import * as XLSX from 'xlsx';
import { Atividade } from '../types/database';
import { lastDayOfMonth } from 'date-fns';

export interface PlanilhaLinhaExtraida {
  abaNome: string;
  mes: number; // 1 a 12
  nomeAtividadeOriginal: string;
  total: number;
  observacoes: string;
}

export interface MapeamentoAtividade {
  nomeOriginal: string;
  atividadeIdSugerida: string;
  confianca: number; // 0 a 100
  atividadeIdSelecionada: string;
  ignorar: boolean;
}

export interface ItemImportacaoFinal {
  equipeId: string;
  atividadeId: string;
  data: string; // YYYY-MM-DD (último dia do mês)
  quantidade?: number | null;
  horas?: number | null;
  descricao: string;
  observacao: string;
  tipoMedida: 'quantidade' | 'horas';
}

const MESES_MAP: Record<string, number> = {
  jan: 1, janeiro: 1, '01': 1, '1': 1,
  fev: 2, fevereiro: 2, '02': 2, '2': 2,
  mar: 3, marco: 3, 'março': 3, '03': 3, '3': 3,
  abr: 4, abril: 4, '04': 4, '4': 4,
  mai: 5, maio: 5, '05': 5, '5': 5,
  jun: 6, junho: 6, '06': 6, '6': 6,
  jul: 7, julho: 7, '07': 7, '7': 7,
  ago: 8, agosto: 8, '08': 8, '8': 8,
  set: 9, setembro: 9, '09': 9, '9': 9,
  out: 10, outubro: 10, '10': 10,
  nov: 11, novembro: 11, '11': 11,
  dez: 12, dezembro: 12, '12': 12
};

function normalizarTexto(txt: string): string {
  return txt
    .toLowerCase()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .trim();
}

function calcularSimilaridade(str1: string, str2: string): number {
  const s1 = normalizarTexto(str1);
  const s2 = normalizarTexto(str2);
  if (s1 === s2) return 100;
  if (s1.includes(s2) || s2.includes(s1)) return 85;

  // Comparação por palavras-chave
  const palavras1 = s1.split(/\s+/).filter(w => w.length > 3);
  const palavras2 = s2.split(/\s+/).filter(w => w.length > 3);
  if (palavras1.length === 0 || palavras2.length === 0) return 0;

  let matches = 0;
  palavras1.forEach(p1 => {
    if (palavras2.some(p2 => p2.includes(p1) || p1.includes(p2))) {
      matches++;
    }
  });

  return Math.round((matches / Math.max(palavras1.length, palavras2.length)) * 100);
}

