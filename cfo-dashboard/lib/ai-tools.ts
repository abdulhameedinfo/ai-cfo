import { getSupabaseClient } from "@/lib/supabase";

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function monthsAgoDate(months: number): Date {
  const date = new Date();
  date.setUTCDate(1);
  date.setUTCMonth(date.getUTCMonth() - months + 1);
  date.setUTCHours(0, 0, 0, 0);
  return date;
}

export async function getOrgProfitMargin(orgName: string) {
  const supabase = getSupabaseClient();

  const { data: orgs, error } = await supabase
    .from("org_financials")
    .select("org_id,name,total_revenue,total_expenses,margin,margin_pct")
    .ilike("name", `%${orgName}%`)
    .order("name");

  if (error) {
    throw new Error(`Failed to fetch org profit margin: ${error.message}`);
  }

  if (!orgs || orgs.length === 0) {
    return { found: false, orgName };
  }

  const target = orgs[0];

  return {
    found: true,
    org: {
      id: target.org_id,
      name: target.name,
      totalRevenue: toNumber(target.total_revenue),
      totalExpenses: toNumber(target.total_expenses),
      margin: toNumber(target.margin),
      marginPct: toNumber(target.margin_pct),
    },
  };
}

export async function getTravelCostTrend(orgName: string, months = 24) {
  const supabase = getSupabaseClient();

  const { data: orgs, error: orgError } = await supabase
    .from("organizations")
    .select("id,name")
    .ilike("name", `%${orgName}%`)
    .order("name");

  if (orgError) {
    throw new Error(`Failed to find organization: ${orgError.message}`);
  }

  if (!orgs || orgs.length === 0) {
    return { found: false, orgName };
  }

  const org = orgs[0];
  const since = monthsAgoDate(months);

  const { data: rows, error } = await supabase
    .from("monthly_travel_costs")
    .select("month,travel_cost,survey_count,avg_travel_per_survey")
    .eq("org_id", org.id)
    .gte("month", since.toISOString())
    .order("month");

  if (error) {
    throw new Error(`Failed to fetch travel trend: ${error.message}`);
  }

  const points =
    rows?.map((row) => ({
      month: row.month,
      travelCost: toNumber(row.travel_cost),
      surveyCount: toNumber(row.survey_count),
      avgTravelPerSurvey: toNumber(row.avg_travel_per_survey),
    })) ?? [];

  if (points.length === 0) {
    return { found: true, org, points: [], months, trend: null };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.avgTravelPerSurvey - first.avgTravelPerSurvey;
  const deltaPct = first.avgTravelPerSurvey
    ? delta / first.avgTravelPerSurvey
    : 0;

  const lastThree = points.slice(-3);
  const lastThreeAvgTravelCost =
    lastThree.reduce((sum, point) => sum + point.travelCost, 0) /
    Math.max(lastThree.length, 1);
  const projectedQuarterRunRate = lastThreeAvgTravelCost * 3;

  return {
    found: true,
    org,
    months,
    points,
    trend: {
      firstAvg: first.avgTravelPerSurvey,
      lastAvg: last.avgTravelPerSurvey,
      delta,
      deltaPct,
      projectedQuarterRunRate,
    },
  };
}

export async function getTravelCostTrendOverall(months = 24) {
  const supabase = getSupabaseClient();
  const since = monthsAgoDate(months);

  const { data: rows, error } = await supabase
    .from("monthly_travel_costs")
    .select("month,travel_cost,survey_count")
    .gte("month", since.toISOString())
    .order("month");

  if (error) {
    throw new Error(`Failed to fetch travel trend: ${error.message}`);
  }

  const monthlyMap = new Map<
    string,
    { travelCost: number; surveyCount: number }
  >();

  for (const row of rows ?? []) {
    const month = String(row.month);
    const existing = monthlyMap.get(month) ?? {
      travelCost: 0,
      surveyCount: 0,
    };
    existing.travelCost += toNumber(row.travel_cost);
    existing.surveyCount += toNumber(row.survey_count);
    monthlyMap.set(month, existing);
  }

  const points = Array.from(monthlyMap.entries())
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([month, totals]) => {
      const avgTravelPerSurvey = totals.surveyCount
        ? totals.travelCost / totals.surveyCount
        : 0;
      return {
        month,
        travelCost: totals.travelCost,
        surveyCount: totals.surveyCount,
        avgTravelPerSurvey,
      };
    });

  if (points.length === 0) {
    return { found: true, org: null, points: [], months, trend: null };
  }

  const first = points[0];
  const last = points[points.length - 1];
  const delta = last.avgTravelPerSurvey - first.avgTravelPerSurvey;
  const deltaPct = first.avgTravelPerSurvey
    ? delta / first.avgTravelPerSurvey
    : 0;

  const lastThree = points.slice(-3);
  const lastThreeAvgTravelCost =
    lastThree.reduce((sum, point) => sum + point.travelCost, 0) /
    Math.max(lastThree.length, 1);
  const projectedQuarterRunRate = lastThreeAvgTravelCost * 3;

  return {
    found: true,
    org: null,
    months,
    points,
    trend: {
      firstAvg: first.avgTravelPerSurvey,
      lastAvg: last.avgTravelPerSurvey,
      delta,
      deltaPct,
      projectedQuarterRunRate,
    },
  };
}

export async function auditExpensesLastYear() {
  const supabase = getSupabaseClient();
  const since = new Date();
  since.setUTCFullYear(since.getUTCFullYear() - 1);

  const { data, error } = await supabase
    .from("expense_anomalies")
    .select(
      "issue_type,org_name,project_name,technician_name,category,amount,occurred_on,details",
    )
    .gte("occurred_on", since.toISOString())
    .order("occurred_on", { ascending: false });

  if (error) {
    throw new Error(`Failed to audit expenses: ${error.message}`);
  }

  return {
    since: since.toISOString(),
    anomalies:
      data?.map((row) => ({
        issueType: row.issue_type,
        orgName: row.org_name,
        projectName: row.project_name,
        technicianName: row.technician_name,
        category: row.category,
        amount: toNumber(row.amount),
        occurredOn: row.occurred_on,
        details: row.details,
      })) ?? [],
  };
}
