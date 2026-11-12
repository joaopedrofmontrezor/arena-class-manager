import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  ReactNode,
} from "react";

export type TipoAviso = "sucesso" | "erro";

export interface OpcoesConfirmacao {
  titulo: string;
  mensagem?: string;

  confirmar?: string;

  perigo?: boolean;
}

interface FeedbackValue {
  confirmar: (opcoes: OpcoesConfirmacao) => Promise<boolean>;

  avisar: (mensagem: string, tipo?: TipoAviso) => void;
}

const FeedbackContext = createContext<FeedbackValue | undefined>(undefined);

export const DURACAO_AVISO_MS = 4000;

interface Pendente {
  opcoes: OpcoesConfirmacao;
  resolver: (valor: boolean) => void;
}

export function FeedbackProvider({ children }: { children: ReactNode }) {
  const [pendente, setPendente] = useState<Pendente | null>(null);
  const [aviso, setAviso] = useState<{
    id: number;
    mensagem: string;
    tipo: TipoAviso;
  } | null>(null);
  const timer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const contador = useRef(0);

  const confirmar = useCallback(
    (opcoes: OpcoesConfirmacao) =>
      new Promise<boolean>((resolver) => {
        setPendente((anterior) => {
          anterior?.resolver(false);
          return { opcoes, resolver };
        });
      }),
    [],
  );

  const avisar = useCallback(
    (mensagem: string, tipo: TipoAviso = "sucesso") => {
      contador.current += 1;
      setAviso({ id: contador.current, mensagem, tipo });
      if (timer.current) clearTimeout(timer.current);
      timer.current = setTimeout(() => setAviso(null), DURACAO_AVISO_MS);
    },
    [],
  );

  useEffect(
    () => () => {
      if (timer.current) clearTimeout(timer.current);
    },
    [],
  );

  function responder(valor: boolean) {
    pendente?.resolver(valor);
    setPendente(null);
  }

  useEffect(() => {
    if (!pendente) return;
    function aoTeclar(e: KeyboardEvent) {
      if (e.key === "Escape") {
        pendente?.resolver(false);
        setPendente(null);
      }
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [pendente]);

  return (
    <FeedbackContext.Provider value={{ confirmar, avisar }}>
      {children}

      {pendente && (
        <div
          className="fixed inset-0 bg-black/50 z-40 flex items-center justify-center px-5"
          onClick={() => responder(false)}
        >
          <div
            role="alertdialog"
            aria-modal="true"
            aria-labelledby="confirmacao-titulo"
            className="bg-page w-full max-w-sm rounded-card p-5 shadow-xl"
            onClick={(e) => e.stopPropagation()}
          >
            <p
              id="confirmacao-titulo"
              className="font-display font-semibold text-lg mb-2"
            >
              {pendente.opcoes.titulo}
            </p>
            {pendente.opcoes.mensagem && (
              <p className="text-sm text-ink-soft whitespace-pre-line mb-5">
                {pendente.opcoes.mensagem}
              </p>
            )}
            <div className="flex gap-3">
              <button
                autoFocus
                onClick={() => responder(false)}
                className="flex-1 bg-surface text-ink font-medium rounded-lg py-2.5 text-sm"
              >
                Cancelar
              </button>
              <button
                onClick={() => responder(true)}
                className={`flex-1 text-white font-medium rounded-lg py-2.5 text-sm ${
                  pendente.opcoes.perigo ? "bg-coral-dark" : "bg-teal"
                }`}
              >
                {pendente.opcoes.confirmar ?? "Confirmar"}
              </button>
            </div>
          </div>
        </div>
      )}

      {aviso && (
        <div
          key={aviso.id}
          role={aviso.tipo === "erro" ? "alert" : "status"}
          className="fixed bottom-24 inset-x-0 z-50 flex justify-center px-4 pointer-events-none"
        >
          <p
            className={`pointer-events-auto max-w-sm w-full text-sm font-medium text-white rounded-card px-4 py-3 shadow-lg ${
              aviso.tipo === "erro" ? "bg-coral-dark" : "bg-teal"
            }`}
          >
            {aviso.tipo === "sucesso" ? "✓ " : ""}
            {aviso.mensagem}
          </p>
        </div>
      )}
    </FeedbackContext.Provider>
  );
}

export function useFeedback() {
  const ctx = useContext(FeedbackContext);
  if (!ctx)
    throw new Error("useFeedback deve ser usado dentro de <FeedbackProvider>");
  return ctx;
}
