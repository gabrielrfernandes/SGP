import React from 'react';
import { useAuth } from '../../context/AuthContext';
import {
  CalendarDays,
  LayoutDashboard,
  FileSpreadsheet,
  UploadCloud,
  Settings,
  ShieldCheck,
  CheckCircle,
  Clock,
  Briefcase
} from 'lucide-react';

export type NavTab = 'registro' | 'dashboard' | 'relatorios' | 'importacao' | 'admin';

interface SidebarProps {
  currentTab: NavTab;
  onSelectTab: (tab: NavTab) => void;
}

export const Sidebar: React.FC<SidebarProps> = ({ currentTab, onSelectTab }) => {
  const { currentUser, isAdmin, isGestor } = useAuth();

  const navItems = [
    {
      id: 'registro' as NavTab,
      label: 'Registro de Atividades',
      icon: CalendarDays,
      description: 'Lançamentos diários e grade rápida',
      badge: 'Principal',
    },
    {
      id: 'dashboard' as NavTab,
      label: 'Painel e Indicadores',
      icon: LayoutDashboard,
      description: 'Gráficos, totais e comparativos',
    },
    {
      id: 'relatorios' as NavTab,
      label: 'Relatórios Oficiais',
      icon: FileSpreadsheet,
      description: 'Exportação Excel, PDF e CSV',
    },
    {
      id: 'importacao' as NavTab,
      label: 'Importar Histórico',
      icon: UploadCloud,
      description: 'Migração de planilhas legadas',
    },
    {
      id: 'admin' as NavTab,
      label: 'Administração',
      icon: Settings,
      description: 'Equipes, catálogo, meses e auditoria',
      requiresAdminOrGestor: true,
    },
  ];

  return (
    <aside className="w-64 bg-slate-900 text-slate-300 flex flex-col shrink-0 border-r border-slate-800">
      {/* Seção Superior / Contexto do Servidor */}
      <div className="p-4 border-b border-slate-800 bg-slate-950/40">
        <div className="flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-lg bg-blue-600/30 text-blue-400 border border-blue-500/30 flex items-center justify-center font-bold text-xs">
            RH
          </div>
          <div className="overflow-hidden">
            <div className="text-xs font-semibold text-slate-100 truncate">
              {currentUser?.nome_completo || 'Servidor Público'}
            </div>
            <div className="text-[11px] text-slate-400 capitalize flex items-center gap-1.5">
              <span className={`inline-block w-2 h-2 rounded-full ${currentUser?.ativo ? 'bg-emerald-500' : 'bg-rose-500'}`} />
              Função: <strong className="text-slate-200">{currentUser?.perfil === 'admin' ? 'Administrador' : 'Usuário Padrão'}</strong>
            </div>
          </div>
        </div>
      </div>

      {/* Navegação Principal */}
      <nav className="p-3 space-y-1 flex-1">
        <div className="px-3 py-1.5 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
          Módulos do Sistema
        </div>

        {navItems.map(item => {
          if (item.requiresAdminOrGestor && !isAdmin) {
            return null;
          }

          const isActive = currentTab === item.id;
          const Icon = item.icon;

          return (
            <button
              key={item.id}
              onClick={() => onSelectTab(item.id)}
              className={`w-full flex items-start gap-3 px-3 py-2.5 rounded-lg text-left transition ${
                isActive
                  ? 'bg-blue-600 text-white font-medium shadow-sm'
                  : 'text-slate-300 hover:bg-slate-800/80 hover:text-white'
              }`}
            >
              <Icon className={`w-5 h-5 shrink-0 mt-0.5 ${isActive ? 'text-white' : 'text-slate-400'}`} />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-semibold truncate">{item.label}</span>
                  {item.badge && (
                    <span className="text-[9px] bg-blue-500/30 text-blue-200 px-1.5 py-0.5 rounded font-mono">
                      {item.badge}
                    </span>
                  )}
                </div>
                <div className={`text-[11px] truncate ${isActive ? 'text-blue-100' : 'text-slate-400'}`}>
                  {item.description}
                </div>
              </div>
            </button>
          );
        })}
      </nav>

      {/* Card Informativo de Métricas Institucionais */}
      <div className="p-3 m-3 rounded-lg bg-slate-800/70 border border-slate-700/60 text-xs">
        <div className="flex items-center gap-1.5 font-semibold text-slate-200 mb-1.5">
          <ShieldCheck className="w-4 h-4 text-emerald-400" />
          <span>Controle e Conformidade</span>
        </div>
        <p className="text-[11px] text-slate-400 leading-relaxed">
          Lançamentos salvos com carimbo de data, métrica explícita e rastreabilidade total (LGPD).
        </p>
      </div>

      {/* Rodapé da barra */}
      <div className="p-3 border-t border-slate-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>SGP &bull; Fiocruz Minas</span>
        <span className="font-mono text-slate-400">2026</span>
      </div>
    </aside>
  );
};
