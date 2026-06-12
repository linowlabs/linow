import { NextResponse } from "next/server";
import { AgentInputError } from "@/lib/agent/common";
import { evaluateIsaQ2Harness } from "@/lib/agent/harness";
import { parseJsonObjectRequest, toAgentErrorResponse } from "@/lib/agent/http";

export async function POST(request: Request) {
  try {
    const body = await parseJsonObjectRequest(request);

    const stage = body.stage;

    if (stage !== "before_remediation" && stage !== "after_remediation") {
      throw new AgentInputError("stage must be either before_remediation or after_remediation.");
    }

    const result = await evaluateIsaQ2Harness({
      pack_key: "isa_q2",
      stage,
      classifications: Array.isArray(body.classifications) ? (body.classifications as never[]) : undefined,
      source_confidences: Array.isArray(body.source_confidences) ? (body.source_confidences as never[]) : undefined,
      gap_analysis:
        typeof body.gap_analysis === "object" && body.gap_analysis !== null
          ? (body.gap_analysis as never)
          : undefined,
    });

    return NextResponse.json(result);
  } catch (error) {
    return toAgentErrorResponse(error, "Harness evaluation failed.");
  }
}
