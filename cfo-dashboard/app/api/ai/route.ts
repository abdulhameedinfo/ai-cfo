import { NextResponse } from "next/server";
import { GoogleGenerativeAI, SchemaType } from "@google/generative-ai";
import {
  auditExpensesLastYear,
  getOrgProfitMargin,
  getTravelCostTrend,
  getTravelCostTrendOverall,
} from "@/lib/ai-tools";

const geminiApiKey = process.env.GEMINI_API_KEY;
const geminiModel = process.env.GEMINI_MODEL || "gemini-1.5-flash-latest";
const normalizedModel = geminiModel.startsWith("models/")
  ? geminiModel.slice("models/".length)
  : geminiModel;

const systemPrompt = [
  "You are the AI CFO for a robotic imaging company.",
  "Use the provided tool results to answer financial questions with clear numbers and units.",
  "If a travel cost question does not mention an organization, use overall travel trends.",
  "If data is missing, say what you could not find and suggest next steps.",
  "Keep answers concise and business-focused.",
].join(" ");

const toolDeclarations = [
  {
    name: "get_org_profit_margin",
    description:
      "Get total revenue, expenses, and net margin for a specific organization.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        org_name: {
          type: SchemaType.STRING,
          description: "Organization name to match, e.g., Home Depot.",
        },
      },
      required: ["org_name"],
    },
  },
  {
    name: "get_travel_cost_trend",
    description:
      "Get average travel cost per survey over time and a projected quarterly run-rate.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        org_name: {
          type: SchemaType.STRING,
          description: "Organization name to match, e.g., Home Depot.",
        },
        months: {
          type: SchemaType.NUMBER,
          description: "How many months to include in the trend window.",
        },
      },
      required: ["org_name"],
    },
  },
  {
    name: "get_travel_cost_trend_overall",
    description:
      "Get average travel cost per survey over time and projected quarterly run-rate across all organizations.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {
        months: {
          type: SchemaType.NUMBER,
          description: "How many months to include in the trend window.",
        },
      },
    },
  },
  {
    name: "audit_expenses_last_year",
    description:
      "Detect duplicate flights or unusually large equipment purchases in the last year.",
    parameters: {
      type: SchemaType.OBJECT,
      properties: {},
    },
  },
];

async function runTool(name: string, args: Record<string, unknown>) {
  switch (name) {
    case "get_org_profit_margin": {
      const orgName = String(args.org_name ?? "");
      return getOrgProfitMargin(orgName);
    }
    case "get_travel_cost_trend": {
      const orgName = String(args.org_name ?? "");
      const months = args.months ? Number(args.months) : 24;
      return getTravelCostTrend(orgName, Number.isFinite(months) ? months : 24);
    }
    case "get_travel_cost_trend_overall": {
      const months = args.months ? Number(args.months) : 24;
      return getTravelCostTrendOverall(
        Number.isFinite(months) ? months : 24,
      );
    }
    case "audit_expenses_last_year":
      return auditExpensesLastYear();
    default:
      return { error: "Unknown tool requested." };
  }
}

export async function POST(request: Request) {
  try {
    if (!geminiApiKey) {
      return NextResponse.json(
        { error: "Missing GEMINI_API_KEY environment variable." },
        { status: 500 },
      );
    }

    const body = (await request.json()) as { question?: string };
    const question = body.question?.trim();

    if (!question) {
      return NextResponse.json(
        { error: "Question is required." },
        { status: 400 },
      );
    }

    const genAI = new GoogleGenerativeAI(geminiApiKey);
    const model = genAI.getGenerativeModel({
      model: normalizedModel,
      tools: [{ functionDeclarations: toolDeclarations }],
      systemInstruction: systemPrompt,
    });

    const initial = await model.generateContent({
      contents: [{ role: "user", parts: [{ text: question }] }],
    });

    const response = initial.response;
    const functionCalls = response.functionCalls?.() ?? [];

    if (functionCalls.length === 0) {
      const text = response.text();
      return NextResponse.json({ answer: text });
    }

    const toolResults = [];
    for (const call of functionCalls) {
      const rawArgs = call.args ?? {};
      let args: Record<string, unknown> = {};
      if (typeof rawArgs === "string") {
        try {
          args = JSON.parse(rawArgs) as Record<string, unknown>;
        } catch {
          args = {};
        }
      } else {
        args = rawArgs as Record<string, unknown>;
      }
      // eslint-disable-next-line no-await-in-loop
      const result = await runTool(call.name, args);
      toolResults.push({ tool: call.name, args, result });
    }

    const final = await model.generateContent({
      contents: [
        {
          role: "user",
          parts: [
            {
              text: `${systemPrompt}\nUser question: ${question}\nTool results: ${JSON.stringify(
                toolResults,
              )}`,
            },
          ],
        },
      ],
    });

    return NextResponse.json({ answer: final.response.text() });
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error";
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
