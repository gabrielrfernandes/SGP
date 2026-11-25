import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { SisRHRepository } from '../services/supabase';
import { ImportService, PlanilhaLinhaExtraida, MapeamentoAtividade, ItemImportacaoFinal } from '../services/importService';
import * as XLSX from 'xlsx';
import {
  UploadCloud,
  FileSpreadsheet,
  CheckCircle2,
  AlertCircle,
  ArrowRight,
  RefreshCw,
  Download,
  Info,
  Layers,
  HelpCircle
} from 'lucide-react';
import { formatarNumeroBR, formatarHorasBR, MESES_NOMES } from '../utils/formatters';

export const Importacao: React.FC = () => {
  const { equipes, currentUser } = useAuth();

  const [etapa, setEtapa] = useState<'upload' | 'mapeamento' | 'preview' | 'sucesso'>('upload');
  const [arquivo, setArquivo] = useState<File | null>(null);
  const [anoDestino, setAnoDestino] = useState<number>(new Date().getFullYear());
  const [equipeDestinoId, setEquipeDestinoId] = useState<string>(equipes[0]?.id || '');

  // Dados extraídos
  const [linhasExtraidas, setLinhasExtraidas] = useState<PlanilhaLinhaExtraida[]>([]);
  const [abasEncontradas, setAbasEncontradas] = useState<string[]>([]);
  const [mapeamentos, setMapeamentos] = useState<MapeamentoAtividade[]>([]);
  const [itensFinais, setItensFinais] = useState<ItemImportacaoFinal[]>([]);

  // Carregamento e mensagens
  const [carregando, setCarregando] = useState<boolean>(false);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  const catalogoAtividades = useMemo(() => SisRHRepository.getAtividades(), []);

  // Processar arquivo
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setArquivo(file);
    setCarregando(true);
    setMensagemErro(null);

    try {
      const resultado = await ImportService.processarArquivoExcel(file);
      if (resultado.linhas.length === 0) {
        throw new Error('Nenhuma linha válida de atividade foi encontrada nas abas mensais da planilha.');
      }

      const sugestoes = ImportService.gerarSugestoesMapeamento(
        resultado.nomesAtividadesUnicas,
        catalogoAtividades
      );

      setLinhasExtraidas(resultado.linhas);
      setAbasEncontradas(resultado.abasEncontradas);
      setMapeamentos(sugestoes);
      setEtapa('mapeamento');
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao processar arquivo.');
    } finally {
      setCarregando(false);
    }
  };

  // Atualizar mapeamento manual
  const handleMapeamentoChange = (nomeOriginal: string, novaAtividadeId: string) => {
    setMapeamentos(prev => prev.map(m => {
      if (m.nomeOriginal === nomeOriginal) {
        return {
          ...m,
          atividadeIdSelecionada: novaAtividadeId,
          ignorar: false
        };
      }
      return m;
    }));
  };

  const handleToggleIgnorar = (nomeOriginal: string) => {
    setMapeamentos(prev => prev.map(m => {
      if (m.nomeOriginal === nomeOriginal) {
        return { ...m, ignorar: !m.ignorar };
      }
      return m;
    }));
  };

  // Avançar para pré-visualização
  const handleAvancarParaPreview = () => {
    if (!equipeDestinoId) {
      setMensagemErro('Selecione a equipe de destino dos lançamentos.');
      return;
    }

    const finais = ImportService.construirLancamentosParaImportacao(
      linhasExtraidas,
      mapeamentos,
      catalogoAtividades,
      equipeDestinoId,
      anoDestino
    );

    setItensFinais(finais);
    setEtapa('preview');
  };

  // Efetivar importação no banco
  const handleConfirmarImportacao = () => {
    if (!currentUser) return;
    setCarregando(true);

    try {
      let inseridos = 0;
      itensFinais.forEach(item => {
        SisRHRepository.saveLancamento({
          equipe_id: item.equipeId,
          atividade_id: item.atividadeId,
          registrado_por: currentUser.id,
          data: item.data,
          quantidade: item.quantidade,
          horas: item.horas,
          duracao_minutos: item.horas ? Math.round(item.horas * 60) : null,
          descricao: item.descricao,
          observacao: item.observacao,
        });
        inseridos++;
      });

      setEtapa('sucesso');
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao gravar os lançamentos.');
    } finally {
      setCarregando(false);
    }
  };

  // Baixar modelo de planilha legado para teste
  const handleBaixarPlanilhaModelo = () => {
    const wb = XLSX.utils.book_new();

    const dadosJan = [
      ['Atividade / Procedimento', 'Total do Mês', 'Observações / Ocorrências'],
      ['Inclusões e exclusões Fiosaúde', 24, 'Cadastramentos realizados no prazo legal'],
      ['Reuniões, alinhamentos e capacitações', 12.5, 'Reuniões de alinhamento com a chefia e CPPD'],
      ['Operações nos sistemas da folha (SIAPE, SIGEPE, AFD)', 85, 'Fechamento da folha e implantação de rubricas'],
      ['Atendimento presencial a aposentados/pensionistas', 18, 'Atendimentos de prova de vida em balcão'],
    ];

    const dadosFev = [
      ['Atividade / Procedimento', 'Total do Mês', 'Observações / Ocorrências'],
      ['Inclusões e exclusões Fiosaúde', 19, 'Movimentações normais'],
      ['Progressões funcionais', 14, 'Portarias emitidas e averbadas'],
      ['Movimentação de processos (SEI)', 32, 'Processos de aposentadoria instruídos'],
      ['Fiscalização de contratos (Empresa Valor)', 6.0, 'Ateste da fatura de serviços terceirizados'],
    ];

    const wsJan = XLSX.utils.aoa_to_sheet(dadosJan);
    const wsFev = XLSX.utils.aoa_to_sheet(dadosFev);

    XLSX.utils.book_append_sheet(wb, wsJan, 'Janeiro');
    XLSX.utils.book_append_sheet(wb, wsFev, 'Fevereiro');

    XLSX.writeFile(wb, 'Modelo_Planilha_Mensal_Legada_RH.xlsx');
  };

  return (
    <div className="p-4 sm:p-6 max-w-5xl mx-auto space-y-6">
      {/* Cabeçalho */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <UploadCloud className="w-5 h-5 text-blue-700" />
            <span>Migração e Importação de Planilhas Legadas</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Importa históricos das planilhas mensais antigas (uma aba por mês, coluna A=atividade, B=total, C=observações)
          </p>
        </div>

        <button
          onClick={handleBaixarPlanilhaModelo}
          className="flex items-center gap-1.5 px-3 py-2 bg-slate-100 hover:bg-slate-200 text-slate-700 rounded-lg text-xs font-semibold border border-slate-300 transition shrink-0"
        >
          <Download className="w-4 h-4 text-slate-600" />
          <span>Baixar Planilha Modelo (.xlsx)</span>
        </button>
      </div>

      {mensagemErro && (
        <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{mensagemErro}</span>
          </div>
          <button onClick={() => setMensagemErro(null)} className="font-bold text-rose-600">&times;</button>
        </div>
      )}

      {/* Indicador de Passos */}
      <div className="flex items-center justify-between bg-white px-6 py-3 rounded-xl border border-slate-200 text-xs font-semibold text-slate-600">
        <div className={`flex items-center gap-2 ${etapa === 'upload' ? 'text-blue-700 font-bold' : ''}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${etapa === 'upload' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>1</span>
          <span>Upload do Arquivo</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        <div className={`flex items-center gap-2 ${etapa === 'mapeamento' ? 'text-blue-700 font-bold' : ''}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${etapa === 'mapeamento' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>2</span>
          <span>Mapeamento Assistido</span>
        </div>
        <ArrowRight className="w-4 h-4 text-slate-300" />
        <div className={`flex items-center gap-2 ${etapa === 'preview' ? 'text-blue-700 font-bold' : ''}`}>
          <span className={`w-5 h-5 rounded-full flex items-center justify-center text-[10px] ${etapa === 'preview' ? 'bg-blue-600 text-white' : 'bg-slate-200'}`}>3</span>
          <span>Conferência e Gravação</span>
        </div>
      </div>

      {/* ======================================================== */}
      {/* ETAPA 1: UPLOAD                                          */}
      {/* ======================================================== */}
      {etapa === 'upload' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Equipe de Destino dos Lançamentos *
              </label>
              <select
                value={equipeDestinoId}
                onChange={(e) => setEquipeDestinoId(e.target.value)}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {equipes.map(eq => (
                  <option key={eq.id} value={eq.id}>{eq.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                Exercício / Ano da Planilha *
              </label>
              <select
                value={anoDestino}
                onChange={(e) => setAnoDestino(Number(e.target.value))}
                className="w-full text-xs border border-slate-300 rounded-lg px-3 py-2 bg-white"
              >
                {[2024, 2025, 2026, 2027].map(a => (
                  <option key={a} value={a}>{a}</option>
                ))}
              </select>
            </div>
          </div>

          {/* Área de Dropzone */}
          <div className="border-2 border-dashed border-slate-300 hover:border-blue-500 rounded-2xl p-8 text-center bg-slate-50/50 hover:bg-blue-50/20 transition cursor-pointer relative">
            <input
              type="file"
              accept=".xlsx, .xls"
              onChange={handleFileChange}
              className="absolute inset-0 opacity-0 cursor-pointer w-full h-full"
            />
            <div className="flex flex-col items-center justify-center space-y-2">
              <div className="w-12 h-12 rounded-full bg-blue-100 text-blue-700 flex items-center justify-center">
                <FileSpreadsheet className="w-6 h-6" />
              </div>
              <div className="text-sm font-semibold text-slate-800">
                Arraste o arquivo Excel (.xlsx) ou clique para selecionar
              </div>
              <p className="text-xs text-slate-500 max-w-md">
                O arquivo deve conter uma aba para cada mês (ex: Janeiro, Fevereiro...). A coluna A deve conter a atividade, a coluna B o total, e a coluna C as observações.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ETAPA 2: MAPEAMENTO ASSISTIDO                           */}
      {/* ======================================================== */}
      {etapa === 'mapeamento' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Mapeamento Assistido de Atividades
              </h3>
              <p className="text-xs text-slate-500">
                Encontramos <strong>{mapeamentos.length}</strong> atividades distintas em <strong>{linhasExtraidas.length}</strong> linhas de {abasEncontradas.length} abas.
              </p>
            </div>

            <button
              onClick={handleAvancarParaPreview}
              className="flex items-center gap-1.5 px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold shadow-xs"
            >
              <span>Avançar para Conferência</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Nome na Planilha Original</th>
                  <th className="py-2.5 px-3">Correspondência no Catálogo Oficial</th>
                  <th className="py-2.5 px-3 text-center w-24">Confiança</th>
                  <th className="py-2.5 px-3 text-center w-24">Ação</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {mapeamentos.map((m, idx) => (
                  <tr key={idx} className={`hover:bg-slate-50 ${m.ignorar ? 'opacity-40 bg-slate-50' : ''}`}>
                    <td className="py-2.5 px-3 font-medium text-slate-800">
                      {m.nomeOriginal}
                    </td>
                    <td className="py-2.5 px-3">
                      <select
                        disabled={m.ignorar}
                        value={m.atividadeIdSelecionada}
                        onChange={(e) => handleMapeamentoChange(m.nomeOriginal, e.target.value)}
                        className="w-full text-xs border border-slate-300 rounded-md px-2 py-1 bg-white"
                      >
                        {catalogoAtividades.map(a => (
                          <option key={a.id} value={a.id}>
                            [{a.tipo_medida.toUpperCase()}] {a.nome}
                          </option>
                        ))}
                      </select>
                    </td>
                    <td className="py-2.5 px-3 text-center font-mono">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        m.confianca >= 80 ? 'bg-emerald-100 text-emerald-800' :
                        m.confianca >= 40 ? 'bg-amber-100 text-amber-800' : 'bg-slate-100 text-slate-600'
                      }`}>
                        {m.confianca}%
                      </span>
                    </td>
                    <td className="py-2.5 px-3 text-center">
                      <button
                        onClick={() => handleToggleIgnorar(m.nomeOriginal)}
                        className={`text-[10px] font-semibold px-2 py-1 rounded transition ${
                          m.ignorar ? 'bg-blue-100 text-blue-700' : 'bg-slate-100 hover:bg-rose-100 text-slate-600 hover:text-rose-700'
                        }`}
                      >
                        {m.ignorar ? 'Restaurar' : 'Ignorar'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ETAPA 3: PREVIEW E CONFIRMAÇÃO                           */}
      {/* ======================================================== */}
      {etapa === 'preview' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-5">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900">
                Conferência dos Lançamentos a Serem Gravados
              </h3>
              <p className="text-xs text-slate-500">
                Total de <strong>{itensFinais.length}</strong> lançamentos prontos com carimbo no último dia de cada mês
              </p>
            </div>

            <div className="flex items-center gap-2">
              <button
                onClick={() => setEtapa('mapeamento')}
                className="px-3 py-1.5 text-xs text-slate-600 hover:bg-slate-100 rounded-lg"
              >
                Voltar Mapeamento
              </button>
              <button
                onClick={handleConfirmarImportacao}
                disabled={carregando}
                className="flex items-center gap-1.5 px-4 py-2 bg-emerald-700 hover:bg-emerald-800 text-white rounded-lg text-xs font-semibold shadow-xs"
              >
                <CheckCircle2 className="w-4 h-4" />
                <span>Confirmar e Efetivar Importação</span>
              </button>
            </div>
          </div>

          <div className="max-h-96 overflow-y-auto border border-slate-200 rounded-lg">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 text-slate-700 font-bold sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Data</th>
                  <th className="py-2.5 px-3">Atividade Mapeada</th>
                  <th className="py-2.5 px-3">Métrica / Valor</th>
                  <th className="py-2.5 px-3">Observações Preservadas</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {itensFinais.map((item, idx) => {
                  const ativ = catalogoAtividades.find(a => a.id === item.atividadeId);
                  return (
                    <tr key={idx} className="hover:bg-slate-50">
                      <td className="py-2 px-3 font-mono text-slate-700 whitespace-nowrap">{item.data}</td>
                      <td className="py-2 px-3 font-medium text-slate-900">{ativ?.nome}</td>
                      <td className="py-2 px-3 font-mono font-semibold">
                        {item.tipoMedida === 'horas' ? formatarHorasBR(item.horas) : `${item.quantidade} un`}
                      </td>
                      <td className="py-2 px-3 text-slate-500 italic max-w-xs truncate" title={item.observacao}>
                        {item.observacao}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ETAPA 4: SUCESSO                                         */}
      {/* ======================================================== */}
      {etapa === 'sucesso' && (
        <div className="bg-white p-8 rounded-xl border border-slate-200 shadow-xs text-center space-y-4">
          <div className="w-14 h-14 bg-emerald-100 text-emerald-700 rounded-full flex items-center justify-center mx-auto">
            <CheckCircle2 className="w-8 h-8" />
          </div>
          <h3 className="text-base font-bold text-slate-900">
            Importação Concluída com Sucesso!
          </h3>
          <p className="text-xs text-slate-600 max-w-md mx-auto">
            Foram inseridos <strong>{itensFinais.length}</strong> novos lançamentos históricos com carimbo de auditoria no catálogo oficial. Os dados já estão visíveis no Painel, Relatórios e Grade.
          </p>
          <div className="pt-2">
            <button
              onClick={() => {
                setEtapa('upload');
                setArquivo(null);
                setLinhasExtraidas([]);
                setItensFinais([]);
              }}
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold"
            >
              Importar Outra Planilha
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
