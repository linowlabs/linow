import { NextResponse } from "next/server";
import { hashAgentArtifact, parseAgentArtifactEnvelopes } from "@/lib/agent/artifacts";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);
    const artifacts = parseAgentArtifactEnvelopes(body).map((artifact) =>
      hashAgentArtifact(artifact.payload, artifact.label),
    );

    return NextResponse.json({
      artifacts,
    });
  } catch (error) {
    return toAgentErrorResponse(error, "Agent artifact validation or hashing failed.");
  }
}
