import { createClient, SupabaseClient } from '@supabase/supabase-js';
import { db, handleFirestoreError, OperationType } from './firebase';
import { doc, setDoc, deleteDoc } from 'firebase/firestore';
import {
  Profile,
  Equipe,
  EquipeMembro,
  CategoriaAtividade,
  Atividade,
  EquipeAtividade,
  Lancamento,
  MesFechado,
  AuditoriaLog
} from '../types/database';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || '';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || '';

export const isSupabaseConfigured = Boolean(
  supabaseUrl &&
  supabaseAnonKey &&
  supabaseUrl.startsWith('http') &&
  !supabaseUrl.includes('placeholder')
);

export const supabase: SupabaseClient | null = isSupabaseConfigured
  ? createClient(supabaseUrl, supabaseAnonKey)
  : null;

// =====================================================================
// DADOS MOCK / INICIAIS BASEADOS NO SEED OFICIAL
// =====================================================================

export const INITIAL_CATEGORIAS: CategoriaAtividade[] = [
  { id: '11111111-1111-1111-1111-111111111101', nome: 'Folha de Pagamento', descricao: 'Operações em sistemas de pagamento, SIAPE, SIGEPE, AFD e financeiro', ordem: 10, criado_em: '2024-01-01T00:00:00Z' },
  { id: '11111111-1111-1111-1111-111111111102', nome: 'Aposentados e Pensionistas', descricao: 'Atendimento e procedimentos para aposentados, pensionistas e prova de vida', ordem: 20, criado_em: '2024-01-01T00:00:00Z' },
  { id: '11111111-1111-1111-1111-111111111103', nome: 'Processos e Tramitação', descricao: 'Movimentação e instrução processual em SEI, SGARH e sistemas de processos', ordem: 30, criado_em: '2024-01-01T00:00:00Z' },
  { id: '11111111-1111-1111-1111-111111111104', nome: 'Atendimento ao Servidor', descricao: 'Atendimentos presenciais, remotos, esclarecimentos e correspondências', ordem: 40, criado_em: '2024-01-01T00:00:00Z' },
  { id: '11111111-1111-1111-1111-111111111105', nome: 'Reuniões, Capacitação e PGD', descricao: 'Reuniões técnicas, comitês, alinhamentos, capacitações e gestão do PGD', ordem: 50, criado_em: '2024-01-01T00:00:00Z' },
  { id: '11111111-1111-1111-1111-111111111106', nome: 'Contratos e Gestão', descricao: 'Fiscalização contratual, licitações, crachás e suporte institucional', ordem: 60, criado_em: '2024-01-01T00:00:00Z' },
];

