import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { SisRHRepository } from '../services/supabase';
import { ExportService } from '../services/exportService';
import {
  formatarNumeroBR,
  formatarHorasBR,
  formatarDataBR,
  MESES_NOMES
} from '../utils/formatters';
import { computeIndicadoresRelatorio } from '../utils/reportCharts';
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
  FileSpreadsheet,
  Download,
  Printer,
  TrendingUp,
  BarChart3,
  Users,
  Layers
} from 'lucide-react';

export const Relatorios: React.FC = () => {
  const { equipes, currentUser } = useAuth();

  const hoje = new Date();
  const [tipoRelatorio, setTipoRelatorio] = useState<'mensal' | 'anual'>('mensal');
  const [ano, setAno] = useState<number>(hoje.getFullYear());
  const [mes, setMes] = useState<number>(hoje.getMonth() + 1);
  const [equipeId, setEquipeId] = useState<string>('todas');
  const [incluirFigurasIndicadores, setIncluirFigurasIndicadores] = useState<boolean>(true);
  const [incluirDetalhamentoHoras, setIncluirDetalhamentoHoras] = useState<boolean>(true);

  const atividades = useMemo(() => SisRHRepository.getAtividades(), []);
  const categorias = useMemo(() => SisRHRepository.getCategorias(), []);
  const todosLancamentos = useMemo(() => SisRHRepository.getLancamentos(), []);

  const equipeObjeto = useMemo(() => {
    if (equipeId === 'todas') return undefined;
    return equipes.find(e => e.id === equipeId);
  }, [equipes, equipeId]);

  // Filtragem dos lançamentos
  const lancamentosFiltrados = useMemo(() => {
    return todosLancamentos.filter(l => {
      const d = new Date(l.data + 'T00:00:00');
      if (d.getFullYear() !== ano) return false;
      if (tipoRelatorio === 'mensal' && d.getMonth() + 1 !== mes) return false;
      if (equipeId !== 'todas' && l.equipe_id !== equipeId) return false;
      return true;
    });
  }, [todosLancamentos, tipoRelatorio, ano, mes, equipeId]);

  // Totais agregados
  const totalQuantidade = useMemo(() => {
    return lancamentosFiltrados.reduce((acc, curr) => {
      const ativ = atividades.find(a => a.id === curr.atividade_id);
      return ativ?.tipo_medida === 'quantidade' ? acc + (curr.quantidade || 0) : acc;
    }, 0);
  }, [lancamentosFiltrados, atividades]);

  const totalHoras = useMemo(() => {
    return lancamentosFiltrados.reduce((acc, curr) => {
      const ativ = atividades.find(a => a.id === curr.atividade_id);
      return ativ?.tipo_medida === 'horas' ? acc + (curr.horas || 0) : acc;
    }, 0);
  }, [lancamentosFiltrados, atividades]);

  // Dados das 4 figuras do Painel de Indicadores para pré-visualização e PDF
  const indicadoresFiguras = useMemo(() => {
    return computeIndicadoresRelatorio(
      lancamentosFiltrados,
      atividades,
      equipes,
      categorias,
      { ano, mes: tipoRelatorio === 'mensal' ? mes : undefined }
    );
  }, [lancamentosFiltrados, atividades, equipes, categorias, ano, mes, tipoRelatorio]);

  // Ações de exportação
  const handleExportarExcel = () => {
    ExportService.exportarExcelAnual(
      lancamentosFiltrados,
      atividades,
      equipeObjeto,
      ano
    );
  };

  const handleExportarPDF = () => {
    ExportService.exportarPDF(
      lancamentosFiltrados,
      atividades,
      {
        equipe: equipeObjeto,
        equipes,
        categorias,
        ano,
        mes: tipoRelatorio === 'mensal' ? mes : undefined,
        incluirFigurasIndicadores,
        incluirDetalhamentoHoras,
        emitidoPor: currentUser?.nome_completo
      }
    );
  };

  const handleExportarCSV = () => {
    ExportService.exportarCSV(lancamentosFiltrados, equipeObjeto?.nome);
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Cabeçalho da Página */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <FileSpreadsheet className="w-5 h-5 text-blue-700" />
            <span>Relatórios Oficiais e Exportação Homologada</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Geração de documentos em formatos padronizados para prestação de contas, auditoria e controle do PGD
          </p>
        </div>

        {/* Botões de Ação Rápida de Exportação */}
        <div className="flex flex-wrap items-center gap-2">
          <button
            onClick={handleExportarExcel}
            className="flex items-center gap-1.5 px-3 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            title="Gera planilha com abas mensais e resumo anual"
          >
            <FileSpreadsheet className="w-4 h-4" />
            <span>Exportar Excel (.xlsx)</span>
          </button>

          <button
            onClick={handleExportarPDF}
            className="flex items-center gap-1.5 px-3 py-2 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            title="Gera documento A4 com cabeçalho institucional brasileiro"
          >
            <Printer className="w-4 h-4" />
            <span>Gerar PDF Institucional</span>
          </button>

          <button
            onClick={handleExportarCSV}
            className="flex items-center gap-1.5 px-3 py-2 bg-slate-700 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold shadow-xs transition"
            title="Gera dados em CSV aberto com delimitador ponto-e-vírgula"
          >
            <Download className="w-4 h-4" />
            <span>Exportar CSV</span>
          </button>
        </div>
      </div>

      {/* Parâmetros do Relatório */}
      <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-xs space-y-4">
        <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
          Configuração dos Parâmetros de Emissão
        </h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 text-xs">
          {/* Tipo de Relatório */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Escopo Temporal:
            </label>
            <div className="flex rounded-lg border border-slate-300 p-0.5 bg-slate-100">
              <button
                onClick={() => setTipoRelatorio('mensal')}
                className={`flex-1 py-1.5 text-center font-medium rounded-md transition ${
                  tipoRelatorio === 'mensal' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Mensal
              </button>
              <button
                onClick={() => setTipoRelatorio('anual')}
                className={`flex-1 py-1.5 text-center font-medium rounded-md transition ${
                  tipoRelatorio === 'anual' ? 'bg-white text-blue-700 shadow-xs' : 'text-slate-600'
                }`}
              >
                Anual Consolidado
              </button>
            </div>
          </div>

          {/* Exercício / Mês */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Período de Referência:
            </label>
            <div className="flex gap-2">
              <select
                value={ano}
                onChange={(e) => setAno(Number(e.target.value))}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white font-medium"
              >
                {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
              </select>

              {tipoRelatorio === 'mensal' && (
                <select
                  value={mes}
                  onChange={(e) => setMes(Number(e.target.value))}
                  className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white"
                >
                  {MESES_NOMES.map((m, idx) => (
                    <option key={idx + 1} value={idx + 1}>{m}</option>
                  ))}
                </select>
              )}
            </div>
          </div>

          {/* Equipe */}
          <div>
            <label className="block text-[11px] font-semibold text-slate-600 mb-1">
              Equipe / Setor:
            </label>
            <select
              value={equipeId}
              onChange={(e) => setEquipeId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-1.5 bg-white text-slate-800"
            >
              <option value="todas">Todas as Equipes (Consolidado)</option>
              {equipes.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nome}</option>
              ))}
            </select>
          </div>

          {/* Opções de Conteúdo do Relatório */}
          <div className="flex flex-col justify-end gap-2 pb-0.5">
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={incluirFigurasIndicadores}
                onChange={(e) => setIncluirFigurasIndicadores(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Incluir figuras do Painel de Indicadores
              </span>
            </label>
            <label className="flex items-center gap-2 cursor-pointer select-none">
              <input
                type="checkbox"
                checked={incluirDetalhamentoHoras}
                onChange={(e) => setIncluirDetalhamentoHoras(e.target.checked)}
                className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
              />
              <span className="text-xs font-semibold text-slate-700">
                Incluir detalhamento de horas no PDF
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Pré-visualização do Relatório Oficial (Layout Impresso Simulado) */}
      <div className="bg-white rounded-xl border border-slate-300 shadow-sm overflow-hidden">
        {/* Faixa Superior Institucional */}
        <div className="p-6 bg-slate-50 border-b border-slate-200 text-center space-y-1">
          <div className="text-[11px] font-bold text-slate-600 uppercase tracking-widest">
            FUNDAÇÃO OSWALDO CRUZ &bull; FIOCRUZ MINAS
          </div>
          <div className="text-xs font-semibold text-slate-500">
            SERVIÇO DE GESTÃO DE PESSOAS (SGP) &bull; INSTITUTO RENÉ RACHOU
          </div>
          <h1 className="text-base font-bold text-slate-900 pt-1">
            {tipoRelatorio === 'mensal'
              ? `RELATÓRIO MENSAL DE ATIVIDADES E ATENDIMENTOS - ${MESES_NOMES[mes - 1].toUpperCase()} DE ${ano}`
              : `RELATÓRIO ANUAL CONSOLIDADO DE ATIVIDADES - EXERCÍCIO ${ano}`}
          </h1>
          <div className="flex items-center justify-center gap-6 text-xs text-slate-500 pt-2">
            <span><strong>Equipe:</strong> {equipeObjeto ? equipeObjeto.nome : 'Todas as Equipes'}</span>
            <span>&bull;</span>
            <span><strong>Emissão:</strong> {hoje.toLocaleDateString('pt-BR')}</span>
            <span>&bull;</span>
            <span><strong>Total de Registros:</strong> {lancamentosFiltrados.length}</span>
          </div>
        </div>

        {/* Resumo Sintético em Caixas */}
        <div className="grid grid-cols-2 divide-x divide-slate-200 border-b border-slate-200 bg-white">
          <div className="p-4 text-center">
            <div className="text-xs text-slate-500 font-semibold uppercase">Total de Atendimentos / Operações</div>
            <div className="text-2xl font-bold text-blue-900 mt-1">{formatarNumeroBR(totalQuantidade, 0)}</div>
          </div>
          <div className="p-4 text-center">
            <div className="text-xs text-slate-500 font-semibold uppercase">Carga Horária Total em Horas</div>
            <div className="text-2xl font-bold text-amber-900 mt-1">{formatarHorasBR(totalHoras)}</div>
          </div>
        </div>

        {/* Tabela de Atividades do Período */}
        <div className="p-6 space-y-6">
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
              1. Quadro Quantitativo por Atividade
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Atividade Oficial</th>
                    <th className="py-2.5 px-3">Categoria</th>
                    <th className="py-2.5 px-3">Unidade de Medida</th>
                    <th className="py-2.5 px-3 text-right">Total Registrado</th>
                    <th className="py-2.5 px-3 text-center">Lançamentos</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {atividades.map(ativ => {
                    const ativLancs = lancamentosFiltrados.filter(l => l.atividade_id === ativ.id);
                    if (ativLancs.length === 0) return null;

                    const total = ativLancs.reduce((acc, curr) => {
                      return acc + (ativ.tipo_medida === 'quantidade' ? (curr.quantidade || 0) : (curr.horas || 0));
                    }, 0);

                    return (
                      <tr key={ativ.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{ativ.nome}</td>
                        <td className="py-2.5 px-3 text-slate-600">{ativ.categoria?.nome}</td>
                        <td className="py-2.5 px-3">
                          <Badge variant={ativ.tipo_medida === 'horas' ? 'amber' : 'blue'} size="sm">
                            {ativ.tipo_medida === 'horas' ? 'Horas' : 'Quantidade'}
                          </Badge>
                        </td>
                        <td className="py-2.5 px-3 text-right font-mono font-bold text-slate-900">
                          {ativ.tipo_medida === 'horas' ? formatarHorasBR(total) : formatarNumeroBR(total, 0)}
                        </td>
                        <td className="py-2.5 px-3 text-center text-slate-500 font-mono">
                          {ativLancs.length}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          {/* 2. Figuras do Painel de Indicadores */}
          {incluirFigurasIndicadores && (
            <div className="space-y-3">
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                2. Figuras do Painel de Indicadores
              </h4>

              <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                {/* Figura 1: Evolução Temporal */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <TrendingUp className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Figura 1 &ndash; {indicadoresFiguras.tituloEvolucao}</span>
                    </h5>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">Qtd e Horas</span>
                  </div>
                  <div className="h-56 w-full">
                    {indicadoresFiguras.evolucao.some(p => p.Atendimentos > 0 || p.Horas > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <LineChart data={indicadoresFiguras.evolucao} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="label" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(value: any, name: any) => [
                              name === 'Horas' ? formatarHorasBR(Number(value)) : formatarNumeroBR(Number(value), 0),
                              name
                            ]}
                            contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, borderColor: '#e2e8f0', fontSize: 11 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Line type="monotone" dataKey="Atendimentos" stroke="#2563eb" strokeWidth={2.5} dot={{ r: 3 }} />
                          <Line type="monotone" dataKey="Horas" stroke="#f59e0b" strokeWidth={2.5} dot={{ r: 3 }} />
                        </LineChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Nenhum lançamento registrado no período selecionado.
                      </div>
                    )}
                  </div>
                </div>

                {/* Figura 2: Distribuição por Atividade (Top 7) */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <BarChart3 className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Figura 2 &ndash; Distribuição por Atividade (Mais Demandadas)</span>
                    </h5>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">Top 7</span>
                  </div>
                  <div className="h-56 w-full">
                    {indicadoresFiguras.topAtividades.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                          layout="vertical"
                          data={indicadoresFiguras.topAtividades}
                          margin={{ top: 8, right: 24, left: 20, bottom: 0 }}
                        >
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis type="number" tick={{ fontSize: 10 }} />
                          <YAxis type="category" dataKey="nome" tick={{ fontSize: 10 }} width={115} />
                          <Tooltip
                            formatter={(value: any) => [formatarNumeroBR(Number(value), 0), 'Volume']}
                            contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, borderColor: '#e2e8f0', fontSize: 11 }}
                          />
                          <Bar dataKey="total" fill="#3b82f6" radius={[0, 4, 4, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Nenhuma atividade registrada no período selecionado.
                      </div>
                    )}
                  </div>
                </div>

                {/* Figura 3: Comparativo Entre Equipes */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Users className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Figura 3 &ndash; Comparativo Entre Equipes de Trabalho</span>
                    </h5>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">Por Unidade</span>
                  </div>
                  <div className="h-56 w-full">
                    {indicadoresFiguras.comparacaoEquipes.some(e => e.Atendimentos > 0 || e.Horas > 0) ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={indicadoresFiguras.comparacaoEquipes} margin={{ top: 8, right: 16, left: 0, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="nome" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(value: any, name: any) => [
                              name === 'Horas' ? formatarHorasBR(Number(value)) : formatarNumeroBR(Number(value), 0),
                              name
                            ]}
                            contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, borderColor: '#e2e8f0', fontSize: 11 }}
                          />
                          <Legend wrapperStyle={{ fontSize: 11 }} />
                          <Bar dataKey="Atendimentos" fill="#1d4ed8" radius={[4, 4, 0, 0]} />
                          <Bar dataKey="Horas" fill="#f59e0b" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Sem dados de equipes para o período selecionado.
                      </div>
                    )}
                  </div>
                </div>

                {/* Figura 4: Carga Horária por Categoria Temática */}
                <div className="bg-white p-4 rounded-xl border border-slate-200 space-y-2.5">
                  <div className="flex items-center justify-between gap-2">
                    <h5 className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                      <Layers className="w-4 h-4 text-blue-600 shrink-0" />
                      <span>Figura 4 &ndash; Carga Horária por Categoria Temática</span>
                    </h5>
                    <span className="text-[10px] text-slate-400 font-mono shrink-0">Horas Totais</span>
                  </div>
                  <div className="h-56 w-full">
                    {indicadoresFiguras.horasPorCategoria.length > 0 ? (
                      <ResponsiveContainer width="100%" height="100%">
                        <BarChart data={indicadoresFiguras.horasPorCategoria} margin={{ top: 8, right: 16, left: 6, bottom: 0 }}>
                          <CartesianGrid strokeDasharray="3 3" stroke="#f1f5f9" />
                          <XAxis dataKey="categoria" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip
                            formatter={(value: any) => [formatarHorasBR(Number(value)), 'Horas']}
                            contentStyle={{ backgroundColor: '#ffffff', borderRadius: 8, borderColor: '#e2e8f0', fontSize: 11 }}
                          />
                          <Bar dataKey="Horas" fill="#8b5cf6" radius={[4, 4, 0, 0]} />
                        </BarChart>
                      </ResponsiveContainer>
                    ) : (
                      <div className="h-full flex items-center justify-center text-xs text-slate-400">
                        Nenhuma atividade medida em horas no período selecionado.
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quadro Detalhado de Lançamentos em Horas (se marcado) */}
          {incluirDetalhamentoHoras && (
            <div>
              <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-3">
                {incluirFigurasIndicadores ? '3.' : '2.'} Detalhamento de Atividades Temporais (Horas e Observações)
              </h4>
              <div className="border border-slate-200 rounded-lg overflow-hidden">
                <table className="w-full text-xs text-left">
                  <thead className="bg-slate-100 font-bold text-slate-800 border-b border-slate-200">
                    <tr>
                      <th className="py-2.5 px-3">Data</th>
                      <th className="py-2.5 px-3">Atividade</th>
                      <th className="py-2.5 px-3 text-right">Duração</th>
                      <th className="py-2.5 px-3">Descrição / Pauta</th>
                      <th className="py-2.5 px-3">Observações / Encaminhamentos</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {lancamentosFiltrados.filter(l => l.horas && l.horas > 0).map(l => (
                      <tr key={l.id} className="hover:bg-slate-50">
                        <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">{formatarDataBR(l.data)}</td>
                        <td className="py-2 px-3 font-medium text-slate-900">{l.atividade?.nome}</td>
                        <td className="py-2 px-3 text-right font-mono font-bold text-amber-800">{formatarHorasBR(l.horas)}</td>
                        <td className="py-2 px-3 text-slate-700">{l.descricao || '-'}</td>
                        <td className="py-2 px-3 text-slate-500 italic">{l.observacao || '-'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
