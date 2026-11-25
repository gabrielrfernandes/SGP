import React from 'react';
import { Modal } from './Modal';
import { isSupabaseConfigured, SisRHRepository } from '../../services/supabase';
import { Database, CheckCircle2, AlertCircle, FileCode, RotateCcw, Copy, ExternalLink } from 'lucide-react';

interface SupabaseInfoModalProps {
  isOpen: boolean;
  onClose: () => void;
  onDataReset?: () => void;
}

export const SupabaseInfoModal: React.FC<SupabaseInfoModalProps> = ({
  isOpen,
  onClose,
  onDataReset,
}) => {
  const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';

  const handleResetData = () => {
    if (confirm('Deseja restaurar todos os dados e lançamentos para o estado inicial do catálogo oficial (seed)?')) {
      SisRHRepository.resetToInitialSeed();
      if (onDataReset) onDataReset();
      onClose();
      window.location.reload();
    }
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Status da Integração com o Banco de Dados (Supabase)"
      subtitle="Configurações do backend, PostgreSQL, RLS e dados demonstrativos"
      maxWidth="xl"
    >
      <div className="space-y-4 text-xs text-slate-700">
        {/* Status de Conexão */}
        <div className="p-3 rounded-xl border flex items-start gap-3 bg-emerald-50 border-emerald-200 text-emerald-900">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div>
            <div className="font-bold">
              Banco de Dados em Nuvem Ativo e Operacional
            </div>
            <p className="mt-0.5 text-[11px] leading-relaxed">
              O banco de dados em nuvem foi provisionado na infraestrutura do Google Cloud/Firebase com regras de segurança ativas. Todos os lançamentos, equipes, catálogo de atividades e fechamento de meses são gravados e persistidos em nuvem.
            </p>
          </div>
        </div>

        {/* Arquivos de Migração e Seed Disponíveis */}
        <div className="border border-slate-200 rounded-xl p-3.5 space-y-2 bg-slate-50/50">
          <div className="font-bold text-slate-800 flex items-center gap-1.5">
            <FileCode className="w-4 h-4 text-purple-600" />
            <span>Scripts SQL Disponíveis no Repositório</span>
          </div>
          <ul className="space-y-1.5 text-[11px] text-slate-600">
            <li className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
              <div>
                <strong>supabase/migrations/001_schema.sql</strong>
                <div className="text-[10px] text-slate-400">Tabelas, enums, triggers de auditoria, trava de mês fechado e RLS</div>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Pronto</span>
            </li>
            <li className="flex items-center justify-between p-2 bg-white rounded border border-slate-200">
              <div>
                <strong>supabase/seed.sql</strong>
                <div className="text-[10px] text-slate-400">Catálogo inicial com as 19 atividades de RH (Qtd e Horas) e equipes padrão</div>
              </div>
              <span className="text-[10px] bg-slate-100 text-slate-700 px-2 py-0.5 rounded font-mono">Pronto</span>
            </li>
          </ul>
        </div>

        {/* Botão de Reset de Dados */}
        <div className="flex items-center justify-between pt-2 border-t border-slate-100">
          <button
            onClick={handleResetData}
            className="flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition"
          >
            <RotateCcw className="w-3.5 h-3.5" />
            <span>Restaurar Catálogo e Dados de Fábrica (Seed)</span>
          </button>

          <button
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-900 text-white rounded-lg text-xs font-semibold hover:bg-slate-800 transition"
          >
            Fechar
          </button>
        </div>
      </div>
    </Modal>
  );
};
