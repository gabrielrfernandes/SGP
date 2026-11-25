import { format, parseISO } from 'date-fns';
import { ptBR } from 'date-fns/locale';

/**
 * Formata número no padrão brasileiro (ex: 1.250 ou 1.250,50)
 */
export function formatarNumeroBR(valor: number | null | undefined, casasDecimais: number = 0): string {
  if (valor === null || valor === undefined || isNaN(valor)) return '0';
  return new Intl.NumberFormat('pt-BR', {
    minimumFractionDigits: casasDecimais,
    maximumFractionDigits: casasDecimais,
  }).format(valor);
}

/**
 * Converte valor decimal de horas (ex: 1.5) para formato "1h30"
 */
export function formatarHorasBR(horasDecimais: number | null | undefined): string {
  if (horasDecimais === null || horasDecimais === undefined || isNaN(horasDecimais) || horasDecimais === 0) {
    return '0h00';
  }
  const totalMinutos = Math.round(horasDecimais * 60);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${horas}h${minutos.toString().padStart(2, '0')}`;
}

/**
 * Converte minutos para string "1h30"
 */
export function formatarMinutosParaHoras(minutosTotais: number | null | undefined): string {
  if (!minutosTotais || minutosTotais <= 0) return '0h00';
  const horas = Math.floor(minutosTotais / 60);
  const minutos = minutosTotais % 60;
  return `${horas}h${minutos.toString().padStart(2, '0')}`;
}

/**
 * Converte string "hh:mm" ou "1:30" ou "1h30" para decimal de horas (ex: 1.5)
 */
export function converterStringParaHorasDecimais(tempoStr: string): number {
  if (!tempoStr) return 0;
  const limpo = tempoStr.trim().toLowerCase().replace('h', ':');
  const partes = limpo.split(':');
  if (partes.length === 1) {
    const num = parseFloat(partes[0].replace(',', '.'));
    return isNaN(num) ? 0 : num;
  }
  const horas = parseInt(partes[0], 10) || 0;
  const minutos = parseInt(partes[1], 10) || 0;
  return Number((horas + minutos / 60).toFixed(2));
}

/**
 * Converte decimal de horas para string de input "HH:MM"
 */
export function converterHorasDecimaisParaTimeInput(horasDecimais: number | null | undefined): string {
  if (!horasDecimais || horasDecimais <= 0) return '01:00';
  const totalMinutos = Math.round(horasDecimais * 60);
  const horas = Math.floor(totalMinutos / 60);
  const minutos = totalMinutos % 60;
  return `${horas.toString().padStart(2, '0')}:${minutos.toString().padStart(2, '0')}`;
}

/**
 * Formata data ISO para "DD/MM/YYYY"
 */
export function formatarDataBR(dataIso: string | Date | null | undefined): string {
  if (!dataIso) return '-';
  try {
    const dataObj = typeof dataIso === 'string' ? parseISO(dataIso.split('T')[0]) : dataIso;
    return format(dataObj, 'dd/MM/yyyy', { locale: ptBR });
  } catch {
    return String(dataIso);
  }
}

/**
 * Nome do mês em português (1 = Janeiro, 12 = Dezembro)
 */
export const MESES_NOMES = [
  'Janeiro', 'Fevereiro', 'Março', 'Abril', 'Maio', 'Junho',
  'Julho', 'Agosto', 'Setembro', 'Outubro', 'Novembro', 'Dezembro'
];

export const MESES_SIGLAS = [
  'Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun',
  'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'
];
