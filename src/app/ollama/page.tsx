"use client";

import { useState } from "react";

export default function OllamaPage() {
  const [prompt, setPrompt] = useState("");
  const [answer, setAnswer] = useState("");
  const [loading, setLoading] = useState(false);

  const handleAsk = async () => {
    if (!prompt.trim()) return;
    setLoading(true);
    setAnswer("");

    try {
      const res = await fetch("/api/ollama", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ prompt }),
      });

      const data = await res.json();
      if (data.error) {
        setAnswer(`Error: ${data.error}`);
      } else {
        setAnswer(data.response);
      }
    } catch (e: unknown) {
      setAnswer("Network error: " + ((e as Error)?.message ?? "unknown"));
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleAsk();
    }
  };

  return (
    <div className="min-h-screen bg-zinc-950 text-gray-100 flex justify-center">
      <div className="w-full max-w-3xl px-4 py-8 flex flex-col gap-4">
        <h1 className="text-2xl font-semibold">
          Local Qwen2.5 Coder UI
        </h1>
        <p className="text-sm text-gray-400">
          Runs on <code>qwen2.5-coder:3b</code> via Ollama (
          <code>localhost:11434</code>).
        </p>

        <div className="flex flex-col gap-2">
          <label className="text-sm text-gray-300">
            Prompt
          </label>
          <textarea
            className="w-full rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm focus:outline-none focus:ring-1 focus:ring-blue-500"
            rows={4}
            placeholder="Ask something like: “Write a minimal GLUT C++ program that draws a triangle.”"
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            onKeyDown={handleKeyDown}
          />
          <button
            onClick={handleAsk}
            disabled={loading || !prompt.trim()}
            className="self-end rounded-xl bg-blue-600 px-4 py-2 text-sm font-medium disabled:opacity-50"
          >
            {loading ? "Thinking..." : "Ask"}
          </button>
        </div>

        <div className="mt-4">
          <h2 className="text-sm font-medium text-gray-300 mb-2">
            Answer
          </h2>
          <div className="min-h-[120px] whitespace-pre-wrap rounded-xl border border-zinc-700 bg-zinc-900 px-3 py-2 text-sm">
            {answer || (!loading && "No answer yet.")}
            {loading && !answer && "Generating..."}
          </div>
        </div>
      </div>
    </div>
  );
}
