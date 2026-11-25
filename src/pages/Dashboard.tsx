import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { SisRHRepository } from '../services/supabase';
import {
  formatarNumeroBR,
  formatarHorasBR,
  MESES_NOMES,
  MESES_SIGLAS
} from '../utils/formatters';
import { Badge } from '../components/common/Badge';
import {
  ResponsiveContainer,
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import {
  TrendingUp,
  Clock,
  CheckCircle,
  Award,
  Filter,
  Users,
  Layers,
  Calendar,
  BarChart3,
  Table as TableIcon
} from 'lucide-react';

export const Dashboard: React.FC = () => {
  const { equipes, profiles } = useAuth();

  // Estados dos filtros
  const hoje = new Date();
  const [tipoPeriodo, setTipoPeriodo] = useState<'mes' | 'trimestre' | 'ano' | 'personalizado'>('ano');
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1);
  const [trimestre, setTrimestre] = useState<number>(Math.ceil((hoje.getMonth() + 1) / 3));
  const [dataInicio, setDataInicio] = useState<string>(`${ano}-01-01`);
  const [dataFim, setDataFim] = useState<string>(`${ano}-12-31`);

  const [equipeFiltro, setEquipeFiltro] = useState<string>('todas');
  const [usuarioFiltro, setUsuarioFiltro] = useState<string>('todos');
  const [categoriaFiltro, setCategoriaFiltro] = useState<string>('todas');
  const [atividadeFiltro, setAtividadeFiltro] = useState<string>('todas');

  // Carregar dados
  const atividades = useMemo(() => SisRHRepository.getAtividades(), []);
  const categorias = useMemo(() => SisRHRepository.getCategorias(), []);
  const todosLancamentos = useMemo(() => SisRHRepository.getLancamentos(), []);

  // Filtragem dos lançamentos pelo período
  const lancamentosPeriodo = useMemo(() => {
    return todosLancamentos.filter(l => {
      const d = new Date(l.data + 'T00:00:00');
      const lAno = d.getFullYear();
      const lMes = d.getMonth() + 1;

      // Filtro de tempo
      if (tipoPeriodo === 'ano') {
        if (lAno !== ano) return false;
      } else if (tipoPeriodo === 'mes') {
        if (lAno !== ano || lMes !== mes) return false;
      } else if (tipoPeriodo === 'trimestre') {
        if (lAno !== ano) return false;
        const lTri = Math.ceil(lMes / 3);
        if (lTri !== trimestre) return false;
      } else if (tipoPeriodo === 'personalizado') {
        if (l.data < dataInicio || l.data > dataFim) return false;
      }

      // Filtro equipe
      if (equipeFiltro !== 'todas' && l.equipe_id !== equipeFiltro) return false;

      // Filtro usuário
      if (usuarioFiltro !== 'todos' && l.registrado_por !== usuarioFiltro) return false;

      // Filtro atividade
      if (atividadeFiltro !== 'todas' && l.atividade_id !== atividadeFiltro) return false;

      // Filtro categoria
      if (categoriaFiltro !== 'todas') {
        const ativ = atividades.find(a => a.id === l.atividade_id);
        if (ativ?.categoria_id !== categoriaFiltro) return false;
      }

      return true;
    });
  }, [
    todosLancamentos,
    tipoPeriodo,
    ano,
    mes,
    trimestre,
    dataInicio,
    dataFim,
    equipeFiltro,
    usuarioFiltro,
    categoriaFiltro,
    atividadeFiltro,
    atividades
  ]);

  // Período anterior para cálculo de variação percentual
  const variacaoPercentual = useMemo(() => {
    const anoAnterior = ano - 1;
    const lancsAnterior = todosLancamentos.filter(l => {
      const d = new Date(l.data + 'T00:00:00');
      if (d.getFullYear() !== anoAnterior) return false;
      if (equipeFiltro !== 'todas' && l.equipe_id !== equipeFiltro) return false;
      return true;
    });

    const totalAtual = lancamentosPeriodo.reduce((acc, curr) => acc + (curr.quantidade || curr.horas || 0), 0);
    const totalAnterior = lancsAnterior.reduce((acc, curr) => acc + (curr.quantidade || curr.horas || 0), 0);

    if (totalAnterior === 0) return '+100%';
    const diff = ((totalAtual - totalAnterior) / totalAnterior) * 100;
    const sinal = diff >= 0 ? '+' : '';
    return `${sinal}${diff.toFixed(1)}%`;
  }, [todosLancamentos, lancamentosPeriodo, ano, equipeFiltro]);

  // Indicadores
  const totalAtendimentos = useMemo(() => {
    return lancamentosPeriodo.reduce((acc, curr) => {
      const ativ = atividades.find(a => a.id === curr.atividade_id);
      return ativ?.tipo_medida === 'quantidade' ? acc + (curr.quantidade || 0) : acc;
    }, 0);
  }, [lancamentosPeriodo, atividades]);

  const totalHoras = useMemo(() => {
    return lancamentosPeriodo.reduce((acc, curr) => {
      const ativ = atividades.find(a => a.id === curr.atividade_id);
      return ativ?.tipo_medida === 'horas' ? acc + (curr.horas || 0) : acc;
    }, 0);
  }, [lancamentosPeriodo, atividades]);

  const atividadeMaisFrequente = useMemo(() => {
    const counts: Record<string, number> = {};
    lancamentosPeriodo.forEach(l => {
      counts[l.atividade_id] = (counts[l.atividade_id] || 0) + 1;
    });
    let topId = '';
    let topVal = 0;
    for (const [id, c] of Object.entries(counts)) {
      if (c > topVal) {
        topVal = c;
        topId = id;
      }
    }
    const ativ = atividades.find(a => a.id === topId);
    return ativ ? { nome: ativ.nome, contagem: topVal } : { nome: 'Nenhuma no período', contagem: 0 };
  }, [lancamentosPeriodo, atividades]);

  // 1. Gráfico de Evolução Mensal (Linhas por Mês)
  const dadosEvolucaoMensal = useMemo(() => {
    return MESES_SIGLAS.map((sigla, idx) => {
      const mesNum = idx + 1;
      const lancsMes = lancamentosPeriodo.filter(l => {
        const d = new Date(l.data + 'T00:00:00');
        return d.getMonth() + 1 === mesNum;
      });

      const qtd = lancsMes.reduce((acc, curr) => {
        const ativ = atividades.find(a => a.id === curr.atividade_id);
        return ativ?.tipo_medida === 'quantidade' ? acc + (curr.quantidade || 0) : acc;
      }, 0);

      const horas = lancsMes.reduce((acc, curr) => {
        const ativ = atividades.find(a => a.id === curr.atividade_id);
        return ativ?.tipo_medida === 'horas' ? acc + (curr.horas || 0) : acc;
      }, 0);

      return {
        mes: sigla,
        Atendimentos: qtd,
        Horas: Number(horas.toFixed(1))
      };
    });
  }, [lancamentosPeriodo, atividades]);

  // 2. Gráfico de Distribuição por Atividade (Barras Horizontais Top 8)
  const dadosTopAtividades = useMemo(() => {
    const mapa: Record<string, { nome: string; total: number; tipo: string }> = {};

    lancamentosPeriodo.forEach(l => {
      const ativ = atividades.find(a => a.id === l.atividade_id);
      if (!ativ) return;
      if (!mapa[ativ.id]) {
        mapa[ativ.id] = {
          nome: ativ.nome.length > 32 ? ativ.nome.substring(0, 30) + '...' : ativ.nome,
          total: 0,
          tipo: ativ.tipo_medida
        };
      }
      mapa[ativ.id].total += l.quantidade || l.horas || 0;
    });

    return Object.values(mapa)
      .sort((a, b) => b.total - a.total)
      .slice(0, 7);
  }, [lancamentosPeriodo, atividades]);

  // 3. Gráfico Comparação Entre Equipes (Barras Agrupadas)
  const dadosComparacaoEquipes = useMemo(() => {
    return equipes.map(eq => {
      const lancsEq = lancamentosPeriodo.filter(l => l.equipe_id === eq.id);
      const qtd = lancsEq.reduce((acc, curr) => {
        const ativ = atividades.find(a => a.id === curr.atividade_id);
        return ativ?.tipo_medida === 'quantidade' ? acc + (curr.quantidade || 0) : acc;
      }, 0);
      const hrs = lancsEq.reduce((acc, curr) => {
        const ativ = atividades.find(a => a.id === curr.atividade_id);
        return ativ?.tipo_medida === 'horas' ? acc + (curr.horas || 0) : acc;
      }, 0);

      return {
        nome: eq.sigla || eq.nome.substring(0, 16),
        Atendimentos: qtd,
        Horas: Number(hrs.toFixed(1))
      };
    });
  }, [equipes, lancamentosPeriodo, atividades]);

  // 4. Gráfico Horas por Categoria (Barras Empilhadas)
  const dadosHorasPorCategoria = useMemo(() => {
    return categorias.map(cat => {
      const lancsCat = lancamentosPeriodo.filter(l => {
        const ativ = atividades.find(a => a.id === l.atividade_id);
        return ativ?.categoria_id === cat.id && ativ?.tipo_medida === 'horas';
      });

      const totalHorasCat = lancsCat.reduce((acc, curr) => acc + (curr.horas || 0), 0);

      return {
        categoria: cat.nome.length > 20 ? cat.nome.substring(0, 18) + '...' : cat.nome,
        Horas: Number(totalHorasCat.toFixed(1))
      };
    }).filter(item => item.Horas > 0);
  }, [categorias, lancamentosPeriodo, atividades]);

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Barra de Filtros Avançados */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
        <div className="flex items-center justify-between border-b border-slate-100 pb-2">
          <div className="flex items-center gap-2">
            <Filter className="w-4 h-4 text-blue-600" />
            <span className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Painel de Indicadores &bull; Filtros Analíticos
            </span>
          </div>
          <span className="text-[11px] text-slate-400">
            {lancamentosPeriodo.length} lançamentos considerados no período
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-3 text-xs">
          {/* Tipo de Período */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Período:</label>
            <select
              value={tipoPeriodo}
              onChange={(e) => setTipoPeriodo(e.target.value as any)}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium"
            >
              <option value="ano">Ano Completo</option>
              <option value="trimestre">Por Trimestre</option>
              <option value="mes">Mês Específico</option>
              <option value="personalizado">Intervalo Personalizado</option>
            </select>
          </div>

          {/* Ano / Mês / Trimestre condicional */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Exercício / Ano:</label>
            <div className="flex gap-1.5">
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800 font-medium"
              >
                {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              {tipoPeriodo === 'mes' && (
                <select
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-800"
                >
                  {MESES_NOMES.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>{m}</option>
                  ))}
                </select>
              )}

              {tipoPeriodo === 'trimestre' && (
                <select
                  value={trimestre}
                  onChange={(e) => setTrimestre(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2 py-1.5 bg-white text-slate-800"
                >
                  <option value={1}>1º Trimestre (Jan-Mar)</option>
                  <option value={2}>2º Trimestre (Abr-Jun)</option>
                  <option value={3}>3º Trimestre (Jul-Set)</option>
                  <option value={4}>4º Trimestre (Out-Dez)</option>
                </select>
              )}
            </div>
          </div>

          {/* Equipe */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Equipe:</label>
            <select
              value={equipeFiltro}
              onChange={(e) => setEquipeFiltro(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="todas">Todas as Equipes</option>
              {equipes.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nome}</option>
              ))}
            </select>
          </div>

          {/* Categoria */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Categoria:</label>
            <select
              value={categoriaFiltro}
              onChange={(e) => setCategoriaFiltro(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="todas">Todas as Categorias</option>
              {categorias.map(c => (
                <option key={c.id} value={c.id}>{c.nome}</option>
              ))}
            </select>
          </div>

          {/* Servidor */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">Servidor:</label>
            <select
              value={usuarioFiltro}
              onChange={(e) => setUsuarioFiltro(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="todos">Todos os Servidores</option>
              {profiles.map(p => (
                <option key={p.id} value={p.id}>{p.nome_completo}</option>
              ))}
            </select>
          </div>
        </div>

        {tipoPeriodo === 'personalizado' && (
          <div className="flex items-center gap-3 pt-2 text-xs border-t border-slate-100">
            <span className="font-semibold text-slate-600">Intervalo:</span>
            <input
              type="date"
              value={dataInicio}
              onChange={(e) => setDataInicio(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1"
            />
            <span className="text-slate-400">até</span>
            <input
              type="date"
              value={dataFim}
              onChange={(e) => setDataFim(e.target.value)}
              className="border border-slate-300 rounded px-2 py-1"
            />
          </div>
        )}
      </div>

      {/* Cartões de Indicadores Chave */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Atendimentos */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-blue-50 text-blue-700 flex items-center justify-center shrink-0">
            <CheckCircle className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Atendimentos / Operações
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {formatarNumeroBR(totalAtendimentos, 0)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Lançamentos em unidades</div>
          </div>
        </div>

        {/* Total Horas */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-amber-50 text-amber-700 flex items-center justify-center shrink-0">
            <Clock className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Carga Horária Registrada
            </div>
            <div className="text-2xl font-bold text-slate-900 mt-0.5">
              {formatarHorasBR(totalHoras)}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Atendimentos e reuniões</div>
          </div>
        </div>

        {/* Atividade Mais Frequente */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-emerald-50 text-emerald-700 flex items-center justify-center shrink-0">
            <Award className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide truncate">
              Atividade Mais Frequente
            </div>
            <div className="text-sm font-bold text-slate-900 mt-0.5 truncate" title={atividadeMaisFrequente.nome}>
              {atividadeMaisFrequente.nome}
            </div>
            <div className="text-[10px] text-emerald-700 font-semibold mt-0.5">
              {atividadeMaisFrequente.contagem} lançamentos
            </div>
          </div>
        </div>

        {/* Variação vs Período Anterior */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs flex items-center gap-4">
          <div className="w-12 h-12 rounded-xl bg-purple-50 text-purple-700 flex items-center justify-center shrink-0">
            <TrendingUp className="w-6 h-6" />
          </div>
          <div>
            <div className="text-[11px] font-semibold text-slate-500 uppercase tracking-wide">
              Variação vs Ano Anterior
            </div>
            <div className={`text-2xl font-bold mt-0.5 ${variacaoPercentual.startsWith('-') ? 'text-rose-600' : 'text-emerald-600'}`}>
              {variacaoPercentual}
            </div>
            <div className="text-[10px] text-slate-400 mt-0.5">Comparativo do exercício</div>
          </div>
        </div>
      </div>

      {/* Grid de Gráficos em Recharts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
        {/* 1. Evolução Mensal (Linha) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <TrendingUp className="w-4 h-4 text-blue-600" />
              <span>Evolução Mensal no Exercício ({ano})</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Qtd e Horas</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <LineChart data={dadosEvolucaoMensal} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="mes" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    name === 'Horas' ? formatarHorasBR(Number(value)) : formatarNumeroBR(Number(value), 0),
                    name
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Line type="monotone" dataKey="Atendimentos" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 4 }} activeDot={{ r: 6 }} />
                <Line type="monotone" dataKey="Horas" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 4 }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 2. Top Atividades mais Demandadas (Barras Horizontais) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <BarChart3 className="w-4 h-4 text-blue-600" />
              <span>Distribuição por Atividade (Mais Demandadas)</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Top 7</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart
                layout="vertical"
                data={dadosTopAtividades}
                margin={{ top: 10, right: 30, left: 30, bottom: 0 }}
              >
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis type="number" tick={{ fontSize: 11 }} />
                <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={120} />
                <Tooltip
                  formatter={(value: any) => [formatarNumeroBR(Number(value), 0), 'Volume']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 3. Comparação Entre Equipes (Barras Agrupadas) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-4 h-4 text-blue-600" />
              <span>Comparativo Entre Equipes de Trabalho</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Por Unidade</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosComparacaoEquipes} margin={{ top: 10, right: 20, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="nome" tick={{ fontSize: 11 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any, name: any) => [
                    name === 'Horas' ? formatarHorasBR(Number(value)) : formatarNumeroBR(Number(value), 0),
                    name
                  ]}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                <Bar dataKey="Atendimentos" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                <Bar dataKey="Horas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* 4. Horas por Categoria (Barras Empilhadas) */}
        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider flex items-center gap-1.5">
              <Layers className="w-4 h-4 text-blue-600" />
              <span>Carga Horária por Categoria Temática</span>
            </h3>
            <span className="text-[10px] text-slate-400 font-mono">Horas Totais</span>
          </div>

          <div className="h-64 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={dadosHorasPorCategoria} margin={{ top: 10, right: 20, left: 10, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                <XAxis dataKey="categoria" tick={{ fontSize: 10 }} />
                <YAxis tick={{ fontSize: 11 }} />
                <Tooltip
                  formatter={(value: any) => [formatarHorasBR(Number(value)), 'Horas']}
                  contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, borderColor: '#e2e8f0', fontSize: 12 }}
                />
                <Bar dataKey="Horas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Tabela Dinâmica: Atividades x Meses (Resumo Anual Consolidado) */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="px-4 py-3 bg-slate-50 border-b border-slate-200 flex items-center justify-between">
          <div className="flex items-center gap-2">
            <TableIcon className="w-4 h-4 text-blue-600" />
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Tabela Dinâmica Consolidada: Atividades &times; Meses ({ano})
            </h3>
          </div>
          <span className="text-[11px] text-slate-500 hidden sm:inline">
            Equivalente ao Resumo Anual das planilhas legadas
          </span>
        </div>

        <div className="overflow-x-auto max-h-[480px]">
          <table className="w-full text-xs border-collapse">
            <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 z-10 border-b border-slate-200">
              <tr>
                <th className="p-2.5 text-left min-w-[260px] sticky left-0 bg-slate-100 border-r border-slate-200">
                  Atividade do Catálogo
                </th>
                <th className="p-2 text-center w-16 border-r border-slate-200">Tipo</th>
                {MESES_SIGLAS.map(sigla => (
                  <th key={sigla} className="p-1.5 text-center min-w-[36px] border-r border-slate-200">
                    {sigla}
                  </th>
                ))}
                <th className="p-2 text-center bg-slate-200 text-slate-900 min-w-[65px] sticky right-0">
                  Total Ano
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {atividades.map(ativ => {
                let somaAno = 0;
                const valoresMensais = MESES_SIGLAS.map((_, idx) => {
                  const mNum = idx + 1;
                  const lancs = lancamentosPeriodo.filter(l => {
                    const d = new Date(l.data + 'T00:00:00');
                    return l.atividade_id === ativ.id && d.getFullYear() === ano && d.getMonth() + 1 === mNum;
                  });

                  const val = lancs.reduce((acc, curr) => {
                    return acc + (ativ.tipo_medida === 'quantidade' ? (curr.quantidade || 0) : (curr.horas || 0));
                  }, 0);

                  somaAno += val;
                  return val;
                });

                return (
                  <tr key={ativ.id} className="hover:bg-slate-50/70 transition">
                    <td className="p-2.5 font-medium text-slate-900 sticky left-0 bg-white border-r border-slate-200">
                      <div className="truncate max-w-[260px]" title={ativ.nome}>
                        {ativ.nome}
                      </div>
                      <div className="text-[10px] text-slate-400">{ativ.categoria?.nome}</div>
                    </td>
                    <td className="p-1.5 text-center border-r border-slate-200">
                      <Badge variant={ativ.tipo_medida === 'horas' ? 'amber' : 'blue'} size="sm">
                        {ativ.tipo_medida === 'horas' ? 'Horas' : 'Qtd'}
                      </Badge>
                    </td>
                    {valoresMensais.map((v, i) => (
                      <td key={i} className="p-1 text-center font-mono text-slate-700 border-r border-slate-100">
                        {v > 0 ? (ativ.tipo_medida === 'horas' ? formatarHorasBR(v) : formatarNumeroBR(v, 0)) : '-'}
                      </td>
                    ))}
                    <td className="p-2 text-center font-mono font-bold text-slate-900 bg-slate-50 sticky right-0">
                      {somaAno > 0 ? (ativ.tipo_medida === 'horas' ? formatarHorasBR(somaAno) : formatarNumeroBR(somaAno, 0)) : '-'}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
