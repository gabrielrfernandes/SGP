import React, { useState } from 'react';
import { useAuth } from '../../context/AuthContext';
import { Badge } from '../common/Badge';
import {
  Users,
  Shield,
  Briefcase,
  ChevronDown,
  Database,
  Building2,
  CheckCircle2,
  LogOut,
  Info
} from 'lucide-react';

interface HeaderProps {
  onOpenSupabaseModal?: () => void;
}

export const Header: React.FC<HeaderProps> = ({ onOpenSupabaseModal }) => {
  const { currentUser, profiles, loginAs, isAdmin, isGestor, isSupabaseOnline, logout } = useAuth();
  const [userDropdownOpen, setUserDropdownOpen] = useState(false);

  const getPerfilBadge = () => {
    if (!currentUser) return null;
    switch (currentUser.perfil) {
      case 'admin':
        return <Badge variant="purple" size="sm"><Shield className="w-3 h-3" /> Administrador</Badge>;
      case 'gestor':
        return <Badge variant="blue" size="sm"><Briefcase className="w-3 h-3" /> Gestor</Badge>;
      default:
        return <Badge variant="slate" size="sm"><Users className="w-3 h-3" /> Colaborador</Badge>;
    }
  };

  return (
    <header className="sticky top-0 z-40 bg-white border-b border-slate-200 shadow-xs">
      {/* Barra de identificação federal / Fiocruz Minas */}
      <div className="bg-slate-900 text-slate-300 text-[11px] py-1 px-4 sm:px-6 flex items-center justify-between">
        <div className="flex items-center gap-2">
          <span className="font-semibold tracking-wider text-slate-100 uppercase">Fiocruz Minas</span>
          <span className="text-slate-500">|</span>
          <span className="truncate">Serviço de Gestão de Pessoas (SGP) &bull; Instituto René Rachou</span>
        </div>
        <div className="hidden md:flex items-center gap-4 text-slate-400">
          <span className="hover:text-slate-200 transition">Intranet Fiocruz</span>
          <span>&bull;</span>
          <span className="hover:text-slate-200 transition">Regulamentações SGP</span>
          <span>&bull;</span>
          <span className="hover:text-slate-200 transition">LGPD e Privacidade</span>
        </div>
      </div>

      {/* Conteúdo principal do cabeçalho */}
      <div className="px-4 sm:px-6 py-2.5 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-lg bg-blue-900 text-white flex items-center justify-center font-bold text-sm shadow-xs">
            <Building2 className="w-5 h-5 text-blue-300" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <h1 className="text-base font-bold text-slate-900 tracking-tight">SGP Atividades</h1>
              <span className="hidden sm:inline-block text-[11px] bg-blue-50 text-blue-800 font-medium px-2 py-0.5 rounded border border-blue-200">
                Fiocruz Minas
              </span>
            </div>
            <p className="text-xs text-slate-500 hidden sm:block">
              Serviço de Gestão de Pessoas &bull; Gestão de Atividades e Produtividade
            </p>
          </div>
        </div>

        {/* Lado Direito: Status Supabase e Seletor de Usuário */}
        <div className="flex items-center gap-3">
          {/* Indicador de Conexão com Banco em Nuvem */}
          <button
            onClick={onOpenSupabaseModal}
            className="hidden sm:flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium border transition bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            title="Clique para ver detalhes de conexão e status do banco"
          >
            <Database className="w-3.5 h-3.5 text-emerald-600" />
            <span>Banco em Nuvem Conectado</span>
            <Info className="w-3 h-3 text-emerald-600" />
          </button>

          {/* Painel do Perfil Atual */}
          <div className="relative">
            <button
              onClick={() => setUserDropdownOpen(!userDropdownOpen)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-lg border border-slate-200 bg-white hover:bg-slate-50 transition text-left cursor-pointer"
            >
              <div className="w-7 h-7 rounded-full bg-blue-100 text-blue-800 flex items-center justify-center text-xs font-semibold">
                {currentUser?.nome_completo ? currentUser.nome_completo.charAt(0) : 'U'}
              </div>
              <div className="hidden md:block">
                <div className="text-xs font-semibold text-slate-900 leading-tight">
                  {currentUser?.nome_completo || 'Perfil Autenticado'}
                </div>
                <div className="text-[10px] text-slate-500 flex items-center gap-1.5 mt-0.5">
                  <span className={`px-1.5 py-0.2 rounded font-semibold uppercase ${
                    currentUser?.perfil === 'admin' ? 'bg-purple-100 text-purple-800' : 'bg-blue-100 text-blue-800'
                  }`}>
                    {currentUser?.perfil === 'admin' ? 'Administrador' : 'Usuário Padrão'}
                  </span>
                  {currentUser?.matricula_siape && <span>• SIAPE {currentUser.matricula_siape}</span>}
                </div>
              </div>
              <ChevronDown className="w-4 h-4 text-slate-400" />
            </button>

            {/* Botão Sair direto na barra */}
            <button
              onClick={logout}
              className="hidden sm:flex items-center gap-1.5 px-3 py-1.5 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg transition font-medium cursor-pointer"
              title="Encerrar sessão no sistema"
            >
              <LogOut className="w-3.5 h-3.5" />
              <span>Sair</span>
            </button>

            {/* Dropdown com dados exclusivos do usuário logado */}
            {userDropdownOpen && (
              <div
                className="absolute right-0 mt-1.5 w-72 bg-white rounded-xl shadow-xl border border-slate-200 py-3 px-3.5 z-50 animate-in fade-in zoom-in-95 duration-100 space-y-3"
                onClick={() => setUserDropdownOpen(false)}
              >
                <div className="border-b border-slate-100 pb-2.5">
                  <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                    Servidor Autenticado
                  </div>
                  <div className="text-xs font-bold text-slate-900 mt-1 truncate">
                    {currentUser?.nome_completo}
                  </div>
                  <div className="text-[11px] text-slate-500 font-mono truncate">
                    {currentUser?.email}
                  </div>
                  <div className="flex items-center gap-2 mt-2">
                    <span className={`text-[10px] uppercase px-2 py-0.5 rounded-md font-bold ${
                      currentUser?.perfil === 'admin' ? 'bg-purple-100 text-purple-800 border border-purple-200' : 'bg-blue-100 text-blue-800 border border-blue-200'
                    }`}>
                      {currentUser?.perfil === 'admin' ? 'Administrador' : 'Usuário Padrão'}
                    </span>
                    {currentUser?.matricula_siape && (
                      <span className="text-[10px] text-slate-500 font-mono">
                        SIAPE {currentUser.matricula_siape}
                      </span>
                    )}
                  </div>
                </div>

                <div className="pt-1">
                  <button
                    onClick={logout}
                    className="w-full text-left px-3 py-2 text-xs text-rose-700 bg-rose-50 hover:bg-rose-100 border border-rose-200 rounded-lg flex items-center justify-center gap-2 transition font-bold cursor-pointer"
                  >
                    <LogOut className="w-4 h-4" />
                    <span>Encerrar Sessão (Sair)</span>
                  </button>
                  <p className="text-[10px] text-slate-400 text-center mt-2 leading-relaxed">
                    Para acessar com outro e-mail ou perfil, encerre a sessão e informe o e-mail e senha na tela de login.
                  </p>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};
