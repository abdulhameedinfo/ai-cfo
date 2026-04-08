import { getSupabaseClient } from "@/lib/supabase";

export type OrgFinancialRow = {
  org_id: string;
  name: string;
  total_revenue: number | string | null;
  total_expenses: number | string | null;
  margin: number | string | null;
  margin_pct: number | string | null;
};

export type ProjectFinancialRow = {
  project_id: string;
  org_id: string;
  name: string;
  budget: number | string | null;
  status: string | null;
  start_date: string | null;
  total_revenue: number | string | null;
  total_expenses: number | string | null;
  margin: number | string | null;
  margin_pct: number | string | null;
};

export type DashboardOrg = {
  id: string;
  name: string;
  totalRevenue: number;
  totalExpenses: number;
  margin: number;
  marginPct: number;
  projects: DashboardProject[];
};

export type DashboardProject = {
  id: string;
  name: string;
  budget: number;
  status: string;
  startDate: string | null;
  totalRevenue: number;
  totalExpenses: number;
  margin: number;
  marginPct: number;
};

export type DashboardData = {
  kpis: {
    totalRevenue: number;
    totalExpenses: number;
    netMargin: number;
    netMarginPct: number;
    activeProjects: number;
  };
  organizations: DashboardOrg[];
};

function toNumber(value: number | string | null | undefined): number {
  if (value === null || value === undefined) return 0;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

export async function getDashboardData(): Promise<DashboardData> {
  const supabase = getSupabaseClient();

  const [orgRes, projectRes] = await Promise.all([
    supabase
      .from("org_financials")
      .select(
        "org_id,name,total_revenue,total_expenses,margin,margin_pct",
      )
      .order("name"),
    supabase
      .from("project_financials")
      .select(
        "project_id,org_id,name,budget,status,start_date,total_revenue,total_expenses,margin,margin_pct",
      )
      .order("name"),
  ]);

  if (orgRes.error) {
    throw new Error(`Failed to load org_financials: ${orgRes.error.message}`);
  }
  if (projectRes.error) {
    throw new Error(
      `Failed to load project_financials: ${projectRes.error.message}`,
    );
  }

  const orgRows = (orgRes.data ?? []) as OrgFinancialRow[];
  const projectRows = (projectRes.data ?? []) as ProjectFinancialRow[];

  const orgMap = new Map<string, DashboardOrg>();

  for (const org of orgRows) {
    orgMap.set(org.org_id, {
      id: org.org_id,
      name: org.name,
      totalRevenue: toNumber(org.total_revenue),
      totalExpenses: toNumber(org.total_expenses),
      margin: toNumber(org.margin),
      marginPct: toNumber(org.margin_pct),
      projects: [],
    });
  }

  for (const project of projectRows) {
    const target = orgMap.get(project.org_id);
    if (!target) continue;

    target.projects.push({
      id: project.project_id,
      name: project.name,
      budget: toNumber(project.budget),
      status: project.status ?? "unknown",
      startDate: project.start_date ?? null,
      totalRevenue: toNumber(project.total_revenue),
      totalExpenses: toNumber(project.total_expenses),
      margin: toNumber(project.margin),
      marginPct: toNumber(project.margin_pct),
    });
  }

  const organizations = Array.from(orgMap.values());
  const totalRevenue = organizations.reduce(
    (sum, org) => sum + org.totalRevenue,
    0,
  );
  const totalExpenses = organizations.reduce(
    (sum, org) => sum + org.totalExpenses,
    0,
  );
  const netMargin = totalRevenue - totalExpenses;
  const netMarginPct = totalRevenue ? netMargin / totalRevenue : 0;
  const activeProjects = organizations.reduce(
    (sum, org) =>
      sum +
      org.projects.filter((project) => project.status === "active").length,
    0,
  );

  return {
    kpis: {
      totalRevenue,
      totalExpenses,
      netMargin,
      netMarginPct,
      activeProjects,
    },
    organizations,
  };
}