export const INITIAL_ATIVIDADES: Atividade[] = [
  // Quantidade
  { id: '22222222-2222-2222-2222-222222222101', categoria_id: '11111111-1111-1111-1111-111111111102', nome: 'Acompanhamento de pendências de prova de vida (aposentados/pensionistas)', descricao: 'Controle, checagem e contato com beneficiários para regularização de prova de vida', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 1, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222102', categoria_id: '11111111-1111-1111-1111-111111111102', nome: 'Atendimento presencial a aposentados/pensionistas (IRR ou prova de vida em residência)', descricao: 'Atendimento presencial em balcão ou diligência domiciliar para prova de vida e orientações de IRR', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 2, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222103', categoria_id: '11111111-1111-1111-1111-111111111101', nome: 'Inclusões e exclusões Fiosaúde', descricao: 'Cadastramento, cancelamento e alterações de planos e dependentes no sistema de saúde suplementar', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 3, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222104', categoria_id: '11111111-1111-1111-1111-111111111101', nome: 'Operações nos sistemas da folha (SIAPE, SIGEPE, AFD): operações financeiras, implantações, cadastros, relatórios, afastamentos', descricao: 'Rotinas de fechamento, homologação e lançamentos sistêmicos na folha de pagamento federal', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 4, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222105', categoria_id: '11111111-1111-1111-1111-111111111103', nome: 'Movimentação de processos (tramitação e emissão de declarações: SEI, SGARH, Módulos)', descricao: 'Despacho, instrução, envio e recebimento de processos administrativos e emissão de declarações', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 5, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222106', categoria_id: '11111111-1111-1111-1111-111111111104', nome: 'Requerimentos SIGEPE / SouGov', descricao: 'Análise, deferimento, indeferimento e saneamento de requerimentos enviados pelos servidores via SouGov', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 6, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222107', categoria_id: '11111111-1111-1111-1111-111111111101', nome: 'Progressões funcionais', descricao: 'Análise de interstício, titulação, elaboração de portarias e lançamentos no SIAPE de progressão', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 7, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222108', categoria_id: '11111111-1111-1111-1111-111111111101', nome: 'RRA (análise de processos e emissão de declarações)', descricao: 'Cálculo e formalização de Rendimentos Recebidos Acumuladamente e declarações fiscais', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 8, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222109', categoria_id: '11111111-1111-1111-1111-111111111101', nome: 'Férias: alterações dentro e fora do prazo', descricao: 'Homologação, reprogramação e ajuste de escalas de férias em conformidade com a legislação', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 9, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222110', categoria_id: '11111111-1111-1111-1111-111111111104', nome: 'Atendimentos por e-mail e envio de comunicados', descricao: 'Respostas formais a dúvidas de servidores, envio de informativos institucionais de RH', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 10, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222111', categoria_id: '11111111-1111-1111-1111-111111111106', nome: 'Abertura/controle de processos de contratação de serviços e capacitação (Licitaweb)', descricao: 'Instrução de Termos de Referência, controle de empenhos e contratações voltadas a RH', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 11, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222112', categoria_id: '11111111-1111-1111-1111-111111111104', nome: 'Envio de correspondências', descricao: 'Expedição de ofícios, cartas registradas com aviso de recebimento e notificações', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 12, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222113', categoria_id: '11111111-1111-1111-1111-111111111101', nome: 'Lançamentos SGA RH', descricao: 'Alimentação de histórico funcional e ocorrências no Sistema de Gestão Acadêmica/RH', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 13, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222114', categoria_id: '11111111-1111-1111-1111-111111111105', nome: 'PGD: acompanhamento dos ciclos de trabalho', descricao: 'Análise de planos de trabalho, entregas pactuadas e relatórios de avaliação no PGD', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 14, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '22222222-2222-2222-2222-222222222115', categoria_id: '11111111-1111-1111-1111-111111111103', nome: 'Digitalização de processos físicos e tramitação no SEI', descricao: 'Higienização, captura digital com OCR e inserção no SEI de acervos legados e pastas funcionais', tipo_medida: 'quantidade', ativo: true, vigencia_inicio: '2024-01-01', ordem: 15, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  // Horas
  { id: '33333333-3333-3333-3333-333333333201', categoria_id: '11111111-1111-1111-1111-111111111104', nome: 'Atendimento presencial personalizado (orientações sobre RRA, aposentadorias, averbações, aplicativos)', descricao: 'Sessões de esclarecimento individualizado com simulações de aposentadoria e cálculos complexos', tipo_medida: 'horas', ativo: true, vigencia_inicio: '2024-01-01', ordem: 16, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '33333333-3333-3333-3333-333333333202', categoria_id: '11111111-1111-1111-1111-111111111105', nome: 'Gerenciamento de conflitos', descricao: 'Mediações e reuniões com equipes e chefias para pacificação e melhoria do clima de trabalho', tipo_medida: 'horas', ativo: true, vigencia_inicio: '2024-01-01', ordem: 17, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '33333333-3333-3333-3333-333333333203', categoria_id: '11111111-1111-1111-1111-111111111105', nome: 'Reuniões, alinhamentos e capacitações', descricao: 'Participação em comitês (ex: CDI, CPPD, CIS), alinhamentos técnicos internos e capacitações', tipo_medida: 'horas', ativo: true, vigencia_inicio: '2024-01-01', ordem: 18, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '33333333-3333-3333-3333-333333333204', categoria_id: '11111111-1111-1111-1111-111111111106', nome: 'Fiscalização de contratos (Empresa Valor e empresa de emissão de crachás)', descricao: 'Acompanhamento da execução, glosas, ateste de faturas e reuniões com prepostos', tipo_medida: 'horas', ativo: true, vigencia_inicio: '2024-01-01', ordem: 19, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
];

export const INITIAL_PROFILES: Profile[] = [
  { id: 'user-admin-01', nome_completo: 'Carlos Eduardo Mendes (Chefe do RH)', email: 'carlos.mendes@instituicao.gov.br', matricula_siape: '1849201', perfil: 'admin', ativo: true, senha: 'admin123', criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: 'user-gestor-01', nome_completo: 'Mariana Silveira (Coordenadora de Atendimento)', email: 'mariana.silveira@instituicao.gov.br', matricula_siape: '2093842', perfil: 'admin', ativo: true, senha: 'admin123', criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: 'user-colab-01', nome_completo: 'Renan Oliveira da Silva', email: 'renan.silva@instituicao.gov.br', matricula_siape: '3129841', perfil: 'padrao', ativo: true, senha: 'padrao123', criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: 'user-colab-02', nome_completo: 'Josiane Alencar (Josi)', email: 'josiane.alencar@instituicao.gov.br', matricula_siape: '3209418', perfil: 'padrao', ativo: true, senha: 'padrao123', criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: 'user-colab-03', nome_completo: 'Lucas Vasconcellos (Folha SIAPE)', email: 'lucas.vasconcellos@instituicao.gov.br', matricula_siape: '2981042', perfil: 'padrao', ativo: true, senha: 'padrao123', criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
];

export const INITIAL_EQUIPES: Equipe[] = [
  { id: '44444444-4444-4444-4444-444444444301', nome: 'Equipe de Folha e Benefícios', descricao: 'Processamento de folha de pagamento, Fiosaúde, progressões e RRA', sigla: 'EFOLHA', ativo: true, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '44444444-4444-4444-4444-444444444302', nome: 'Equipe de Aposentadorias e Atendimento', descricao: 'Balcão de atendimento presencial, orientações previdenciárias e prova de vida', sigla: 'EAPOSENT', ativo: true, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
  { id: '44444444-4444-4444-4444-444444444303', nome: 'Renan e Josi (Carreiras, SEI e PGD)', descricao: 'Dupla responsável compartilhada por progressões, tramitações no SEI e acompanhamento do PGD', sigla: 'E-RJ', ativo: true, criado_em: '2024-01-01T00:00:00Z', atualizado_em: '2024-01-01T00:00:00Z' },
];

export const INITIAL_EQUIPE_MEMBROS: EquipeMembro[] = [
  { equipe_id: '44444444-4444-4444-4444-444444444301', profile_id: 'user-admin-01', papel: 'coordenador', criado_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444301', profile_id: 'user-colab-03', papel: 'membro', criado_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444302', profile_id: 'user-gestor-01', papel: 'coordenador', criado_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444303', profile_id: 'user-colab-01', papel: 'membro', criado_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444303', profile_id: 'user-colab-02', papel: 'membro', criado_em: '2024-01-01T00:00:00Z' },
];

export const INITIAL_EQUIPE_ATIVIDADES: EquipeAtividade[] = [
  // Equipe Folha
  { equipe_id: '44444444-4444-4444-4444-444444444301', atividade_id: '22222222-2222-2222-2222-222222222103', atribuido_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444301', atividade_id: '22222222-2222-2222-2222-222222222104', atribuido_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444301', atividade_id: '22222222-2222-2222-2222-222222222107', atribuido_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444301', atividade_id: '22222222-2222-2222-2222-222222222108', atribuido_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444301', atividade_id: '22222222-2222-2222-2222-222222222109', atribuido_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444301', atividade_id: '33333333-3333-3333-3333-333333333203', atribuido_em: '2024-01-01T00:00:00Z' },
  // Equipe Aposentados
  { equipe_id: '44444444-4444-4444-4444-444444444302', atividade_id: '22222222-2222-2222-2222-222222222101', atribuido_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444302', atividade_id: '22222222-2222-2222-2222-222222222102', atribuido_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444302', atividade_id: '22222222-2222-2222-2222-222222222106', atribuido_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444302', atividade_id: '22222222-2222-2222-2222-222222222110', atribuido_em: '2024-01-01T00:00:00Z' },
  { equipe_id: '44444444-4444-4444-4444-444444444302', atividade_id: '33333333-3333-3333-3333-333333333201', atribuido_em: '2024-01-01T00:00:00Z' },
  // Renan e Josi
  ...INITIAL_ATIVIDADES.map(a => ({
    equipe_id: '44444444-4444-4444-4444-444444444303',
    atividade_id: a.id,
    atribuido_em: '2024-01-01T00:00:00Z',
  })),
];

// Dados amostrais de lançamentos do mês corrente e anterior
const hoje = new Date();
const anoAtual = hoje.getFullYear();
const mesAtualNum = hoje.getMonth() + 1;
const mesStr = mesAtualNum.toString().padStart(2, '0');

export const INITIAL_LANCAMENTOS: Lancamento[] = [
  {
    id: 'lanc-001',
    equipe_id: '44444444-4444-4444-4444-444444444303',
    atividade_id: '33333333-3333-3333-3333-333333333203', // Reuniões, alinhamentos
    registrado_por: 'user-colab-01',
    data: `${anoAtual}-${mesStr}-02`,
    horas: 1.5,
    duracao_minutos: 90,
    descricao: 'Reunião CDI - Comitê Diretor Institucional',
    observacao: 'Pauta: definição de metas do ciclo de avaliação e transição PGD',
    criado_em: `${anoAtual}-${mesStr}-02T10:00:00Z`,
    atualizado_em: `${anoAtual}-${mesStr}-02T10:00:00Z`,
  },
  {
    id: 'lanc-002',
    equipe_id: '44444444-4444-4444-4444-444444444303',
    atividade_id: '22222222-2222-2222-2222-222222222105', // Movimentação processos SEI
    registrado_por: 'user-colab-02',
    data: `${anoAtual}-${mesStr}-03`,
    quantidade: 14,
    descricao: 'Tramitação de processos de incentivo à qualificação',
    observacao: 'Instruídos e encaminhados à CPPD para emissão de parecer',
    criado_em: `${anoAtual}-${mesStr}-03T11:00:00Z`,
    atualizado_em: `${anoAtual}-${mesStr}-03T11:00:00Z`,
  },
  {
    id: 'lanc-003',
    equipe_id: '44444444-4444-4444-4444-444444444303',
    atividade_id: '22222222-2222-2222-2222-222222222107', // Progressões funcionais
    registrado_por: 'user-colab-01',
    data: `${anoAtual}-${mesStr}-05`,
    quantidade: 8,
    descricao: 'Portarias de progressão por mérito publicadas no Boletim de Serviço',
    observacao: 'Lançadas as ocorrências 03/SIAPE e notificadas chefias imediatas',
    criado_em: `${anoAtual}-${mesStr}-05T14:30:00Z`,
    atualizado_em: `${anoAtual}-${mesStr}-05T14:30:00Z`,
  },
  {
    id: 'lanc-004',
    equipe_id: '44444444-4444-4444-4444-444444444302',
    atividade_id: '33333333-3333-3333-3333-333333333201', // Atendimento presencial personalizado
    registrado_por: 'user-gestor-01',
    data: `${anoAtual}-${mesStr}-06`,
    horas: 2.25,
    duracao_minutos: 135,
    descricao: 'Orientação a 3 servidores sobre regra de transição da EC 103/2019 e abono de permanência',
    observacao: 'Simulação realizada no simulador do SouGov e emitido extrato de averbação CTC',
    criado_em: `${anoAtual}-${mesStr}-06T15:00:00Z`,
    atualizado_em: `${anoAtual}-${mesStr}-06T15:00:00Z`,
  },
  {
    id: 'lanc-005',
    equipe_id: '44444444-4444-4444-4444-444444444301',
    atividade_id: '22222222-2222-2222-2222-222222222104', // Operações na folha SIAPE
    registrado_por: 'user-colab-03',
    data: `${anoAtual}-${mesStr}-08`,
    quantidade: 42,
    descricao: 'Implantação de rubricas financeiras e acertos da primeira prévia da folha',
    observacao: 'Batimento das inconsistências financeiras com o espelho do Serpro',
    criado_em: `${anoAtual}-${mesStr}-08T16:00:00Z`,
    atualizado_em: `${anoAtual}-${mesStr}-08T16:00:00Z`,
  },
  {
    id: 'lanc-006',
    equipe_id: '44444444-4444-4444-4444-444444444302',
    atividade_id: '22222222-2222-2222-2222-222222222101', // Prova de vida
    registrado_por: 'user-gestor-01',
    data: `${anoAtual}-${mesStr}-10`,
    quantidade: 19,
    descricao: 'Contatos e regularizações de prova de vida de aniversariantes',
    observacao: 'Casos com risco de suspensão de proventos no próximo mês',
    criado_em: `${anoAtual}-${mesStr}-10T11:00:00Z`,
    atualizado_em: `${anoAtual}-${mesStr}-10T11:00:00Z`,
  },
  {
    id: 'lanc-007',
    equipe_id: '44444444-4444-4444-4444-444444444303',
    atividade_id: '22222222-2222-2222-2222-222222222114', // PGD
    registrado_por: 'user-colab-02',
    data: `${anoAtual}-${mesStr}-12`,
    quantidade: 15,
    descricao: 'Validação de planos de entrega do ciclo 2026/2',
    observacao: 'Encaminhado relatório consolidado de cumprimento de metas à Direção',
    criado_em: `${anoAtual}-${mesStr}-12T17:00:00Z`,
    atualizado_em: `${anoAtual}-${mesStr}-12T17:00:00Z`,
  },
  {
    id: 'lanc-008',
    equipe_id: '44444444-4444-4444-4444-444444444301',
    atividade_id: '33333333-3333-3333-3333-333333333204', // Fiscalização de contratos
    registrado_por: 'user-admin-01',
    data: `${anoAtual}-${mesStr}-14`,
    horas: 3.0,
    duracao_minutos: 180,
    descricao: 'Reunião mensal com preposto da Empresa Valor e conferência de atestes de faturas',
    observacao: 'Emitido termo circunstanciado de conformidade com os postos de trabalho',
    criado_em: `${anoAtual}-${mesStr}-14T14:00:00Z`,
    atualizado_em: `${anoAtual}-${mesStr}-14T14:00:00Z`,
  },
];

export const INITIAL_MESES_FECHADOS: MesFechado[] = [
  // Exemplo de mês fechado no ano passado
  {
    id: 'fechado-01',
    equipe_id: '44444444-4444-4444-4444-444444444301',
    ano: anoAtual - 1,
    mes: 12,
    fechado_por: 'user-admin-01',
    fechado_em: `${anoAtual - 1}-12-31T18:00:00Z`,
    motivo: 'Fechamento anual do exercício homologado pela Direção-Geral',
  },
];

export const INITIAL_AUDITORIA: AuditoriaLog[] = [
  {
    id: 'aud-001',
    tabela: 'lancamentos',
    registro_id: 'lanc-001',
    acao: 'INSERT',
    usuario_id: 'user-colab-01',
    dados_depois: { equipe: 'Renan e Josi', atividade: 'Reuniões, alinhamentos e capacitações', horas: 1.5 },
    data: `${anoAtual}-${mesStr}-02T10:00:00Z`,
  },
  {
    id: 'aud-002',
    tabela: 'meses_fechados',
    registro_id: 'fechado-01',
    acao: 'INSERT',
    usuario_id: 'user-admin-01',
    dados_depois: { ano: anoAtual - 1, mes: 12, equipe: 'Equipe de Folha e Benefícios' },
    data: `${anoAtual - 1}-12-31T18:00:00Z`,
  },
];

// =====================================================================
// LOCAL REPOSITORY (Gerencia estado com persistência em LocalStorage)
// Garante funcionamento completo, reativo e offline
// =====================================================================

const STORAGE_KEYS = {
  PROFILES: 'sisrh_profiles',
  EQUIPES: 'sisrh_equipes',
  EQUIPE_MEMBROS: 'sisrh_equipe_membros',
  CATEGORIAS: 'sisrh_categorias',
  ATIVIDADES: 'sisrh_atividades',
  EQUIPE_ATIVIDADES: 'sisrh_equipe_atividades',
  LANCAMENTOS: 'sisrh_lancamentos',
  MESES_FECHADOS: 'sisrh_meses_fechados',
  AUDITORIA: 'sisrh_auditoria',
  CURRENT_USER: 'sisrh_current_user',
};

function getStorage<T>(key: string, fallback: T): T {
  try {
    const val = localStorage.getItem(key);
    return val ? JSON.parse(val) : fallback;
  } catch {
    return fallback;
  }
}

function setStorage<T>(key: string, data: T): void {
  try {
    localStorage.setItem(key, JSON.stringify(data));
  } catch (err) {
    console.error('Erro ao salvar no localStorage:', err);
  }
}

// Repositório do SisRH
export const SisRHRepository = {
  // Categorias
  getCategorias(): CategoriaAtividade[] {
    const cats = getStorage<CategoriaAtividade[]>(STORAGE_KEYS.CATEGORIAS, INITIAL_CATEGORIAS);
    return [...cats].sort((a, b) => a.ordem - b.ordem);
  },

  // Atividades
  getAtividades(): Atividade[] {
    const atividades = getStorage<Atividade[]>(STORAGE_KEYS.ATIVIDADES, INITIAL_ATIVIDADES);
    const categorias = this.getCategorias();
    return atividades.map(a => ({
      ...a,
      categoria: categorias.find(c => c.id === a.categoria_id)
    })).sort((a, b) => a.ordem - b.ordem);
  },

  saveAtividade(atividade: Partial<Atividade> & { nome: string; categoria_id: string; tipo_medida: 'quantidade' | 'horas' }): Atividade {
    const list = getStorage<Atividade[]>(STORAGE_KEYS.ATIVIDADES, INITIAL_ATIVIDADES);
    let item: Atividade;
    const now = new Date().toISOString();

    if (atividade.id) {
      const idx = list.findIndex(a => a.id === atividade.id);
      const anterior = list[idx];
      item = {
        ...anterior,
        ...atividade,
        atualizado_em: now,
      } as Atividade;
      if (idx >= 0) list[idx] = item;
      this.logAuditoria('atividades', item.id, 'UPDATE', anterior, item);
    } else {
      item = {
        id: 'ativ-' + Date.now(),
        categoria_id: atividade.categoria_id,
        nome: atividade.nome,
        descricao: atividade.descricao || '',
        tipo_medida: atividade.tipo_medida,
        ativo: atividade.ativo ?? true,
        vigencia_inicio: atividade.vigencia_inicio || new Date().toISOString().split('T')[0],
        vigencia_fim: atividade.vigencia_fim || null,
        ordem: atividade.ordem || list.length + 1,
        criado_em: now,
        atualizado_em: now,
      };
      list.push(item);
      this.logAuditoria('atividades', item.id, 'INSERT', null, item);
    }
    setStorage(STORAGE_KEYS.ATIVIDADES, list);
    // Sincronização assíncrona com Firestore
    setDoc(doc(db, 'atividades', item.id), item).catch(err => console.warn('Sync Firestore atividades:', err));
    return item;
  },

  toggleAtividadeAtiva(id: string): Atividade | undefined {
    const list = getStorage<Atividade[]>(STORAGE_KEYS.ATIVIDADES, INITIAL_ATIVIDADES);
    const item = list.find(a => a.id === id);
    if (item) {
      const anterior = { ...item };
      item.ativo = !item.ativo;
      item.atualizado_em = new Date().toISOString();
      setStorage(STORAGE_KEYS.ATIVIDADES, list);
      this.logAuditoria('atividades', item.id, 'UPDATE', anterior, item);
      setDoc(doc(db, 'atividades', item.id), item).catch(err => console.warn('Sync Firestore atividades:', err));
      return item;
    }
    return undefined;
  },

  // Equipes
  getEquipes(): Equipe[] {
    const equipes = getStorage<Equipe[]>(STORAGE_KEYS.EQUIPES, INITIAL_EQUIPES);
    const membros = getStorage<EquipeMembro[]>(STORAGE_KEYS.EQUIPE_MEMBROS, INITIAL_EQUIPE_MEMBROS);
    return equipes.map(e => ({
      ...e,
      membros_count: membros.filter(m => m.equipe_id === e.id).length
    }));
  },

  saveEquipe(equipe: Partial<Equipe> & { nome: string }): Equipe {
    const list = getStorage<Equipe[]>(STORAGE_KEYS.EQUIPES, INITIAL_EQUIPES);
    let item: Equipe;
    const now = new Date().toISOString();

    if (equipe.id) {
      const idx = list.findIndex(e => e.id === equipe.id);
      const anterior = list[idx];
      item = { ...anterior, ...equipe, atualizado_em: now } as Equipe;
      if (idx >= 0) list[idx] = item;
      this.logAuditoria('equipes', item.id, 'UPDATE', anterior, item);
    } else {
      item = {
        id: 'eq-' + Date.now(),
        nome: equipe.nome,
        descricao: equipe.descricao || '',
        sigla: equipe.sigla || equipe.nome.substring(0, 4).toUpperCase(),
        ativo: equipe.ativo ?? true,
        criado_em: now,
        atualizado_em: now,
      };
      list.push(item);
      this.logAuditoria('equipes', item.id, 'INSERT', null, item);
    }
    setStorage(STORAGE_KEYS.EQUIPES, list);
    setDoc(doc(db, 'equipes', item.id), item).catch(err => console.warn('Sync Firestore equipes:', err));
    return item;
  },

  // Membros
  getEquipeMembros(): EquipeMembro[] {
    const membros = getStorage<EquipeMembro[]>(STORAGE_KEYS.EQUIPE_MEMBROS, INITIAL_EQUIPE_MEMBROS);
    const profiles = this.getProfiles();
    const equipes = this.getEquipes();
    return membros.map(m => ({
      ...m,
      profile: profiles.find(p => p.id === m.profile_id),
      equipe: equipes.find(e => e.id === m.equipe_id),
    }));
  },

  setEquipeMembros(equipeId: string, profileIdsWithRole: { profile_id: string; papel: 'membro' | 'coordenador' }[]): void {
    const all = getStorage<EquipeMembro[]>(STORAGE_KEYS.EQUIPE_MEMBROS, INITIAL_EQUIPE_MEMBROS);
    const filtered = all.filter(m => m.equipe_id !== equipeId);
    const now = new Date().toISOString();
    const newMembers: EquipeMembro[] = profileIdsWithRole.map(p => ({
      equipe_id: equipeId,
      profile_id: p.profile_id,
      papel: p.papel,
      criado_em: now,
    }));
    setStorage(STORAGE_KEYS.EQUIPE_MEMBROS, [...filtered, ...newMembers]);
  },

  // Perfis
  getProfiles(): Profile[] {
    return getStorage<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
  },

  saveProfile(profile: Partial<Profile> & { nome_completo: string; email: string }): Profile {
    const list = getStorage<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    let item: Profile;
    const now = new Date().toISOString();
    const emailLimpo = profile.email.trim().toLowerCase();

    // Validação de e-mail duplicado
    const existingWithSameEmail = list.find(p => p.email.toLowerCase() === emailLimpo && p.id !== profile.id);
    if (existingWithSameEmail) {
      throw new Error(`O e-mail "${profile.email}" já está cadastrado para o servidor "${existingWithSameEmail.nome_completo}".`);
    }

    if (profile.id) {
      const idx = list.findIndex(p => p.id === profile.id);
      const anterior = list[idx];
      item = {
        ...anterior,
        ...profile,
        email: emailLimpo,
        cargo: profile.cargo !== undefined ? profile.cargo : (anterior?.cargo ?? null),
        perfil: profile.perfil || anterior.perfil || 'padrao',
        atualizado_em: now
      } as Profile;
      if (idx >= 0) list[idx] = item;
      this.logAuditoria('profiles', item.id, 'UPDATE', anterior, item);
    } else {
      item = {
        id: 'user-' + Date.now(),
        nome_completo: profile.nome_completo.trim(),
        email: emailLimpo,
        matricula_siape: profile.matricula_siape?.trim() || null,
        cargo: profile.cargo || null,
        perfil: profile.perfil || 'padrao',
        ativo: profile.ativo ?? true,
        senha: profile.senha?.trim() || (profile.perfil === 'admin' ? 'admin123' : 'padrao123'),
        criado_em: now,
        atualizado_em: now,
      };
      list.push(item);
      this.logAuditoria('profiles', item.id, 'INSERT', null, item);
    }
    setStorage(STORAGE_KEYS.PROFILES, list);
    setDoc(doc(db, 'profiles', item.id), item).catch(err => console.warn('Sync Firestore profiles:', err));
    return item;
  },

  autenticarUsuario(email: string, senhaDigitada: string): { sucesso: boolean; usuario?: Profile; erro?: string } {
    const list = this.getProfiles();
    const emailLimpo = email.trim().toLowerCase();
    const user = list.find(p => p.email.toLowerCase() === emailLimpo);

    if (!user) {
      return { sucesso: false, erro: 'E-mail não cadastrado no sistema. Verifique a grafia ou solicite cadastro ao Administrador.' };
    }

    if (!user.ativo) {
      return { sucesso: false, erro: 'Esta conta de usuário foi desativada pelo Administrador do RH.' };
    }

    // Validação de senha
    const senhaValida = user.senha || (user.perfil === 'admin' ? 'admin123' : 'padrao123');
    if (senhaDigitada !== senhaValida) {
      return { sucesso: false, erro: 'Senha incorreta. Tente novamente ou use as credenciais padrão indicadas.' };
    }

    return { sucesso: true, usuario: user };
  },

  toggleProfileAtivo(id: string): Profile | undefined {
    const list = getStorage<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const item = list.find(p => p.id === id);
    if (item) {
      const anterior = { ...item };
      item.ativo = !item.ativo;
      item.atualizado_em = new Date().toISOString();
      setStorage(STORAGE_KEYS.PROFILES, list);
      this.logAuditoria('profiles', item.id, 'UPDATE', anterior, item);
      setDoc(doc(db, 'profiles', item.id), item).catch(err => console.warn('Sync Firestore profiles:', err));
      return item;
    }
    return undefined;
  },

  deleteProfile(id: string): void {
    const list = getStorage<Profile[]>(STORAGE_KEYS.PROFILES, INITIAL_PROFILES);
    const item = list.find(p => p.id === id);
    if (!item) return;

    const currentUser = this.getCurrentUser();
    if (currentUser && currentUser.id === id) {
      throw new Error('Você não pode excluir sua própria conta de usuário.');
    }

    if (item.perfil === 'admin') {
      const outrosAdminsAtivos = list.filter(p => p.id !== id && p.perfil === 'admin' && p.ativo);
      if (outrosAdminsAtivos.length === 0) {
        throw new Error('Não é possível excluir o único administrador ativo do sistema.');
      }
    }

    const filtered = list.filter(p => p.id !== id);
    setStorage(STORAGE_KEYS.PROFILES, filtered);

    // Remover vínculos do usuário nas equipes
    const membros = getStorage<EquipeMembro[]>(STORAGE_KEYS.EQUIPE_MEMBROS, INITIAL_EQUIPE_MEMBROS);
    const membrosFiltrados = membros.filter(m => m.profile_id !== id);
    if (membrosFiltrados.length !== membros.length) {
      setStorage(STORAGE_KEYS.EQUIPE_MEMBROS, membrosFiltrados);
    }

    this.logAuditoria('profiles', id, 'DELETE', item, null);
    deleteDoc(doc(db, 'profiles', id)).catch(err =>
      handleFirestoreError(err, OperationType.DELETE, `profiles/${id}`)
    );
  },

  // Atribuição de Atividades a Equipes
  getEquipeAtividades(): EquipeAtividade[] {
    return getStorage<EquipeAtividade[]>(STORAGE_KEYS.EQUIPE_ATIVIDADES, INITIAL_EQUIPE_ATIVIDADES);
  },

  setEquipeAtividades(equipeId: string, atividadeIds: string[]): void {
    const all = getStorage<EquipeAtividade[]>(STORAGE_KEYS.EQUIPE_ATIVIDADES, INITIAL_EQUIPE_ATIVIDADES);
    const filtered = all.filter(ea => ea.equipe_id !== equipeId);
    const now = new Date().toISOString();
    const newItems: EquipeAtividade[] = atividadeIds.map(aid => ({
      equipe_id: equipeId,
      atividade_id: aid,
      atribuido_em: now,
    }));
    setStorage(STORAGE_KEYS.EQUIPE_ATIVIDADES, [...filtered, ...newItems]);
    this.logAuditoria('equipe_atividades', equipeId, 'UPDATE', null, { equipeId, count: atividadeIds.length });
  },

  getAtividadesByEquipe(equipeId: string): Atividade[] {
    const allAtividades = this.getAtividades();
    const rels = this.getEquipeAtividades().filter(r => r.equipe_id === equipeId);
    const ids = new Set(rels.map(r => r.atividade_id));
    return allAtividades.filter(a => ids.has(a.id) && a.ativo);
  },

  // Lançamentos
  getLancamentos(): Lancamento[] {
    const lancamentos = getStorage<Lancamento[]>(STORAGE_KEYS.LANCAMENTOS, INITIAL_LANCAMENTOS);
    const atividades = this.getAtividades();
    const equipes = this.getEquipes();
    const profiles = this.getProfiles();

    return lancamentos.map(l => ({
      ...l,
      atividade: atividades.find(a => a.id === l.atividade_id),
      equipe: equipes.find(e => e.id === l.equipe_id),
      usuario: profiles.find(p => p.id === l.registrado_por),
    })).sort((a, b) => b.data.localeCompare(a.data));
  },

  isMesFechado(equipeId: string, dataIso: string): boolean {
    const d = new Date(dataIso + 'T00:00:00');
    const ano = d.getFullYear();
    const mes = d.getMonth() + 1;
    const mesesFechados = this.getMesesFechados();
    return mesesFechados.some(mf => mf.equipe_id === equipeId && mf.ano === ano && mf.mes === mes);
  },

  saveLancamento(lancamento: Partial<Lancamento> & { equipe_id: string; atividade_id: string; registrado_por: string; data: string }): Lancamento {
    if (this.isMesFechado(lancamento.equipe_id, lancamento.data)) {
      throw new Error('Não é permitido alterar lançamentos para este mês, pois o período está fechado/homologado pela chefia.');
    }

    const list = getStorage<Lancamento[]>(STORAGE_KEYS.LANCAMENTOS, INITIAL_LANCAMENTOS);
    let item: Lancamento;
    const now = new Date().toISOString();

    if (lancamento.id) {
      const idx = list.findIndex(l => l.id === lancamento.id);
      const anterior = list[idx];
      item = { ...anterior, ...lancamento, atualizado_em: now } as Lancamento;
      if (idx >= 0) list[idx] = item;
      this.logAuditoria('lancamentos', item.id, 'UPDATE', anterior, item);
    } else {
      item = {
        id: 'lanc-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
        equipe_id: lancamento.equipe_id,
        atividade_id: lancamento.atividade_id,
        registrado_por: lancamento.registrado_por,
        data: lancamento.data,
        quantidade: lancamento.quantidade !== undefined ? lancamento.quantidade : null,
        horas: lancamento.horas !== undefined ? lancamento.horas : null,
        duracao_minutos: lancamento.duracao_minutos !== undefined ? lancamento.duracao_minutos : null,
        descricao: lancamento.descricao || null,
        observacao: lancamento.observacao || null,
        criado_em: now,
        atualizado_em: now,
      };
      list.push(item);
      this.logAuditoria('lancamentos', item.id, 'INSERT', null, item);
    }
    setStorage(STORAGE_KEYS.LANCAMENTOS, list);
    setDoc(doc(db, 'lancamentos', item.id), item).catch(err => console.warn('Sync Firestore lancamentos:', err));
    return item;
  },

  deleteLancamento(id: string): void {
    const list = getStorage<Lancamento[]>(STORAGE_KEYS.LANCAMENTOS, INITIAL_LANCAMENTOS);
    const item = list.find(l => l.id === id);
    if (!item) return;

    if (this.isMesFechado(item.equipe_id, item.data)) {
      throw new Error('Não é permitido excluir lançamentos de meses fechados.');
    }

    const filtered = list.filter(l => l.id !== id);
    setStorage(STORAGE_KEYS.LANCAMENTOS, filtered);
    this.logAuditoria('lancamentos', id, 'DELETE', item, null);
    deleteDoc(doc(db, 'lancamentos', id)).catch(err => console.warn('Sync Firestore delete lancamentos:', err));
  },

  // Salvar em lote para a grade rápida
  saveGradeLancamentos(equipeId: string, registradoPor: string, itens: { atividade_id: string; data: string; valor: number; tipo_medida: 'quantidade' | 'horas' }[]): void {
    const list = getStorage<Lancamento[]>(STORAGE_KEYS.LANCAMENTOS, INITIAL_LANCAMENTOS);
    const now = new Date().toISOString();

    for (const item of itens) {
      if (this.isMesFechado(equipeId, item.data)) {
        continue;
      }

      // Procura se já tem lançamento simples nesse dia para essa atividade e equipe
      const idx = list.findIndex(l => l.equipe_id === equipeId && l.atividade_id === item.atividade_id && l.data === item.data);
      if (item.valor <= 0) {
        if (idx >= 0) {
          list.splice(idx, 1);
        }
      } else {
        if (idx >= 0) {
          list[idx] = {
            ...list[idx],
            quantidade: item.tipo_medida === 'quantidade' ? item.valor : null,
            horas: item.tipo_medida === 'horas' ? item.valor : null,
            atualizado_em: now,
          };
        } else {
          list.push({
            id: 'lanc-grade-' + Date.now() + '-' + Math.random().toString(36).substring(2, 7),
            equipe_id: equipeId,
            atividade_id: item.atividade_id,
            registrado_por: registradoPor,
            data: item.data,
            quantidade: item.tipo_medida === 'quantidade' ? item.valor : null,
            horas: item.tipo_medida === 'horas' ? item.valor : null,
            descricao: null,
            observacao: null,
            criado_em: now,
            atualizado_em: now,
          });
        }
      }
    }
    setStorage(STORAGE_KEYS.LANCAMENTOS, list);
  },

  // Meses Fechados
  getMesesFechados(): MesFechado[] {
    const meses = getStorage<MesFechado[]>(STORAGE_KEYS.MESES_FECHADOS, INITIAL_MESES_FECHADOS);
    const equipes = this.getEquipes();
    const profiles = this.getProfiles();
    return meses.map(m => ({
      ...m,
      equipe: equipes.find(e => e.id === m.equipe_id),
      fechador: profiles.find(p => p.id === m.fechado_por),
    }));
  },

  fecharMes(equipeId: string, ano: number, mes: number, fechadoPor: string, motivo?: string): MesFechado {
    const list = getStorage<MesFechado[]>(STORAGE_KEYS.MESES_FECHADOS, INITIAL_MESES_FECHADOS);
    const exists = list.find(m => m.equipe_id === equipeId && m.ano === ano && m.mes === mes);
    if (exists) {
      throw new Error('Este mês já está fechado.');
    }
    const novo: MesFechado = {
      id: 'mf-' + Date.now(),
      equipe_id: equipeId,
      ano,
      mes,
      fechado_por: fechadoPor,
      fechado_em: new Date().toISOString(),
      motivo: motivo || 'Homologação mensal de rotina',
    };
    list.push(novo);
    setStorage(STORAGE_KEYS.MESES_FECHADOS, list);
    this.logAuditoria('meses_fechados', novo.id, 'INSERT', null, novo);
    setDoc(doc(db, 'meses_fechados', novo.id), novo).catch(err => console.warn('Sync Firestore fecharMes:', err));
    return novo;
  },

  reabrirMes(id: string): void {
    const list = getStorage<MesFechado[]>(STORAGE_KEYS.MESES_FECHADOS, INITIAL_MESES_FECHADOS);
    const item = list.find(m => m.id === id);
    if (item) {
      const filtered = list.filter(m => m.id !== id);
      setStorage(STORAGE_KEYS.MESES_FECHADOS, filtered);
      this.logAuditoria('meses_fechados', id, 'DELETE', item, null);
      deleteDoc(doc(db, 'meses_fechados', id)).catch(err => console.warn('Sync Firestore reabrirMes:', err));
    }
  },

  // Auditoria
  getAuditoria(): AuditoriaLog[] {
    const logs = getStorage<AuditoriaLog[]>(STORAGE_KEYS.AUDITORIA, INITIAL_AUDITORIA);
    const profiles = this.getProfiles();
    return logs.map(l => ({
      ...l,
      usuario: profiles.find(p => p.id === l.usuario_id),
    })).sort((a, b) => b.data.localeCompare(a.data));
  },

  logAuditoria(tabela: string, registroId: string, acao: 'INSERT' | 'UPDATE' | 'DELETE', antes: any, depois: any): void {
    const logs = getStorage<AuditoriaLog[]>(STORAGE_KEYS.AUDITORIA, INITIAL_AUDITORIA);
    const currentUser = this.getCurrentUser();
    const novoLog: AuditoriaLog = {
      id: 'aud-' + Date.now() + '-' + Math.floor(Math.random() * 1000),
      tabela,
      registro_id: registroId,
      acao,
      usuario_id: currentUser?.id || 'sistema',
      dados_antes: antes,
      dados_depois: depois,
      data: new Date().toISOString(),
    };
    logs.unshift(novoLog);
    if (logs.length > 500) logs.pop();
    setStorage(STORAGE_KEYS.AUDITORIA, logs);
  },

  // Sessão atual
  getCurrentUser(): Profile {
    const stored = getStorage<Profile | null>(STORAGE_KEYS.CURRENT_USER, null);
    if (stored) {
      const fresh = this.getProfiles().find(p => p.id === stored.id);
      if (fresh) return fresh;
      return stored;
    }
    // Default: Admin
    return INITIAL_PROFILES[0];
  },

  setCurrentUser(profile: Profile): void {
    setStorage(STORAGE_KEYS.CURRENT_USER, profile);
  },

  // Reiniciar dados para o seed original
  resetToInitialSeed(): void {
    localStorage.removeItem(STORAGE_KEYS.PROFILES);
    localStorage.removeItem(STORAGE_KEYS.EQUIPES);
    localStorage.removeItem(STORAGE_KEYS.EQUIPE_MEMBROS);
    localStorage.removeItem(STORAGE_KEYS.CATEGORIAS);
    localStorage.removeItem(STORAGE_KEYS.ATIVIDADES);
    localStorage.removeItem(STORAGE_KEYS.EQUIPE_ATIVIDADES);
    localStorage.removeItem(STORAGE_KEYS.LANCAMENTOS);
    localStorage.removeItem(STORAGE_KEYS.MESES_FECHADOS);
    localStorage.removeItem(STORAGE_KEYS.AUDITORIA);
  }
};
