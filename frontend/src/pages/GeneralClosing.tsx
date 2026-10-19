import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { Layout } from '../components/Layout';
import { Modal } from '../components/Modal';
import { EditLessonModal } from '../components/EditLessonModal';
import { Lesson, ResumoGeral, ResumoGeralItem, ResumoProfessor } from '../types';
import { getPeriodoAtual, getPeriodoAnterior, getProximoPeriodo, toQueryDate, Periodo } from '../utils/period';

function formatBRL(value: number) {
  return value.toLocaleString('pt-BR', { style: 'currency', currency: 'BRL' });
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'UTC' });
}

export function GeneralClosing() {
  const [periodo, setPeriodo] = useState<Periodo>(getPeriodoAtual());
  const [resumo, setResumo] = useState<ResumoGeral | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const [selecionado, setSelecionado] = useState<ResumoGeralItem | null>(null);
  const [detalhe, setDetalhe] = useState<ResumoProfessor | null>(null);
  const [detalheLoading, setDetalheLoading] = useState(false);
  const [actionError, setActionError] = useState('');
  const [reloadKey, setReloadKey] = useState(0);
  const [editando, setEditando] = useState<Lesson | null>(null);

  const periodoAtual = getPeriodoAtual();
  const estaNoPeriodoAtual = toQueryDate(periodo.start) === toQueryDate(periodoAtual.start);

  useEffect(() => {
    setLoading(true);
    setError('');
    api
      .get<ResumoGeral>('/closing/general', {
        params: { start: toQueryDate(periodo.start), end: toQueryDate(periodo.end) },
      })
      .then((res) => setResumo(res.data))
      .catch((err) => setError(getErrorMessage(err)))
      .finally(() => setLoading(false));
  }, [periodo, reloadKey]);

  function carregarDetalhe(professorId: string) {
    setDetalheLoading(true);
    api
      .get<ResumoProfessor>(`/closing/professor/${professorId}`, {
        params: { start: toQueryDate(periodo.start), end: toQueryDate(periodo.end) },
      })
      .then((res) => setDetalhe(res.data))
      .finally(() => setDetalheLoading(false));
  }

  function abrirDetalhe(professor: ResumoGeralItem) {
    setSelecionado(professor);
    setActionError('');
    setDetalhe(null);
    carregarDetalhe(professor.professorId);
  }

  
  function recarregarTudo() {
    if (selecionado) carregarDetalhe(selecionado.professorId);
    setReloadKey((k) => k + 1);
  }

  async function excluirAula(aula: Lesson) {
    const aviso = estaNoPeriodoAtual
      ? ''
      : `\n\nATENÇÃO: este período (${periodo.label}) já passou. Excluir vai alterar o fechamento dele.`;
    if (
      !confirm(
        `Excluir a aula de ${selecionado?.nome} em ${formatDate(aula.date)} às ${aula.time}?${aviso}`,
      )
    )
      return;
    setActionError('');
    try {
      await api.delete(`/lessons/${aula.id}`);
      recarregarTudo();
    } catch (err) {
      setActionError(getErrorMessage(err, 'Não foi possível excluir a aula.'));
    }
  }

  return (
    <Layout>
      <div className="flex items-center justify-between mb-1">
        <button onClick={() => setPeriodo(getPeriodoAnterior(periodo))} className="text-ink-soft text-lg px-2 py-1 -ml-2">
          ◀
        </button>
        <div className="text-center">
          <p className="text-sm text-ink-soft">Fechamento geral</p>
          <p className="font-display font-semibold text-lg">{periodo.label}</p>
        </div>
        <button onClick={() => setPeriodo(getProximoPeriodo(periodo))} className="text-ink-soft text-lg px-2 py-1 -mr-2">
          ▶
        </button>
      </div>

      <div className="text-center mb-4 space-x-4">
        <Link to="/professores" className="text-xs text-coral font-medium underline">
          Gerenciar professores
        </Link>
        {!estaNoPeriodoAtual && (
          <button onClick={() => setPeriodo(periodoAtual)} className="text-xs text-coral font-medium underline">
            Voltar para o período atual
          </button>
        )}
      </div>

      {loading && <p className="text-ink-soft text-sm text-center">Carregando...</p>}
      {error && <p className="text-sm text-coral-dark text-center">{error}</p>}

      {!loading && !error && resumo && (
        <>
          <div className="bg-teal text-white rounded-card p-5 mb-3">
            <p className="text-white/70 text-sm mb-1">Total de todos os professores</p>
            <p className="font-display font-semibold text-4xl">{formatBRL(resumo.totalGeral)}</p>
          </div>

          <div className="grid grid-cols-2 gap-3 mb-6">
            <div className="bg-surface rounded-card p-4">
              <p className="text-ink-soft text-xs mb-1">Total professores</p>
              <p className="font-display font-semibold text-lg">{formatBRL(resumo.totalGeralProfessor)}</p>
            </div>
            <div className="bg-sea-light rounded-card p-4">
              <p className="text-sea text-xs mb-1">Total auxiliares</p>
              <p className="font-display font-semibold text-lg text-sea">
                {formatBRL(resumo.totalGeralAuxiliares)}
              </p>
            </div>
          </div>

          {resumo.professores.length === 0 && (
            <div className="bg-surface rounded-card p-6 text-center">
              <p className="text-ink-soft text-sm">Nenhuma movimentação neste período.</p>
            </div>
          )}

          <div className="space-y-2">
            {resumo.professores.map((p) => (
              <button
                key={p.professorId}
                onClick={() => abrirDetalhe(p)}
                className="w-full text-left bg-surface rounded-card px-4 py-3.5 hover:bg-black/[0.02] transition-colors"
              >
                <div className="flex items-center justify-between">
                  <p className="font-medium text-sm flex items-center gap-1.5">
                    {p.nome}
                    {!p.ativo && (
                      <span className="text-[10px] font-normal text-ink-soft bg-black/5 px-1.5 py-0.5 rounded">
                        desligado
                      </span>
                    )}
                  </p>
                  <p className="font-display font-semibold text-lg">{formatBRL(p.totalReceber)}</p>
                </div>
                <p className="text-xs text-ink-soft mt-0.5">
                  {p.totalAulas} aulas · auxiliar: {formatBRL(p.valorComoAuxiliar)}
                </p>
              </button>
            ))}
          </div>
        </>
      )}

      {selecionado && (
        <Modal title={selecionado.nome} onClose={() => setSelecionado(null)}>
          {detalheLoading && <p className="text-ink-soft text-sm">Carregando...</p>}

          {actionError && <p className="text-sm text-coral-dark mb-3">{actionError}</p>}

          {!detalheLoading && detalhe && (
            <>
              <div className="grid grid-cols-2 gap-3 mb-5">
                <div className="bg-surface rounded-card p-4">
                  <p className="text-ink-soft text-xs mb-1">Turmas</p>
                  <p className="font-display font-semibold text-xl">{detalhe.totalTurmas}</p>
                </div>
                <div className="bg-surface rounded-card p-4">
                  <p className="text-ink-soft text-xs mb-1">Personais</p>
                  <p className="font-display font-semibold text-xl">{detalhe.totalPersonais}</p>
                </div>
              </div>

              {detalhe.aulas.length > 0 ? (
                <div className="space-y-2">
                  {detalhe.aulas.map((a) => (
                    <div key={a.id} className="bg-surface rounded-card px-4 py-3">
                      <div className="flex items-center justify-between">
                        <p className="text-sm font-medium">
                          {formatDate(a.date)} · {a.time}
                        </p>
                        <p className="text-sm font-semibold">{formatBRL(Number(a.professorValue))}</p>
                      </div>
                      <div className="flex items-center gap-2 mt-1">
                        <span
                          className={`text-xs font-medium px-2 py-0.5 rounded-full ${
                            a.type === 'TURMA' ? 'bg-sand text-ink' : 'bg-sea-light text-sea'
                          }`}
                        >
                          {a.type === 'TURMA' ? 'Turma' : 'Personal'}
                        </span>
                        <span className="text-xs text-ink-soft">{a.assistant ? `Auxiliar: ${a.assistant.name}` : 'Sem auxiliar'}</span>
                      </div>
                      <div className="flex gap-4 mt-2 pt-2 border-t border-black/5">
                        <button onClick={() => setEditando(a)} className="text-xs font-medium text-teal">
                          Editar
                        </button>
                        <button onClick={() => excluirAula(a)} className="text-xs font-medium text-coral-dark">
                          Excluir
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <p className="text-ink-soft text-sm">Nenhuma aula como professor neste período.</p>
              )}
            </>
          )}
        </Modal>
      )}

      {editando && (
        <EditLessonModal
          lesson={editando}
          aviso={
            estaNoPeriodoAtual
              ? undefined
              : `Este período (${periodo.label}) já passou. Alterar a aula muda o fechamento dele.`
          }
          onClose={() => setEditando(null)}
          onSaved={() => {
            setEditando(null);
            recarregarTudo();
          }}
        />
      )}
    </Layout>
  );
}
