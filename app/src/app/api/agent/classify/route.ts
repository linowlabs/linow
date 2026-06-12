import { NextResponse } from "next/server";
import { parseClassifyDocumentInput } from "@/lib/agent/classify";
import { classifyDocumentWithGroq } from "@/lib/agent/groq";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const input = parseClassifyDocumentInput(body);
    const result = await classifyDocumentWithGroq(input);

    return NextResponse.json({
      provider: result.provider,
      model: result.model,
      classification: result.result,
      usage: result.usage ?? null,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Agent classification failed.");
  }
}
