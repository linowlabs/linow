import { NextResponse } from "next/server";
import { AgentInputError } from "@/lib/agent/common";

export async function parseJsonObjectRequest(request: Request): Promise<Record<string, unknown>> {
  try {
    const body = (await request.json()) as unknown;

    if (typeof body !== "object" || body === null || Array.isArray(body)) {
      throw new AgentInputError("Request body must be a JSON object.");
    }

    return body as Record<string, unknown>;
  } catch (error) {
    if (error instanceof AgentInputError) {
      throw error;
    }

    throw new AgentInputError("Request body must be valid JSON.");
  }
}

export function toAgentErrorResponse(error: unknown, fallbackMessage: string) {
  if (error instanceof AgentInputError) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json(
    { error: error instanceof Error ? error.message : fallbackMessage },
    { status: 500 },
  );
}