export const ImportService = {
  /**
   * Lê o arquivo .xlsx e extrai os dados linha a linha de cada aba mensal
   */
  async processarArquivoExcel(file: File): Promise<{
    linhas: PlanilhaLinhaExtraida[];
    nomesAtividadesUnicas: string[];
    abasEncontradas: string[];
  }> {
    const data = await file.arrayBuffer();
    const workbook = XLSX.read(data, { type: 'array' });
    const linhas: PlanilhaLinhaExtraida[] = [];
    const nomesUnicosSet = new Set<string>();
    const abasEncontradas: string[] = [];

    workbook.SheetNames.forEach(sheetName => {
      abasEncontradas.push(sheetName);
      const sheetNameNorm = normalizarTexto(sheetName);

      // Descobrir o mês da aba
      let mes = 0;
      for (const [chave, numMes] of Object.entries(MESES_MAP)) {
        if (sheetNameNorm.includes(chave)) {
          mes = numMes;
          break;
        }
      }

      // Se a aba for "resumo", "anual", "total", pula
      if (sheetNameNorm.includes('resumo') || sheetNameNorm.includes('anual') || sheetNameNorm.includes('consolidado')) {
        return;
      }

      if (mes === 0) {
        // Tentar inferir se for a posição da aba (ex: primeira aba = mês 1)
        const pos = workbook.SheetNames.indexOf(sheetName) + 1;
        if (pos >= 1 && pos <= 12) mes = pos;
        else return;
      }

      const worksheet = workbook.Sheets[sheetName];
      const json: any[][] = XLSX.utils.sheet_to_json(worksheet, { header: 1 });

      json.forEach((row, rowIndex) => {
        if (!row || row.length === 0) return;

        // Pula linhas de cabeçalho comuns
        const colA = String(row[0] || '').trim();
        if (!colA || rowIndex === 0 && (colA.toLowerCase().includes('atividade') || colA.toLowerCase().includes('descrição'))) {
          return;
        }

        const colB = row[1];
        let total = 0;
        if (typeof colB === 'number') {
          total = colB;
        } else if (typeof colB === 'string') {
          // Trata formatos como "1,5" ou "1.5" ou "1:30"
          if (colB.includes(':')) {
            const [h, m] = colB.split(':').map(Number);
            total = (h || 0) + (m || 0) / 60;
          } else {
            total = parseFloat(colB.replace(',', '.')) || 0;
          }
        }

        const colC = row[2] ? String(row[2]).trim() : '';

        if (colA.length > 2 && (total > 0 || colC.length > 0)) {
          linhas.push({
            abaNome: sheetName,
            mes,
            nomeAtividadeOriginal: colA,
            total: Number(total.toFixed(2)),
            observacoes: colC
          });
          nomesUnicosSet.add(colA);
        }
      });
    });

    return {
      linhas,
      nomesAtividadesUnicas: Array.from(nomesUnicosSet),
      abasEncontradas
    };
  },

  /**
   * Mapeamento assistido: compara nomes originais com o catálogo atual e sugere a correspondência mais provável
   */
  gerarSugestoesMapeamento(
    nomesOriginais: string[],
    catalogoAtividades: Atividade[]
  ): MapeamentoAtividade[] {
    return nomesOriginais.map(nomeOriginal => {
      let melhorAtividadeId = catalogoAtividades[0]?.id || '';
      let maiorSimilaridade = -1;

      catalogoAtividades.forEach(ativ => {
        const score = calcularSimilaridade(nomeOriginal, ativ.nome);
        if (score > maiorSimilaridade) {
          maiorSimilaridade = score;
          melhorAtividadeId = ativ.id;
        }
      });

      return {
        nomeOriginal,
        atividadeIdSugerida: melhorAtividadeId,
        confianca: Math.max(0, maiorSimilaridade),
        atividadeIdSelecionada: melhorAtividadeId,
        ignorar: false
      };
    });
  },

  /**
   * Constrói os lançamentos finais prontos para inserção:
   * Colocados no último dia de cada mês respectivo, com a observação original preservada
   */
  construirLancamentosParaImportacao(
    linhas: PlanilhaLinhaExtraida[],
    mapeamentos: MapeamentoAtividade[],
    catalogoAtividades: Atividade[],
    equipeId: string,
    ano: number
  ): ItemImportacaoFinal[] {
    const mapaConfig = new Map<string, MapeamentoAtividade>();
    mapeamentos.forEach(m => mapaConfig.set(m.nomeOriginal, m));

    const resultado: ItemImportacaoFinal[] = [];

    linhas.forEach(linha => {
      const config = mapaConfig.get(linha.nomeAtividadeOriginal);
      if (!config || config.ignorar) return;

      const atividade = catalogoAtividades.find(a => a.id === config.atividadeIdSelecionada);
      if (!atividade) return;

      // Calcular o último dia do mês para o ano informado
      const dataBase = new Date(ano, linha.mes - 1, 1);
      const ultimoDia = lastDayOfMonth(dataBase);
      const diaStr = ultimoDia.getDate().toString().padStart(2, '0');
      const mesStr = linha.mes.toString().padStart(2, '0');
      const dataIso = `${ano}-${mesStr}-${diaStr}`;

      const item: ItemImportacaoFinal = {
        equipeId,
        atividadeId: atividade.id,
        data: dataIso,
        tipoMedida: atividade.tipo_medida,
        quantidade: atividade.tipo_medida === 'quantidade' ? linha.total : null,
        horas: atividade.tipo_medida === 'horas' ? linha.total : null,
        descricao: `[Importação Histórica Planilha] ${linha.nomeAtividadeOriginal}`,
        observacao: linha.observacoes || 'Importado via planilha de histórico mensal'
      };

      resultado.push(item);
    });

    return resultado;
  }
};
