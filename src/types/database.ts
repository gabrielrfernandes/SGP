export type PerfilUsuario = 'admin' | 'padrao' | 'gestor' | 'colaborador';
export type CargoServidor = '1' | '2' | '3' | '4';
export const CARGOS_SERVIDOR: CargoServidor[] = ['1', '2', '3', '4'];
export type PapelEquipe = 'membro' | 'coordenador';
export type TipoMedida = 'quantidade' | 'horas';
export type AcaoAuditoria = 'INSERT' | 'UPDATE' | 'DELETE';

export interface Profile {
  id: string;
  nome_completo: string;
  email: string;
  matricula_siape?: string | null;
  cargo?: CargoServidor | null;
  perfil: PerfilUsuario;
  ativo: boolean;
  senha?: string; // Armazenada para autenticação
  criado_em: string;
  atualizado_em: string;
}

export interface Equipe {
  id: string;
  nome: string;
  descricao?: string | null;
  sigla?: string | null;
  ativo: boolean;
  criado_em: string;
  atualizado_em: string;
  membros_count?: number;
}

export interface EquipeMembro {
  equipe_id: string;
  profile_id: string;
  papel: PapelEquipe;
  criado_em: string;
  profile?: Profile;
  equipe?: Equipe;
}

export interface CategoriaAtividade {
  id: string;
  nome: string;
  descricao?: string | null;
  ordem: number;
  criado_em: string;
}

export interface Atividade {
  id: string;
  categoria_id: string;
  nome: string;
  descricao?: string | null;
  tipo_medida: TipoMedida;
  ativo: boolean;
  vigencia_inicio: string;
  vigencia_fim?: string | null;
  ordem: number;
  criado_em: string;
  atualizado_em: string;
  categoria?: CategoriaAtividade;
}

export interface EquipeAtividade {
  equipe_id: string;
  atividade_id: string;
  atribuido_em: string;
}

export interface Lancamento {
  id: string;
  equipe_id: string;
  atividade_id: string;
  registrado_por: string;
  data: string; // YYYY-MM-DD
  quantidade?: number | null;
  horas?: number | null;
  duracao_minutos?: number | null;
  descricao?: string | null;
  observacao?: string | null;
  criado_em: string;
  atualizado_em: string;
  // Joins
  atividade?: Atividade;
  equipe?: Equipe;
  usuario?: Profile;
}

export interface MesFechado {
  id: string;
  equipe_id: string;
  ano: number;
  mes: number; // 1-12
  fechado_por: string;
  fechado_em: string;
  motivo?: string | null;
  // Joins
  equipe?: Equipe;
  fechador?: Profile;
}

export interface AuditoriaLog {
  id: string;
  tabela: string;
  registro_id?: string | null;
  acao: AcaoAuditoria;
  usuario_id?: string | null;
  dados_antes?: any;
  dados_depois?: any;
  data: string;
  usuario?: Profile;
}

export interface DashboardFiltros {
  tipoPeriodo: 'mes' | 'trimestre' | 'ano' | 'personalizado';
  ano: number;
  mes?: number;
  trimestre?: number;
  dataInicio?: string;
  dataFim?: string;
  equipeId?: string;
  usuarioId?: string;
  categoriaId?: string;
  atividadeId?: string;
}
