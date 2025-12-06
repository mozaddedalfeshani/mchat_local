import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = "http://localhost:11434";

export async function POST(req: NextRequest) {
  try {
    const { prompt } = await req.json();

    if (!prompt || typeof prompt !== "string") {
      return NextResponse.json(
        { error: "Prompt is required" },
        { status: 400 }
      );
    }

    const resp = await fetch(`${OLLAMA_URL}/api/generate`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5-coder:3b",
        prompt,
        stream: false,
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json(
        { error: "Ollama error", details: text },
        { status: 500 }
      );
    }

    const data = await resp.json();

    return NextResponse.json({
      response: data.response ?? "",
    });
  } catch (err: any) {
    console.error("Ollama API error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message },
      { status: 500 }
    );
  }
}
