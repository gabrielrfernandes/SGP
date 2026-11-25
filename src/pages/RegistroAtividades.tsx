import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { SisRHRepository } from '../services/supabase';
import { Lancamento, Atividade, Equipe } from '../types/database';
import {
  formatarNumeroBR,
  formatarHorasBR,
  formatarDataBR,
  converterStringParaHorasDecimais,
  converterHorasDecimaisParaTimeInput,
  MESES_NOMES
} from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  Calendar,
  Clock,
  Plus,
  Trash2,
  Edit2,
  Lock,
  Unlock,
  CheckCircle2,
  AlertCircle,
  Users,
  Grid,
  List,
  Save,
  Info,
  Search,
  Filter
} from 'lucide-react';
import { getDaysInMonth, format, isWeekend } from 'date-fns';

export const RegistroAtividades: React.FC = () => {
  const { currentUser, minhasEquipes, isAdmin } = useAuth();

  // Estados de seleção
  const hoje = new Date();
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1);
  const [equipeSelecionadaId, setEquipeSelecionadaId] = useState<string>(
    minhasEquipes[0]?.id || '44444444-4444-4444-4444-444444444303'
  );

  // Modo de visualização: grade rápida ou lista detalhada
  const [modoVisualizacao, setModoVisualizacao] = useState<'grade' | 'lista'>('grade');

  // Controle de recarregamento
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => setRefreshKey(k => k + 1);

  // Modal de Lançamento Detalhado
  const [modalLancamentoAberto, setModalLancamentoAberto] = useState(false);
  const [lancamentoEmEdicao, setLancamentoEmEdicao] = useState<Lancamento | null>(null);

  // Modal de Criação de Atividade pelo Administrador
  const [modalNovaAtividadeAberto, setModalNovaAtividadeAberto] = useState(false);
  const [novaAtivNome, setNovaAtivNome] = useState('');
  const [novaAtivCategoriaId, setNovaAtivCategoriaId] = useState('');
  const [novaAtivTipoMedida, setNovaAtivTipoMedida] = useState<'quantidade' | 'horas'>('quantidade');
  const [novaAtivDescricao, setNovaAtivDescricao] = useState('');
  const [novaAtivAtribuirTodas, setNovaAtivAtribuirTodas] = useState(true);

  const categorias = useMemo(() => SisRHRepository.getCategorias(), [refreshKey]);

  const abrirModalNovaAtividadeDireta = () => {
    setNovaAtivNome('');
    setNovaAtivCategoriaId(categorias[0]?.id || '');
    setNovaAtivTipoMedida('quantidade');
    setNovaAtivDescricao('');
    setNovaAtivAtribuirTodas(true);
    setModalNovaAtividadeAberto(true);
  };

  const salvarNovaAtividadeDireta = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const ativ = SisRHRepository.saveAtividade({
        nome: novaAtivNome,
        categoria_id: novaAtivCategoriaId || categorias[0]?.id || '',
        tipo_medida: novaAtivTipoMedida,
        descricao: novaAtivDescricao.trim() || undefined,
        vigencia_inicio: new Date().toISOString().split('T')[0],
      });

      if (equipeAtual) {
        const ativsDaEq = SisRHRepository.getAtividadesByEquipe(equipeAtual.id).map(a => a.id);
        if (!ativsDaEq.includes(ativ.id)) {
          SisRHRepository.setEquipeAtividades(equipeAtual.id, [...ativsDaEq, ativ.id]);
        }
      }

      if (novaAtivAtribuirTodas) {
        const todasEquipes = SisRHRepository.getEquipes();
        todasEquipes.forEach(eq => {
          const ids = SisRHRepository.getAtividadesByEquipe(eq.id).map(a => a.id);
          if (!ids.includes(ativ.id)) {
            SisRHRepository.setEquipeAtividades(eq.id, [...ids, ativ.id]);
          }
        });
      }

      setMensagemSucesso(`Atividade "${novaAtivNome}" criada e disponibilizada para registro!`);
      setModalNovaAtividadeAberto(false);
      setNovaAtivNome('');
      setNovaAtivDescricao('');
      triggerRefresh();
      setTimeout(() => setMensagemSucesso(null), 4000);
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao cadastrar atividade.');
      setTimeout(() => setMensagemErro(null), 5000);
    }
  };

  // Notificações locais
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Carregar dados reativos
  const equipeAtual = useMemo(() => {
    return minhasEquipes.find(e => e.id === equipeSelecionadaId) || minhasEquipes[0];
  }, [minhasEquipes, equipeSelecionadaId, refreshKey]);

  const atividadesAtribuidas = useMemo(() => {
    if (!equipeAtual) return [];
    return SisRHRepository.getAtividadesByEquipe(equipeAtual.id);
  }, [equipeAtual, refreshKey]);

  const lancamentosMes = useMemo(() => {
    if (!equipeAtual) return [];
    const todos = SisRHRepository.getLancamentos();
    return todos.filter(l => {
      if (l.equipe_id !== equipeAtual.id) return false;
      const d = new Date(l.data + 'T00:00:00');
      return d.getFullYear() === ano && d.getMonth() + 1 === mes;
    });
  }, [equipeAtual, ano, mes, refreshKey]);

  // Verificar se o mês está fechado
  const mesesFechados = useMemo(() => SisRHRepository.getMesesFechados(), [refreshKey]);
  const mesFechadoInfo = useMemo(() => {
    if (!equipeAtual) return null;
    return mesesFechados.find(mf => mf.equipe_id === equipeAtual.id && mf.ano === ano && mf.mes === mes);
  }, [mesesFechados, equipeAtual, ano, mes]);

  const isFechado = Boolean(mesFechadoInfo);

  // Cálculos para a grade de dias
  const totalDiasNoMes = getDaysInMonth(new Date(ano, mes - 1));
  const diasDoMes = useMemo(() => {
    return Array.from({ length: totalDiasNoMes }, (_, i) => {
      const diaNum = i + 1;
      const dateObj = new Date(ano, mes - 1, diaNum);
      const diaSemana = dateObj.getDay(); // 0 = Domingo, 6 = Sábado
      const isFimDeSemana = isWeekend(dateObj);
      const diaStr = diaNum.toString().padStart(2, '0');
      const mesStr = mes.toString().padStart(2, '0');
      const dataIso = `${ano}-${mesStr}-${diaStr}`;
      return {
        diaNum,
        dataIso,
        isFimDeSemana,
        diaSemanaAbrev: ['D', 'S', 'T', 'Q', 'Q', 'S', 'S'][diaSemana]
      };
    });
  }, [ano, mes, totalDiasNoMes]);

  // Estado local para edições rápidas na grade: mapa [atividadeId_dataIso] => valor numérico
  const [gradeValores, setGradeValores] = useState<Record<string, string>>({});
  const [gradeAlterada, setGradeAlterada] = useState(false);

  // Inicializa mapa da grade quando muda mês, equipe ou recarrega
  React.useEffect(() => {
    const mapa: Record<string, string> = {};
    lancamentosMes.forEach(l => {
      const chave = `${l.atividade_id}_${l.data}`;
      const val = l.quantidade !== null && l.quantidade !== undefined ? String(l.quantidade) : (l.horas ? String(l.horas) : '');
      mapa[chave] = val;
    });
    setGradeValores(mapa);
    setGradeAlterada(false);
  }, [lancamentosMes, equipeSelecionadaId, ano, mes]);

  const handleGradeCellChange = (atividadeId: string, dataIso: string, valorStr: string) => {
    if (isFechado) return;
    setGradeValores(prev => ({
      ...prev,
      [`${atividadeId}_${dataIso}`]: valorStr
    }));
    setGradeAlterada(true);
  };

  const salvarGrade = () => {
    if (!equipeAtual || !currentUser || isFechado) return;
    try {
      const itens: { atividade_id: string; data: string; valor: number; tipo_medida: 'quantidade' | 'horas' }[] = [];

      atividadesAtribuidas.forEach(ativ => {
        diasDoMes.forEach(dia => {
          const chave = `${ativ.id}_${dia.dataIso}`;
          const rawVal = gradeValores[chave];
          if (rawVal !== undefined) {
            const num = parseFloat(rawVal.replace(',', '.')) || 0;
            itens.push({
              atividade_id: ativ.id,
              data: dia.dataIso,
              valor: num,
              tipo_medida: ativ.tipo_medida
            });
          }
        });
      });

      SisRHRepository.saveGradeLancamentos(equipeAtual.id, currentUser.id, itens);
      setMensagemSucesso('Lançamentos da grade salvos com sucesso!');
      setGradeAlterada(false);
      triggerRefresh();
      setTimeout(() => setMensagemSucesso(null), 3500);
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao salvar lançamentos na grade.');
      setTimeout(() => setMensagemErro(null), 5000);
    }
  };

  // Formulário Detalhado State
  const [formAtividadeId, setFormAtividadeId] = useState('');
  const [formDataLancamento, setFormDataLancamento] = useState('');
  const [formValor, setFormValor] = useState('');
  const [formDescricao, setFormDescricao] = useState('');
  const [formObservacao, setFormObservacao] = useState('');

  const abrirModalNovoLancamento = () => {
    if (isFechado) {
      setMensagemErro('Este mês está fechado para alterações.');
      return;
    }
    const hojeStr = hoje.toISOString().split('T')[0];
    const dataInicial = hoje.getFullYear() === ano && hoje.getMonth() + 1 === mes
      ? hojeStr
      : `${ano}-${mes.toString().padStart(2, '0')}-01`;

    setLancamentoEmEdicao(null);
    setFormAtividadeId(atividadesAtribuidas[0]?.id || '');
    setFormDataLancamento(dataInicial);
    setFormValor('1');
    setFormDescricao('');
    setFormObservacao('');
    setModalLancamentoAberto(true);
  };

  const abrirModalEditarLancamento = (lanc: Lancamento) => {
    if (isFechado) {
      setMensagemErro('Este mês está fechado para alterações.');
      return;
    }
    setLancamentoEmEdicao(lanc);
    setFormAtividadeId(lanc.atividade_id);
    setFormDataLancamento(lanc.data);
    if (lanc.atividade?.tipo_medida === 'horas') {
      setFormValor(converterHorasDecimaisParaTimeInput(lanc.horas));
    } else {
      setFormValor(String(lanc.quantidade || '1'));
    }
    setFormDescricao(lanc.descricao || '');
    setFormObservacao(lanc.observacao || '');
    setModalLancamentoAberto(true);
  };

  const salvarFormularioDetalhado = (e: React.FormEvent) => {
    e.preventDefault();
    if (!equipeAtual || !currentUser || !formAtividadeId) return;

    const atividade = atividadesAtribuidas.find(a => a.id === formAtividadeId);
    if (!atividade) return;

    try {
      let qtd: number | null = null;
      let hrs: number | null = null;
      let duracaoMinutos: number | null = null;

      if (atividade.tipo_medida === 'horas') {
        hrs = converterStringParaHorasDecimais(formValor);
        duracaoMinutos = Math.round(hrs * 60);
      } else {
        qtd = parseFloat(formValor.replace(',', '.')) || 1;
      }

      SisRHRepository.saveLancamento({
        id: lancamentoEmEdicao?.id,
        equipe_id: equipeAtual.id,
        atividade_id: atividade.id,
        registrado_por: currentUser.id,
        data: formDataLancamento,
        quantidade: qtd,
        horas: hrs,
        duracao_minutos: duracaoMinutos,
        descricao: formDescricao.trim() || null,
        observacao: formObservacao.trim() || null
      });

      setMensagemSucesso(lancamentoEmEdicao ? 'Lançamento atualizado com sucesso!' : 'Lançamento registrado com sucesso!');
      setModalLancamentoAberto(false);
      triggerRefresh();
      setTimeout(() => setMensagemSucesso(null), 3500);
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao salvar lançamento.');
      setTimeout(() => setMensagemErro(null), 5000);
    }
  };

  const excluirLancamento = (id: string) => {
    if (isFechado) return;
    if (confirm('Confirma a exclusão deste lançamento?')) {
      try {
        SisRHRepository.deleteLancamento(id);
        setMensagemSucesso('Lançamento removido.');
        triggerRefresh();
        setTimeout(() => setMensagemSucesso(null), 3000);
      } catch (err: any) {
        setMensagemErro(err.message || 'Erro ao excluir.');
      }
    }
  };

  // Totais do mês para o resumo lateral
  const resumoTotaisPorAtividade = useMemo(() => {
    const mapa: Record<string, { total: number; lancamentosCount: number }> = {};
    lancamentosMes.forEach(l => {
      if (!mapa[l.atividade_id]) {
        mapa[l.atividade_id] = { total: 0, lancamentosCount: 0 };
      }
      mapa[l.atividade_id].lancamentosCount++;
      mapa[l.atividade_id].total += l.quantidade !== null && l.quantidade !== undefined
        ? l.quantidade
        : (l.horas || 0);
    });
    return mapa;
  }, [lancamentosMes]);

  const totalAtendimentosGeral = useMemo(() => {
    return lancamentosMes.reduce((acc, curr) => {
      const ativ = atividadesAtribuidas.find(a => a.id === curr.atividade_id);
      return ativ?.tipo_medida === 'quantidade' ? acc + (curr.quantidade || 0) : acc;
    }, 0);
  }, [lancamentosMes, atividadesAtribuidas]);

  const totalHorasGeral = useMemo(() => {
    return lancamentosMes.reduce((acc, curr) => {
      const ativ = atividadesAtribuidas.find(a => a.id === curr.atividade_id);
      return ativ?.tipo_medida === 'horas' ? acc + (curr.horas || 0) : acc;
    }, 0);
  }, [lancamentosMes, atividadesAtribuidas]);

  // Filtros da lista
  const [filtroTextoLista, setFiltroTextoLista] = useState('');
  const [filtroAtividadeLista, setFiltroAtividadeLista] = useState('');

  const lancamentosFiltradosLista = useMemo(() => {
    return lancamentosMes.filter(l => {
      if (filtroAtividadeLista && l.atividade_id !== filtroAtividadeLista) return false;
      if (filtroTextoLista) {
        const t = filtroTextoLista.toLowerCase();
        const desc = (l.descricao || '').toLowerCase();
        const obs = (l.observacao || '').toLowerCase();
        const ativNome = (l.atividade?.nome || '').toLowerCase();
        if (!desc.includes(t) && !obs.includes(t) && !ativNome.includes(t)) return false;
      }
      return true;
    });
  }, [lancamentosMes, filtroTextoLista, filtroAtividadeLista]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-5">
      {/* Alertas de Notificação */}
      {mensagemSucesso && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
          <button onClick={() => setMensagemSucesso(null)} className="text-emerald-600 hover:text-emerald-900 font-bold">&times;</button>
        </div>
      )}
      {mensagemErro && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{mensagemErro}</span>
          </div>
          <button onClick={() => setMensagemErro(null)} className="text-rose-600 hover:text-rose-900 font-bold">&times;</button>
        </div>
      )}

      {/* Faixa de Alerta: Mês Fechado / Bloqueado */}
      {isFechado && (
        <div className="p-3.5 bg-amber-50 border border-amber-300 rounded-xl text-amber-900 text-xs flex items-start gap-3 shadow-xs">
          <Lock className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
          <div className="flex-1">
            <div className="font-bold flex items-center gap-2">
              <span>MÊS HOMOLOGADO E FECHADO PELA CHEFIA</span>
              <span className="text-[10px] bg-amber-200/80 text-amber-900 px-2 py-0.5 rounded font-mono">
                {MESES_NOMES[mes - 1]} / {ano}
              </span>
            </div>
            <p className="mt-1 text-amber-800 leading-relaxed">
              As edições neste mês estão bloqueadas para garantir a integridade dos relatórios consolidados.
              {mesFechadoInfo?.fechador && ` Fechado por ${mesFechadoInfo.fechador.nome_completo} em ${formatarDataBR(mesFechadoInfo.fechado_em)}.`}
              {mesFechadoInfo?.motivo && ` Motivo: "${mesFechadoInfo.motivo}".`}
            </p>
          </div>
        </div>
      )}

      {/* Barra de Controles Superiores: Seletor de Equipe, Período e Ações */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div className="flex flex-wrap items-center gap-3">
          {/* Seletor de Equipe */}
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4 text-slate-500" />
            <label className="text-xs font-semibold text-slate-700">Equipe:</label>
            <select
              value={equipeSelecionadaId}
              onChange={(e) => setEquipeSelecionadaId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {minhasEquipes.map(eq => (
                <option key={eq.id} value={eq.id}>
                  {eq.nome} {eq.sigla ? `(${eq.sigla})` : ''}
                </option>
              ))}
            </select>
          </div>

          <div className="h-5 w-px bg-slate-200 hidden sm:block" />

          {/* Seletor de Mês e Ano */}
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-slate-500" />
            <select
              value={mes}
              onChange={(e) => setMes(Number(e.target.value))}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {MESES_NOMES.map((nome, idx) => (
                <option key={idx + 1} value={idx + 1}>
                  {nome}
                </option>
              ))}
            </select>
            <select
              value={ano}
              onChange={(e) => setAno(Number(e.target.value))}
              className="text-xs border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium text-slate-800 focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {[2024, 2025, 2026, 2027].map(a => (
                <option key={a} value={a}>{a}</option>
              ))}
            </select>
          </div>
        </div>

        {/* Alternador de Modo e Botão de Novo Lançamento */}
        <div className="flex items-center gap-2">
          {/* Alternador Grade vs Lista */}
          <div className="flex items-center border border-slate-200 rounded-lg p-0.5 bg-slate-100 text-xs">
            <button
              onClick={() => setModoVisualizacao('grade')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                modoVisualizacao === 'grade'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Grid className="w-3.5 h-3.5" />
              <span>Grade Diária</span>
            </button>
            <button
              onClick={() => setModoVisualizacao('lista')}
              className={`flex items-center gap-1.5 px-3 py-1.5 rounded-md font-medium transition ${
                modoVisualizacao === 'lista'
                  ? 'bg-white text-blue-700 shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <List className="w-3.5 h-3.5" />
              <span>Lista de Lançamentos ({lancamentosMes.length})</span>
            </button>
          </div>

          {/* Botão Novo Lançamento Detalhado */}
          <button
            onClick={abrirModalNovoLancamento}
            disabled={isFechado}
            className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium text-white transition ${
              isFechado
                ? 'bg-slate-400 cursor-not-allowed'
                : 'bg-blue-700 hover:bg-blue-800 shadow-xs'
            }`}
          >
            <Plus className="w-4 h-4" />
            <span>Lançamento Detalhado</span>
          </button>

          {/* Botão Atalho para Administrador Criar Atividade no Catálogo */}
          {isAdmin && (
            <button
              onClick={abrirModalNovaAtividadeDireta}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold text-purple-800 bg-purple-100/80 hover:bg-purple-200 border border-purple-300 transition shadow-2xs cursor-pointer"
              title="Cadastrar uma nova atividade oficial no catálogo do sistema"
            >
              <Plus className="w-3.5 h-3.5" />
              <span>Nova Atividade (Admin)</span>
            </button>
          )}
        </div>
      </div>

      {/* Conteúdo Principal Dividido: Área de Trabalho + Resumo Lateral */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-5">
        {/* Painel Esquerdo: Grade Rápida ou Lista de Lançamentos */}
        <div className="lg:col-span-3 space-y-4">
          {modoVisualizacao === 'grade' ? (
            /* ============================================================ */
            /* MODO GRADE: Atividades x Dias do Mês (Estilo Planilha)       */
            /* ============================================================ */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                <div>
                  <h2 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
                    <Grid className="w-4 h-4 text-blue-600" />
                    <span>Grade Rápida de Atividades &bull; {MESES_NOMES[mes - 1]} / {ano}</span>
                  </h2>
                  <p className="text-[11px] text-slate-500">
                    Preencha as quantidades ou horas diretamente nas células dos dias correspondentes
                  </p>
                </div>

                {!isFechado && (
                  <button
                    onClick={salvarGrade}
                    disabled={!gradeAlterada}
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition ${
                      gradeAlterada
                        ? 'bg-emerald-600 hover:bg-emerald-700 text-white shadow-xs animate-pulse'
                        : 'bg-slate-100 text-slate-400 cursor-not-allowed'
                    }`}
                  >
                    <Save className="w-4 h-4" />
                    <span>{gradeAlterada ? 'Salvar Alterações na Grade' : 'Grade Sincronizada'}</span>
                  </button>
                )}
              </div>

              {/* Tabela de Grade com Scroll Horizontal */}
              <div className="overflow-x-auto max-h-[620px]">
                <table className="w-full text-xs border-collapse">
                  <thead className="bg-slate-100 sticky top-0 z-20 shadow-xs text-slate-700">
                    <tr>
                      <th className="p-2.5 text-left font-bold border-b border-r border-slate-200 min-w-[240px] max-w-[280px] bg-slate-100 sticky left-0 z-30">
                        Atividade Atribuída
                      </th>
                      <th className="p-2 text-center font-bold border-b border-r border-slate-200 w-16">
                        Tipo
                      </th>
                      {diasDoMes.map(d => (
                        <th
                          key={d.diaNum}
                          className={`p-1.5 text-center font-bold border-b border-r border-slate-200 min-w-[34px] ${
                            d.isFimDeSemana ? 'bg-slate-200/70 text-slate-500' : 'bg-slate-100 text-slate-800'
                          }`}
                        >
                          <div>{d.diaNum}</div>
                          <div className="text-[9px] font-normal text-slate-500">{d.diaSemanaAbrev}</div>
                        </th>
                      ))}
                      <th className="p-2 text-center font-bold border-b border-slate-200 min-w-[70px] bg-slate-200 text-slate-900 sticky right-0 z-20">
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {atividadesAtribuidas.length === 0 ? (
                      <tr>
                        <td colSpan={totalDiasNoMes + 3} className="p-8 text-center text-slate-400">
                          Nenhuma atividade atribuída a esta equipe. Acesse o menu de Administração para vincular atividades.
                        </td>
                      </tr>
                    ) : (
                      atividadesAtribuidas.map((ativ) => {
                        // Calcular total da linha na grade
                        let somaLinha = 0;
                        diasDoMes.forEach(d => {
                          const chave = `${ativ.id}_${d.dataIso}`;
                          const val = parseFloat((gradeValores[chave] || '0').replace(',', '.')) || 0;
                          somaLinha += val;
                        });

                        return (
                          <tr key={ativ.id} className="hover:bg-blue-50/40 border-b border-slate-100 transition">
                            {/* Nome da atividade fixo à esquerda */}
                            <td className="p-2.5 border-r border-slate-200 font-medium text-slate-900 sticky left-0 bg-white z-10">
                              <div className="line-clamp-2 leading-snug" title={ativ.nome}>
                                {ativ.nome}
                              </div>
                              <div className="text-[10px] text-slate-400 mt-0.5">
                                {ativ.categoria?.nome}
                              </div>
                            </td>

                            {/* Badge do tipo de medida */}
                            <td className="p-1.5 text-center border-r border-slate-200">
                              <Badge variant={ativ.tipo_medida === 'horas' ? 'amber' : 'blue'} size="sm">
                                {ativ.tipo_medida === 'horas' ? 'Horas' : 'Qtd'}
                              </Badge>
                            </td>

                            {/* Células de cada dia do mês */}
                            {diasDoMes.map(d => {
                              const chave = `${ativ.id}_${d.dataIso}`;
                              const valorAtual = gradeValores[chave] || '';

                              return (
                                <td
                                  key={d.diaNum}
                                  className={`p-0.5 border-r border-slate-200 text-center ${
                                    d.isFimDeSemana ? 'bg-slate-50/70' : ''
                                  }`}
                                >
                                  <input
                                    type="text"
                                    disabled={isFechado}
                                    value={valorAtual}
                                    onChange={(e) => handleGradeCellChange(ativ.id, d.dataIso, e.target.value)}
                                    placeholder="-"
                                    className={`w-full h-8 text-center text-xs font-mono font-medium rounded transition focus:ring-1 focus:ring-blue-500 focus:outline-hidden ${
                                      valorAtual
                                        ? 'bg-blue-50 text-blue-900 font-semibold'
                                        : 'bg-transparent text-slate-400 hover:bg-slate-100'
                                    } ${isFechado ? 'cursor-not-allowed opacity-75' : ''}`}
                                  />
                                </td>
                              );
                            })}

                            {/* Total da Linha */}
                            <td className="p-2 text-center border-slate-200 font-mono font-bold text-slate-900 bg-slate-100/90 sticky right-0 z-10">
                              {ativ.tipo_medida === 'horas' ? formatarHorasBR(somaLinha) : formatarNumeroBR(somaLinha, 0)}
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          ) : (
            /* ============================================================ */
            /* MODO LISTA: Tabela Detalhada com busca e edição              */
            /* ============================================================ */
            <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
              <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-2">
                  <div className="relative">
                    <Search className="w-3.5 h-3.5 text-slate-400 absolute left-2.5 top-2.5" />
                    <input
                      type="text"
                      placeholder="Filtrar por texto, descrição..."
                      value={filtroTextoLista}
                      onChange={(e) => setFiltroTextoLista(e.target.value)}
                      className="text-xs pl-8 pr-3 py-1.5 border border-slate-300 rounded-lg bg-white w-56 focus:outline-hidden focus:ring-1 focus:ring-blue-500"
                    />
                  </div>

                  <select
                    value={filtroAtividadeLista}
                    onChange={(e) => setFiltroAtividadeLista(e.target.value)}
                    className="text-xs px-2.5 py-1.5 border border-slate-300 rounded-lg bg-white text-slate-700"
                  >
                    <option value="">Todas as Atividades</option>
                    {atividadesAtribuidas.map(a => (
                      <option key={a.id} value={a.id}>{a.nome}</option>
                    ))}
                  </select>
                </div>

                <div className="text-xs text-slate-500 font-medium">
                  Exibindo {lancamentosFiltradosLista.length} de {lancamentosMes.length} lançamentos
                </div>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Atividade</th>
                      <th className="py-2.5 px-3">Métrica</th>
                      <th className="py-2.5 px-3">Descrição / Detalhes</th>
                      <th className="py-2.5 px-3">Observação</th>
                      <th className="py-2.5 px-3">Registrado Por</th>
                      <th className="py-2.5 px-3 text-right">Ações</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lancamentosFiltradosLista.length === 0 ? (
                      <tr>
                        <td colSpan={7} className="py-8 text-center text-slate-400">
                          Nenhum lançamento encontrado para os filtros selecionados.
                        </td>
                      </tr>
                    ) : (
                      lancamentosFiltradosLista.map(lanc => (
                        <tr key={lanc.id} className="hover:bg-slate-50/70 transition">
                          <td className="py-2.5 px-3 font-mono font-medium text-slate-800 whitespace-nowrap">
                            {formatarDataBR(lanc.data)}
                          </td>
                          <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-[220px]">
                            <div className="truncate" title={lanc.atividade?.nome}>
                              {lanc.atividade?.nome}
                            </div>
                            <div className="text-[10px] text-slate-400 font-normal">
                              {lanc.atividade?.categoria?.nome}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 whitespace-nowrap font-mono">
                            {lanc.atividade?.tipo_medida === 'horas' ? (
                              <Badge variant="amber" size="sm">
                                <Clock className="w-3 h-3" /> {formatarHorasBR(lanc.horas)}
                              </Badge>
                            ) : (
                              <Badge variant="blue" size="sm">
                                {formatarNumeroBR(lanc.quantidade, 0)} un
                              </Badge>
                            )}
                          </td>
                          <td className="py-2.5 px-3 max-w-[200px] text-slate-700">
                            <div className="truncate" title={lanc.descricao || '-'}>
                              {lanc.descricao || '-'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 max-w-[180px] text-slate-500 italic">
                            <div className="truncate" title={lanc.observacao || '-'}>
                              {lanc.observacao || '-'}
                            </div>
                          </td>
                          <td className="py-2.5 px-3 text-slate-600 whitespace-nowrap">
                            {lanc.usuario?.nome_completo || 'Sistema'}
                          </td>
                          <td className="py-2.5 px-3 text-right whitespace-nowrap">
                            <div className="flex items-center justify-end gap-1.5">
                              <button
                                onClick={() => abrirModalEditarLancamento(lanc)}
                                disabled={isFechado}
                                className={`p-1.5 rounded transition ${
                                  isFechado
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-600 hover:text-blue-600 hover:bg-blue-50'
                                }`}
                                title="Editar Lançamento"
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => excluirLancamento(lanc.id)}
                                disabled={isFechado}
                                className={`p-1.5 rounded transition ${
                                  isFechado
                                    ? 'text-slate-300 cursor-not-allowed'
                                    : 'text-slate-600 hover:text-rose-600 hover:bg-rose-50'
                                }`}
                                title="Excluir Lançamento"
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>

        {/* Painel Direito: Resumo Lateral de Totais do Mês por Atividade */}
        <div className="space-y-4">
          {/* Card Indicadores Globais do Mês */}
          <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center justify-between">
              <span>Totais do Mês</span>
              <span className="text-[10px] text-slate-400 font-mono">
                {MESES_NOMES[mes - 1]} / {ano}
              </span>
            </h3>

            <div className="grid grid-cols-2 gap-2 pt-1">
              <div className="p-3 bg-blue-50/70 border border-blue-100 rounded-lg">
                <div className="text-[10px] font-semibold text-blue-700 uppercase">Atendimentos/Qtd</div>
                <div className="text-lg font-bold text-blue-900 mt-0.5">
                  {formatarNumeroBR(totalAtendimentosGeral, 0)}
                </div>
              </div>
              <div className="p-3 bg-amber-50/70 border border-amber-100 rounded-lg">
                <div className="text-[10px] font-semibold text-amber-700 uppercase">Tempo Total</div>
                <div className="text-lg font-bold text-amber-900 mt-0.5">
                  {formatarHorasBR(totalHorasGeral)}
                </div>
              </div>
            </div>
          </div>

          {/* Lista de Totais por Atividade */}
          <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
            <div className="px-4 py-3 bg-slate-50 border-b border-slate-200">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Consolidado por Atividade
              </h4>
              <p className="text-[11px] text-slate-500">
                Soma de todos os lançamentos homologados no período
              </p>
            </div>

            <div className="divide-y divide-slate-100 max-h-[500px] overflow-y-auto">
              {atividadesAtribuidas.map(ativ => {
                const info = resumoTotaisPorAtividade[ativ.id] || { total: 0, lancamentosCount: 0 };
                return (
                  <div key={ativ.id} className="p-3 hover:bg-slate-50 transition">
                    <div className="flex items-start justify-between gap-2">
                      <div className="text-xs font-medium text-slate-800 line-clamp-2" title={ativ.nome}>
                        {ativ.nome}
                      </div>
                      <span className="shrink-0 font-mono font-bold text-xs text-slate-900">
                        {ativ.tipo_medida === 'horas' ? formatarHorasBR(info.total) : formatarNumeroBR(info.total, 0)}
                      </span>
                    </div>
                    <div className="flex items-center justify-between text-[10px] text-slate-400 mt-1">
                      <span>{ativ.categoria?.nome}</span>
                      <span>{info.lancamentosCount} lançamento(s)</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Modal de Lançamento Detalhado */}
      <Modal
        isOpen={modalLancamentoAberto}
        onClose={() => setModalLancamentoAberto(false)}
        title={lancamentoEmEdicao ? 'Editar Lançamento' : 'Novo Lançamento Detalhado'}
        subtitle={`Equipe: ${equipeAtual?.nome || ''}`}
        maxWidth="lg"
      >
        <form onSubmit={salvarFormularioDetalhado} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Atividade Atribuída *
            </label>
            <select
              required
              value={formAtividadeId}
              onChange={(e) => setFormAtividadeId(e.target.value)}
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            >
              {atividadesAtribuidas.map(a => (
                <option key={a.id} value={a.id}>
                  [{a.tipo_medida === 'horas' ? 'HORAS' : 'QUANTIDADE'}] {a.nome}
                </option>
              ))}
            </select>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Data do Lançamento *
              </label>
              <input
                type="date"
                required
                value={formDataLancamento}
                onChange={(e) => setFormDataLancamento(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
              />
            </div>

            <div>
              {(() => {
                const ativ = atividadesAtribuidas.find(a => a.id === formAtividadeId);
                const isHoras = ativ?.tipo_medida === 'horas';

                return (
                  <div>
                    <label className="block text-xs font-semibold text-slate-700 mb-1">
                      {isHoras ? 'Duração (hh:mm ou ex: 1h30) *' : 'Quantidade Realizada *'}
                    </label>
                    <input
                      type="text"
                      required
                      value={formValor}
                      onChange={(e) => setFormValor(e.target.value)}
                      placeholder={isHoras ? 'Ex: 01:30 ou 1h30' : 'Ex: 10'}
                      className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500 font-mono"
                    />
                    <p className="text-[10px] text-slate-400 mt-1">
                      {isHoras ? 'Aceita formato "1:30", "1h30" ou decimal "1.5"' : 'Número inteiro ou decimal'}
                    </p>
                  </div>
                );
              })()}
            </div>
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Descrição do Atendimento / Pauta (Ex: "Reunião CDI", "Processo SEI nº...")
            </label>
            <input
              type="text"
              value={formDescricao}
              onChange={(e) => setFormDescricao(e.target.value)}
              placeholder="Descreva suscintamente o atendimento, reunião ou processo trabalhado"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações Administrativas / Justificativa
            </label>
            <textarea
              rows={3}
              value={formObservacao}
              onChange={(e) => setFormObservacao(e.target.value)}
              placeholder="Informações adicionais, ocorrências ou despachos pertinentes ao controle interno"
              className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white focus:outline-hidden focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalLancamentoAberto(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-semibold text-white bg-blue-700 hover:bg-blue-800 rounded-lg shadow-xs transition"
            >
              Salvar Lançamento
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal de Criação de Atividade pelo Administrador */}
      <Modal
        isOpen={modalNovaAtividadeAberto}
        onClose={() => setModalNovaAtividadeAberto(false)}
        title="Cadastrar Nova Atividade no Catálogo"
      >
        <form onSubmit={salvarNovaAtividadeDireta} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nome Oficial da Atividade *</label>
            <input
              type="text"
              required
              value={novaAtivNome}
              onChange={(e) => setNovaAtivNome(e.target.value)}
              placeholder="Ex: Análise de Licença-Capacitação"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Categoria Temática *</label>
            <select
              value={novaAtivCategoriaId}
              onChange={(e) => setNovaAtivCategoriaId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-xs"
            >
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Tipo de Medida da Atividade *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                onClick={() => setNovaAtivTipoMedida('quantidade')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition ${
                  novaAtivTipoMedida === 'quantidade'
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Quantidade (Contagem)</span>
                  </span>
                  <input
                    type="radio"
                    name="nova_ativ_tipo_radio"
                    checked={novaAtivTipoMedida === 'quantidade'}
                    onChange={() => setNovaAtivTipoMedida('quantidade')}
                    className="text-blue-600"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  Para processos, atendimentos em balcão, requerimentos e despachos.
                </p>
              </div>

              <div
                onClick={() => setNovaAtivTipoMedida('horas')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition ${
                  novaAtivTipoMedida === 'horas'
                    ? 'border-amber-600 bg-amber-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Horas (Duração)</span>
                  </span>
                  <input
                    type="radio"
                    name="nova_ativ_tipo_radio"
                    checked={novaAtivTipoMedida === 'horas'}
                    onChange={() => setNovaAtivTipoMedida('horas')}
                    className="text-amber-600"
                  />
                </div>
                <p className="text-[11px] text-slate-600">
                  Para reuniões de comitês, capacitações, mediações e fiscalização.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Descrição e Orientações</label>
            <textarea
              rows={2}
              value={novaAtivDescricao}
              onChange={(e) => setNovaAtivDescricao(e.target.value)}
              placeholder="Orientações e instruções de preenchimento para a equipe..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
            />
          </div>

          <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={novaAtivAtribuirTodas}
                onChange={(e) => setNovaAtivAtribuirTodas(e.target.checked)}
                className="rounded text-purple-700 w-4 h-4"
              />
              <span className="text-xs font-bold text-purple-950">
                Disponibilizar imediatamente para todas as equipes de RH
              </span>
            </label>
            <p className="text-[11px] text-purple-800 pl-6 mt-0.5">
              Se marcado, a atividade já poderá ser registrada por qualquer equipe na grade diária.
            </p>
          </div>

          <div className="flex items-center justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalNovaAtividadeAberto(false)}
              className="px-4 py-2 text-xs font-medium text-slate-600 hover:bg-slate-100 rounded-lg transition cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 text-xs font-bold text-white bg-purple-700 hover:bg-purple-800 rounded-lg shadow-xs transition cursor-pointer"
            >
              Cadastrar Atividade
            </button>
          </div>
        </form>
      </Modal>
    </div>
  );
};
