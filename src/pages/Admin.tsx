import React, { useState, useMemo } from 'react';
import { useAuth } from '../context/AuthContext';
import { SisRHRepository } from '../services/supabase';
import {
  Profile,
  CargoServidor,
  CARGOS_SERVIDOR,
  Equipe,
  Atividade,
  CategoriaAtividade,
  MesFechado,
  AuditoriaLog
} from '../types/database';
import { Badge } from '../components/common/Badge';
import { Modal } from '../components/common/Modal';
import {
  formatarDataBR,
  MESES_NOMES
} from '../utils/formatters';
import {
  Settings,
  Users,
  Briefcase,
  Layers,
  Lock,
  Unlock,
  ShieldAlert,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ToggleLeft,
  ToggleRight,
  Clock,
  Search,
  Check,
  KeyRound,
  Shield,
  User,
  Copy,
  Sparkles,
  Mail
} from 'lucide-react';

export const Admin: React.FC = () => {
  const { currentUser, isAdmin, isGestor, recarregarDados } = useAuth();

  const [abaAtiva, setAbaAtiva] = useState<'usuarios' | 'equipes' | 'catalogo' | 'atribuicoes' | 'fechamento' | 'auditoria'>('usuarios');
  const [refreshKey, setRefreshKey] = useState(0);
  const triggerRefresh = () => {
    setRefreshKey(k => k + 1);
    recarregarDados();
  };

  // Notificações
  const [mensagemSucesso, setMensagemSucesso] = useState<string | null>(null);
  const [mensagemErro, setMensagemErro] = useState<string | null>(null);

  // Dados do repositório
  const profiles = useMemo(() => SisRHRepository.getProfiles(), [refreshKey]);
  const equipes = useMemo(() => SisRHRepository.getEquipes(), [refreshKey]);
  const equipeMembros = useMemo(() => SisRHRepository.getEquipeMembros(), [refreshKey]);
  const atividades = useMemo(() => SisRHRepository.getAtividades(), [refreshKey]);
  const categorias = useMemo(() => SisRHRepository.getCategorias(), [refreshKey]);
  const equipeAtividades = useMemo(() => SisRHRepository.getEquipeAtividades(), [refreshKey]);
  const mesesFechados = useMemo(() => SisRHRepository.getMesesFechados(), [refreshKey]);
  const auditoriaLogs = useMemo(() => SisRHRepository.getAuditoria(), [refreshKey]);

  // ========================================================
  // ABA 1: GESTÃO DE USUÁRIOS
  // ========================================================
  const [modalUsuarioAberto, setModalUsuarioAberto] = useState(false);
  const [usuarioEmEdicao, setUsuarioEmEdicao] = useState<Profile | null>(null);
  const [formNomeUsuario, setFormNomeUsuario] = useState('');
  const [formEmailUsuario, setFormEmailUsuario] = useState('');
  const [formSenhaUsuario, setFormSenhaUsuario] = useState('');
  const [formSiapeUsuario, setFormSiapeUsuario] = useState('');
  const [formCargoUsuario, setFormCargoUsuario] = useState<CargoServidor | ''>('');
  const [formPerfilUsuario, setFormPerfilUsuario] = useState<'admin' | 'padrao'>('padrao');
  const [formEquipeUsuarioId, setFormEquipeUsuarioId] = useState('');
  const [mostrarSenhaModal, setMostrarSenhaModal] = useState(false);
  const [usuarioParaExcluir, setUsuarioParaExcluir] = useState<Profile | null>(null);

  // Filtros de busca de Usuários
  const [filtroTextoUsuario, setFiltroTextoUsuario] = useState('');
  const [filtroPerfilUsuario, setFiltroPerfilUsuario] = useState<'todos' | 'admin' | 'padrao'>('todos');
  const [filtroStatusUsuario, setFiltroStatusUsuario] = useState<'todos' | 'ativos' | 'inativos'>('todos');
  const [verSenhasTabela, setVerSenhasTabela] = useState(false);

  const usuariosFiltrados = useMemo(() => {
    return profiles.filter(p => {
      const eAdmin = p.perfil === 'admin';
      if (filtroPerfilUsuario === 'admin' && !eAdmin) return false;
      if (filtroPerfilUsuario === 'padrao' && eAdmin) return false;
      if (filtroStatusUsuario === 'ativos' && !p.ativo) return false;
      if (filtroStatusUsuario === 'inativos' && p.ativo) return false;
      if (filtroTextoUsuario) {
        const t = filtroTextoUsuario.toLowerCase();
        const nomeMatch = p.nome_completo.toLowerCase().includes(t);
        const emailMatch = p.email.toLowerCase().includes(t);
        const siapeMatch = p.matricula_siape ? p.matricula_siape.includes(t) : false;
        if (!nomeMatch && !emailMatch && !siapeMatch) return false;
      }
      return true;
    });
  }, [profiles, filtroTextoUsuario, filtroPerfilUsuario, filtroStatusUsuario]);

  const abrirModalNovoUsuario = () => {
    setUsuarioEmEdicao(null);
    setFormNomeUsuario('');
    setFormEmailUsuario('');
    setFormSenhaUsuario('padrao123');
    setFormSiapeUsuario('');
    setFormCargoUsuario('');
    setFormPerfilUsuario('padrao');
    setFormEquipeUsuarioId(equipes[0]?.id || '');
    setMostrarSenhaModal(false);
    setModalUsuarioAberto(true);
  };

  const abrirModalEditarUsuario = (p: Profile) => {
    setUsuarioEmEdicao(p);
    setFormNomeUsuario(p.nome_completo);
    setFormEmailUsuario(p.email);
    setFormSenhaUsuario(p.senha || (p.perfil === 'admin' ? 'admin123' : 'padrao123'));
    setFormSiapeUsuario(p.matricula_siape || '');
    setFormCargoUsuario(p.cargo || '');
    setFormPerfilUsuario(p.perfil === 'admin' ? 'admin' : 'padrao');
    const eqMembro = equipeMembros.find(m => m.profile_id === p.id);
    setFormEquipeUsuarioId(eqMembro?.equipe_id || '');
    setMostrarSenhaModal(false);
    setModalUsuarioAberto(true);
  };

  const gerarSenhaAleatoria = () => {
    const chars = 'abcdefghjkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789!@#$';
    let s = 'rh-';
    for (let i = 0; i < 6; i++) {
      s += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    setFormSenhaUsuario(s);
  };

  const salvarUsuario = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const savedUser = SisRHRepository.saveProfile({
        id: usuarioEmEdicao?.id,
        nome_completo: formNomeUsuario,
        email: formEmailUsuario,
        matricula_siape: formSiapeUsuario.trim() || null,
        cargo: formCargoUsuario || null,
        perfil: formPerfilUsuario,
        senha: formSenhaUsuario.trim() || (formPerfilUsuario === 'admin' ? 'admin123' : 'padrao123'),
      });

      // Se selecionou equipe e for novo usuário ou edição
      if (formEquipeUsuarioId) {
        const membrosAtuais = equipeMembros
          .filter(m => m.equipe_id === formEquipeUsuarioId && m.profile_id !== savedUser.id)
          .map(m => ({ profile_id: m.profile_id, papel: m.papel }));
        
        membrosAtuais.push({ profile_id: savedUser.id, papel: 'membro' });
        SisRHRepository.setEquipeMembros(formEquipeUsuarioId, membrosAtuais);
      }

      setMensagemSucesso(`Usuário "${formNomeUsuario}" salvo com sucesso! O acesso já está liberado pelo e-mail "${savedUser.email}" e senha definida.`);
      setModalUsuarioAberto(false);
      triggerRefresh();
      setTimeout(() => setMensagemSucesso(null), 5000);
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao salvar usuário.');
      setTimeout(() => setMensagemErro(null), 5000);
    }
  };

  const toggleUsuarioAtivo = (id: string) => {
    SisRHRepository.toggleProfileAtivo(id);
    triggerRefresh();
  };

  const confirmarExclusaoUsuario = () => {
    if (!usuarioParaExcluir) return;
    try {
      const { id, nome_completo, email } = usuarioParaExcluir;
      SisRHRepository.deleteProfile(id);
      setUsuarioParaExcluir(null);
      setMensagemSucesso(`Usuário "${nome_completo}" (${email}) excluído com sucesso.`);
      triggerRefresh();
      setTimeout(() => setMensagemSucesso(null), 5000);
    } catch (err: any) {
      setUsuarioParaExcluir(null);
      setMensagemErro(err.message || 'Erro ao excluir usuário.');
      setTimeout(() => setMensagemErro(null), 5000);
    }
  };

  // ========================================================
  // ABA 2: GESTÃO DE EQUIPES
  // ========================================================
  const [modalEquipeAberto, setModalEquipeAberto] = useState(false);
  const [equipeEmEdicao, setEquipeEmEdicao] = useState<Equipe | null>(null);
  const [formNomeEquipe, setFormNomeEquipe] = useState('');
  const [formSiglaEquipe, setFormSiglaEquipe] = useState('');
  const [formDescricaoEquipe, setFormDescricaoEquipe] = useState('');
  const [formMembrosSelecionados, setFormMembrosSelecionados] = useState<{ profile_id: string; papel: 'membro' | 'coordenador' }[]>([]);

  const abrirModalNovaEquipe = () => {
    setEquipeEmEdicao(null);
    setFormNomeEquipe('');
    setFormSiglaEquipe('');
    setFormDescricaoEquipe('');
    setFormMembrosSelecionados([]);
    setModalEquipeAberto(true);
  };

  const abrirModalEditarEquipe = (eq: Equipe) => {
    setEquipeEmEdicao(eq);
    setFormNomeEquipe(eq.nome);
    setFormSiglaEquipe(eq.sigla || '');
    setFormDescricaoEquipe(eq.descricao || '');
    const atuais = equipeMembros.filter(m => m.equipe_id === eq.id).map(m => ({ profile_id: m.profile_id, papel: m.papel }));
    setFormMembrosSelecionados(atuais);
    setModalEquipeAberto(true);
  };

  const salvarEquipe = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const eq = SisRHRepository.saveEquipe({
        id: equipeEmEdicao?.id,
        nome: formNomeEquipe,
        sigla: formSiglaEquipe.trim() || undefined,
        descricao: formDescricaoEquipe.trim() || undefined,
      });

      SisRHRepository.setEquipeMembros(eq.id, formMembrosSelecionados);

      setMensagemSucesso('Equipe gravada com sucesso!');
      setModalEquipeAberto(false);
      triggerRefresh();
      setTimeout(() => setMensagemSucesso(null), 3000);
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao salvar equipe.');
    }
  };

  // ========================================================
  // ABA 3: CATÁLOGO DE ATIVIDADES
  // ========================================================
  const [modalAtividadeAberto, setModalAtividadeAberto] = useState(false);
  const [atividadeEmEdicao, setAtividadeEmEdicao] = useState<Atividade | null>(null);
  const [formNomeAtiv, setFormNomeAtiv] = useState('');
  const [formCategoriaAtivId, setFormCategoriaAtivId] = useState('');
  const [formTipoMedidaAtiv, setFormTipoMedidaAtiv] = useState<'quantidade' | 'horas'>('quantidade');
  const [formDescricaoAtiv, setFormDescricaoAtiv] = useState('');
  const [formVigenciaInicio, setFormVigenciaInicio] = useState(new Date().toISOString().split('T')[0]);
  const [formVigenciaFim, setFormVigenciaFim] = useState('');
  const [formAtribuirATodasEquipes, setFormAtribuirATodasEquipes] = useState(true);

  // Filtros do Catálogo
  const [filtroTextoCatalogo, setFiltroTextoCatalogo] = useState('');
  const [filtroCategoriaCatalogo, setFiltroCategoriaCatalogo] = useState('');
  const [filtroTipoMedidaCatalogo, setFiltroTipoMedidaCatalogo] = useState<'todos' | 'quantidade' | 'horas'>('todos');
  const [filtroStatusCatalogo, setFiltroStatusCatalogo] = useState<'todos' | 'ativos' | 'inativos'>('todos');

  const atividadesFiltradas = useMemo(() => {
    return atividades.filter(a => {
      if (filtroTipoMedidaCatalogo !== 'todos' && a.tipo_medida !== filtroTipoMedidaCatalogo) return false;
      if (filtroCategoriaCatalogo && a.categoria_id !== filtroCategoriaCatalogo) return false;
      if (filtroStatusCatalogo === 'ativos' && !a.ativo) return false;
      if (filtroStatusCatalogo === 'inativos' && a.ativo) return false;
      if (filtroTextoCatalogo) {
        const t = filtroTextoCatalogo.toLowerCase();
        const nomeMatch = a.nome.toLowerCase().includes(t);
        const descMatch = a.descricao ? a.descricao.toLowerCase().includes(t) : false;
        if (!nomeMatch && !descMatch) return false;
      }
      return true;
    });
  }, [atividades, filtroTextoCatalogo, filtroCategoriaCatalogo, filtroTipoMedidaCatalogo, filtroStatusCatalogo]);

  const abrirModalNovaAtividade = () => {
    setAtividadeEmEdicao(null);
    setFormNomeAtiv('');
    setFormCategoriaAtivId(categorias[0]?.id || '');
    setFormTipoMedidaAtiv('quantidade');
    setFormDescricaoAtiv('');
    setFormVigenciaInicio(new Date().toISOString().split('T')[0]);
    setFormVigenciaFim('');
    setFormAtribuirATodasEquipes(true);
    setModalAtividadeAberto(true);
  };

  const abrirModalEditarAtividade = (ativ: Atividade) => {
    setAtividadeEmEdicao(ativ);
    setFormNomeAtiv(ativ.nome);
    setFormCategoriaAtivId(ativ.categoria_id);
    setFormTipoMedidaAtiv(ativ.tipo_medida);
    setFormDescricaoAtiv(ativ.descricao || '');
    setFormVigenciaInicio(ativ.vigencia_inicio);
    setFormVigenciaFim(ativ.vigencia_fim || '');
    setModalAtividadeAberto(true);
  };

  const salvarAtividade = (e: React.FormEvent) => {
    e.preventDefault();
    try {
      const novaAtiv = SisRHRepository.saveAtividade({
        id: atividadeEmEdicao?.id,
        nome: formNomeAtiv,
        categoria_id: formCategoriaAtivId,
        tipo_medida: formTipoMedidaAtiv,
        descricao: formDescricaoAtiv.trim() || undefined,
        vigencia_inicio: formVigenciaInicio,
        vigencia_fim: formVigenciaFim.trim() || null,
      });

      // Se for nova atividade criada e marcada para disponibilizar para as equipes
      if (!atividadeEmEdicao && formAtribuirATodasEquipes) {
        equipes.forEach(eq => {
          const ativsDaEq = SisRHRepository.getAtividadesByEquipe(eq.id).map(a => a.id);
          if (!ativsDaEq.includes(novaAtiv.id)) {
            SisRHRepository.setEquipeAtividades(eq.id, [...ativsDaEq, novaAtiv.id]);
          }
        });
      }

      setMensagemSucesso(`Atividade "${formNomeAtiv}" salva e disponibilizada para registros!`);
      setModalAtividadeAberto(false);
      triggerRefresh();
      setTimeout(() => setMensagemSucesso(null), 3500);
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao salvar atividade.');
    }
  };

  const toggleAtividadeAtiva = (id: string) => {
    SisRHRepository.toggleAtividadeAtiva(id);
    triggerRefresh();
  };

  // ========================================================
  // ABA 4: ATRIBUIÇÕES (Equipe x Atividades)
  // ========================================================
  const [equipeAtribuicaoId, setEquipeAtribuicaoId] = useState<string>(equipes[0]?.id || '');
  const atividadesDaEquipeAtribuicao = useMemo(() => {
    const rels = equipeAtividades.filter(ea => ea.equipe_id === equipeAtribuicaoId);
    return new Set(rels.map(r => r.atividade_id));
  }, [equipeAtividades, equipeAtribuicaoId]);

  const toggleAtividadeNaEquipe = (atividadeId: string) => {
    const novoSet = new Set(atividadesDaEquipeAtribuicao);
    if (novoSet.has(atividadeId)) {
      novoSet.delete(atividadeId);
    } else {
      novoSet.add(atividadeId);
    }
    SisRHRepository.setEquipeAtividades(equipeAtribuicaoId, Array.from(novoSet));
    triggerRefresh();
  };

  // ========================================================
  // ABA 5: FECHAMENTO DE MESES
  // ========================================================
  const [fechamentoEquipeId, setFechamentoEquipeId] = useState<string>(equipes[0]?.id || '');
  const [fechamentoAno, setFechamentoAno] = useState<number>(new Date().getFullYear());
  const [fechamentoMes, setFechamentoMes] = useState<number>(new Date().getMonth() + 1);
  const [fechamentoMotivo, setFechamentoMotivo] = useState<string>('Homologação mensal do RH');

  const handleFecharMes = (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentUser) return;
    try {
      SisRHRepository.fecharMes(
        fechamentoEquipeId,
        fechamentoAno,
        fechamentoMes,
        currentUser.id,
        fechamentoMotivo
      );
      setMensagemSucesso('Mês fechado e homologado com sucesso! As edições estão travadas.');
      triggerRefresh();
      setTimeout(() => setMensagemSucesso(null), 3000);
    } catch (err: any) {
      setMensagemErro(err.message || 'Erro ao fechar mês.');
      setTimeout(() => setMensagemErro(null), 4000);
    }
  };

  const handleReabrirMes = (id: string) => {
    if (!isAdmin) {
      setMensagemErro('Apenas administradores podem reabrir meses bloqueados.');
      return;
    }
    if (confirm('Tem certeza de que deseja reabrir este mês? As equipes poderão editar lançamentos novamente.')) {
      SisRHRepository.reabrirMes(id);
      setMensagemSucesso('Mês reaberto com sucesso!');
      triggerRefresh();
      setTimeout(() => setMensagemSucesso(null), 3000);
    }
  };

  return (
    <div className="p-4 sm:p-6 max-w-7xl mx-auto space-y-6">
      {/* Notificações */}
      {mensagemSucesso && (
        <div className="p-3 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
            <span>{mensagemSucesso}</span>
          </div>
          <button onClick={() => setMensagemSucesso(null)} className="font-bold text-emerald-600">&times;</button>
        </div>
      )}
      {mensagemErro && (
        <div className="p-3 bg-rose-50 border border-rose-200 text-rose-800 rounded-lg text-xs flex items-center justify-between">
          <div className="flex items-center gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0" />
            <span>{mensagemErro}</span>
          </div>
          <button onClick={() => setMensagemErro(null)} className="font-bold text-rose-600">&times;</button>
        </div>
      )}

      {/* Cabeçalho */}
      <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-xs flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <Settings className="w-5 h-5 text-purple-700" />
            <span>Módulo de Administração e Governança</span>
          </h2>
          <p className="text-xs text-slate-500 mt-1">
            Gestão de acessos, catálogo de atividades, equipes compartilhadas, homologação de meses e auditoria
          </p>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="purple" size="sm">
            Privilégio: {isAdmin ? 'Super Admin' : 'Gestor de Unidade'}
          </Badge>
        </div>
      </div>

      {/* Barra de Abas de Administração */}
      <div className="flex flex-wrap border-b border-slate-200 gap-1 bg-white p-1 rounded-xl shadow-xs">
        {[
          { id: 'usuarios', label: 'Usuários e Perfis', icon: Users },
          { id: 'equipes', label: 'Equipes e Membros', icon: Briefcase },
          { id: 'catalogo', label: 'Catálogo de Atividades', icon: Layers },
          { id: 'atribuicoes', label: 'Atribuições de Atividades', icon: Check },
          { id: 'fechamento', label: 'Fechamento de Meses', icon: Lock },
          { id: 'auditoria', label: 'Trilha de Auditoria (LGPD)', icon: ShieldAlert },
        ].map(aba => {
          const Icon = aba.icon;
          const isSelected = abaAtiva === aba.id;
          return (
            <button
              key={aba.id}
              onClick={() => setAbaAtiva(aba.id as any)}
              className={`flex items-center gap-2 px-3.5 py-2 rounded-lg text-xs font-semibold transition ${
                isSelected
                  ? 'bg-purple-50 text-purple-800 border border-purple-200'
                  : 'text-slate-600 hover:bg-slate-100'
              }`}
            >
              <Icon className={`w-4 h-4 ${isSelected ? 'text-purple-600' : 'text-slate-400'}`} />
              <span>{aba.label}</span>
            </button>
          );
        })}
      </div>

      {/* ======================================================== */}
      {/* ABA 1: USUÁRIOS                                          */}
      {/* ======================================================== */}
      {abaAtiva === 'usuarios' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Users className="w-4 h-4 text-blue-700" />
                <span>Servidores Cadastrados ({profiles.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Cadastre novos usuários com permissão de <strong>Administrador</strong> ou <strong>Usuário Padrão</strong>. O acesso é liberado imediatamente via e-mail e senha.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={abrirModalNovoUsuario}
                className="flex items-center gap-2 px-3.5 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Novo Usuário</span>
              </button>
            )}
          </div>

          {/* Barra de Filtros e Busca de Usuários */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filtroTextoUsuario}
                onChange={(e) => setFiltroTextoUsuario(e.target.value)}
                placeholder="Buscar por nome, e-mail ou SIAPE..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Perfil:</label>
              <select
                value={filtroPerfilUsuario}
                onChange={(e) => setFiltroPerfilUsuario(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
              >
                <option value="todos">Todos os Perfis ({profiles.length})</option>
                <option value="admin">Apenas Administradores</option>
                <option value="padrao">Apenas Usuários Padrão</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Status:</label>
              <select
                value={filtroStatusUsuario}
                onChange={(e) => setFiltroStatusUsuario(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
              >
                <option value="todos">Todos os Status</option>
                <option value="ativos">Apenas Ativos</option>
                <option value="inativos">Apenas Desativados</option>
              </select>
            </div>

            <button
              type="button"
              onClick={() => setVerSenhasTabela(!verSenhasTabela)}
              className={`flex items-center gap-1.5 px-3 py-2 rounded-lg text-xs font-medium border transition ${
                verSenhasTabela
                  ? 'bg-amber-50 text-amber-900 border-amber-300'
                  : 'bg-slate-50 text-slate-600 border-slate-200 hover:bg-slate-100'
              }`}
              title="Exibir senhas cadastradas para suporte ao usuário"
            >
              {verSenhasTabela ? <EyeOff className="w-3.5 h-3.5" /> : <Eye className="w-3.5 h-3.5" />}
              <span>{verSenhasTabela ? 'Ocultar Senhas' : 'Ver Senhas'}</span>
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Nome do Servidor</th>
                  <th className="py-2.5 px-3">E-mail Institucional (Login de Acesso)</th>
                  {verSenhasTabela && <th className="py-2.5 px-3 font-mono">Senha</th>}
                  <th className="py-2.5 px-3">Matrícula SIAPE</th>
                  <th className="py-2.5 px-3">Cargo</th>
                  <th className="py-2.5 px-3">Função / Perfil</th>
                  <th className="py-2.5 px-3">Equipe</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {usuariosFiltrados.length === 0 ? (
                  <tr>
                    <td colSpan={verSenhasTabela ? 9 : 8} className="py-6 text-center text-slate-400">
                      Nenhum servidor encontrado com os filtros aplicados.
                    </td>
                  </tr>
                ) : (
                  usuariosFiltrados.map(p => {
                    const eqMembro = equipeMembros.find(m => m.profile_id === p.id);
                    const equipeDoUsuario = eqMembro ? equipes.find(e => e.id === eqMembro.equipe_id) : null;
                    const eAdmin = p.perfil === 'admin';
                    const senhaCadastrada = p.senha || (eAdmin ? 'admin123' : 'padrao123');

                    return (
                      <tr key={p.id} className="hover:bg-slate-50 transition">
                        <td className="py-2.5 px-3">
                          <div className="font-bold text-slate-900">{p.nome_completo}</div>
                          {p.id === currentUser?.id && (
                            <span className="text-[10px] text-blue-600 font-semibold">(Você)</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-slate-700 font-mono text-[11px]">
                          <div className="flex items-center gap-1.5">
                            <Mail className="w-3.5 h-3.5 text-slate-400 shrink-0" />
                            <span>{p.email}</span>
                          </div>
                        </td>
                        {verSenhasTabela && (
                          <td className="py-2.5 px-3 font-mono text-[11px] text-amber-800">
                            <span className="bg-amber-100/70 px-1.5 py-0.5 rounded font-bold">
                              {senhaCadastrada}
                            </span>
                          </td>
                        )}
                        <td className="py-2.5 px-3 font-mono text-slate-500">{p.matricula_siape || '-'}</td>
                        <td className="py-2.5 px-3 text-slate-700">
                          {p.cargo ? (
                            <span className="inline-flex items-center px-2 py-0.5 rounded bg-slate-100 text-slate-800 border border-slate-200 font-semibold text-[11px]">
                              {p.cargo}
                            </span>
                          ) : (
                            <span className="text-slate-400">-</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3">
                          <span className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded text-[10px] font-bold uppercase ${
                            eAdmin
                              ? 'bg-purple-100 text-purple-800 border border-purple-200'
                              : 'bg-blue-100 text-blue-800 border border-blue-200'
                          }`}>
                            {eAdmin ? <Shield className="w-3 h-3" /> : <User className="w-3 h-3" />}
                            <span>{eAdmin ? 'Administrador' : 'Usuário Padrão'}</span>
                          </span>
                        </td>
                        <td className="py-2.5 px-3 text-slate-600 text-[11px]">
                          {equipeDoUsuario ? (
                            <span className="font-semibold text-slate-800">{equipeDoUsuario.nome}</span>
                          ) : (
                            <span className="text-slate-400 italic">Sem equipe</span>
                          )}
                        </td>
                        <td className="py-2.5 px-3 text-center">
                          <button
                            onClick={() => toggleUsuarioAtivo(p.id)}
                            disabled={!isAdmin || p.id === currentUser?.id}
                            className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                              p.ativo
                                ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                            } disabled:opacity-50 disabled:cursor-not-allowed`}
                            title={p.id === currentUser?.id ? 'Você não pode desativar sua própria conta' : 'Clique para alternar ativo/inativo'}
                          >
                            {p.ativo ? 'Ativo' : 'Desativado'}
                          </button>
                        </td>
                        <td className="py-2.5 px-3 text-right">
                          {isAdmin && (
                            <div className="inline-flex items-center justify-end gap-1">
                              <button
                                onClick={() => abrirModalEditarUsuario(p)}
                                className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition cursor-pointer"
                                title="Editar Dados, Perfil e Senha"
                                aria-label={`Editar ${p.nome_completo}`}
                              >
                                <Edit2 className="w-3.5 h-3.5" />
                              </button>
                              <button
                                onClick={() => setUsuarioParaExcluir(p)}
                                disabled={p.id === currentUser?.id}
                                className="p-1.5 hover:bg-rose-100 rounded-lg text-slate-500 hover:text-rose-600 transition cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-slate-500"
                                title={
                                  p.id === currentUser?.id
                                    ? 'Você não pode excluir sua própria conta'
                                    : 'Excluir Usuário'
                                }
                                aria-label={`Excluir ${p.nome_completo}`}
                              >
                                <Trash2 className="w-3.5 h-3.5" />
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 2: EQUIPES                                           */}
      {/* ======================================================== */}
      {abaAtiva === 'equipes' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                Equipes de Trabalho ({equipes.length})
              </h3>
              <p className="text-[11px] text-slate-500">
                Suporta equipes de múltiplos servidores ou duplas compartilhadas (ex.: "Renan e Josi").
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={abrirModalNovaEquipe}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-semibold"
              >
                <Plus className="w-4 h-4" />
                <span>Nova Equipe</span>
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {equipes.map(eq => {
              const membrosDaEquipe = equipeMembros.filter(m => m.equipe_id === eq.id);
              return (
                <div key={eq.id} className="p-4 border border-slate-200 rounded-xl bg-slate-50/50 space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="text-sm font-bold text-slate-900">{eq.nome}</h4>
                      <p className="text-xs text-slate-500">{eq.descricao || 'Sem descrição cadastrada'}</p>
                    </div>
                    {isAdmin && (
                      <button
                        onClick={() => abrirModalEditarEquipe(eq)}
                        className="p-1 hover:bg-slate-200 rounded text-slate-600"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>

                  <div>
                    <span className="text-[11px] font-bold text-slate-600 uppercase">Membros Vinculados:</span>
                    <div className="flex flex-wrap gap-1.5 mt-1">
                      {membrosDaEquipe.length === 0 ? (
                        <span className="text-xs text-slate-400">Nenhum membro atribuído</span>
                      ) : (
                        membrosDaEquipe.map(m => (
                          <span
                            key={m.profile_id}
                            className="text-[11px] bg-white border border-slate-200 px-2 py-0.5 rounded font-medium text-slate-700 flex items-center gap-1"
                          >
                            <span>{m.profile?.nome_completo || 'Membro'}</span>
                            {m.papel === 'coordenador' && (
                              <span className="text-[9px] bg-blue-100 text-blue-800 px-1 rounded">Coord</span>
                            )}
                          </span>
                        ))
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 3: CATÁLOGO DE ATIVIDADES                            */}
      {/* ======================================================== */}
      {abaAtiva === 'catalogo' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
            <div>
              <h3 className="text-sm font-bold text-slate-900 uppercase tracking-wider flex items-center gap-2">
                <Layers className="w-4 h-4 text-purple-700" />
                <span>Catálogo Geral de Atividades ({atividades.length})</span>
              </h3>
              <p className="text-xs text-slate-500 mt-0.5">
                Crie e gerencie as atividades oficiais de trabalho e atendimento (em <strong>Quantidade</strong> ou <strong>Horas</strong>). As atividades podem ser ativadas/desativadas sem apagar os registros históricos.
              </p>
            </div>
            {isAdmin && (
              <button
                onClick={abrirModalNovaAtividade}
                className="flex items-center gap-2 px-3.5 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs transition shrink-0 cursor-pointer"
              >
                <Plus className="w-4 h-4" />
                <span>Cadastrar Nova Atividade</span>
              </button>
            )}
          </div>

          {/* Barra de Filtros e Busca do Catálogo */}
          <div className="flex flex-wrap items-center gap-3 pt-2 border-t border-slate-100">
            <div className="relative flex-1 min-w-[200px]">
              <Search className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="text"
                value={filtroTextoCatalogo}
                onChange={(e) => setFiltroTextoCatalogo(e.target.value)}
                placeholder="Buscar por nome ou descrição da atividade..."
                className="w-full text-xs pl-9 pr-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
              />
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Categoria:</label>
              <select
                value={filtroCategoriaCatalogo}
                onChange={(e) => setFiltroCategoriaCatalogo(e.target.value)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
              >
                <option value="">Todas as Categorias</option>
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Medida:</label>
              <select
                value={filtroTipoMedidaCatalogo}
                onChange={(e) => setFiltroTipoMedidaCatalogo(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
              >
                <option value="todos">Todas as Medidas</option>
                <option value="quantidade">Apenas Quantidade</option>
                <option value="horas">Apenas Horas</option>
              </select>
            </div>

            <div className="flex items-center gap-2">
              <label className="text-xs font-semibold text-slate-600">Status:</label>
              <select
                value={filtroStatusCatalogo}
                onChange={(e) => setFiltroStatusCatalogo(e.target.value as any)}
                className="text-xs border border-slate-300 rounded-lg px-2.5 py-2 bg-white"
              >
                <option value="todos">Todos os Status</option>
                <option value="ativos">Apenas Ativas</option>
                <option value="inativos">Apenas Desativadas</option>
              </select>
            </div>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Nome da Atividade</th>
                  <th className="py-2.5 px-3">Categoria Temática</th>
                  <th className="py-2.5 px-3">Tipo de Medida</th>
                  <th className="py-2.5 px-3">Vigência</th>
                  <th className="py-2.5 px-3 text-center">Status</th>
                  <th className="py-2.5 px-3 text-right">Ações</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {atividadesFiltradas.length === 0 ? (
                  <tr>
                    <td colSpan={6} className="py-6 text-center text-slate-400">
                      Nenhuma atividade encontrada com os filtros selecionados.
                    </td>
                  </tr>
                ) : (
                  atividadesFiltradas.map(ativ => (
                    <tr key={ativ.id} className="hover:bg-slate-50 transition">
                      <td className="py-2.5 px-3 font-semibold text-slate-900 max-w-sm">
                        <div className="text-slate-900 font-bold">{ativ.nome}</div>
                        {ativ.descricao && <div className="text-[11px] text-slate-500 font-normal mt-0.5 line-clamp-1">{ativ.descricao}</div>}
                      </td>
                      <td className="py-2.5 px-3 text-slate-700 font-medium">{ativ.categoria?.nome}</td>
                      <td className="py-2.5 px-3">
                        <Badge variant={ativ.tipo_medida === 'horas' ? 'amber' : 'blue'} size="sm">
                          {ativ.tipo_medida === 'horas' ? 'Horas (Tempo)' : 'Quantidade (Itens)'}
                        </Badge>
                      </td>
                      <td className="py-2.5 px-3 font-mono text-[11px] text-slate-500 whitespace-nowrap">
                        {formatarDataBR(ativ.vigencia_inicio)} até {ativ.vigencia_fim ? formatarDataBR(ativ.vigencia_fim) : 'Indeterminado'}
                      </td>
                      <td className="py-2.5 px-3 text-center">
                        <button
                          onClick={() => toggleAtividadeAtiva(ativ.id)}
                          disabled={!isAdmin}
                          className={`px-2 py-0.5 rounded text-[10px] font-semibold cursor-pointer transition ${
                            ativ.ativo ? 'bg-emerald-100 text-emerald-800 hover:bg-emerald-200' : 'bg-rose-100 text-rose-800 hover:bg-rose-200'
                          }`}
                        >
                          {ativ.ativo ? 'Ativa' : 'Desativada'}
                        </button>
                      </td>
                      <td className="py-2.5 px-3 text-right">
                        {isAdmin && (
                          <button
                            onClick={() => abrirModalEditarAtividade(ativ)}
                            className="p-1.5 hover:bg-slate-200 rounded-lg text-slate-600 transition"
                            title="Editar Atividade"
                          >
                            <Edit2 className="w-3.5 h-3.5" />
                          </button>
                        )}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 4: ATRIBUIÇÕES                                       */}
      {/* ======================================================== */}
      {abaAtiva === 'atribuicoes' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Atribuição de Atividades por Equipe
            </h3>
            <p className="text-[11px] text-slate-500">
              Defina quais atividades cada equipe está autorizada a registrar na sua grade diária.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <label className="text-xs font-semibold text-slate-700">Selecione a Equipe:</label>
            <select
              value={equipeAtribuicaoId}
              onChange={(e) => setEquipeAtribuicaoId(e.target.value)}
              className="text-xs border border-slate-300 rounded-lg px-3 py-1.5 bg-white font-medium"
            >
              {equipes.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nome}</option>
              ))}
            </select>
          </div>

          <div className="border border-slate-200 rounded-xl overflow-hidden divide-y divide-slate-100">
            {atividades.map(ativ => {
              const estaAtribuida = atividadesDaEquipeAtribuicao.has(ativ.id);
              return (
                <div
                  key={ativ.id}
                  onClick={() => isAdmin && toggleAtividadeNaEquipe(ativ.id)}
                  className={`p-3 flex items-center justify-between transition cursor-pointer ${
                    estaAtribuida ? 'bg-blue-50/50 hover:bg-blue-50' : 'hover:bg-slate-50'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <input
                      type="checkbox"
                      checked={estaAtribuida}
                      onChange={() => {}}
                      disabled={!isAdmin}
                      className="w-4 h-4 text-blue-600 rounded border-slate-300 focus:ring-blue-500"
                    />
                    <div>
                      <div className="text-xs font-semibold text-slate-900">{ativ.nome}</div>
                      <div className="text-[10px] text-slate-400">{ativ.categoria?.nome}</div>
                    </div>
                  </div>

                  <Badge variant={ativ.tipo_medida === 'horas' ? 'amber' : 'blue'} size="sm">
                    {ativ.tipo_medida === 'horas' ? 'Horas' : 'Quantidade'}
                  </Badge>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 5: FECHAMENTO DE MESES                               */}
      {/* ======================================================== */}
      {abaAtiva === 'fechamento' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-6">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Bloqueio e Fechamento de Meses
            </h3>
            <p className="text-[11px] text-slate-500">
              Meses fechados impedem criação, edição e exclusão de lançamentos pela equipe. Apenas administradores podem reabrir.
            </p>
          </div>

          {/* Formulário para Fechar Novo Mês */}
          <form onSubmit={handleFecharMes} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-3">
            <h4 className="text-xs font-bold text-slate-800">Homologar / Fechar Período:</h4>
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Equipe:</label>
                <select
                  value={fechamentoEquipeId}
                  onChange={(e) => setFechamentoEquipeId(e.target.value)}
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                >
                  {equipes.map(eq => (
                    <option key={eq.id} value={eq.id}>{eq.nome}</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Mês / Ano:</label>
                <div className="flex gap-2">
                  <select
                    value={fechamentoMes}
                    onChange={(e) => setFechamentoMes(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white"
                  >
                    {MESES_NOMES.map((m, idx) => (
                      <option key={idx + 1} value={idx + 1}>{m}</option>
                    ))}
                  </select>
                  <select
                    value={fechamentoAno}
                    onChange={(e) => setFechamentoAno(Number(e.target.value))}
                    className="w-full border border-slate-300 rounded px-2 py-1.5 bg-white font-medium"
                  >
                    {[2024, 2025, 2026, 2027].map(a => <option key={a} value={a}>{a}</option>)}
                  </select>
                </div>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">Motivo do Fechamento:</label>
                <input
                  type="text"
                  value={fechamentoMotivo}
                  onChange={(e) => setFechamentoMotivo(e.target.value)}
                  placeholder="Ex: Homologação formal do RH"
                  className="w-full border border-slate-300 rounded px-2.5 py-1.5 bg-white"
                />
              </div>
            </div>

            <div className="flex justify-end pt-1">
              <button
                type="submit"
                className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-700 text-white rounded text-xs font-semibold"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Bloquear Mês da Equipe</span>
              </button>
            </div>
          </form>

          {/* Relação de Meses Já Fechados */}
          <div>
            <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider mb-2">
              Histórico de Meses Homologados e Bloqueados ({mesesFechados.length})
            </h4>
            <div className="border border-slate-200 rounded-lg overflow-hidden">
              <table className="w-full text-xs text-left">
                <thead className="bg-slate-100 font-bold text-slate-700 border-b border-slate-200">
                  <tr>
                    <th className="py-2.5 px-3">Equipe</th>
                    <th className="py-2.5 px-3">Período</th>
                    <th className="py-2.5 px-3">Fechado Por</th>
                    <th className="py-2.5 px-3">Data do Bloqueio</th>
                    <th className="py-2.5 px-3">Motivo</th>
                    <th className="py-2.5 px-3 text-right">Ação</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {mesesFechados.length === 0 ? (
                    <tr>
                      <td colSpan={6} className="py-6 text-center text-slate-400">
                        Nenhum mês fechado no momento.
                      </td>
                    </tr>
                  ) : (
                    mesesFechados.map(mf => (
                      <tr key={mf.id} className="hover:bg-slate-50">
                        <td className="py-2.5 px-3 font-semibold text-slate-900">{mf.equipe?.nome}</td>
                        <td className="py-2.5 px-3 font-mono font-bold text-amber-800">
                          {MESES_NOMES[mf.mes - 1]} / {mf.ano}
                        </td>
                        <td className="py-2.5 px-3 text-slate-600">{mf.fechador?.nome_completo || 'Chefia'}</td>
                        <td className="py-2.5 px-3 text-slate-500 font-mono">{formatarDataBR(mf.fechado_em)}</td>
                        <td className="py-2.5 px-3 text-slate-600 italic">{mf.motivo || '-'}</td>
                        <td className="py-2.5 px-3 text-right">
                          {isAdmin ? (
                            <button
                              onClick={() => handleReabrirMes(mf.id)}
                              className="text-xs text-blue-700 hover:text-blue-900 font-semibold flex items-center gap-1 ml-auto"
                              title="Reabrir mês para edições"
                            >
                              <Unlock className="w-3.5 h-3.5" />
                              <span>Reabrir</span>
                            </button>
                          ) : (
                            <span className="text-slate-400 text-[10px]">Apenas Admin</span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* ======================================================== */}
      {/* ABA 6: TRILHA DE AUDITORIA                               */}
      {/* ======================================================== */}
      {abaAtiva === 'auditoria' && (
        <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-xs space-y-4">
          <div>
            <h3 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
              Trilha de Auditoria e Conformidade (LGPD)
            </h3>
            <p className="text-[11px] text-slate-500">
              Registros imutáveis de inserção, alteração e exclusão para fins de controle interno e prestação de contas.
            </p>
          </div>

          <div className="overflow-x-auto max-h-[500px]">
            <table className="w-full text-xs text-left">
              <thead className="bg-slate-100 font-bold text-slate-700 sticky top-0 border-b border-slate-200">
                <tr>
                  <th className="py-2.5 px-3">Data/Hora</th>
                  <th className="py-2.5 px-3">Tabela</th>
                  <th className="py-2.5 px-3">Operação</th>
                  <th className="py-2.5 px-3">Servidor Responsável</th>
                  <th className="py-2.5 px-3">Detalhes do Registro</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {auditoriaLogs.map(log => (
                  <tr key={log.id} className="hover:bg-slate-50">
                    <td className="py-2 px-3 font-mono text-slate-600 whitespace-nowrap">
                      {new Date(log.data).toLocaleString('pt-BR')}
                    </td>
                    <td className="py-2 px-3 font-mono text-slate-800 font-semibold">{log.tabela}</td>
                    <td className="py-2 px-3">
                      <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                        log.acao === 'INSERT' ? 'bg-emerald-100 text-emerald-800' :
                        log.acao === 'UPDATE' ? 'bg-amber-100 text-amber-800' : 'bg-rose-100 text-rose-800'
                      }`}>
                        {log.acao}
                      </span>
                    </td>
                    <td className="py-2 px-3 text-slate-700">{log.usuario?.nome_completo || 'Sistema'}</td>
                    <td className="py-2 px-3 font-mono text-[10px] text-slate-500 max-w-xs truncate">
                      {JSON.stringify(log.dados_depois || log.dados_antes || {})}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Criar/Editar Usuário */}
      <Modal
        isOpen={modalUsuarioAberto}
        onClose={() => setModalUsuarioAberto(false)}
        title={usuarioEmEdicao ? 'Editar Servidor' : 'Cadastrar Novo Usuário no Sistema'}
      >
        <form onSubmit={salvarUsuario} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nome Completo do Servidor *</label>
            <input
              type="text"
              required
              value={formNomeUsuario}
              onChange={(e) => setFormNomeUsuario(e.target.value)}
              placeholder="Ex: Mariana Costa"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            />
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">
              E-mail Institucional (Login de Acesso) *
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type="email"
                required
                value={formEmailUsuario}
                onChange={(e) => setFormEmailUsuario(e.target.value)}
                placeholder="mariana.costa@instituicao.gov.br"
                className="w-full border border-slate-300 rounded-lg pl-9 pr-3 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
            </div>
            <p className="text-[11px] text-blue-800 bg-blue-50/70 p-2 rounded-lg border border-blue-100 mt-1.5">
              Este e-mail será utilizado pelo servidor para realizar o login no sistema.
            </p>
          </div>

          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="block font-semibold text-slate-700">Senha de Acesso *</label>
              <div className="flex items-center gap-1.5">
                <button
                  type="button"
                  onClick={() => setFormSenhaUsuario(formPerfilUsuario === 'admin' ? 'admin123' : 'padrao123')}
                  className="text-[10px] text-blue-700 hover:text-blue-900 font-semibold"
                >
                  Usar Padrão
                </button>
                <span className="text-slate-300">&bull;</span>
                <button
                  type="button"
                  onClick={gerarSenhaAleatoria}
                  className="text-[10px] text-purple-700 hover:text-purple-900 font-semibold flex items-center gap-0.5"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Gerar Senha</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-2.5" />
              <input
                type={mostrarSenhaModal ? 'text' : 'password'}
                required
                value={formSenhaUsuario}
                onChange={(e) => setFormSenhaUsuario(e.target.value)}
                placeholder="Defina a senha do usuário"
                className="w-full border border-slate-300 rounded-lg pl-9 pr-10 py-2 text-xs font-mono focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              />
              <button
                type="button"
                onClick={() => setMostrarSenhaModal(!mostrarSenhaModal)}
                className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5"
                tabIndex={-1}
              >
                {mostrarSenhaModal ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Matrícula SIAPE (Opcional)</label>
              <input
                type="text"
                value={formSiapeUsuario}
                onChange={(e) => setFormSiapeUsuario(e.target.value)}
                placeholder="Ex: 3129841"
                className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs font-mono"
              />
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Cargo do Servidor</label>
              <select
                value={formCargoUsuario}
                onChange={(e) => setFormCargoUsuario(e.target.value as CargoServidor | '')}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
              >
                <option value="">Selecione um cargo...</option>
                {CARGOS_SERVIDOR.map(cargo => (
                  <option key={cargo} value={cargo}>{cargo}</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Vincular à Equipe Inicial</label>
            <select
              value={formEquipeUsuarioId}
              onChange={(e) => setFormEquipeUsuarioId(e.target.value)}
              className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs bg-white focus:ring-2 focus:ring-blue-600 focus:outline-hidden"
            >
              <option value="">(Sem equipe vinculada)</option>
              {equipes.map(eq => (
                <option key={eq.id} value={eq.id}>{eq.nome}</option>
              ))}
            </select>
          </div>

          {/* Seleção de Função / Perfil com Cards Informativos */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Função e Perfil de Acesso *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              {/* Opção Usuário Padrão */}
              <div
                onClick={() => setFormPerfilUsuario('padrao')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  formPerfilUsuario === 'padrao'
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <User className="w-4 h-4 text-blue-600" />
                      <span>Usuário Padrão</span>
                    </span>
                    <input
                      type="radio"
                      name="perfil_radio"
                      checked={formPerfilUsuario === 'padrao'}
                      onChange={() => setFormPerfilUsuario('padrao')}
                      className="text-blue-600"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Acesso operacional: acessa com o e-mail cadastrado e senha, realiza lançamentos diários na grade de sua equipe e consulta seus relatórios.
                  </p>
                </div>
              </div>

              {/* Opção Administrador */}
              <div
                onClick={() => setFormPerfilUsuario('admin')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition flex flex-col justify-between ${
                  formPerfilUsuario === 'admin'
                    ? 'border-purple-600 bg-purple-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <span className="font-bold text-slate-900 flex items-center gap-1.5">
                      <Shield className="w-4 h-4 text-purple-600" />
                      <span>Administrador</span>
                    </span>
                    <input
                      type="radio"
                      name="perfil_radio"
                      checked={formPerfilUsuario === 'admin'}
                      onChange={() => setFormPerfilUsuario('admin')}
                      className="text-purple-600"
                    />
                  </div>
                  <p className="text-[11px] text-slate-600 leading-relaxed">
                    Acesso irrestrito: cadastra novos usuários, cria novas atividades no catálogo, gerencia equipes e homologa o fechamento de meses.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalUsuarioAberto(false)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-blue-700 hover:bg-blue-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              {usuarioEmEdicao ? 'Salvar Alterações' : 'Cadastrar Usuário'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Criar/Editar Atividade */}
      <Modal
        isOpen={modalAtividadeAberto}
        onClose={() => setModalAtividadeAberto(false)}
        title={atividadeEmEdicao ? 'Editar Atividade' : 'Cadastrar Nova Atividade no Catálogo'}
      >
        <form onSubmit={salvarAtividade} className="space-y-4 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nome Oficial da Atividade *</label>
            <input
              type="text"
              required
              value={formNomeAtiv}
              onChange={(e) => setFormNomeAtiv(e.target.value)}
              placeholder="Ex: Análise de Licença-Capacitação e Afastamentos"
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
            />
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Categoria Temática *</label>
              <select
                value={formCategoriaAtivId}
                onChange={(e) => setFormCategoriaAtivId(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-2 bg-white text-xs"
              >
                {categorias.map(c => (
                  <option key={c.id} value={c.id}>{c.nome}</option>
                ))}
              </select>
            </div>

            <div>
              <label className="block font-semibold text-slate-700 mb-1">Início da Vigência *</label>
              <input
                type="date"
                required
                value={formVigenciaInicio}
                onChange={(e) => setFormVigenciaInicio(e.target.value)}
                className="w-full border border-slate-300 rounded-lg px-2.5 py-2 text-xs"
              />
            </div>
          </div>

          {/* Cards de Tipo de Medida */}
          <div>
            <label className="block font-semibold text-slate-700 mb-1.5">Tipo de Medida da Atividade *</label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
              <div
                onClick={() => setFormTipoMedidaAtiv('quantidade')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition ${
                  formTipoMedidaAtiv === 'quantidade'
                    ? 'border-blue-600 bg-blue-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <CheckCircle2 className="w-4 h-4 text-blue-600" />
                    <span>Quantidade (Unidades)</span>
                  </span>
                  <input
                    type="radio"
                    name="tipo_medida_radio"
                    checked={formTipoMedidaAtiv === 'quantidade'}
                    onChange={() => setFormTipoMedidaAtiv('quantidade')}
                    className="text-blue-600"
                  />
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Para atividades mensuradas por contagem: processos tramitados, atendimentos, requerimentos, portarias emitidas.
                </p>
              </div>

              <div
                onClick={() => setFormTipoMedidaAtiv('horas')}
                className={`p-3 rounded-xl border-2 cursor-pointer transition ${
                  formTipoMedidaAtiv === 'horas'
                    ? 'border-amber-600 bg-amber-50/70 shadow-xs'
                    : 'border-slate-200 bg-white hover:border-slate-300'
                }`}
              >
                <div className="flex items-center justify-between mb-1">
                  <span className="font-bold text-slate-900 flex items-center gap-1.5">
                    <Clock className="w-4 h-4 text-amber-600" />
                    <span>Horas (Duração)</span>
                  </span>
                  <input
                    type="radio"
                    name="tipo_medida_radio"
                    checked={formTipoMedidaAtiv === 'horas'}
                    onChange={() => setFormTipoMedidaAtiv('horas')}
                    className="text-amber-600"
                  />
                </div>
                <p className="text-[11px] text-slate-600 leading-relaxed">
                  Para atividades mensuradas por tempo despendido: reuniões de colegiado, mediações de conflito, fiscalizações contratuais.
                </p>
              </div>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Descrição e Orientações de Preenchimento</label>
            <textarea
              rows={2}
              value={formDescricaoAtiv}
              onChange={(e) => setFormDescricaoAtiv(e.target.value)}
              placeholder="Instruções para o servidor ao realizar o registro desta atividade..."
              className="w-full border border-slate-300 rounded-lg px-3 py-2 text-xs focus:ring-2 focus:ring-purple-600 focus:outline-hidden"
            />
          </div>

          {!atividadeEmEdicao && (
            <div className="p-3 bg-purple-50 rounded-xl border border-purple-200">
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={formAtribuirATodasEquipes}
                  onChange={(e) => setFormAtribuirATodasEquipes(e.target.checked)}
                  className="rounded text-purple-700 w-4 h-4"
                />
                <span className="text-xs font-bold text-purple-950">
                  Disponibilizar imediatamente para todas as equipes de RH
                </span>
              </label>
              <p className="text-[11px] text-purple-800 pl-6 mt-0.5">
                A atividade aparecerá de imediato na grade diária e formulários de lançamento de todos os servidores.
              </p>
            </div>
          )}

          <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
            <button
              type="button"
              onClick={() => setModalAtividadeAberto(false)}
              className="px-3.5 py-2 text-slate-600 hover:bg-slate-100 rounded-lg text-xs font-semibold cursor-pointer"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-purple-700 hover:bg-purple-800 text-white rounded-lg text-xs font-bold shadow-xs cursor-pointer"
            >
              {atividadeEmEdicao ? 'Salvar Alterações' : 'Cadastrar Atividade no Catálogo'}
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Criar/Editar Equipe */}
      <Modal
        isOpen={modalEquipeAberto}
        onClose={() => setModalEquipeAberto(false)}
        title={equipeEmEdicao ? 'Editar Equipe' : 'Nova Equipe de Trabalho'}
      >
        <form onSubmit={salvarEquipe} className="space-y-3 text-xs">
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Nome da Equipe *</label>
            <input
              type="text"
              required
              value={formNomeEquipe}
              onChange={(e) => setFormNomeEquipe(e.target.value)}
              placeholder="Ex: Renan e Josi ou Equipe de Folha"
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Sigla / Abreviação</label>
            <input
              type="text"
              value={formSiglaEquipe}
              onChange={(e) => setFormSiglaEquipe(e.target.value)}
              placeholder="Ex: EFOLHA, E-RJ"
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Descrição</label>
            <textarea
              rows={2}
              value={formDescricaoEquipe}
              onChange={(e) => setFormDescricaoEquipe(e.target.value)}
              className="w-full border border-slate-300 rounded px-3 py-2"
            />
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Membros Integrantes</label>
            <div className="max-h-40 overflow-y-auto border border-slate-200 rounded p-2 space-y-1">
              {profiles.map(p => {
                const isSelected = formMembrosSelecionados.some(m => m.profile_id === p.id);
                return (
                  <label key={p.id} className="flex items-center justify-between p-1 hover:bg-slate-50 rounded cursor-pointer">
                    <div className="flex items-center gap-2">
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={(e) => {
                          if (e.target.checked) {
                            setFormMembrosSelecionados(prev => [...prev, { profile_id: p.id, papel: 'membro' }]);
                          } else {
                            setFormMembrosSelecionados(prev => prev.filter(m => m.profile_id !== p.id));
                          }
                        }}
                        className="rounded"
                      />
                      <span>{p.nome_completo}</span>
                    </div>
                    {isSelected && (
                      <span className="text-[10px] text-blue-600 font-semibold">Integrado</span>
                    )}
                  </label>
                );
              })}
            </div>
          </div>
          <div className="flex justify-end gap-2 pt-3">
            <button
              type="button"
              onClick={() => setModalEquipeAberto(false)}
              className="px-3 py-1.5 text-slate-600 hover:bg-slate-100 rounded"
            >
              Cancelar
            </button>
            <button
              type="submit"
              className="px-3 py-1.5 bg-blue-700 hover:bg-blue-800 text-white rounded font-semibold"
            >
              Salvar Equipe
            </button>
          </div>
        </form>
      </Modal>

      {/* Modal Confirmar Exclusão de Usuário */}
      <Modal
        isOpen={Boolean(usuarioParaExcluir)}
        onClose={() => setUsuarioParaExcluir(null)}
        title="Confirmar Exclusão de Usuário"
        subtitle="Esta ação é permanente e não pode ser desfeita."
        maxWidth="md"
      >
        {usuarioParaExcluir && (
          <div className="space-y-4 text-xs">
            <div className="p-3.5 bg-rose-50 border border-rose-200 rounded-xl flex items-start gap-3 text-rose-900">
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div className="space-y-1 leading-relaxed">
                <p className="font-bold text-rose-950">
                  Tem certeza que deseja excluir este servidor do sistema?
                </p>
                <p className="text-rose-800">
                  O acesso com este e-mail será revogado imediatamente e o vínculo com equipes será removido. O histórico de auditoria e registros anteriores serão preservados.
                </p>
              </div>
            </div>

            <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Servidor:</span>
                <span className="font-bold text-slate-900 text-right">{usuarioParaExcluir.nome_completo}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">E-mail (Login):</span>
                <span className="font-mono text-slate-800 text-right">{usuarioParaExcluir.email}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-slate-500">Perfil:</span>
                <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                  usuarioParaExcluir.perfil === 'admin'
                    ? 'bg-purple-100 text-purple-800'
                    : 'bg-blue-100 text-blue-800'
                }`}>
                  {usuarioParaExcluir.perfil === 'admin' ? 'Administrador' : 'Usuário Padrão'}
                </span>
              </div>
            </div>

            <div className="flex justify-end gap-2 pt-3 border-t border-slate-100">
              <button
                type="button"
                onClick={() => setUsuarioParaExcluir(null)}
                className="px-3.5 py-2 text-slate-700 hover:bg-slate-100 rounded-lg text-xs font-semibold transition cursor-pointer"
              >
                Cancelar
              </button>
              <button
                type="button"
                onClick={confirmarExclusaoUsuario}
                className="inline-flex items-center gap-1.5 px-4 py-2 bg-rose-600 hover:bg-rose-700 text-white rounded-lg text-xs font-bold shadow-xs transition cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Excluir Usuário</span>
              </button>
            </div>
          </div>
        )}
      </Modal>
    </div>
  );
};
