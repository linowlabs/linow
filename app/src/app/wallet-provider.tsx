"use client";

import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { DAppKitProvider, useCurrentAccount, useCurrentClient, useDAppKit } from "@mysten/dapp-kit-react";
import { dAppKit } from "@/lib/dapp-kit";
import { WalletBridgeProvider } from "@/lib/wallet-context";

function ConnectedWalletBridge({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const kit = useDAppKit();

  return (
    <WalletBridgeProvider
      value={{
        address: account?.address,
        connectButton: <ConnectButton />,
        async signTransaction({ transaction }) {
          if (!account) {
            throw new Error("Connect a Sui wallet before signing transactions.");
          }

          if (typeof transaction !== "string") {
            transaction.setSenderIfNotSet(account.address);
            await transaction.build({ client });
          }

          const signed = await kit.signTransaction({ transaction });
          return {
            bytes: signed.bytes,
            signature: signed.signature,
          };
        },
      }}
    >
      {children}
    </WalletBridgeProvider>
  );
}

export function WalletProvider({ children }: { children: React.ReactNode }) {
  return (
    <DAppKitProvider dAppKit={dAppKit}>
      <ConnectedWalletBridge>{children}</ConnectedWalletBridge>
    </DAppKitProvider>
  );
}
