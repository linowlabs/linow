"use client";

import { createContext, useContext, type ReactNode } from "react";
import type { Transaction } from "@mysten/sui/transactions";

export interface WalletBridge {
  address?: string;
  connectButton: ReactNode;
  signTransaction(input: { transaction: Transaction | string }): Promise<{
    bytes: string;
    signature: string | string[];
  }>;
}

const WalletBridgeContext = createContext<WalletBridge>({
  connectButton: null,
  async signTransaction() {
    throw new Error("Connect a Sui wallet before signing transactions.");
  },
});

export function WalletBridgeProvider({
  children,
  value,
}: {
  children: ReactNode;
  value: WalletBridge;
}) {
  return <WalletBridgeContext.Provider value={value}>{children}</WalletBridgeContext.Provider>;
}

export function useWalletBridge() {
  return useContext(WalletBridgeContext);
}
