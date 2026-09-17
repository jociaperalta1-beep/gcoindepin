import "@/lib/buffer-polyfill";
import { useConnection, useWallet } from "@solana/wallet-adapter-react";
import { LAMPORTS_PER_SOL, PublicKey } from "@solana/web3.js";
import { useQuery } from "@tanstack/react-query";

import { GCOIN_MINT } from "@/lib/gcoin";

export function useWalletBalances() {
  const { connection } = useConnection();
  const { publicKey } = useWallet();
  const owner = publicKey?.toBase58() ?? null;

  return useQuery({
    queryKey: ["wallet-balances", owner],
    enabled: Boolean(owner),
    refetchInterval: 30_000,
    queryFn: async () => {
      if (!owner) return { sol: 0, gcoin: 0 };
      const ownerKey = new PublicKey(owner);
      const [lamports, tokenAccounts] = await Promise.all([
        connection.getBalance(ownerKey),
        connection.getParsedTokenAccountsByOwner(ownerKey, {
          mint: new PublicKey(GCOIN_MINT),
        }),
      ]);
      const gcoin = tokenAccounts.value.reduce((total, account) => {
        const parsed = account.account.data.parsed as {
          info?: { tokenAmount?: { uiAmount?: number | null } };
        };
        return total + (parsed.info?.tokenAmount?.uiAmount ?? 0);
      }, 0);
      return { sol: lamports / LAMPORTS_PER_SOL, gcoin };
    },
  });
}
