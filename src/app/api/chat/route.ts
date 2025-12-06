import { NextRequest, NextResponse } from "next/server";

const OLLAMA_URL = "http://localhost:11434";

export async function POST(req: NextRequest) {
  try {
    const { messages } = await req.json();

    if (!messages || !Array.isArray(messages)) {
      return NextResponse.json(
        { error: "Messages are required" },
        { status: 400 }
      );
    }

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5-coder:3b",
        messages: messages.map((m: any) => ({
          role: m.role,
          content: m.content,
        })),
        stream: true,
      }),
    });

    if (!response.ok) {
      const text = await response.text();
      return NextResponse.json(
        { error: "Ollama error", details: text },
        { status: 500 }
      );
    }

    // Create a streaming response
    const stream = new ReadableStream({
      async start(controller) {
        if (!response.body) return;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();

        try {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;

            const chunk = decoder.decode(value, { stream: true });
            // Ollama sends multiple JSON objects in one chunk sometimes
            const lines = chunk.split('\n').filter(line => line.trim() !== '');

            for (const line of lines) {
              try {
                const json = JSON.parse(line);
                if (json.message && json.message.content) {
                  // Send just the content to the client
                  controller.enqueue(new TextEncoder().encode(json.message.content));
                }
                if (json.done) {
                  // controller.close(); // Don't close yet, let the loop finish
                }
              } catch (e) {
                console.error("Error parsing JSON chunk", e);
              }
            }
          }
        } catch (err) {
          console.error("Stream reading error", err);
          controller.error(err);
        } finally {
          controller.close();
        }
      },
    });

    return new NextResponse(stream, {
      headers: {
        "Content-Type": "text/plain; charset=utf-8",
        "Transfer-Encoding": "chunked",
      },
    });

  } catch (err: any) {
    console.error("Ollama API error:", err);
    return NextResponse.json(
      { error: "Server error", details: err?.message },
      { status: 500 }
    );
  }
}
