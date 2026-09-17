import { Component, type ErrorInfo, type ReactNode } from "react";

type Props = {
  children: ReactNode;
  /** Etiqueta para identificar el bloque en la consola. */
  label?: string;
  /** Qué mostrar si el bloque falla. Por defecto no muestra nada. */
  fallback?: ReactNode;
};

type State = { hasError: boolean };

/**
 * Aísla fallos de componentes secundarios (anuncios, paneles, widgets) para que
 * nunca desmonten el dashboard ni lleguen al ErrorComponent de la raíz.
 */
export class ErrorBoundary extends Component<Props, State> {
  override state: State = { hasError: false };

  static getDerivedStateFromError(): State {
    return { hasError: true };
  }

  override componentDidCatch(error: Error, info: ErrorInfo) {
    console.warn(`[GCOIN] Bloque aislado con error (${this.props.label ?? "desconocido"})`, error, info.componentStack);
  }

  override render() {
    if (this.state.hasError) return this.props.fallback ?? null;
    return this.props.children;
  }
}
