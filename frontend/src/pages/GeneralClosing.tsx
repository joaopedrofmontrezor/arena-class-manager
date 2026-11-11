import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../api/client';
import { getErrorMessage } from '../api/errors';
import { Layout } from '../components/Layout';
import { ExportarWhatsApp } from '../components/ExportarWhatsApp';
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


function formatEventDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', { timeZone: 'America/Sao_Paulo' });
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
  const [periodoError, setPeriodoError] = useState('');
  const [salvandoFechamento, setSalvandoFechamento] = useState(false);

  const periodoAtual = getPeriodoAtual();
  const estaNoPeriodoAtual = toQueryDate(periodo.start) === toQueryDate(periodoAtual.start);
  
  const periodoJaEncerrado = periodo.start.getTime() < periodoAtual.start.getTime();
  const periodoFechado = Boolean(resumo?.fechamento);
  
  const itemAtual =
    resumo?.professores.find((p) => p.professorId === selecionado?.professorId) ?? selecionado;

  useEffect(() => {
    setLoading(true);
    setError('');
    setPeriodoError('');
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

  async function executarAcaoDePeriodo(acao: () => Promise<unknown>, falha: string) {
    setPeriodoError('');
    setActionError('');
    setSalvandoFechamento(true);
    try {
      await acao();
      recarregarTudo();
    } catch (err) {
      const mensagem = getErrorMessage(err, falha);
      setPeriodoError(mensagem);
      setActionError(mensagem);
    } finally {
      setSalvandoFechamento(false);
    }
  }

  function fecharPeriodo() {
    if (
      !confirm(
        `Fechar o período ${periodo.label}?\n\nDepois de fechado, NINGUÉM (nem você) poderá criar, editar ou excluir aulas desse período, até que ele seja reaberto.`,
      )
    )
      return;
    executarAcaoDePeriodo(
      () => api.post('/closing/periods', { start: toQueryDate(periodo.start) }),
      'Não foi possível fechar o período.',
    );
  }

  function reabrirPeriodo() {
    if (!resumo?.fechamento) return;
    const idFechamento = resumo.fechamento.id;
    if (
      !confirm(
        `Reabrir o período ${periodo.label}?\n\nAs aulas dele voltam a poder ser alteradas e o total pode mudar.`,
      )
    )
      return;
    executarAcaoDePeriodo(
      () => api.delete(`/closing/periods/${idFechamento}`),
      'Não foi possível reabrir o período.',
    );
  }

  function marcarComoPago(item: ResumoGeralItem) {
    if (!resumo?.fechamento) return;
    const idFechamento = resumo.fechamento.id;
    if (!confirm(`Marcar ${item.nome} como pago(a): ${formatBRL(item.totalReceber)}?`)) return;
    executarAcaoDePeriodo(
      () => api.post(`/closing/periods/${idFechamento}/payments/${item.professorId}`),
      'Não foi possível marcar como pago.',
    );
  }

  function desfazerPagamento(item: ResumoGeralItem) {
    if (!resumo?.fechamento) return;
    const idFechamento = resumo.fechamento.id;
    if (!confirm(`Desfazer o pagamento de ${item.nome}?`)) return;
    executarAcaoDePeriodo(
      () => api.delete(`/closing/periods/${idFechamento}/payments/${item.professorId}`),
      'Não foi possível desfazer o pagamento.',
    );
  }

  async function excluirAula(aula: Lesson) {
    const aviso = estaNoPeriodoAtual
      ? ''
      : `\n\nATENÇÃO: este período (${periodo.label}) já passou. Excluir vai alterar o fechamento dele.`;
    if (
      !confirm(
        `Excluir a aula de ${itemAtual?.nome} em ${formatDate(aula.date)} às ${aula.time}?${aviso}`,
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
          <div className={`rounded-card p-4 mb-3 ${periodoFechado ? 'bg-sea-light' : 'bg-surface'}`}>
            {periodoFechado ? (
              <>
                <p className="text-sm font-medium text-sea">🔒 Período fechado</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  As aulas deste período estão travadas. Abra um professor para marcar o pagamento.
                </p>
                <button
                  onClick={reabrirPeriodo}
                  disabled={salvandoFechamento}
                  className="text-xs text-coral font-medium underline mt-2 disabled:opacity-50"
                >
                  Reabrir período
                </button>
              </>
            ) : periodoJaEncerrado ? (
              <>
                <p className="text-sm font-medium">Período encerrado, ainda aberto para edição</p>
                <p className="text-xs text-ink-soft mt-0.5">
                  Feche para travar as aulas e poder registrar os pagamentos.
                </p>
                <button
                  onClick={fecharPeriodo}
                  disabled={salvandoFechamento}
                  className="mt-2 bg-teal text-white text-sm font-medium rounded-card px-4 py-2 disabled:opacity-50"
                >
                  Fechar período
                </button>
              </>
            ) : (
              <p className="text-xs text-ink-soft">
                Período em andamento. Ele só pode ser fechado depois que terminar.
              </p>
            )}
            {periodoError && <p className="text-xs text-coral-dark mt-2">{periodoError}</p>}
          </div>

          <div className="bg-teal text-white rounded-card p-5 mb-3">
            <p className="text-white/70 text-sm mb-1">Total de todos os professores</p>
            <p className="font-display font-semibold text-4xl">{formatBRL(resumo.totalGeral)}</p>
          </div>

          <ExportarWhatsApp
            rota="/closing/general/export"
            periodo={periodo}
            rotulo="Exportar fechamento geral"
            titulo="Fechamento geral"
            className="mb-3"
          />

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
                    {p.pago && (
                      <span className="text-[10px] font-normal text-sea bg-sea-light px-1.5 py-0.5 rounded">
                        pago
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

      {selecionado && itemAtual && (
        <Modal title={itemAtual.nome} onClose={() => setSelecionado(null)}>
          {detalheLoading && <p className="text-ink-soft text-sm">Carregando...</p>}

          {actionError && <p className="text-sm text-coral-dark mb-3">{actionError}</p>}

          {periodoFechado && (
            <div className="bg-surface rounded-card p-4 mb-5">
              {itemAtual.pago ? (
                <>
                  <p className="text-sm font-medium text-sea">
                    Pago em {itemAtual.pagoEm ? formatEventDate(itemAtual.pagoEm) : '—'} ·{' '}
                    {formatBRL(itemAtual.valorPago ?? 0)}
                  </p>
                  <button
                    onClick={() => desfazerPagamento(itemAtual)}
                    disabled={salvandoFechamento}
                    className="text-xs text-coral font-medium underline mt-2 disabled:opacity-50"
                  >
                    Desfazer pagamento
                  </button>
                </>
              ) : itemAtual.totalReceber > 0 ? (
                <button
                  onClick={() => marcarComoPago(itemAtual)}
                  disabled={salvandoFechamento}
                  className="w-full bg-teal text-white text-sm font-medium rounded-card px-4 py-2.5 disabled:opacity-50"
                >
                  Marcar como pago · {formatBRL(itemAtual.totalReceber)}
                </button>
              ) : (
                <p className="text-sm text-ink-soft">Nada a receber neste período.</p>
              )}
            </div>
          )}

          <ExportarWhatsApp
            rota={`/closing/professor/${itemAtual.professorId}/export`}
            periodo={periodo}
            rotulo="Enviar fechamento deste professor"
            titulo={`Fechamento — ${itemAtual.nome}`}
            className="mb-5"
          />

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
                      {!periodoFechado && (
                        <div className="flex gap-4 mt-2 pt-2 border-t border-black/5">
                          <button onClick={() => setEditando(a)} className="text-xs font-medium text-teal">
                            Editar
                          </button>
                          <button onClick={() => excluirAula(a)} className="text-xs font-medium text-coral-dark">
                            Excluir
                          </button>
                        </div>
                      )}
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
