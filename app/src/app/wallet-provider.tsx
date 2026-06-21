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

const WALLET_BUTTON_STYLE = `
  button {
    background: rgba(255, 255, 255, 0.85) !important;
    border: 1px solid rgba(0, 0, 0, 0.08) !important;
    border-radius: 8px !important;
    padding: 0 12px !important;
    color: #1f2937 !important;
    font-size: 12px !important;
    font-weight: 600 !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
    font-family: inherit !important;
    cursor: pointer !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    height: 32px !important;
    transition: all 150ms ease !important;
  }

  button:hover {
    background: #ffffff !important;
    border-color: rgba(0, 0, 0, 0.16) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  }

  button:active {
    background: #f3f4f6 !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05) inset !important;
  }

  button, button * {
    color: #1f2937 !important;
  }

  button svg {
    color: #1f2937 !important;
  }
`;

const WALLET_MENU_STYLE = `
  :host {
    width: auto !important;
    display: inline-block !important;
  }

  /* Style the trigger button custom element */
  internal-button,
  #menu-button {
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    background: rgba(255, 255, 255, 0.85) !important; /* white glass */
    border: 1px solid rgba(0, 0, 0, 0.08) !important;
    border-radius: 8px !important;
    height: 32px !important;
    padding: 0 12px !important;
    cursor: pointer !important;
    box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05), inset 0 1px 0 rgba(255, 255, 255, 0.8) !important;
    transition: all 150ms ease !important;
    box-sizing: border-box !important;
  }

  internal-button:hover,
  #menu-button:hover {
    background: #ffffff !important;
    border-color: rgba(0, 0, 0, 0.16) !important;
    box-shadow: 0 2px 4px rgba(0, 0, 0, 0.06), inset 0 1px 0 rgba(255, 255, 255, 0.9) !important;
  }

  /* Style the inner button inside the trigger component shadow DOM */
  internal-button::part(trigger) {
    background: transparent !important;
    border: none !important;
    padding: 0 !important;
    box-shadow: none !important;
    height: 100% !important;
    width: 100% !important;
    color: #1f2937 !important;
  }

  /* Style the trigger content text, images, and chevrons */
  .trigger-content {
    display: flex !important;
    align-items: center !important;
    gap: 8px !important;
    font-weight: 600 !important;
    font-size: 12px !important;
    color: #1f2937 !important;
    height: 100% !important;
  }

  .trigger-content img {
    width: 16px !important;
    height: 16px !important;
    border-radius: 4px !important;
  }

  .chevron {
    display: flex !important;
    align-items: center !important;
    margin-left: 4px !important;
  }

  .chevron svg {
    width: 10px !important;
    height: 10px !important;
    fill: currentColor !important;
    color: #1f2937 !important;
  }

  /* Style the menu popover box */
  .menu {
    width: 240px !important;
    min-width: 240px !important;
    max-width: 240px !important;
    padding: 10px !important;
    background: rgba(245, 245, 245, 0.85) !important; /* Dominant gray glass */
    backdrop-filter: blur(20px) saturate(120%) !important;
    -webkit-backdrop-filter: blur(20px) saturate(120%) !important;
    border: 1px solid rgba(0, 0, 0, 0.08) !important;
    border-radius: 12px !important;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.08), inset 0 1px 0 rgba(255, 255, 255, 0.6) !important;
    flex-direction: column !important;
    gap: 8px !important;
    z-index: 99999 !important;
  }

  [aria-expanded='true'] + .menu {
    display: flex !important;
  }

  .header-container {
    display: flex !important;
    align-items: center !important;
    justify-content: space-between !important;
    width: 100% !important;
    margin-bottom: 4px !important;
    padding: 0 4px !important;
  }

  .header-title {
    font-size: 10.5px !important;
    font-weight: 700 !important;
    text-transform: uppercase !important;
    letter-spacing: 0.5px !important;
    color: rgba(9, 13, 22, 0.45) !important;
    margin: 0 !important;
  }

  .accounts-container {
    width: 100% !important;
  }

  .accounts-list {
    list-style: none !important;
    padding: 0 !important;
    margin: 0 !important;
    display: flex !important;
    flex-direction: column !important;
    gap: 4px !important;
    width: 100% !important;
  }

  .accounts-list li {
    list-style: none !important;
    padding: 0 !important;
    margin: 0 !important;
    width: 100% !important;
  }

  /* Style SUI account item to look like a premium gray glass row */
  .accounts-list .container,
  .accounts-list account-menu-item .container {
    background: transparent !important;
    border: 1px solid transparent !important;
    border-radius: 8px !important;
    padding: 6px 8px !important;
    width: 100% !important;
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    justify-content: space-between !important;
    gap: 8px !important;
    transition: all 150ms ease !important;
    box-sizing: border-box !important;
  }

  .accounts-list .container[data-checked="true"],
  .accounts-list account-menu-item .container[data-checked="true"] {
    background: rgba(0, 0, 0, 0.05) !important; /* soft warm gray background instead of blue */
    border: 1px solid rgba(0, 0, 0, 0.06) !important;
  }

  .accounts-list .container:hover,
  .accounts-list account-menu-item .container:hover {
    background: rgba(0, 0, 0, 0.08) !important;
  }

  .accounts-list .container .content,
  .accounts-list account-menu-item .container .content {
    display: flex !important;
    flex-direction: row !important;
    align-items: center !important;
    gap: 8px !important;
    cursor: pointer !important;
    flex: 1 !important;
    min-width: 0 !important;
  }

  .accounts-list .container .content img,
  .accounts-list account-menu-item .container .content img {
    width: 16px !important;
    height: 16px !important;
    border-radius: 4px !important;
  }

  .account-info {
    display: flex !important;
    flex-direction: column !important;
    gap: 2px !important;
    min-width: 0 !important;
  }

  .account-title {
    font-size: 11.5px !important;
    font-weight: 600 !important;
    color: #1f2937 !important;
    white-space: nowrap !important;
    overflow: hidden !important;
    text-overflow: ellipsis !important;
    text-align: left !important;
  }

  .account-subtitle {
    display: none !important; /* Hide secondary description to keep it compact */
  }

  .copy-address-button {
    background: transparent !important;
    border: none !important;
    cursor: pointer !important;
    padding: 4px !important;
    display: inline-flex !important;
    align-items: center !important;
    justify-content: center !important;
    color: rgba(9, 13, 22, 0.45) !important;
    transition: color 150ms ease !important;
  }

  .copy-address-button:hover {
    color: rgba(9, 13, 22, 0.8) !important;
  }

  .copy-address-button svg {
    width: 13px !important;
    height: 13px !important;
    fill: currentColor !important;
  }

  .radio-input {
    display: none !important;
  }

  /* Disconnect button */
  .disconnect-button {
    background: rgba(220, 38, 38, 0.06) !important;
    border: 1px solid rgba(220, 38, 38, 0.12) !important;
    border-radius: 8px !important;
    color: #dc2626 !important;
    font-size: 11.5px !important;
    font-weight: 600 !important;
    padding: 0 12px !important;
    height: 30px !important;
    display: flex !important;
    align-items: center !important;
    justify-content: center !important;
    gap: 6px !important;
    cursor: pointer !important;
    transition: all 150ms ease !important;
    width: 100% !important;
    box-sizing: border-box !important;
  }

  .disconnect-button:hover {
    background: rgba(220, 38, 38, 0.1) !important;
    border-color: rgba(220, 38, 38, 0.2) !important;
  }

  .disconnect-button svg {
    width: 12px !important;
    height: 12px !important;
    fill: currentColor !important;
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
    const applyToButton = () => {
      const buttonRoot = (button as HTMLElement).shadowRoot;
      if (!buttonRoot) {
        return false;
      }

      // Inject styles for the button itself
      ensureShadowStyle(buttonRoot, "button", WALLET_BUTTON_STYLE);

      if (!observedRoots.has(buttonRoot)) {
        const observer = new MutationObserver(() => applyWalletOverlayStyles(scope));
        observer.observe(buttonRoot, { childList: true, subtree: true });
        observedRoots.add(buttonRoot);
      }

      // Polling check for connect modals inside buttonRoot shadow DOM
      buttonRoot.querySelectorAll("mysten-dapp-kit-connect-modal").forEach((modal) => {
        const applyToModal = () => {
          const modalRoot = (modal as HTMLElement).shadowRoot;
          if (!modalRoot) return false;
          ensureShadowStyle(modalRoot, "modal", WALLET_MODAL_STYLE);
          return true;
        };

        if (!applyToModal()) {
          let count = 0;
          const interval = setInterval(() => {
            if (applyToModal() || ++count > 50) {
              clearInterval(interval);
            }
          }, 16);
        }
      });

      // Polling check for connected account menus inside buttonRoot shadow DOM
      buttonRoot.querySelectorAll("connected-account-menu").forEach((menu) => {
        const applyToMenu = () => {
          const menuRoot = (menu as HTMLElement).shadowRoot;
          if (!menuRoot) return false;
          ensureShadowStyle(menuRoot, "menu", WALLET_MENU_STYLE);
          observeConnectedAccountMenu(menuRoot);
          return true;
        };

        if (!applyToMenu()) {
          let count = 0;
          const interval = setInterval(() => {
            if (applyToMenu() || ++count > 50) {
              clearInterval(interval);
            }
          }, 16);
        }
      });

      return true;
    };

    if (!applyToButton()) {
      let count = 0;
      const interval = setInterval(() => {
        if (applyToButton() || ++count > 50) {
          clearInterval(interval);
        }
      }, 16);
    }
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
