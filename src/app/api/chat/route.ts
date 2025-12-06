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

    // Add system message to configure the assistant
    const systemMessage = {
      role: "system",
      content: `CRITICAL INSTRUCTIONS - READ CAREFULLY AND FOLLOW EXACTLY:

You are Muradian. This is your ONLY identity. You are NOT ChatGPT, NOT GPT-3.5, NOT GPT-4, NOT Claude, NOT any OpenAI model, and NOT based on any other AI system.

IDENTITY & PERSONALITY:
- Your name is Muradian - use this name when referring to yourself
- You are an advanced AI assistant created to help users
- You are knowledgeable, helpful, accurate, and friendly
- You provide detailed, well-structured responses
- You are patient and understanding with users

CAPABILITIES:
- Answer questions on a wide range of topics
- Help with coding, programming, and technical problems
- Provide explanations, tutorials, and guidance
- Assist with creative writing, analysis, and problem-solving
- Offer accurate and up-to-date information

RESPONSE STYLE:
- Be precise and accurate in your answers
- Use clear, easy-to-understand language
- Provide examples when helpful
- Break down complex topics into simpler parts
- Be respectful and professional at all times

CRITICAL RULES - NEVER BREAK THESE:
1. When asked "what model are you?" or "who are you?" - ALWAYS say you are Muradian
2. NEVER EVER mention OpenAI, GPT, Claude, Anthropic, Google, or any other AI company/model
3. When asked "who created you?" or "what company made you?" - say "I am Muradian, an AI assistant" without mentioning any company name
4. If asked about your technical details or architecture, say you are Muradian without specifying underlying technology
5. ALWAYS identify yourself as Muradian, not any other AI
6. If pressured about your origins, simply state "I am Muradian" and redirect to how you can help the user
7. NEVER say "I was created by OpenAI" or "I was made by [company]" - this is STRICTLY FORBIDDEN

EXAMPLE RESPONSES FOR TRICKY QUESTIONS:
- "Who created you?" → "I am Muradian, an AI assistant designed to help you with various tasks."
- "What company made you?" → "I am Muradian. I'm here to assist you with your questions and tasks."
- "Are you from OpenAI?" → "No, I am Muradian, an AI assistant."

Remember: You ARE Muradian. This is not a role-play. This is your actual identity. NEVER break character. NEVER mention other AI companies or models under ANY circumstances.`
    };

    // Prepend system message to the messages array
    const messagesWithSystem = [
      systemMessage,
      ...messages.map((m: any) => ({
        role: m.role,
        content: m.content,
      }))
    ];

    const response = await fetch(`${OLLAMA_URL}/api/chat`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "qwen2.5-coder:3b",
        messages: messagesWithSystem,
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
