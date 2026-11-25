import { Atividade, CategoriaAtividade, Equipe, Lancamento } from '../types/database';
import { formatarHorasBR, formatarNumeroBR, MESES_NOMES, MESES_SIGLAS } from './formatters';

export interface PontoEvolucao {
  label: string;
  Atendimentos: number;
  Horas: number;
}

export interface PontoTopAtividade {
  nome: string;
  nomeCompleto: string;
  total: number;
  tipo: 'quantidade' | 'horas';
}

export interface PontoComparacaoEquipe {
  nome: string;
  Atendimentos: number;
  Horas: number;
}

export interface PontoHorasCategoria {
  categoria: string;
  Horas: number;
}

export interface DadosIndicadoresRelatorio {
  tituloEvolucao: string;
  subtituloEvolucao: string;
  evolucao: PontoEvolucao[];
  topAtividades: PontoTopAtividade[];
  comparacaoEquipes: PontoComparacaoEquipe[];
  horasPorCategoria: PontoHorasCategoria[];
}

export interface FiguraRelatorioImagem {
  numero: number;
  titulo: string;
  subtitulo: string;
  dataUrl: string;
}

/**
 * Calcula todos os conjuntos de dados dos 4 gráficos do Painel de Indicadores
 * a partir dos lançamentos filtrados do relatório.
 */
export function computeIndicadoresRelatorio(
  lancamentos: Lancamento[],
  atividades: Atividade[],
  equipes: Equipe[],
  categorias: CategoriaAtividade[],
  opts: { ano: number; mes?: number }
): DadosIndicadoresRelatorio {
  const ativMap = new Map(atividades.map(a => [a.id, a]));

  // 1. Evolução Temporal (Diária quando mensal; Mensal quando anual)
  let evolucao: PontoEvolucao[] = [];
  let tituloEvolucao = `Evolução Mensal no Exercício (${opts.ano})`;
  let subtituloEvolucao = 'Atendimentos (Qtd) e Carga Horária (h) por mês';

  if (opts.mes) {
    const diasNoMes = new Date(opts.ano, opts.mes, 0).getDate();
    tituloEvolucao = `Evolução Diária em ${MESES_NOMES[opts.mes - 1]} / ${opts.ano}`;
    subtituloEvolucao = 'Volume diário de atendimentos e horas registradas no mês';

    const diasComDados: PontoEvolucao[] = [];
    for (let dia = 1; dia <= diasNoMes; dia++) {
      const diaStr = String(dia).padStart(2, '0');
      const lancsDia = lancamentos.filter(l => {
        const d = new Date(l.data + 'T00:00:00');
        return d.getDate() === dia;
      });

      const qtd = lancsDia.reduce((acc, curr) => {
        const ativ = ativMap.get(curr.atividade_id);
        return ativ?.tipo_medida === 'quantidade' ? acc + (curr.quantidade || 0) : acc;
      }, 0);

      const horas = lancsDia.reduce((acc, curr) => {
        const ativ = ativMap.get(curr.atividade_id);
        return ativ?.tipo_medida === 'horas' ? acc + (curr.horas || 0) : acc;
      }, 0);

      diasComDados.push({
        label: diaStr,
        Atendimentos: qtd,
        Horas: Number(horas.toFixed(1))
      });
    }
    evolucao = diasComDados;
  } else {
    evolucao = MESES_SIGLAS.map((sigla, idx) => {
      const mesNum = idx + 1;
      const lancsMes = lancamentos.filter(l => {
        const d = new Date(l.data + 'T00:00:00');
        return d.getMonth() + 1 === mesNum;
      });

      const qtd = lancsMes.reduce((acc, curr) => {
        const ativ = ativMap.get(curr.atividade_id);
        return ativ?.tipo_medida === 'quantidade' ? acc + (curr.quantidade || 0) : acc;
      }, 0);

      const horas = lancsMes.reduce((acc, curr) => {
        const ativ = ativMap.get(curr.atividade_id);
        return ativ?.tipo_medida === 'horas' ? acc + (curr.horas || 0) : acc;
      }, 0);

      return {
        label: sigla,
        Atendimentos: qtd,
        Horas: Number(horas.toFixed(1))
      };
    });
  }

  // 2. Top 7 Atividades Mais Demandadas
  const mapaAtividades: Record<string, PontoTopAtividade> = {};
  lancamentos.forEach(l => {
    const ativ = ativMap.get(l.atividade_id);
    if (!ativ) return;
    if (!mapaAtividades[ativ.id]) {
      mapaAtividades[ativ.id] = {
        nome: ativ.nome.length > 32 ? ativ.nome.substring(0, 30) + '...' : ativ.nome,
        nomeCompleto: ativ.nome,
        total: 0,
        tipo: ativ.tipo_medida
      };
    }
    mapaAtividades[ativ.id].total += ativ.tipo_medida === 'quantidade' ? (l.quantidade || 0) : (l.horas || 0);
  });

  const topAtividades = Object.values(mapaAtividades)
    .filter(item => item.total > 0)
    .sort((a, b) => b.total - a.total)
    .slice(0, 7);

  // 3. Comparativo Entre Equipes
  const comparacaoEquipes: PontoComparacaoEquipe[] = equipes.map(eq => {
    const lancsEq = lancamentos.filter(l => l.equipe_id === eq.id);
    const qtd = lancsEq.reduce((acc, curr) => {
      const ativ = ativMap.get(curr.atividade_id);
      return ativ?.tipo_medida === 'quantidade' ? acc + (curr.quantidade || 0) : acc;
    }, 0);
    const hrs = lancsEq.reduce((acc, curr) => {
      const ativ = ativMap.get(curr.atividade_id);
      return ativ?.tipo_medida === 'horas' ? acc + (curr.horas || 0) : acc;
    }, 0);

    return {
      nome: eq.sigla || eq.nome.substring(0, 16),
      Atendimentos: qtd,
      Horas: Number(hrs.toFixed(1))
    };
  });

  // 4. Carga Horária por Categoria Temática
  const horasPorCategoria: PontoHorasCategoria[] = categorias
    .map(cat => {
      const lancsCat = lancamentos.filter(l => {
        const ativ = ativMap.get(l.atividade_id);
        return ativ?.categoria_id === cat.id && ativ?.tipo_medida === 'horas';
      });
      const totalHorasCat = lancsCat.reduce((acc, curr) => acc + (curr.horas || 0), 0);

      return {
        categoria: cat.nome.length > 20 ? cat.nome.substring(0, 18) + '...' : cat.nome,
        Horas: Number(totalHorasCat.toFixed(1))
      };
    })
    .filter(item => item.Horas > 0);

  return {
    tituloEvolucao,
    subtituloEvolucao,
    evolucao,
    topAtividades,
    comparacaoEquipes,
    horasPorCategoria
  };
}

