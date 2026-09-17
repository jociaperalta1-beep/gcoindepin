import "@/lib/buffer-polyfill";
import { PhantomWalletAdapter } from "@solana/wallet-adapter-phantom";
import { ConnectionProvider, WalletProvider } from "@solana/wallet-adapter-react";
import { SolflareWalletAdapter } from "@solana/wallet-adapter-solflare";
import { useQuery } from "@tanstack/react-query";
import { useCallback, useMemo, useState, type ReactNode } from "react";

import { RpcHealthProvider } from "./RpcHealth";
import { RPC_FALLBACKS, SOLANA_RPC_URL } from "@/lib/gcoin";
import { getRpcEndpoint } from "@/lib/gcoin.functions";

/**
 * Proveedor nativo de Solana. No hay MetaMask ni redes EVM en esta app:
 * solo billeteras Solana (Phantom, Solflare y cualquier wallet compatible
 * con el estándar Wallet Standard que el usuario tenga instalada).
 *
 * El endpoint RPC principal se resuelve en el servidor (secreto RPC_URL en
 * producción) y hay endpoints públicos de respaldo con failover automático.
 */
export function SolanaProvider({ children }: { children: ReactNode }) {
  const wallets = useMemo(() => [new PhantomWalletAdapter(), new SolflareWalletAdapter()], []);
  const [failoverIndex, setFailoverIndex] = useState(0);

  const endpointQuery = useQuery({
    queryKey: ["rpc-endpoint"],
    queryFn: () => getRpcEndpoint(),
    staleTime: Infinity,
    retry: 3,
    retryDelay: (attempt) => Math.min(8000, 500 * 2 ** attempt),
  });

  const endpoints = useMemo(() => {
    const list = [endpointQuery.data ?? SOLANA_RPC_URL, ...RPC_FALLBACKS];
    return Array.from(new Set(list.filter(Boolean)));
  }, [endpointQuery.data]);

  const endpoint = endpoints[failoverIndex % endpoints.length] ?? SOLANA_RPC_URL;

  const handleFailover = useCallback(() => {
    setFailoverIndex((index) => index + 1);
  }, []);

  return (
    <ConnectionProvider
      key={endpoint}
      endpoint={endpoint}
      config={{ commitment: "confirmed", confirmTransactionInitialTimeout: 90_000 }}
    >
      <WalletProvider wallets={wallets} autoConnect>
        <RpcHealthProvider endpoint={endpoint} onFailover={handleFailover}>
          {children}
        </RpcHealthProvider>
      </WalletProvider>
    </ConnectionProvider>
  );
}
