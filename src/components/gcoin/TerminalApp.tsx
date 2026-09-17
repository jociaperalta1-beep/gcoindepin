import "@/lib/buffer-polyfill";
import { Dashboard } from "./Dashboard";
import { ErrorBoundary } from "./ErrorBoundary";
import { SolanaProvider } from "./SolanaProvider";

function Fallback() {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-4 text-center">
      <div className="max-w-sm space-y-3">
        <p className="font-display text-sm font-bold uppercase tracking-[0.3em] text-primary">
          GCOIN
        </p>
        <p className="text-sm text-muted-foreground">
          La terminal tuvo un problema al mostrarse. Recargá la página para volver a intentarlo.
        </p>
        <button
          type="button"
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-4 py-2 text-xs font-bold uppercase tracking-widest text-primary-foreground"
        >
          Recargar
        </button>
      </div>
    </div>
  );
}

export default function TerminalApp() {
  return (
    <ErrorBoundary label="TerminalApp" fallback={<Fallback />}>
      <SolanaProvider>
        <Dashboard />
      </SolanaProvider>
    </ErrorBoundary>
  );
}
