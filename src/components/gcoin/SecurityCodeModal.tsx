import { KeyRound, ShieldCheck, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";

import { generateSecurityCode } from "@/lib/platform";
import { cn } from "@/lib/utils";

/**
 * Verificación en dos pasos (2FA) previa a cualquier operación crítica.
 * El código se genera en el dispositivo y debe reescribirse para confirmar.
 */
export function SecurityCodeModal({
  open,
  title,
  summary,
  onCancel,
  onVerified,
}: {
  open: boolean;
  title: string;
  summary: string;
  onCancel: () => void;
  onVerified: () => void;
}) {
  const [code, setCode] = useState("");
  const [input, setInput] = useState("");
  const [error, setError] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!open) return;
    setCode(generateSecurityCode());
    setInput("");
    setError(null);
    const timer = setTimeout(() => inputRef.current?.focus(), 60);
    return () => clearTimeout(timer);
  }, [open]);

  if (!open) return null;

  function submit() {
    if (input.length !== 6) {
      setError("Ingresá los 6 dígitos del código.");
      return;
    }
    if (input !== code) {
      setError("El código no coincide. Verificá e intentá de nuevo.");
      return;
    }
    onVerified();
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-background/85 p-4 backdrop-blur-sm"
      role="dialog"
      aria-modal="true"
      aria-label="Verificación de seguridad"
    >
      <div className="panel-surface w-full max-w-md p-5">
        <div className="flex items-start justify-between gap-4">
          <span className="flex items-center gap-2 text-primary">
            <ShieldCheck className="size-6" />
            <span className="text-[10px] font-bold uppercase tracking-[0.25em]">
              Verificación 2FA
            </span>
          </span>
          <button
            type="button"
            onClick={onCancel}
            aria-label="Cancelar verificación"
            className="rounded-md border border-border p-1.5 text-muted-foreground hover:text-foreground"
          >
            <X className="size-4" />
          </button>
        </div>

        <h3 className="mt-4 font-display text-lg font-bold text-foreground">{title}</h3>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{summary}</p>

        <div className="mt-4 rounded-md border border-primary/40 bg-primary/5 p-3 text-center">
          <p className="text-[10px] uppercase tracking-widest text-muted-foreground">
            Código de seguridad
          </p>
          <p className="mt-1 font-display text-2xl font-bold tracking-[0.5em] text-primary">
            {code}
          </p>
        </div>

        <label className="mt-4 block text-[10px] uppercase tracking-widest text-muted-foreground">
          Reescribí el código para confirmar
        </label>
        <input
          ref={inputRef}
          value={input}
          onChange={(event) => {
            setInput(event.target.value.replace(/\D/g, "").slice(0, 6));
            setError(null);
          }}
          onKeyDown={(event) => {
            if (event.key === "Enter") submit();
          }}
          inputMode="numeric"
          placeholder="000000"
          aria-label="Código de 6 dígitos"
          className="mt-1 w-full rounded-md border border-border bg-background/50 px-3 py-3 text-center text-xl font-bold tracking-[0.5em] text-foreground outline-none focus:border-primary"
        />

        {error ? (
          <p className="mt-2 rounded border border-bear/50 bg-bear/10 px-2 py-1.5 text-[11px] font-semibold text-bear">
            {error}
          </p>
        ) : null}

        <button
          type="button"
          onClick={submit}
          className={cn(
            "mt-4 flex w-full items-center justify-center gap-2 rounded-md bg-primary py-3 text-xs font-bold uppercase tracking-widest text-primary-foreground",
          )}
        >
          <KeyRound className="size-4" /> Confirmar y continuar
        </button>
      </div>
    </div>
  );
}
