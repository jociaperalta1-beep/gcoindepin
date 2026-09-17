import { ClientOnly, createFileRoute } from "@tanstack/react-router";
import { lazy, Suspense } from "react";

const TerminalApp = lazy(() => import("@/components/gcoin/TerminalApp"));

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "GCOIN (GUARANI COIN) | Terminal Solana" },
      { name: "description", content: "Terminal en vivo de GCOIN: mercado, velas, swaps Jupiter, actividad y billeteras Solana." },
      { property: "og:title", content: "GCOIN (GUARANI COIN) | Terminal Solana" },
      { property: "og:description", content: "Mercado, swaps Jupiter y actividad on-chain de GCOIN en Solana." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary_large_image" },
    ],
  }),
  component: Index,
});

function Index() {
  return (
    <ClientOnly fallback={<div className="min-h-screen bg-background" />}>
      <Suspense fallback={<div className="min-h-screen bg-background" />}>
        <TerminalApp />
      </Suspense>
    </ClientOnly>
  );
}
