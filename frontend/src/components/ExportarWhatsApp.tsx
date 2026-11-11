import { useRef, useState } from "react";
import api from "../api/client";
import { getErrorMessage } from "../api/errors";
import { Modal } from "./Modal";
import { Periodo, toQueryDate } from "../utils/period";

const LIMITE_LINK_WHATSAPP = 8000;

interface Props {
  rota: string;
  periodo: Periodo;
  rotulo?: string;
  titulo?: string;
  className?: string;
}

export function ExportarWhatsApp({
  rota,
  periodo,
  rotulo = "Exportar para WhatsApp",
  titulo = "Texto para WhatsApp",
  className = "",
}: Props) {
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState("");
  const [texto, setTexto] = useState<string | null>(null);
  const [aviso, setAviso] = useState("");
  const areaRef = useRef<HTMLTextAreaElement>(null);

  async function gerar() {
    setErro("");
    setAviso("");
    setCarregando(true);
    try {
      const res = await api.get<{ texto: string }>(rota, {
        params: {
          start: toQueryDate(periodo.start),
          end: toQueryDate(periodo.end),
        },
      });
      setTexto(res.data.texto);
    } catch (err) {
      setErro(getErrorMessage(err, "Não foi possível gerar o texto."));
    } finally {
      setCarregando(false);
    }
  }

  async function copiar() {
    if (texto === null) return;
    try {
      await navigator.clipboard.writeText(texto);
      setAviso("Copiado! Agora é só colar no WhatsApp.");
    } catch {
      areaRef.current?.focus();
      areaRef.current?.select();
      setAviso(
        'Não deu para copiar sozinho. O texto está selecionado: use "Copiar" do seu aparelho.',
      );
    }
  }

  const codificado = texto === null ? "" : encodeURIComponent(texto);
  const linkWhatsApp =
    texto !== null && codificado.length <= LIMITE_LINK_WHATSAPP
      ? `https://wa.me/?text=${codificado}`
      : null;

  return (
    <>
      <button
        onClick={gerar}
        disabled={carregando}
        className={`w-full bg-surface text-ink text-sm font-medium rounded-card px-4 py-2.5 disabled:opacity-50 ${className}`}
      >
        {carregando ? "Gerando texto..." : `📲 ${rotulo}`}
      </button>
      {erro && <p className="text-xs text-coral-dark mt-1">{erro}</p>}

      {texto !== null && (
        <Modal
          title={titulo}
          onClose={() => {
            setTexto(null);
            setAviso("");
          }}
        >
          <textarea
            ref={areaRef}
            readOnly
            value={texto}
            className="w-full h-64 text-xs bg-surface rounded-card p-3 mb-3 font-mono"
            aria-label="Texto do fechamento"
          />
          {aviso && <p className="text-xs text-sea mb-3">{aviso}</p>}
          <div className="flex gap-3">
            <button
              onClick={copiar}
              className="flex-1 bg-teal text-white text-sm font-medium rounded-card px-4 py-2.5"
            >
              Copiar texto
            </button>
            {linkWhatsApp && (
              <a
                href={linkWhatsApp}
                target="_blank"
                rel="noopener noreferrer"
                className="flex-1 text-center bg-sea-light text-sea text-sm font-medium rounded-card px-4 py-2.5"
              >
                Enviar pelo WhatsApp
              </a>
            )}
          </div>
          {!linkWhatsApp && (
            <p className="text-xs text-ink-soft mt-3">
              O texto é longo para abrir direto no WhatsApp. Use "Copiar texto"
              e cole na conversa.
            </p>
          )}
        </Modal>
      )}
    </>
  );
}
