import { useSyncExternalStore } from "react";
import { assinar, estaAcordando } from "../api/serverWake";

export function ServerWakingBanner() {
  const acordando = useSyncExternalStore(assinar, estaAcordando, estaAcordando);
  if (!acordando) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-0 inset-x-0 z-50 bg-coral text-white text-sm text-center px-4 py-2.5 shadow"
    >
      <span className="font-medium">Acordando o servidor…</span> Na primeira
      vez do dia pode levar até 1 minuto. Não precisa recarregar a página.
    </div>
  );
}
