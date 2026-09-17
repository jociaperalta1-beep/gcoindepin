import "@/lib/buffer-polyfill";
import { useWallet } from "@solana/wallet-adapter-react";
import { SendHorizonal } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { formatTime, shortAddress } from "@/lib/gcoin";
import { cn } from "@/lib/utils";

type ChatMessage = {
  id: string;
  author: string;
  text: string;
  timestamp: number;
  own?: boolean;
};

const SEED: Array<[string, string]> = [
  ["jaguarete_py", "Che ra'a, GCOIN es el primer token DePIN pensado desde Paraguay 🇵🇾"],
  ["asu_node", "Ya tenemos 38 nodos activos entre Asunción, Ciudad del Este y Encarnación"],
  ["itaipu_dev", "La energía de Itaipú hace que minar y correr nodos acá sea rentable de verdad"],
  ["guarani_hodl", "Soporte fuerte en el mínimo de ayer, no vendan el piso 🚀"],
  ["depin_lat", "Interesante la integración con Solana: fees bajísimas para micro pagos"],
  ["mbarete", "Quien sumó nodo esta semana? Estoy armando uno en Luque"],
];

const INCOMING: Array<[string, string]> = [
  ["chipa_trader", "Volumen subiendo en el gráfico de 5m 👀"],
  ["depin_lat", "Nuevo nodo sincronizado en Encarnación, ya somos más red"],
  ["guarani_hodl", "Compré otro poco en la caída, GCOIN largo plazo"],
  ["asu_node", "Recuerden verificar siempre el mint oficial antes de comprar"],
  ["mbarete", "La comunidad paraguaya está fuerte hoy 🔥"],
  ["itaipu_dev", "Energía limpia + Solana = DePIN rentable en el Cono Sur"],
];

function avatarColor(name: string) {
  const hue = [...name].reduce((sum, char) => sum + char.charCodeAt(0), 0) % 360;
  return `oklch(0.62 0.16 ${hue})`;
}

const CHAT_STORAGE_KEY = "gcoin_community_chat_v1";

function seedMessages(): ChatMessage[] {
  return SEED.map(([author, text], index) => ({
    id: `seed-${index}`,
    author,
    text,
    timestamp: Date.now() - (SEED.length - index) * 4 * 60_000,
  }));
}

function loadMessages(): ChatMessage[] {
  if (typeof window === "undefined") return seedMessages();
  try {
    const raw = window.localStorage.getItem(CHAT_STORAGE_KEY);
    if (!raw) return seedMessages();
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return seedMessages();
    const valid = parsed.filter(
      (item): item is ChatMessage =>
        !!item &&
        typeof item.id === "string" &&
        typeof item.author === "string" &&
        typeof item.text === "string" &&
        typeof item.timestamp === "number",
    );
    return valid.length > 0 ? valid.slice(-100) : seedMessages();
  } catch {
    return seedMessages();
  }
}

export function CommunityChat() {
  const { publicKey, connected } = useWallet();
  const [messages, setMessages] = useState<ChatMessage[]>(loadMessages);
  const [draft, setDraft] = useState("");
  const listRef = useRef<HTMLDivElement>(null);
  const cursor = useRef(0);

  useEffect(() => {
    const timer = setInterval(() => {
      const entry = INCOMING[cursor.current % INCOMING.length]!;
      cursor.current += 1;
      setMessages((prev) => [
        ...prev.slice(-60),
        {
          id: `live-${Date.now()}`,
          author: entry[0],
          text: entry[1],
          timestamp: Date.now(),
        },
      ]);
    }, 22_000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    try {
      window.localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-100)));
    } catch {
      // almacenamiento lleno o no disponible: el chat sigue funcionando en memoria
    }
  }, [messages]);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
  }, [messages]);

  function send() {
    const text = draft.trim();
    if (!text) return;
    setMessages((prev) => [
      ...prev,
      {
        id: `own-${Date.now()}`,
        author:
          connected && publicKey ? shortAddress(publicKey.toBase58(), 4) : "vos (invitado)",
        text,
        timestamp: Date.now(),
        own: true,
      },
    ]);
    setDraft("");
  }

  return (
    <section className="panel-surface flex flex-col overflow-hidden">
      <header className="flex items-center justify-between border-b border-border px-4 py-3">
        <h2 className="text-[10px] font-bold uppercase tracking-[0.3em] text-muted-foreground">
          Chat comunitario
        </h2>
        <span className="flex items-center gap-1.5 text-[10px] uppercase tracking-widest text-bull">
          <span className="size-1.5 animate-pulse rounded-full bg-bull" /> en vivo
        </span>
      </header>

      <div ref={listRef} className="max-h-[320px] min-h-[240px] space-y-3 overflow-y-auto px-4 py-3">
        {messages.map((message) => (
          <article key={message.id} className="flex gap-2.5">
            <span
              className="mt-0.5 flex size-7 shrink-0 items-center justify-center rounded-md text-[11px] font-bold text-background"
              style={{ backgroundColor: avatarColor(message.author) }}
              aria-hidden="true"
            >
              {message.author.slice(0, 2).toUpperCase()}
            </span>
            <div className="min-w-0">
              <p className="flex items-baseline gap-2">
                <span
                  className={cn(
                    "text-[11px] font-bold",
                    message.own ? "text-primary" : "text-foreground",
                  )}
                >
                  {message.author}
                </span>
                <span className="text-[10px] tabular-nums text-muted-foreground">
                  {formatTime(message.timestamp)}
                </span>
              </p>
              <p className="text-[12px] leading-5 text-muted-foreground">{message.text}</p>
            </div>
          </article>
        ))}
      </div>

      <form
        className="flex items-center gap-2 border-t border-border p-3"
        onSubmit={(event) => {
          event.preventDefault();
          send();
        }}
      >
        <input
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          placeholder="Escribí tu mensaje a la comunidad…"
          aria-label="Mensaje para el chat comunitario"
          className="w-full rounded-md border border-border bg-background/60 px-3 py-2 text-xs text-foreground outline-none placeholder:text-muted-foreground focus:border-primary"
        />
        <button
          type="submit"
          aria-label="Enviar mensaje"
          className="rounded-md bg-primary p-2.5 text-primary-foreground transition-transform hover:scale-105"
        >
          <SendHorizonal className="size-4" />
        </button>
      </form>
    </section>
  );
}
