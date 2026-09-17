import { BadgeCheck, Send } from "lucide-react";

import { ParaguayMap } from "./ParaguayMap";
import adminAvatar from "@/assets/gcoin-admin.jpg";
import officialCoin from "@/assets/gcoin-official-coin.jpeg.asset.json";
import { PUMPFUN_URL, shortAddress, GCOIN_MINT } from "@/lib/gcoin";

const SOCIALS = [
  {
    label: "Telegram",
    href: "https://t.me/gcoinguarani",
    icon: <Send className="size-4" />,
  },
  {
    label: "X / Twitter",
    href: "https://x.com/gcoinguarani",
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
        <path d="M18.9 2H22l-7.2 8.2L23.3 22h-6.6l-5.2-6.8L5.5 22H2.4l7.7-8.8L1 2h6.8l4.7 6.2L18.9 2Zm-1.1 18h1.7L7.3 3.8H5.5L17.8 20Z" />
      </svg>
    ),
  },
  {
    label: "Pump.fun",
    href: PUMPFUN_URL,
    icon: (
      <svg viewBox="0 0 24 24" className="size-4" fill="currentColor" aria-hidden="true">
        <path d="M14.5 2a7.5 7.5 0 0 1 5.3 12.8l-9.6 9.6a4.5 4.5 0 0 1-6.4-6.4l9.6-9.6A7.4 7.4 0 0 1 14.5 2Zm-2.3 6.6-6 6a2.5 2.5 0 0 0 3.5 3.5l6-6-3.5-3.5Z" />
      </svg>
    ),
  },
];

export function AdminProfile() {
  return (
    <section className="panel-surface overflow-hidden">
      <div className="relative h-32 overflow-hidden bg-secondary">
        <img
          src={officialCoin.url}
          alt="Moneda oficial GCOIN con escudo de Paraguay"
          className="h-full w-full object-cover opacity-70"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-panel via-transparent to-transparent" />
        <ParaguayMap className="absolute right-3 top-1/2 h-20 -translate-y-1/2 opacity-70" />
      </div>

      <div className="-mt-10 px-4 pb-4">
        <img
          src={adminAvatar}
          alt="Avatar de GCOIN_Admin"
          width={80}
          height={80}
          loading="lazy"
          className="size-20 rounded-lg border-2 border-border object-cover"
        />
        <div className="mt-3 flex items-center gap-2">
          <h2 className="font-display text-lg font-bold text-foreground">GCOIN_Admin</h2>
          <BadgeCheck className="size-4 text-primary" />
          <span className="rounded border border-accent/50 bg-accent/10 px-2 py-0.5 text-[10px] font-bold uppercase tracking-widest text-accent">
            Creador
          </span>
        </div>
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">
          Impulsando la infraestructura DePIN del Paraguay desde Asunción. GCOIN (GUARANI COIN) es la
          moneda comunitaria del jaguareté: energía limpia, red distribuida y soberanía digital
          guaraní. Ñañemomba'e ñande retãre.
        </p>

        <div className="mt-3 flex flex-wrap gap-2">
          {SOCIALS.map((social) => (
            <a
              key={social.label}
              href={social.href}
              target="_blank"
              rel="noreferrer"
              className="flex items-center gap-2 rounded-md border border-border bg-secondary/40 px-3 py-2 text-[11px] font-semibold text-foreground transition-colors hover:border-primary hover:bg-secondary"
            >
              {social.icon}
              {social.label}
            </a>
          ))}
        </div>

        <dl className="mt-4 grid grid-cols-3 gap-2 text-center">
          {[
            { label: "Comunidad", value: "12.4K" },
            { label: "Red DePIN", value: "38 nodos" },
            { label: "País", value: "🇵🇾 PY" },
          ].map((stat) => (
            <div key={stat.label} className="rounded-md border border-border bg-background/40 py-2">
              <dt className="text-[9px] uppercase tracking-widest text-muted-foreground">
                {stat.label}
              </dt>
              <dd className="text-xs font-bold text-foreground">{stat.value}</dd>
            </div>
          ))}
        </dl>

        <p className="mt-3 break-all rounded-md border border-border bg-background/40 p-2 text-[10px] text-muted-foreground">
          Mint oficial: <span className="text-foreground">{shortAddress(GCOIN_MINT, 8)}</span>
        </p>
      </div>
    </section>
  );
}
