"use client";

import { useState } from "react";

type Message = {
  role: "user" | "assistant";
  content: string;
};

const starterQuestions = [
  "What is our overall net profit margin across all Home Depot locations?",
  "How have our average travel costs per survey changed over the last 24 months? Based on this, what is our projected expense run-rate for the upcoming quarter?",
  "Run an audit on technician expenses over the last year. Are there any duplicate flight billings or unusually large equipment purchases we should investigate?",
];

export default function ChatPanel() {
  const [messages, setMessages] = useState<Message[]>([
    {
      role: "assistant",
      content:
        "Ask me about profitability, travel costs, or expense audits across your projects.",
    },
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);

  const sendMessage = async (question?: string) => {
    const prompt = (question ?? input).trim();
    if (!prompt || loading) return;

    setMessages((prev) => [...prev, { role: "user", content: prompt }]);
    setInput("");
    setLoading(true);

    try {
      const response = await fetch("/api/ai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question: prompt }),
      });
      const rawText = await response.text();
      let payload: { answer?: string; error?: string } | null = null;
      try {
        payload = rawText ? (JSON.parse(rawText) as { answer?: string; error?: string }) : null;
      } catch {
        payload = null;
      }

      const content =
        payload?.answer ??
        payload?.error ??
        (rawText
          ? `Unexpected response (${response.status}).`
          : `Empty response (${response.status}).`);

      setMessages((prev) => [...prev, { role: "assistant", content }]);
    } catch (error) {
      setMessages((prev) => [
        ...prev,
        {
          role: "assistant",
          content:
            error instanceof Error
              ? error.message
              : "Network error. Please try again.",
        },
      ]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <section className="flex h-full flex-col rounded-2xl border border-white/10 bg-white/70 p-6 shadow-[0_20px_60px_-40px_rgba(15,23,42,0.7)] backdrop-blur">
      <div className="flex items-center justify-between">
        <div>
          <p className="text-sm uppercase tracking-[0.2em] text-slate-400">
            AI CFO
          </p>
          <h2 className="mt-1 text-2xl font-semibold text-slate-900">
            Financial Analyst
          </h2>
        </div>
        <span className="rounded-full bg-emerald-500/10 px-3 py-1 text-xs font-semibold text-emerald-700">
          Live
        </span>
      </div>

      <div className="mt-4 flex flex-wrap gap-2">
        {starterQuestions.map((question) => (
          <button
            key={question}
            type="button"
            className="rounded-full border border-slate-200 bg-white px-3 py-1 text-xs font-medium text-slate-600 transition hover:border-slate-300 hover:text-slate-800"
            onClick={() => sendMessage(question)}
          >
            {question}
          </button>
        ))}
      </div>

      <div className="mt-4 flex-1 space-y-4 overflow-y-auto rounded-xl border border-slate-100 bg-white p-4">
        {messages.map((message, index) => (
          <div
            key={`${message.role}-${index}`}
            className={`rounded-2xl px-4 py-3 text-sm leading-relaxed ${
              message.role === "user"
                ? "ml-auto max-w-[85%] bg-slate-900 text-white"
                : "mr-auto max-w-[90%] bg-slate-50 text-slate-700"
            }`}
          >
            {message.content}
          </div>
        ))}
        {loading && (
          <div className="mr-auto max-w-[90%] rounded-2xl bg-slate-50 px-4 py-3 text-sm text-slate-500">
            Analyzing...
          </div>
        )}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(event) => {
          event.preventDefault();
          sendMessage();
        }}
      >
        <input
          className="flex-1 rounded-xl border border-slate-200 bg-white px-4 py-3 text-sm text-slate-900 outline-none transition focus:border-slate-400"
          placeholder="Ask the AI CFO about margins, forecasts, or anomalies..."
          value={input}
          onChange={(event) => setInput(event.target.value)}
        />
        <button
          type="submit"
          disabled={loading}
          className="rounded-xl bg-slate-900 px-4 py-3 text-sm font-semibold text-white transition hover:bg-slate-800 disabled:opacity-60"
        >
          Send
        </button>
      </form>
    </section>
  );
}
