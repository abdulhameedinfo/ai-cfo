-- Aggregate views for AI CFO dashboard queries

create or replace view project_financials as
with revenue_totals as (
  select project_id, sum(amount) as total_revenue
  from revenue
  group by project_id
),
expense_totals as (
  select project_id, sum(amount) as total_expenses
  from expenses
  group by project_id
)
select
  p.id as project_id,
  p.org_id,
  p.name,
  p.budget,
  p.status,
  p.start_date,
  coalesce(r.total_revenue, 0) as total_revenue,
  coalesce(e.total_expenses, 0) as total_expenses,
  coalesce(r.total_revenue, 0) - coalesce(e.total_expenses, 0) as margin,
  case
    when coalesce(r.total_revenue, 0) = 0 then 0
    else (coalesce(r.total_revenue, 0) - coalesce(e.total_expenses, 0)) / coalesce(r.total_revenue, 0)
  end as margin_pct
from projects p
left join revenue_totals r on r.project_id = p.id
left join expense_totals e on e.project_id = p.id;

create or replace view org_financials as
select
  o.id as org_id,
  o.name,
  coalesce(sum(p.total_revenue), 0) as total_revenue,
  coalesce(sum(p.total_expenses), 0) as total_expenses,
  coalesce(sum(p.margin), 0) as margin,
  case
    when coalesce(sum(p.total_revenue), 0) = 0 then 0
    else coalesce(sum(p.margin), 0) / coalesce(sum(p.total_revenue), 0)
  end as margin_pct
from organizations o
left join project_financials p on p.org_id = o.id
group by o.id, o.name;

create or replace view monthly_travel_costs as
with travel as (
  select
    p.org_id,
    date_trunc('month', e.date)::date as month,
    sum(e.amount) as travel_cost
  from expenses e
  join projects p on p.id = e.project_id
  where e.category in ('Flight', 'Hotel', 'Meals')
  group by p.org_id, date_trunc('month', e.date)
),
surveys as (
  select
    p.org_id,
    date_trunc('month', r.date)::date as month,
    count(*) as survey_count
  from revenue r
  join projects p on p.id = r.project_id
  group by p.org_id, date_trunc('month', r.date)
)
select
  coalesce(t.org_id, s.org_id) as org_id,
  coalesce(t.month, s.month) as month,
  coalesce(t.travel_cost, 0) as travel_cost,
  coalesce(s.survey_count, 0) as survey_count,
  case
    when coalesce(s.survey_count, 0) = 0 then 0
    else coalesce(t.travel_cost, 0) / coalesce(s.survey_count, 0)
  end as avg_travel_per_survey
from travel t
full outer join surveys s
  on s.org_id = t.org_id and s.month = t.month;

create or replace view expense_anomalies as
with duplicate_flights as (
  select
    e.project_id,
    e.user_id,
    date(e.date) as occurred_on,
    e.amount,
    e.category,
    count(*) as dup_count
  from expenses e
  where e.category = 'Flight'
  group by e.project_id, e.user_id, date(e.date), e.amount, e.category
  having count(*) > 1
),
large_equipment as (
  select
    e.project_id,
    e.user_id,
    date(e.date) as occurred_on,
    e.amount,
    e.category
  from expenses e
  where e.category ilike '%equipment%' and e.amount >= 5000
)
select
  'DUPLICATE_FLIGHT' as issue_type,
  o.name as org_name,
  p.name as project_name,
  u.full_name as technician_name,
  d.category,
  d.amount,
  d.occurred_on,
  concat('Duplicate flight charges detected: ', d.dup_count) as details
from duplicate_flights d
join projects p on p.id = d.project_id
join organizations o on o.id = p.org_id
left join users u on u.id = d.user_id

union all

select
  'LARGE_EQUIPMENT' as issue_type,
  o.name as org_name,
  p.name as project_name,
  u.full_name as technician_name,
  l.category,
  l.amount,
  l.occurred_on,
  'Equipment purchase exceeds $5,000' as details
from large_equipment l
join projects p on p.id = l.project_id
join organizations o on o.id = p.org_id
left join users u on u.id = l.user_id;
