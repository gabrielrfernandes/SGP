import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Building2,
  Lock,
  Mail,
  Shield,
  CheckCircle2,
  AlertCircle,
  Eye,
  EyeOff,
  ArrowRight,
  Info
} from 'lucide-react';

interface LoginProps {
  onSuccess?: () => void;
}

export const Login: React.FC<LoginProps> = ({ onSuccess }) => {
  const { loginWithEmail } = useAuth();

  const [email, setEmail] = useState('');
  const [senha, setSenha] = useState('');
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarAjuda, setMostrarAjuda] = useState(false);
  const [carregando, setCarregando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [sucessoMsg, setSucessoMsg] = useState<string | null>(null);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setCarregando(true);
    setErro(null);
    setSucessoMsg(null);

    const res = await loginWithEmail(email, senha);
    setCarregando(false);

    if (res.sucesso) {
      setSucessoMsg('Autenticado com sucesso! Redirecionando...');
      if (onSuccess) {
        setTimeout(onSuccess, 300);
      }
    } else {
      setErro(res.erro || 'Falha ao autenticar. Verifique seus dados.');
    }
  };

  return (
    <div className="min-h-screen bg-linear-to-b from-slate-900 via-slate-800 to-slate-900 flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brasão / Identificação Governamental / Fiocruz Minas */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <div className="w-16 h-16 rounded-2xl bg-blue-600/20 border border-blue-400/30 text-white flex items-center justify-center mx-auto shadow-lg backdrop-blur-xs">
          <Building2 className="w-9 h-9 text-blue-300" />
        </div>
        <div className="text-[11px] font-bold text-blue-300 uppercase tracking-widest">
          Fiocruz Minas &bull; Instituto René Rachou
        </div>
        <h1 className="text-2xl font-extrabold text-white tracking-tight">
          SGP Atividades
        </h1>
        <p className="text-xs text-slate-300 max-w-sm mx-auto">
          Serviço de Gestão de Pessoas (SGP) &bull; Gestão de Atividades e Produtividade
        </p>
      </div>

      <div className="mt-7 sm:mx-auto sm:w-full sm:max-w-md space-y-5">
        {/* Card Principal de Login Seguro */}
        <div className="bg-white py-8 px-6 shadow-2xl rounded-2xl border border-slate-200 sm:px-9 space-y-6">
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <div>
              <h2 className="text-base font-bold text-slate-900">Acesso Individual de Servidor</h2>
              <p className="text-xs text-slate-500">Informe suas credenciais institucionais de acesso</p>
            </div>
            <div className="w-9 h-9 rounded-xl bg-blue-50 text-blue-800 flex items-center justify-center font-bold">
              <Lock className="w-4 h-4 text-blue-700" />
            </div>
          </div>

          {erro && (
            <div className="p-3.5 bg-rose-50 border border-rose-200 text-rose-800 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed">{erro}</div>
            </div>
          )}

          {sucessoMsg && (
            <div className="p-3.5 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl text-xs flex items-start gap-2.5 animate-in fade-in duration-200">
              <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              <div className="flex-1 font-semibold">{sucessoMsg}</div>
            </div>
          )}

          {mostrarAjuda && (
            <div className="p-3.5 bg-blue-50 border border-blue-200 text-blue-900 rounded-xl text-xs flex items-start gap-2.5">
              <Info className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
              <div className="flex-1 leading-relaxed space-y-1">
                <p className="font-semibold text-blue-950">Primeiro acesso ou recuperação de senha:</p>
                <p>
                  As contas e senhas de servidores são gerenciadas pelo <strong>Administrador do SGP</strong> no Serviço de Gestão de Pessoas da Fiocruz Minas. Caso não possua suas credenciais ou tenha esquecido sua senha, solicite suporte à coordenação do SGP.
                </p>
              </div>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-slate-700 mb-1">
                E-mail Institucional *
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="servidor@instituicao.gov.br"
                  className="w-full text-xs pl-9 pr-3 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden transition"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1">
                <label className="block text-xs font-semibold text-slate-700">
                  Senha de Acesso *
                </label>
                <button
                  type="button"
                  onClick={() => setMostrarAjuda(!mostrarAjuda)}
                  className="text-[11px] text-blue-700 hover:text-blue-900 font-medium cursor-pointer"
                >
                  {mostrarAjuda ? 'Ocultar instrução' : 'Esqueceu a senha?'}
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-slate-400 absolute left-3 top-3" />
                <input
                  type={mostrarSenha ? 'text' : 'password'}
                  required
                  autoComplete="current-password"
                  value={senha}
                  onChange={(e) => setSenha(e.target.value)}
                  placeholder="••••••••"
                  className="w-full text-xs pl-9 pr-10 py-2.5 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-blue-600 focus:outline-hidden transition font-mono"
                />
                <button
                  type="button"
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                  className="absolute right-3 top-2.5 text-slate-400 hover:text-slate-600 p-0.5 rounded cursor-pointer"
                  tabIndex={-1}
                  title={mostrarSenha ? 'Ocultar senha' : 'Exibir senha'}
                >
                  {mostrarSenha ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
                </button>
              </div>
            </div>

            <button
              type="submit"
              disabled={carregando}
              className="w-full py-2.5 px-4 bg-blue-900 hover:bg-blue-950 text-white rounded-lg text-xs font-bold shadow-md transition disabled:opacity-50 flex items-center justify-center gap-2 cursor-pointer mt-2"
            >
              {carregando ? (
                <span>Autenticando...</span>
              ) : (
                <>
                  <span>Entrar no Sistema</span>
                  <ArrowRight className="w-4 h-4" />
                </>
              )}
            </button>
          </form>

          {/* Orientação Institucional Segura */}
          <div className="pt-4 border-t border-slate-100">
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-3 text-[11px] text-slate-600 flex items-start gap-2">
              <Shield className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
              <div className="leading-relaxed">
                Acesso restrito a servidores e colaboradores autorizados do Serviço de Gestão de Pessoas (SGP) da Fiocruz Minas. Suas credenciais são de uso pessoal e intransferível.
              </div>
            </div>
          </div>
        </div>

        {/* Rodapé Informativo Institucional */}
        <div className="text-center text-[11px] text-slate-400 space-y-1">
          <div className="flex items-center justify-center gap-2">
            <Shield className="w-3.5 h-3.5 text-blue-400" />
            <span>Ambiente Seguro • <strong>SGP / Fiocruz Minas</strong></span>
          </div>
          <div>Conformidade com a Lei Geral de Proteção de Dados (LGPD - Lei nº 13.709/2018).</div>
        </div>
      </div>
    </div>
  );
};
