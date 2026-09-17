import {
  BadgeCheck,
  Coins,
  Cpu,
  Download,
  Droplets,
  FileText,
  Globe2,
  KeyRound,
  Radio,
  Wallet,
} from "lucide-react";
import { useMemo, useState } from "react";

import whitepaperAsset from "@/assets/gcoin-whitepaper.pdf.asset.json";
import { GCOIN_SYMBOL, formatNumber, formatUsd } from "@/lib/gcoin";

const ROYALTY_RATE = 0.005; // 0.5% perpetuo para el creador

export function WhitepaperPanel({ volume24hUsd }: { volume24hUsd: number }) {
  // Simulación interactiva de nodo: el usuario ajusta megas compartidos y uptime.
  const [sharedGb, setSharedGb] = useState(120);
  const [uptime, setUptime] = useState(96);

  const rewards = useMemo(() => {
    const points = sharedGb * (uptime / 100);
    return { points, tokens: points * 42 };
  }, [sharedGb, uptime]);

  const royalties = useMemo(() => {
    const daily = volume24hUsd * ROYALTY_RATE;
    return { daily, monthly: daily * 30, yearly: daily * 365 };
  }, [volume24hUsd]);

  return (
    <div className="space-y-4 p-4 text-[12px] leading-5 text-muted-foreground">
      <header className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h3 className="font-display text-lg font-bold text-foreground">
            Proyecto Tecnológico · Whitepaper DePIN
          </h3>
          <p className="text-[10px] uppercase tracking-[0.3em] text-muted-foreground">
            Red global descentralizada de conectividad · $GCOIN
          </p>
        </div>
        <div className="flex gap-2">
          <a
            href={whitepaperAsset.url}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-1.5 rounded-md border border-border px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-foreground hover:border-primary"
          >
            <FileText className="size-3.5" /> Ver documento
          </a>
          <a
            href={whitepaperAsset.url}
            download="GCOIN-Whitepaper-DePIN.pdf"
            className="flex items-center gap-1.5 rounded-md bg-primary px-3 py-2 text-[10px] font-bold uppercase tracking-widest text-primary-foreground"
          >
            <Download className="size-3.5" /> Descargar PDF
          </a>
        </div>
      </header>

      <Section icon={Globe2} title="1. Resumen ejecutivo">
        <p>
          GCOIN (GUARANI COIN) es un activo digital creado bajo el marco DePIN. Cualquier persona en
          el mundo puede monetizar el ancho de banda residencial que le sobra, compartiéndolo de
          forma pasiva a cambio de recompensas automáticas en {GCOIN_SYMBOL}.
        </p>
      </Section>

      <Section icon={BadgeCheck} title="2. Estado actual · Fase 1 completada">
        <ul className="list-disc space-y-1 pl-4">
          <li>Contrato maestro desplegado, verificado y registrado de forma inmutable en la blockchain.</li>
          <li>Gobernanza y perfil de administrador operativos bajo la billetera oficial del fundador.</li>
        </ul>
      </Section>

      <Section icon={Cpu} title="3. Arquitectura de plataforma · Fase 2">
        <div className="grid gap-2 sm:grid-cols-3">
          <Pillar icon={Wallet} title="Autenticación Web3">
            Ingreso en un clic vinculando la billetera (Phantom, Solflare), sin contraseñas.
          </Pillar>
          <Pillar icon={Radio} title="Conectividad pasiva">
            Script liviano que mide y valida uptime y megabytes compartidos en segundo plano.
          </Pillar>
          <Pillar icon={KeyRound} title="Distribución automatizada">
            Pagos periódicos por smart contract directo a la billetera de cada nodo, según puntaje.
          </Pillar>
        </div>

        <div className="mt-3 rounded-md border border-border bg-background/50 p-3">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Simulación interactiva de nodo
          </p>
          <label className="mt-2 block text-[11px]">
            Ancho de banda compartido: <span className="text-foreground">{sharedGb} GB / mes</span>
            <input
              type="range"
              min={10}
              max={1000}
              step={10}
              value={sharedGb}
              onChange={(event) => setSharedGb(Number(event.target.value))}
              className="mt-1 w-full accent-primary"
            />
          </label>
          <label className="mt-2 block text-[11px]">
            Uptime del nodo: <span className="text-foreground">{uptime}%</span>
            <input
              type="range"
              min={50}
              max={100}
              value={uptime}
              onChange={(event) => setUptime(Number(event.target.value))}
              className="mt-1 w-full accent-primary"
            />
          </label>
          <div className="mt-3 grid grid-cols-2 gap-2">
            <Stat label="Puntos de red" value={formatNumber(rewards.points, 1)} />
            <Stat label={`Recompensa estimada`} value={`${formatNumber(rewards.tokens, 0)} ${GCOIN_SYMBOL}`} />
          </div>
          <p className="mt-2 text-[10px] text-muted-foreground">
            Estimación demostrativa del modelo de recompensas; no representa pagos garantizados.
          </p>
        </div>
      </Section>

      <Section icon={Globe2} title="4. Modelo de licencia y transferencia global">
        <p>
          El creador entrega la arquitectura completa del negocio, la identidad de marca y el token
          maestro desplegado en formato «Turnkey Product». El inversor o consorcio adquirente asume
          el 100% de la propiedad operativa y financia el desarrollo técnico global, la ingeniería
          de backend y el escalado de servidores.
        </p>
      </Section>

      <Section icon={Droplets} title="5. Compromiso de inyección de liquidez">
        <p>
          El adquirente se compromete a inyectar capital de respaldo directamente en el pool de
          liquidez descentralizado del token, para estabilizar el mercado y atraer usuarios e
          inversores internacionales.
        </p>
      </Section>

      <Section icon={Coins} title="6. Módulo de regalías del creador · 0,5% perpetuo">
        <p>
          Cada compra, venta o swap de {GCOIN_SYMBOL} en el mundo activa una regalía automática del
          0,5% que la blockchain enruta en tiempo real a la billetera maestra del fundador. Es
          ingreso pasivo perpetuo indexado al volumen global.
        </p>
        <div className="mt-3 grid gap-2 sm:grid-cols-4">
          <Stat label="Volumen global 24h" value={formatUsd(volume24hUsd)} />
          <Stat label="Regalía 24h (0,5%)" value={formatUsd(royalties.daily)} />
          <Stat label="Proyección 30 días" value={formatUsd(royalties.monthly)} />
          <Stat label="Proyección anual" value={formatUsd(royalties.yearly)} />
        </div>
        <p className="mt-2 text-[10px] text-muted-foreground">
          Monitoreo pasivo dirigido a la billetera oficial del fundador. Los valores se recalculan
          con el volumen de mercado en vivo.
        </p>
      </Section>
    </div>
  );
}

function Section({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Globe2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-md border border-border bg-background/40 p-3">
      <h4 className="flex items-center gap-2 font-display text-sm font-bold text-foreground">
        <Icon className="size-4 text-primary" /> {title}
      </h4>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function Pillar({
  icon: Icon,
  title,
  children,
}: {
  icon: typeof Globe2;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="rounded-md border border-border bg-panel p-2.5">
      <p className="flex items-center gap-1.5 text-[11px] font-bold text-foreground">
        <Icon className="size-3.5 text-accent" /> {title}
      </p>
      <p className="mt-1 text-[11px]">{children}</p>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md border border-border bg-panel p-2.5">
      <p className="text-[9px] uppercase tracking-widest text-muted-foreground">{label}</p>
      <p className="mt-1 font-display text-sm font-bold tabular-nums text-foreground">{value}</p>
    </div>
  );
}
