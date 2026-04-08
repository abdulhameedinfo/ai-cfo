import { createClient } from "@supabase/supabase-js";
import dotenv from "dotenv";

dotenv.config({ path: ".env.local" });

type Organization = { id: string; name: string };
type User = {
  id: string;
  org_id: string;
  full_name: string;
  role: "technician" | "manager";
  email: string;
};
type Project = { id: string; org_id: string; name: string; budget: number };

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  throw new Error(
    "Missing SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY environment variables.",
  );
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
});

function getRandomDate(monthsAgo: number): string {
  const date = new Date();
  date.setMonth(date.getMonth() - monthsAgo);
  date.setDate(Math.floor(Math.random() * 28) + 1);
  return date.toISOString();
}

async function seed() {
  console.log("Starting robust 24-month data seed...");

  console.log("Clearing existing data...");
  await supabase.from("expenses").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("revenue").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("projects").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("users").delete().neq("id", "00000000-0000-0000-0000-000000000000");
  await supabase.from("organizations").delete().neq("id", "00000000-0000-0000-0000-000000000000");

  const { data: orgs, error: orgErr } = await supabase
    .from("organizations")
    .insert([{ name: "7-Eleven Global" }, { name: "Home Depot Field Ops" }])
    .select();
  if (orgErr || !orgs) throw new Error(`Org Error: ${orgErr?.message}`);

  const org711 = orgs.find((o: Organization) => o.name === "7-Eleven Global");
  const orgHD = orgs.find(
    (o: Organization) => o.name === "Home Depot Field Ops",
  );
  if (!org711 || !orgHD) throw new Error("Missing orgs after insert.");

  const { data: techs, error: techErr } = await supabase
    .from("users")
    .insert([
      {
        org_id: org711.id,
        full_name: "Marcus Thorne",
        email: "m.thorne@field.com",
        role: "technician",
      },
      {
        org_id: org711.id,
        full_name: "Sarah Miller",
        email: "s.miller@field.com",
        role: "technician",
      },
      {
        org_id: orgHD.id,
        full_name: "David Chen",
        email: "d.chen@field.com",
        role: "technician",
      },
      {
        org_id: orgHD.id,
        full_name: "Aisha Patel",
        email: "a.patel@field.com",
        role: "technician",
      },
    ])
    .select();
  if (techErr || !techs) throw new Error(`Tech Error: ${techErr?.message}`);

  const { data: locations, error: locErr } = await supabase
    .from("projects")
    .insert([
      { org_id: org711.id, name: "Store #24051 - Austin, TX", budget: 150000 },
      { org_id: org711.id, name: "Store #39201 - Denver, CO", budget: 135000 },
      { org_id: orgHD.id, name: "HD #1102 - Seattle, WA", budget: 220000 },
      { org_id: orgHD.id, name: "HD #0899 - Miami, FL", budget: 210000 },
    ])
    .select();
  if (locErr || !locations) throw new Error(`Location Error: ${locErr?.message}`);

  console.log("Generating 24 months of survey data. This might take a moment...");

  const revenueRows: {
    project_id: string;
    amount: number;
    description: string;
    date: string;
  }[] = [];

  const expenseRows: {
    project_id: string;
    user_id: string;
    amount: number;
    category: string;
    date: string;
  }[] = [];

  for (let monthOffset = 23; monthOffset >= 0; monthOffset -= 1) {
    const inflationMultiplier = monthOffset < 12 ? 1.15 : 1.0;

    for (const store of locations) {
      const storeOrgId = store.org_id as string;
      const validTechs = techs.filter((t: User) => t.org_id === storeOrgId);
      const activeTech =
        validTechs[Math.floor(Math.random() * validTechs.length)];
      const surveyDate = getRandomDate(monthOffset);

      const baseFee = storeOrgId === orgHD.id ? 12500 : 8500;
      revenueRows.push({
        project_id: store.id,
        amount: baseFee + Math.floor(Math.random() * 1000),
        description: "Monthly Lidar & Imaging Survey",
        date: surveyDate,
      });

      const tripExpenses = [
        { cat: "Flight", amt: (350 + Math.random() * 250) * inflationMultiplier },
        { cat: "Hotel", amt: (400 + Math.random() * 300) * inflationMultiplier },
        { cat: "Meals", amt: (150 + Math.random() * 100) * inflationMultiplier },
        { cat: "Equipment", amt: 200 },
      ];

      for (const item of tripExpenses) {
        let finalAmount = item.amt;
        let finalCategory = item.cat;

        if (
          activeTech.full_name === "Marcus Thorne" &&
          monthOffset === 8 &&
          item.cat === "Equipment"
        ) {
          finalAmount = 7500;
          finalCategory = "Unauthorized Hardware Purchase";
        }

        if (
          activeTech.full_name === "Aisha Patel" &&
          monthOffset === 3 &&
          item.cat === "Flight"
        ) {
          expenseRows.push({
            project_id: store.id,
            user_id: activeTech.id,
            amount: finalAmount,
            category: "Flight",
            date: surveyDate,
          });
        }

        expenseRows.push({
          project_id: store.id,
          user_id: activeTech.id,
          amount: Number(finalAmount.toFixed(2)),
          category: finalCategory,
          date: surveyDate,
        });
      }
    }
  }

  const { error: revenueErr } = await supabase
    .from("revenue")
    .insert(revenueRows);
  if (revenueErr) throw new Error(`Revenue Error: ${revenueErr.message}`);

  const { error: expenseErr } = await supabase
    .from("expenses")
    .insert(expenseRows);
  if (expenseErr) throw new Error(`Expense Error: ${expenseErr.message}`);

  console.log("Seed complete! 24 months of financial history generated.");
}

seed().catch((error) => {
  console.error(error);
  process.exit(1);
});