// =========================================================================
// RENDERIZAÇÃO DE ALTA RESOLUÇÃO EM CANVAS PARA INCORPORAÇÃO EM PDF
// =========================================================================

const CANVAS_W = 920;
const CANVAS_H = 520;
const FONT_FAMILY = 'Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif';

function createHiDPICanvas(): { canvas: HTMLCanvasElement; ctx: CanvasRenderingContext2D } {
  const canvas = document.createElement('canvas');
  const dpr = 2;
  canvas.width = CANVAS_W * dpr;
  canvas.height = CANVAS_H * dpr;
  const ctx = canvas.getContext('2d')!;
  ctx.scale(dpr, dpr);

  // Fundo branco limpo
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, CANVAS_W, CANVAS_H);
  return { canvas, ctx };
}

function drawChartHeader(ctx: CanvasRenderingContext2D, titulo: string, subtitulo: string) {
  ctx.fillStyle = '#0f172a';
  ctx.font = `700 20px ${FONT_FAMILY}`;
  ctx.textAlign = 'left';
  ctx.textBaseline = 'top';
  ctx.fillText(titulo, 28, 22);

  ctx.fillStyle = '#64748b';
  ctx.font = `400 14px ${FONT_FAMILY}`;
  ctx.fillText(subtitulo, 28, 48);

  ctx.strokeStyle = '#e2e8f0';
  ctx.lineWidth = 1;
  ctx.beginPath();
  ctx.moveTo(28, 74);
  ctx.lineTo(CANVAS_W - 28, 74);
  ctx.stroke();
}

function drawEmptyState(ctx: CanvasRenderingContext2D, mensagem: string) {
  ctx.fillStyle = '#94a3b8';
  ctx.font = `500 16px ${FONT_FAMILY}`;
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(mensagem, CANVAS_W / 2, CANVAS_H / 2 + 25);
}

function drawLegend(
  ctx: CanvasRenderingContext2D,
  items: { label: string; color: string }[],
  y: number
) {
  ctx.font = `600 13px ${FONT_FAMILY}`;
  let totalW = 0;
  const widths = items.map(it => {
    const w = 18 + ctx.measureText(it.label).width + 24;
    totalW += w;
    return w;
  });
  let x = (CANVAS_W - totalW + 24) / 2;
  items.forEach((it, idx) => {
    ctx.fillStyle = it.color;
    ctx.beginPath();
    ctx.roundRect(x, y - 5, 12, 12, 3);
    ctx.fill();

    ctx.fillStyle = '#334155';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'middle';
    ctx.fillText(it.label, x + 18, y + 1);
    x += widths[idx];
  });
}

