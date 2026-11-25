import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Lancamento, Equipe, Atividade, CategoriaAtividade } from '../types/database';
import {
  formatarNumeroBR,
  formatarHorasBR,
  formatarDataBR,
  MESES_NOMES,
  MESES_SIGLAS
} from '../utils/formatters';
import {
  computeIndicadoresRelatorio,
  gerarImagensGraficosPDF
} from '../utils/reportCharts';

interface ExportOptions {
  equipe?: Equipe;
  equipes?: Equipe[];
  categorias?: CategoriaAtividade[];
  ano: number;
  mes?: number;
  incluirFigurasIndicadores?: boolean;
  incluirDetalhamentoHoras?: boolean;
  emitidoPor?: string;
}

export const ExportService = {
  /**
   * Exporta arquivo Excel (.xlsx) com uma aba para cada mês do ano + aba de Resumo Anual
   */
  exportarExcelAnual(
    lancamentos: Lancamento[],
    atividades: Atividade[],
    equipe: Equipe | undefined,
    ano: number
  ): void {
    const wb = XLSX.utils.book_new();

    // 1. Aba: Resumo Anual (Atividades x Meses)
    const resumoData: any[] = [
      [`SISRH - RESUMO ANUAL DE ATIVIDADES E ATENDIMENTOS - EXERCÍCIO ${ano}`],
      [`Equipe: ${equipe ? equipe.nome : 'Todas as Equipes'}`],
      [`Data de Emissão: ${new Date().toLocaleDateString('pt-BR')} ${new Date().toLocaleTimeString('pt-BR')}`],
      [],
      [
        'Código/Ordem',
        'Atividade',
        'Categoria',
        'Unidade de Medida',
        ...MESES_SIGLAS,
        'TOTAL ANUAL'
      ]
    ];

    atividades.forEach(ativ => {
      const linha: (string | number)[] = [
        ativ.ordem,
        ativ.nome,
        ativ.categoria?.nome || '-',
        ativ.tipo_medida === 'quantidade' ? 'Qtd' : 'Horas'
      ];

      let somaAno = 0;
      for (let m = 1; m <= 12; m++) {
        const lancsMes = lancamentos.filter(l => {
          const d = new Date(l.data + 'T00:00:00');
          return l.atividade_id === ativ.id && d.getFullYear() === ano && d.getMonth() + 1 === m;
        });

        const val = lancsMes.reduce((acc, curr) => {
          return acc + (ativ.tipo_medida === 'quantidade' ? (curr.quantidade || 0) : (curr.horas || 0));
        }, 0);

        somaAno += val;
        linha.push(ativ.tipo_medida === 'quantidade' ? val : Number(val.toFixed(2)));
      }

      linha.push(ativ.tipo_medida === 'quantidade' ? somaAno : Number(somaAno.toFixed(2)));
      resumoData.push(linha);
    });

    const wsResumo = XLSX.utils.aoa_to_sheet(resumoData);
    // Ajustar larguras das colunas
    wsResumo['!cols'] = [
      { wch: 12 },
      { wch: 45 },
      { wch: 25 },
      { wch: 16 },
      ...MESES_SIGLAS.map(() => ({ wch: 8 })),
      { wch: 14 }
    ];
    XLSX.utils.book_append_sheet(wb, wsResumo, 'Resumo Anual');

    // 2. Abas Mensais (Jan a Dez)
    for (let m = 1; m <= 12; m++) {
      const nomeMes = MESES_NOMES[m - 1];
      const mesLancamentos = lancamentos.filter(l => {
        const d = new Date(l.data + 'T00:00:00');
        return d.getFullYear() === ano && d.getMonth() + 1 === m;
      });

      const mesData: any[] = [
        [`SISRH - RELATÓRIO MENSAL: ${nomeMes.toUpperCase()} / ${ano}`],
        [`Equipe: ${equipe ? equipe.nome : 'Todas as Equipes'}`],
        [],
        ['Atividade', 'Tipo', 'Total do Mês', 'Qtd Lançamentos', 'Observações / Detalhes']
      ];

      atividades.forEach(ativ => {
        const ativLancs = mesLancamentos.filter(l => l.atividade_id === ativ.id);
        if (ativLancs.length > 0) {
          const total = ativLancs.reduce((acc, curr) => {
            return acc + (ativ.tipo_medida === 'quantidade' ? (curr.quantidade || 0) : (curr.horas || 0));
          }, 0);

          const observacoes = ativLancs
            .map(l => {
              const info = l.descricao ? `${l.descricao}` : '';
              const obs = l.observacao ? ` (${l.observacao})` : '';
              const val = ativ.tipo_medida === 'quantidade' ? `${l.quantidade} un` : formatarHorasBR(l.horas);
              return `${formatarDataBR(l.data)}: ${val}${info ? ' - ' + info : ''}${obs}`;
            })
            .filter(Boolean)
            .join('; ');

          mesData.push([
            ativ.nome,
            ativ.tipo_medida === 'quantidade' ? 'Quantidade' : 'Horas',
            ativ.tipo_medida === 'quantidade' ? total : formatarHorasBR(total),
            ativLancs.length,
            observacoes || '-'
          ]);
        }
      });

      // Se não houver lançamentos no mês
      if (mesData.length === 4) {
        mesData.push(['(Nenhum lançamento registrado neste mês)', '-', 0, 0, '-']);
      }

      const wsMes = XLSX.utils.aoa_to_sheet(mesData);
      wsMes['!cols'] = [
        { wch: 45 },
        { wch: 14 },
        { wch: 14 },
        { wch: 16 },
        { wch: 70 }
      ];
      XLSX.utils.book_append_sheet(wb, wsMes, nomeMes.substring(0, 10));
    }

    // Salvar arquivo
    const nomeArquivo = `SGP_FiocruzMinas_${equipe ? equipe.sigla || 'Equipe' : 'Consolidado'}_${ano}.xlsx`;
    XLSX.writeFile(wb, nomeArquivo);
  },

  /**
   * Exporta arquivo CSV estruturado com delimitador ponto-e-vírgula e BOM UTF-8
   */
  exportarCSV(lancamentos: Lancamento[], equipeNome?: string): void {
    const cabecalho = [
      'Data',
      'Equipe',
      'Categoria',
      'Atividade',
      'Tipo de Medida',
      'Quantidade',
      'Horas (Decimal)',
      'Horas (Formatado)',
      'Descrição',
      'Observação',
      'Registrado Por'
    ];

    const linhas = lancamentos.map(l => [
      formatarDataBR(l.data),
      `"${(l.equipe?.nome || equipeNome || '').replace(/"/g, '""')}"`,
      `"${(l.atividade?.categoria?.nome || '').replace(/"/g, '""')}"`,
      `"${(l.atividade?.nome || '').replace(/"/g, '""')}"`,
      l.atividade?.tipo_medida || 'quantidade',
      l.quantidade !== null && l.quantidade !== undefined ? l.quantidade : '',
      l.horas !== null && l.horas !== undefined ? l.horas.toString().replace('.', ',') : '',
      l.horas ? formatarHorasBR(l.horas) : '',
      `"${(l.descricao || '').replace(/"/g, '""')}"`,
      `"${(l.observacao || '').replace(/"/g, '""')}"`,
      `"${(l.usuario?.nome_completo || '').replace(/"/g, '""')}"`
    ]);

    const csvContent = '\uFEFF' + [cabecalho.join(';'), ...linhas.map(row => row.join(';'))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.setAttribute('download', `SGP_FiocruzMinas_Lancamentos_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  },

  /**
   * Exporta Relatório Institucional em PDF (A4) formatado com cabeçalho oficial de órgão público
   */
  exportarPDF(
    lancamentos: Lancamento[],
    atividades: Atividade[],
    opts: ExportOptions
  ): void {
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    const pageWidth = doc.internal.pageSize.getWidth();
    let currentY = 16;

    // 1. Cabeçalho Institucional
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(30, 41, 59); // slate-800
    doc.text('FUNDAÇÃO OSWALDO CRUZ - FIOCRUZ MINAS', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105); // slate-600
    doc.text('SERVIÇO DE GESTÃO DE PESSOAS - SGP / INSTITUTO RENÉ RACHOU', pageWidth / 2, currentY, { align: 'center' });
    currentY += 5;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.setTextColor(15, 23, 42); // slate-900
    const tituloPeriodo = opts.mes
      ? `RELATÓRIO MENSAL DE ATIVIDADES - ${MESES_NOMES[opts.mes - 1].toUpperCase()} / ${opts.ano}`
      : `RELATÓRIO ANUAL CONSOLIDADO DE ATIVIDADES - ${opts.ano}`;
    doc.text(tituloPeriodo, pageWidth / 2, currentY, { align: 'center' });
    currentY += 6;

    // Linha divisória
    doc.setDrawColor(203, 213, 225);
    doc.line(14, currentY, pageWidth - 14, currentY);
    currentY += 6;

    // Metadados
    doc.setFontSize(8.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(51, 65, 85);
    doc.text(`Equipe / Setor: ${opts.equipe ? opts.equipe.nome : 'Todas as Equipes (Consolidado)'}`, 14, currentY);
    doc.text(`Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, pageWidth - 14, currentY, { align: 'right' });
    currentY += 5;

    if (opts.emitidoPor) {
      doc.text(`Responsável pela Emissão: ${opts.emitidoPor}`, 14, currentY);
      currentY += 5;
    }

    currentY += 3;

    // 2. Tabela de Resumo por Atividade
    const tableRowsAtividades: any[] = [];
    let totalGeralQtd = 0;
    let totalGeralHoras = 0;

    atividades.forEach(ativ => {
      const lancs = lancamentos.filter(l => l.atividade_id === ativ.id);
      if (lancs.length > 0) {
        if (ativ.tipo_medida === 'quantidade') {
          const soma = lancs.reduce((acc, curr) => acc + (curr.quantidade || 0), 0);
          totalGeralQtd += soma;
          tableRowsAtividades.push([
            ativ.nome,
            ativ.categoria?.nome || '-',
            'Quantidade',
            formatarNumeroBR(soma, 0),
            lancs.length
          ]);
        } else {
          const soma = lancs.reduce((acc, curr) => acc + (curr.horas || 0), 0);
          totalGeralHoras += soma;
          tableRowsAtividades.push([
            ativ.nome,
            ativ.categoria?.nome || '-',
            'Horas',
            formatarHorasBR(soma),
            lancs.length
          ]);
        }
      }
    });

    autoTable(doc, {
      startY: currentY,
      head: [['Atividade', 'Categoria', 'Métrica', 'Total no Período', 'Lançamentos']],
      body: tableRowsAtividades.length > 0 ? tableRowsAtividades : [['Nenhum lançamento no período selecionado', '-', '-', '-', '-']],
      theme: 'grid',
      headStyles: {
        fillColor: [30, 58, 138], // Navy blue #1e3a8a
        textColor: 255,
        fontSize: 8.5,
        fontStyle: 'bold'
      },
      styles: {
        fontSize: 8,
        cellPadding: 2,
        textColor: [30, 41, 59]
      },
      columnStyles: {
        0: { cellWidth: 70 },
        1: { cellWidth: 40 },
        2: { cellWidth: 25 },
        3: { cellWidth: 30, halign: 'right' },
        4: { cellWidth: 20, halign: 'center' }
      }
    });

    currentY = (doc as any).lastAutoTable.finalY + 6;

    // Resumo de Totais
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(30, 58, 138);
    doc.text(`Totais Globais:  ${formatarNumeroBR(totalGeralQtd, 0)} atendimentos/itens  |  ${formatarHorasBR(totalGeralHoras)} em atividades temporais`, 14, currentY);
    currentY += 10;

    // 3. Figuras do Painel de Indicadores (opcional, habilitado por padrão)
    const deveIncluirFiguras = opts.incluirFigurasIndicadores !== false;
    let proximaSecaoNum = 2;

    if (deveIncluirFiguras) {
      const equipesLista = opts.equipes && opts.equipes.length > 0
        ? opts.equipes
        : (opts.equipe ? [opts.equipe] : []);

      const categoriasLista: CategoriaAtividade[] = opts.categorias && opts.categorias.length > 0
        ? opts.categorias
        : Array.from(
            new Map(
              atividades
                .filter(a => a.categoria)
                .map(a => [a.categoria!.id, a.categoria!])
            ).values()
          );

      const indicadores = computeIndicadoresRelatorio(
        lancamentos,
        atividades,
        equipesLista,
        categoriasLista,
        { ano: opts.ano, mes: opts.mes }
      );
      const figuras = gerarImagensGraficosPDF(indicadores);

      // Garantir que o bloco 2x2 de figuras caiba inteiro na página
      if (currentY > 145) {
        doc.addPage();
        currentY = 18;
      }

      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(15, 23, 42);
      doc.text(`${proximaSecaoNum}. Figuras do Painel de Indicadores`, 14, currentY);
      currentY += 5;

      const marginX = 14;
      const gapX = 6;
      const gapY = 7;
      const cardW = (pageWidth - marginX * 2 - gapX) / 2; // 88mm
      const imgPad = 1.5;
      const imgW = cardW - imgPad * 2;
      const imgH = imgW * (520 / 920); // ~48mm
      const cardH = imgH + imgPad * 2 + 6; // inclui legenda

      figuras.forEach((fig, index) => {
        const col = index % 2;
        const row = Math.floor(index / 2);
        const x = marginX + col * (cardW + gapX);
        const y = currentY + row * (cardH + gapY);

        // Moldura suave do card
        doc.setDrawColor(226, 232, 240);
        doc.setFillColor(255, 255, 255);
        doc.roundedRect(x, y, cardW, cardH, 2, 2, 'FD');

        // Imagem PNG de alta resolução
        doc.addImage(fig.dataUrl, 'PNG', x + imgPad, y + imgPad, imgW, imgH);

        // Legenda oficial da figura
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7);
        doc.setTextColor(51, 65, 85);
        const legenda = `Figura ${fig.numero} - ${fig.titulo}`;
        const legendaTrunc = legenda.length > 56 ? legenda.substring(0, 54) + '...' : legenda;
        doc.text(legendaTrunc, x + cardW / 2, y + imgPad + imgH + 4, { align: 'center' });
      });

      currentY += cardH * 2 + gapY + 8;
      proximaSecaoNum += 1;
    }

    // 4. Detalhamento dos Lançamentos em Horas (opcional)
    if (opts.incluirDetalhamentoHoras) {
      const lancsHoras = lancamentos.filter(l => l.horas && l.horas > 0);
      if (lancsHoras.length > 0) {
        if (currentY > 230) {
          doc.addPage();
          currentY = 18;
        }

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(10);
        doc.setTextColor(15, 23, 42);
        doc.text(`${proximaSecaoNum}. Detalhamento Específico de Atividades em Horas:`, 14, currentY);
        currentY += 4;

        const tableDetalhamento = lancsHoras.map(l => [
          formatarDataBR(l.data),
          l.atividade?.nome || '-',
          formatarHorasBR(l.horas),
          l.descricao || '-',
          l.observacao || '-'
        ]);

        autoTable(doc, {
          startY: currentY,
          head: [['Data', 'Atividade', 'Duração', 'Descrição do Atendimento', 'Observações']],
          body: tableDetalhamento,
          theme: 'striped',
          headStyles: {
            fillColor: [51, 65, 85], // slate-700
            textColor: 255,
            fontSize: 8,
            fontStyle: 'bold'
          },
          styles: {
            fontSize: 7.5,
            cellPadding: 2,
            overflow: 'linebreak'
          },
          columnStyles: {
            0: { cellWidth: 20 },
            1: { cellWidth: 50 },
            2: { cellWidth: 20, halign: 'right' },
            3: { cellWidth: 45 },
            4: { cellWidth: 45 }
          }
        });

        currentY = (doc as any).lastAutoTable.finalY + 12;
      }
    }

    // Bloco de Assinaturas
    if (currentY > 240) {
      doc.addPage();
      currentY = 30;
    } else {
      currentY += 10;
    }

    doc.setDrawColor(148, 163, 184);
    doc.line(25, currentY + 12, 85, currentY + 12);
    doc.line(pageWidth - 85, currentY + 12, pageWidth - 25, currentY + 12);

    doc.setFontSize(7.5);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(71, 85, 105);
    doc.text('Responsável pela Equipe / Atividade', 55, currentY + 16, { align: 'center' });
    doc.text('Serviço de Gestão de Pessoas - SGP / Fiocruz Minas', pageWidth - 55, currentY + 16, { align: 'center' });

    // Salvar arquivo
    const nomePdf = `SGP_FiocruzMinas_Relatorio_${opts.ano}_${opts.mes ? String(opts.mes).padStart(2, '0') : 'Anual'}.pdf`;
    doc.save(nomePdf);
  }
};
