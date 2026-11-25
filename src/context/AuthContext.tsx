import React, { createContext, useContext, useState, useEffect } from 'react';
import { Profile, Equipe, EquipeMembro } from '../types/database';
import { SisRHRepository, supabase, isSupabaseConfigured } from '../services/supabase';

interface AuthContextType {
  currentUser: Profile | null;
  isAuthenticated: boolean;
  profiles: Profile[];
  equipes: Equipe[];
  minhasEquipes: Equipe[];
  isAdmin: boolean;
  isPadrao: boolean;
  isGestor: boolean;
  isColaborador: boolean;
  isSupabaseOnline: boolean;
  loginAs: (profileId: string) => void;
  loginWithEmail: (email: string, password: string) => Promise<{ sucesso: boolean; erro?: string }>;
  logout: () => void;
  recarregarDados: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [profiles, setProfiles] = useState<Profile[]>(() => SisRHRepository.getProfiles());
  const [equipes, setEquipes] = useState<Equipe[]>(() => SisRHRepository.getEquipes());
  const [membros, setMembros] = useState<EquipeMembro[]>(() => SisRHRepository.getEquipeMembros());
  const [isSupabaseOnline, setIsSupabaseOnline] = useState(isSupabaseConfigured);

  // Controle de Sessão
  const [currentUser, setCurrentUser] = useState<Profile | null>(() => {
    const isSessionActive = localStorage.getItem('sisrh_session_active');
    if (isSessionActive === 'true') {
      return SisRHRepository.getCurrentUser();
    }
    // Para facilitar primeira navegação, se não houver flag, inicia logado como admin padrão
    if (isSessionActive === null) {
      localStorage.setItem('sisrh_session_active', 'true');
      return SisRHRepository.getCurrentUser();
    }
    return null;
  });

  const isAuthenticated = Boolean(currentUser);

  const recarregarDados = () => {
    const p = SisRHRepository.getProfiles();
    const e = SisRHRepository.getEquipes();
    const m = SisRHRepository.getEquipeMembros();
    const curr = SisRHRepository.getCurrentUser();
    setProfiles(p);
    setEquipes(e);
    setMembros(m);
    if (localStorage.getItem('sisrh_session_active') === 'true') {
      setCurrentUser(curr);
    }
  };

  useEffect(() => {
    recarregarDados();
  }, []);

  const loginAs = (profileId: string) => {
    const allProfiles = SisRHRepository.getProfiles();
    const prof = allProfiles.find(p => p.id === profileId);
    if (prof) {
      setCurrentUser(prof);
      SisRHRepository.setCurrentUser(prof);
      localStorage.setItem('sisrh_session_active', 'true');
      recarregarDados();
    }
  };

  const loginWithEmail = async (email: string, password: string): Promise<{ sucesso: boolean; erro?: string }> => {
    const res = SisRHRepository.autenticarUsuario(email, password);
    if (res.sucesso && res.usuario) {
      setCurrentUser(res.usuario);
      SisRHRepository.setCurrentUser(res.usuario);
      localStorage.setItem('sisrh_session_active', 'true');
      recarregarDados();
      return { sucesso: true };
    }
    return { sucesso: false, erro: res.erro || 'Falha na autenticação.' };
  };

  const logout = () => {
    localStorage.removeItem('sisrh_session_active');
    setCurrentUser(null);
  };

  const minhasEquipes = equipes.filter(eq => {
    if (!currentUser) return false;
    if (currentUser.perfil === 'admin') return true; // Admin acessa todas
    return membros.some(m => m.equipe_id === eq.id && m.profile_id === currentUser.id);
  });

  const isAdmin = currentUser?.perfil === 'admin';
  const isPadrao = currentUser?.perfil === 'padrao' || currentUser?.perfil === 'colaborador';
  const isGestor = currentUser?.perfil === 'gestor' || isAdmin;
  const isColaborador = Boolean(currentUser);

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        isAuthenticated,
        profiles,
        equipes,
        minhasEquipes,
        isAdmin,
        isPadrao,
        isGestor,
        isColaborador,
        isSupabaseOnline,
        loginAs,
        loginWithEmail,
        logout,
        recarregarDados,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser usado dentro de AuthProvider');
  }
  return context;
};
