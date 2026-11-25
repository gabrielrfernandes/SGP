/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState } from 'react';
import { AuthProvider, useAuth } from './context/AuthContext';
import { Header } from './components/layout/Header';
import { Sidebar, NavTab } from './components/layout/Sidebar';
import { RegistroAtividades } from './pages/RegistroAtividades';
import { Dashboard } from './pages/Dashboard';
import { Relatorios } from './pages/Relatorios';
import { Importacao } from './pages/Importacao';
import { Admin } from './pages/Admin';
import { Login } from './pages/Login';
import { SupabaseInfoModal } from './components/common/SupabaseInfoModal';

function MainApp() {
  const { currentUser, isAuthenticated, recarregarDados } = useAuth();
  const [currentTab, setCurrentTab] = useState<NavTab>('registro');
  const [supabaseModalOpen, setSupabaseModalOpen] = useState(false);

  // Se não estiver autenticado, exibe a tela de login com senha
  if (!isAuthenticated || !currentUser) {
    return <Login />;
  }

  return (
    <div className="min-h-screen bg-slate-100 flex flex-col font-sans">
      {/* Cabeçalho Oficial Federal */}
      <Header onOpenSupabaseModal={() => setSupabaseModalOpen(true)} />

      {/* Conteúdo com Barra Lateral e Painel Central */}
      <div className="flex-1 flex overflow-hidden">
        {/* Barra Lateral de Navegação */}
        <Sidebar currentTab={currentTab} onSelectTab={setCurrentTab} />

        {/* Área Central de Conteúdo */}
        <main className="flex-1 overflow-y-auto bg-slate-50/60 pb-12">
          {currentTab === 'registro' && <RegistroAtividades />}
          {currentTab === 'dashboard' && <Dashboard />}
          {currentTab === 'relatorios' && <Relatorios />}
          {currentTab === 'importacao' && <Importacao />}
          {currentTab === 'admin' && <Admin />}
        </main>
      </div>

      {/* Modal de Status e Informações do Supabase */}
      <SupabaseInfoModal
        isOpen={supabaseModalOpen}
        onClose={() => setSupabaseModalOpen(false)}
        onDataReset={recarregarDados}
      />
    </div>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <MainApp />
    </AuthProvider>
  );
}
