import { createTatumSuiClient, type SuiObjectReadOptions } from "@linow/sdk";
import { NextResponse } from "next/server";

export async function POST(request: Request) {
  try {
    const { objectId, options } = (await request.json()) as {
      objectId?: string;
      options?: SuiObjectReadOptions;
    };

    if (!objectId) {
      return NextResponse.json({ error: "objectId is required." }, { status: 400 });
    }

    const client = createServerTatumClient();
    const result = await client.getObject(objectId, options);
    return NextResponse.json(result);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Sui object read failed." },
      { status: 500 },
    );
  }
}

function createServerTatumClient() {
  const apiKey = process.env.TATUM_API_KEY;

  if (!apiKey) {
    throw new Error("TATUM_API_KEY is not configured on the server.");
  }

  return createTatumSuiClient({
    apiKey,
    network: process.env.TATUM_SUI_NETWORK === "mainnet" || process.env.TATUM_SUI_NETWORK === "devnet"
      ? process.env.TATUM_SUI_NETWORK
      : "testnet",
    endpoint: process.env.TATUM_SUI_ENDPOINT || undefined,
  });
}