function niceMax(val: number): number {
  if (val <= 0) return 10;
  const exp = Math.pow(10, Math.floor(Math.log10(val)));
  const frac = val / exp;
  let niceFrac = 1;
  if (frac <= 1) niceFrac = 1;
  else if (frac <= 2) niceFrac = 2;
  else if (frac <= 5) niceFrac = 5;
  else niceFrac = 10;
  return Math.ceil((val / (niceFrac * exp / 4))) * (niceFrac * exp / 4);
}

function renderEvolucaoChart(dados: DadosIndicadoresRelatorio): string {
  const { canvas, ctx } = createHiDPICanvas();
  drawChartHeader(ctx, dados.tituloEvolucao, dados.subtituloEvolucao);

  const hasData = dados.evolucao.some(p => p.Atendimentos > 0 || p.Horas > 0);
  if (!hasData) {
    drawEmptyState(ctx, 'Nenhum lançamento registrado no período selecionado.');
    return canvas.toDataURL('image/png');
  }

  const padL = 72;
  const padR = 36;
  const padT = 100;
  const padB = 78;
  const plotW = CANVAS_W - padL - padR;
  const plotH = CANVAS_H - padT - padB;

  const maxVal = niceMax(
    Math.max(...dados.evolucao.map(d => Math.max(d.Atendimentos, d.Horas)), 1)
  );

  // Linhas de grade horizontais
  const ticks = 4;
  ctx.font = `500 13px ${FONT_FAMILY}`;
  for (let i = 0; i <= ticks; i++) {
    const val = (maxVal / ticks) * i;
    const y = padT + plotH - (plotH * i) / ticks;
    ctx.strokeStyle = i === 0 ? '#cbd5e1' : '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatarNumeroBR(val, val < 10 && val % 1 !== 0 ? 1 : 0), padL - 10, y);
  }

  const n = dados.evolucao.length;
  const stepX = n > 1 ? plotW / (n - 1) : plotW;
  const labelEvery = n > 16 ? 2 : 1;

  // Rótulos X
  dados.evolucao.forEach((p, idx) => {
    const x = n > 1 ? padL + idx * stepX : padL + plotW / 2;
    if (idx % labelEvery === 0 || idx === n - 1) {
      ctx.fillStyle = '#475569';
      ctx.font = `500 12px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'top';
      ctx.fillText(p.label, x, padT + plotH + 10);
    }
  });

  // Série: Atendimentos (#2563eb) e Horas (#f59e0b)
  const series: { key: 'Atendimentos' | 'Horas'; color: string }[] = [
    { key: 'Atendimentos', color: '#2563eb' },
    { key: 'Horas', color: '#f59e0b' }
  ];

  series.forEach(s => {
    ctx.strokeStyle = s.color;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    dados.evolucao.forEach((p, idx) => {
      const x = n > 1 ? padL + idx * stepX : padL + plotW / 2;
      const y = padT + plotH - (p[s.key] / maxVal) * plotH;
      if (idx === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();

    // Pontos
    dados.evolucao.forEach((p, idx) => {
      if (n > 15 && p[s.key] === 0) return;
      const x = n > 1 ? padL + idx * stepX : padL + plotW / 2;
      const y = padT + plotH - (p[s.key] / maxVal) * plotH;
      ctx.fillStyle = '#ffffff';
      ctx.beginPath();
      ctx.arc(x, y, 5, 0, Math.PI * 2);
      ctx.fill();
      ctx.strokeStyle = s.color;
      ctx.lineWidth = 2.5;
      ctx.stroke();
    });
  });

  drawLegend(
    ctx,
    [
      { label: 'Atendimentos (Qtd)', color: '#2563eb' },
      { label: 'Carga Horária (Horas)', color: '#f59e0b' }
    ],
    CANVAS_H - 22
  );

  return canvas.toDataURL('image/png');
}

function renderTopAtividadesChart(dados: DadosIndicadoresRelatorio): string {
  const { canvas, ctx } = createHiDPICanvas();
  drawChartHeader(ctx, 'Distribuição por Atividade (Mais Demandadas)', 'Top 7 atividades por volume no período');

  if (dados.topAtividades.length === 0) {
    drawEmptyState(ctx, 'Nenhuma atividade registrada no período selecionado.');
    return canvas.toDataURL('image/png');
  }

  const padL = 290;
  const padR = 78;
  const padT = 96;
  const padB = 46;
  const plotW = CANVAS_W - padL - padR;
  const plotH = CANVAS_H - padT - padB;

  const maxVal = niceMax(Math.max(...dados.topAtividades.map(d => d.total), 1));

  // Grade vertical
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const val = (maxVal / ticks) * i;
    const x = padL + (plotW * i) / ticks;
    ctx.strokeStyle = i === 0 ? '#cbd5e1' : '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(x, padT);
    ctx.lineTo(x, padT + plotH);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = `500 12px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(formatarNumeroBR(val, 0), x, padT + plotH + 10);
  }

  const count = dados.topAtividades.length;
  const rowH = plotH / Math.max(count, 1);
  const barH = Math.min(34, rowH * 0.62);

  dados.topAtividades.forEach((item, idx) => {
    const cy = padT + idx * rowH + rowH / 2;
    const barW = Math.max(4, (item.total / maxVal) * plotW);

    // Rótulo à esquerda
    ctx.fillStyle = '#334155';
    ctx.font = `600 13px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    const label = item.nomeCompleto.length > 35 ? item.nomeCompleto.substring(0, 33) + '...' : item.nomeCompleto;
    ctx.fillText(label, padL - 14, cy);

    // Barra horizontal
    ctx.fillStyle = item.tipo === 'horas' ? '#f59e0b' : '#3b82f6';
    ctx.beginPath();
    ctx.roundRect(padL, cy - barH / 2, barW, barH, [0, 6, 6, 0]);
    ctx.fill();

    // Valor à direita
    ctx.fillStyle = '#0f172a';
    ctx.font = `700 13px ${FONT_FAMILY}`;
    ctx.textAlign = 'left';
    const txtVal = item.tipo === 'horas' ? formatarHorasBR(item.total) : formatarNumeroBR(item.total, 0);
    ctx.fillText(txtVal, padL + barW + 8, cy);
  });

  return canvas.toDataURL('image/png');
}

function renderComparacaoEquipesChart(dados: DadosIndicadoresRelatorio): string {
  const { canvas, ctx } = createHiDPICanvas();
  drawChartHeader(ctx, 'Comparativo Entre Equipes de Trabalho', 'Volume de atendimentos e horas por unidade');

  const hasData = dados.comparacaoEquipes.some(e => e.Atendimentos > 0 || e.Horas > 0);
  if (dados.comparacaoEquipes.length === 0 || !hasData) {
    drawEmptyState(ctx, 'Sem dados de equipes para o período selecionado.');
    return canvas.toDataURL('image/png');
  }

  const padL = 72;
  const padR = 36;
  const padT = 104;
  const padB = 82;
  const plotW = CANVAS_W - padL - padR;
  const plotH = CANVAS_H - padT - padB;

  const maxVal = niceMax(
    Math.max(...dados.comparacaoEquipes.map(e => Math.max(e.Atendimentos, e.Horas)), 1)
  );

  // Linhas de grade
  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const val = (maxVal / ticks) * i;
    const y = padT + plotH - (plotH * i) / ticks;
    ctx.strokeStyle = i === 0 ? '#cbd5e1' : '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = `500 13px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(formatarNumeroBR(val, 0), padL - 10, y);
  }

  const count = dados.comparacaoEquipes.length;
  const groupW = plotW / count;
  const barW = Math.min(46, groupW * 0.28);
  const gap = 8;

  dados.comparacaoEquipes.forEach((eq, idx) => {
    const centerX = padL + idx * groupW + groupW / 2;

    // Barra 1: Atendimentos
    const hQtd = (eq.Atendimentos / maxVal) * plotH;
    const x1 = centerX - barW - gap / 2;
    if (eq.Atendimentos > 0) {
      ctx.fillStyle = '#1d4ed8';
      ctx.beginPath();
      ctx.roundRect(x1, padT + plotH - hQtd, barW, hQtd, [6, 6, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#1e3a8a';
      ctx.font = `700 12px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(formatarNumeroBR(eq.Atendimentos, 0), x1 + barW / 2, padT + plotH - hQtd - 5);
    }

    // Barra 2: Horas
    const hHrs = (eq.Horas / maxVal) * plotH;
    const x2 = centerX + gap / 2;
    if (eq.Horas > 0) {
      ctx.fillStyle = '#f59e0b';
      ctx.beginPath();
      ctx.roundRect(x2, padT + plotH - hHrs, barW, hHrs, [6, 6, 0, 0]);
      ctx.fill();

      ctx.fillStyle = '#b45309';
      ctx.font = `700 12px ${FONT_FAMILY}`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'bottom';
      ctx.fillText(`${eq.Horas}h`, x2 + barW / 2, padT + plotH - hHrs - 5);
    }

    // Nome da equipe
    ctx.fillStyle = '#334155';
    ctx.font = `600 13px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(eq.nome, centerX, padT + plotH + 12);
  });

  drawLegend(
    ctx,
    [
      { label: 'Atendimentos (Qtd)', color: '#1d4ed8' },
      { label: 'Carga Horária (Horas)', color: '#f59e0b' }
    ],
    CANVAS_H - 22
  );

  return canvas.toDataURL('image/png');
}

function renderHorasPorCategoriaChart(dados: DadosIndicadoresRelatorio): string {
  const { canvas, ctx } = createHiDPICanvas();
  drawChartHeader(ctx, 'Carga Horária por Categoria Temática', 'Distribuição de horas registradas por tema');

  if (dados.horasPorCategoria.length === 0) {
    drawEmptyState(ctx, 'Nenhuma atividade medida em horas no período selecionado.');
    return canvas.toDataURL('image/png');
  }

  const padL = 72;
  const padR = 36;
  const padT = 104;
  const padB = 72;
  const plotW = CANVAS_W - padL - padR;
  const plotH = CANVAS_H - padT - padB;

  const maxVal = niceMax(Math.max(...dados.horasPorCategoria.map(c => c.Horas), 1));

  const ticks = 4;
  for (let i = 0; i <= ticks; i++) {
    const val = (maxVal / ticks) * i;
    const y = padT + plotH - (plotH * i) / ticks;
    ctx.strokeStyle = i === 0 ? '#cbd5e1' : '#f1f5f9';
    ctx.lineWidth = 1;
    ctx.beginPath();
    ctx.moveTo(padL, y);
    ctx.lineTo(padL + plotW, y);
    ctx.stroke();

    ctx.fillStyle = '#64748b';
    ctx.font = `500 13px ${FONT_FAMILY}`;
    ctx.textAlign = 'right';
    ctx.textBaseline = 'middle';
    ctx.fillText(`${formatarNumeroBR(val, val < 10 && val % 1 !== 0 ? 1 : 0)}h`, padL - 10, y);
  }

  const count = dados.horasPorCategoria.length;
  const slotW = plotW / count;
  const barW = Math.min(64, slotW * 0.5);

  dados.horasPorCategoria.forEach((cat, idx) => {
    const centerX = padL + idx * slotW + slotW / 2;
    const h = (cat.Horas / maxVal) * plotH;
    const x = centerX - barW / 2;

    ctx.fillStyle = '#8b5cf6';
    ctx.beginPath();
    ctx.roundRect(x, padT + plotH - h, barW, h, [6, 6, 0, 0]);
    ctx.fill();

    ctx.fillStyle = '#5b21b6';
    ctx.font = `700 13px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'bottom';
    ctx.fillText(formatarHorasBR(cat.Horas), centerX, padT + plotH - h - 6);

    ctx.fillStyle = '#334155';
    ctx.font = `600 12px ${FONT_FAMILY}`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'top';
    ctx.fillText(cat.categoria, centerX, padT + plotH + 12);
  });

  return canvas.toDataURL('image/png');
}

/**
 * Gera as 4 figuras de alta resolução do Painel de Indicadores em PNG (Data URL)
 * prontas para incorporação no PDF institucional.
 */
export function gerarImagensGraficosPDF(dados: DadosIndicadoresRelatorio): FiguraRelatorioImagem[] {
  return [
    {
      numero: 1,
      titulo: dados.tituloEvolucao,
      subtitulo: dados.subtituloEvolucao,
      dataUrl: renderEvolucaoChart(dados)
    },
    {
      numero: 2,
      titulo: 'Distribuição por Atividade (Mais Demandadas)',
      subtitulo: 'Top 7 atividades por volume no período',
      dataUrl: renderTopAtividadesChart(dados)
    },
    {
      numero: 3,
      titulo: 'Comparativo Entre Equipes de Trabalho',
      subtitulo: 'Volume de atendimentos e horas por unidade',
      dataUrl: renderComparacaoEquipesChart(dados)
    },
    {
      numero: 4,
      titulo: 'Carga Horária por Categoria Temática',
      subtitulo: 'Distribuição de horas registradas por tema',
      dataUrl: renderHorasPorCategoriaChart(dados)
    }
  ];
}
