import { createTatumSuiClient, type ExecuteTransactionBlockInput } from "@linow/sdk";
import { getServerEnv } from "@/lib/server-env";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const input = (await request.json()) as ExecuteTransactionBlockInput;

    if (!input.transactionBlock || !input.signature) {
      return NextResponse.json(
        { error: "transactionBlock and signature are required." },
        { status: 400 },
      );
    }

    const client = createServerTatumClient();
    const result = await client.executeTransactionBlock(input);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sui transaction execution failed." },
      { status: 500 },
    );
  }
}

function createServerTatumClient() {
  const apiKey = getServerEnv("TATUM_API_KEY");
  const network = getServerEnv("TATUM_SUI_NETWORK");

  if (!apiKey) {
    throw new Error("TATUM_API_KEY is not configured on the server.");
  }

  return createTatumSuiClient({
    apiKey,
    network: network === "mainnet" || network === "devnet"
      ? network
      : "testnet",
    endpoint: getServerEnv("TATUM_SUI_ENDPOINT") || undefined,
  });
}
