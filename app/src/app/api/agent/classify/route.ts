import { NextResponse } from "next/server";
import { AgentInputError, parseClassifyDocumentInput } from "@/lib/agent/classify";
import { classifyDocumentWithGroq } from "@/lib/agent/groq";

export async function POST(request: Request) {
  try {
    const body = (await request.json()) as unknown;
    const input = parseClassifyDocumentInput(body);
    const result = await classifyDocumentWithGroq(input);

    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      classification: result.result,
      usage: result.usage ?? null,
    });
  } catch (error) {
    if (error instanceof AgentInputError) {
      return NextResponse.json({ error: error.message }, { status: 400 });
    }

    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Agent classification failed." },
      { status: 500 },
    );
  }
}
