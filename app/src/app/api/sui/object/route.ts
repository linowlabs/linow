import { createTatumSuiClient, type SuiObjectReadOptions } from "@linow/sdk";
import { getServerEnv } from "@/lib/server-env";
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
