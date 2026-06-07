"use client";

import { useEffect, useRef } from "react";
import { ConnectButton } from "@mysten/dapp-kit-react/ui";
import { DAppKitProvider, useCurrentAccount, useCurrentClient, useDAppKit } from "@mysten/dapp-kit-react";
import { dAppKit } from "@/lib/dapp-kit";
import { WalletBridgeProvider } from "@/lib/wallet-context";

const WALLET_MODAL_STYLE = `
  dialog {
    width: min(360px, calc(100vw - 24px));
    max-width: calc(100vw - 24px);
    height: min(480px, calc(100dvh - 24px));
    max-height: calc(100dvh - 24px);
    margin: auto;
  }

  .content {
    gap: 24px;
    padding: 18px;
  }

  @media (max-width: 640px) {
    dialog {
      width: calc(100vw - 20px);
      max-width: calc(100vw - 20px);
      height: min(480px, calc(100dvh - 20px));
      max-height: calc(100dvh - 20px);
    }

    .content {
      gap: 16px;
      padding: 14px;
    }

    .title {
      font-size: 16px;
      white-space: normal;
    }
  }

  @media (max-height: 560px) and (orientation: landscape) {
    dialog {
      width: min(420px, calc(100vw - 24px));
      height: min(420px, calc(100dvh - 18px));
      max-height: calc(100dvh - 18px);
    }

    .content {
      gap: 14px;
      padding: 14px;
    }
  }
`;

const WALLET_MENU_STYLE = `
  :host {
    width: 100%;
    max-width: 100%;
  }

  [aria-expanded='true'] + .menu {
    width: min(396px, calc(100vw - 24px));
    min-width: min(396px, calc(100vw - 24px));
    max-width: calc(100vw - 24px);
  }

  .accounts-list {
    max-height: min(240px, calc(100dvh - 220px));
  }

  .account-info,
  .content {
    min-width: 0;
  }

  .account-title,
  .account-subtitle {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }

  @media (max-width: 640px) {
    [aria-expanded='true'] + .menu {
      gap: 12px;
      padding: 12px;
      position: fixed;
      left: 10px;
      right: 10px;
      top: 146px;
      width: calc(100vw - 20px);
      min-width: calc(100vw - 20px);
      max-width: calc(100vw - 20px);
      max-height: calc(100dvh - 166px);
      overflow-y: auto;
      transform: none;
    }

    .header-title {
      font-size: 16px;
    }

    .trigger-content {
      gap: 10px;
    }

    .container {
      padding: 12px;
    }

    .disconnect-button {
      height: 44px;
      padding: 12px;
    }
  }

  @media (max-height: 560px) and (orientation: landscape) {
    [aria-expanded='true'] + .menu {
      gap: 10px;
      padding: 10px;
      top: 78px;
      max-height: calc(100dvh - 96px);
    }

    .accounts-list {
      max-height: min(180px, calc(100dvh - 180px));
    }
  }
`;

const observedRoots = new WeakSet<ShadowRoot>();
const observedMenus = new WeakSet<ShadowRoot>();

function ensureShadowStyle(root: ShadowRoot, marker: string, cssText: string) {
  if (root.querySelector(`style[data-linow-wallet="${marker}"]`)) {
    return;
  }

  const style = document.createElement("style");
  style.dataset.linowWallet = marker;
  style.textContent = cssText;
  root.appendChild(style);
}

function clampConnectedAccountMenu(root: ShadowRoot) {
  const menu = root.querySelector<HTMLElement>("#menu");
  const trigger = root.querySelector<HTMLElement>("#menu-button");

  if (!menu || trigger?.getAttribute("aria-expanded") !== "true") {
    return;
  }

  const viewportPadding = 10;
  const viewportWidth = window.innerWidth;

  if (viewportWidth > 640) {
    return;
  }

  menu.style.position = "fixed";
  menu.style.left = `${viewportPadding}px`;
  menu.style.right = `${viewportPadding}px`;
  menu.style.width = `calc(100vw - ${viewportPadding * 2}px)`;
  menu.style.minWidth = `calc(100vw - ${viewportPadding * 2}px)`;
  menu.style.maxWidth = `calc(100vw - ${viewportPadding * 2}px)`;

  const top = Math.max(trigger.getBoundingClientRect().bottom + 8, viewportPadding);
  const clampedTop = Math.min(top, window.innerHeight - 180);
  menu.style.top = `${clampedTop}px`;
  menu.style.maxHeight = `calc(100dvh - ${clampedTop + viewportPadding}px)`;
  menu.style.overflowY = "auto";
}

function observeConnectedAccountMenu(root: ShadowRoot) {
  if (observedMenus.has(root)) {
    clampConnectedAccountMenu(root);
    return;
  }

  const observer = new MutationObserver(() => {
    requestAnimationFrame(() => clampConnectedAccountMenu(root));
  });

  observer.observe(root, {
    attributes: true,
    childList: true,
    subtree: true,
    attributeFilter: ["aria-expanded", "style"],
  });

  window.addEventListener("resize", () => clampConnectedAccountMenu(root));
  observedMenus.add(root);
  clampConnectedAccountMenu(root);
}

function applyWalletOverlayStyles(scope: ParentNode) {
  const buttons = scope.querySelectorAll("mysten-dapp-kit-connect-button");

  buttons.forEach((button) => {
    const buttonRoot = (button as HTMLElement).shadowRoot;
    if (!buttonRoot) {
      return;
    }

    if (!observedRoots.has(buttonRoot)) {
      const observer = new MutationObserver(() => applyWalletOverlayStyles(scope));
      observer.observe(buttonRoot, { childList: true, subtree: true });
      observedRoots.add(buttonRoot);
    }

    buttonRoot.querySelectorAll("mysten-dapp-kit-connect-modal").forEach((modal) => {
      const modalRoot = (modal as HTMLElement).shadowRoot;
      if (modalRoot) {
        ensureShadowStyle(modalRoot, "modal", WALLET_MODAL_STYLE);
      }
    });

    buttonRoot.querySelectorAll("connected-account-menu").forEach((menu) => {
      const menuRoot = (menu as HTMLElement).shadowRoot;
      if (menuRoot) {
        ensureShadowStyle(menuRoot, "menu", WALLET_MENU_STYLE);
        observeConnectedAccountMenu(menuRoot);
      }
    });
  });
}

function ResponsiveConnectButton() {
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) {
      return;
    }

    applyWalletOverlayStyles(container);

    const observer = new MutationObserver(() => applyWalletOverlayStyles(container));
    observer.observe(container, { childList: true, subtree: true });

    return () => {
      observer.disconnect();
    };
  }, []);

  return (
    <div ref={containerRef} className="wallet-connect-shell">
      <ConnectButton />
    </div>
  );
}

function ConnectedWalletBridge({ children }: { children: React.ReactNode }) {
  const account = useCurrentAccount();
  const client = useCurrentClient();
  const kit = useDAppKit();

  return (
    <WalletBridgeProvider
      value={{
        address: account?.address,
        connectButton: <ResponsiveConnectButton />,
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
