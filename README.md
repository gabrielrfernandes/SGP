# SisRH Atividades - Gestão de Atividades e Atendimento de Recursos Humanos

Sistema web full-stack desenvolvido para setores de Recursos Humanos de instituições públicas federais. O sistema substitui as antigas planilhas Excel mensais desconectadas por um modelo estruturado com lançamentos diários, distinção clara entre métricas de **quantidade** e **horas**, controle rigoroso de fechamento mensal, rastreabilidade/auditoria (LGPD) e relatórios em conformidade com as diretrizes do serviço público federal.

---

## 🛠️ Tecnologias Utilizadas

- **Frontend:** React 18, TypeScript, Vite, Tailwind CSS
- **Componentes e Ícones:** Lucide React, Motion
- **Gráficos e Visualizações:** Recharts
- **Backend, Banco de Dados e RLS:** Supabase (PostgreSQL 15+, Supabase Auth, Row Level Security)
- **Manipulação de Datas:** date-fns com localização `pt-BR`
- **Exportação de Dados:** SheetJS (`xlsx`) para planilhas multi-aba, `jspdf` + `jspdf-autotable` para PDF institucional, e exportador nativo para CSV
- **Importação:** Leitor inteligente de planilhas legadas com mapeamento assistido de atividades

---

## 🚀 Passo a Passo de Implantação no Supabase

### 1. Criar o Projeto no Supabase
1. Acesse [supabase.com](https://supabase.com) e faça login.
2. Clique em **"New Project"**.
3. Defina o nome do projeto (ex.: `sisrh-atividades`), escolha a senha forte do banco de dados e a região geográfica (recomendado: `South America (São Paulo) - sa-east-1`).
4. Aguarde a finalização da provisão do banco de dados (cerca de 1 a 2 minutos).

---

### 2. Executar as Migrações do Banco de Dados
1. No painel do seu projeto Supabase, acesse o menu lateral **SQL Editor**.
2. Clique em **"New query"**.
3. Abra o arquivo localizado no repositório:
   `supabase/migrations/001_schema.sql`
4. Copie todo o conteúdo, cole no editor SQL do Supabase e clique em **"Run"** (ou `Ctrl+Enter`).
   > Esse script cria os enums, as tabelas (`profiles`, `equipes`, `equipe_membros`, `categorias_atividade`, `atividades`, `equipe_atividades`, `lancamentos`, `meses_fechados`, `auditoria`), índices de alta performance, triggers de auditoria e validação de mês fechado, views analíticas e todas as políticas RLS (Row Level Security).

---

### 3. Carregar o Catálogo e Dados Iniciais (Seed)
1. No **SQL Editor** do Supabase, clique novamente em **"New query"**.
2. Abra o arquivo:
   `supabase/seed.sql`
3. Copie o conteúdo, cole no editor SQL e clique em **"Run"**.
   > Esse script popula o catálogo inicial oficial de atividades (todas as 15 atividades medidas em quantidade e as 4 medidas em horas), categorias temáticas de RH e equipes padrão (incluindo equipes compartilhadas como "Renan e Josi").

---

### 4. Configurar as Variáveis de Ambiente
1. No painel do Supabase, vá em **Project Settings** (ícone de engrenagem) > **API**.
2. Localize:
   - **Project URL** (ex: `https://xyzcompany.supabase.co`)
   - **Project API keys** -> chave **anon / public** (chave pública segura para o frontend)
   > ⚠️ **ATENÇÃO:** NUNCA utilize a chave `service_role` no código frontend.
3. No seu ambiente local ou painel de variáveis de ambiente, crie um arquivo `.env` na raiz do projeto:
   ```env
   VITE_SUPABASE_URL="https://seu-projeto.supabase.co"
   VITE_SUPABASE_ANON_KEY="sua-chave-anon-publica"
   ```
   *(Nota: O aplicativo conta também com modo demonstrativo integrado que permite testes imediatos e navegação completa caso as credenciais ainda não tenham sido configuradas).*

---

### 5. Criar o Primeiro Usuário Administrador
1. No painel do Supabase, vá em **Authentication** > **Users**.
2. Clique em **"Add User"** > **"Create User"**.
3. Informe o e-mail (ex: `admin.rh@instituicao.gov.br`) e defina uma senha segura.
4. Marque a opção **"Auto Confirm User"** para ativar a conta imediatamente.
5. Em seguida, vá ao **SQL Editor** e execute o seguinte comando para conceder o perfil de **admin**:
   ```sql
   UPDATE public.profiles
   SET perfil = 'admin'
   WHERE email = 'admin.rh@instituicao.gov.br';
   ```
6. Pronto! Agora você pode efetuar login no sistema com este usuário e gerenciar todos os demais servidores e equipes.

---

### 6. Executar a Aplicação Localmente
1. Instale as dependências:
   ```bash
   npm install
   ```
2. Inicie o servidor de desenvolvimento:
   ```bash
   npm run dev
   ```
3. Acesse a aplicação em: `http://localhost:3000` (ou na porta indicada pelo terminal).

---

## 👥 Perfis de Acesso e Regras de Negócio

| Perfil | Permissões |
|---|---|
| **Admin** | Acesso irrestrito a todos os relatórios e equipes; cria e edita usuários; gerencia catálogo de atividades e vigências; atribui atividades a equipes; fecha e reabre meses; visualiza trilha de auditoria. |
| **Gestor** | Visualiza painel geral e exporta relatórios de todas as equipes que coordena; acompanha lançamentos da sua equipe; fecha o mês após validação. Não pode alterar catálogo global nem reabrir meses bloqueados. |
| **Colaborador** | Registra, edita e exclui lançamentos da sua própria equipe; visualiza seu painel de produtividade e resumo mensal. Bloqueado de alterar registros em meses já fechados pela chefia. |

---

## 📊 Principais Recursos do Sistema

1. **Grade Rápida de Lançamentos:** Visão em matriz (Atividades x Dias do mês) para preenchimento rápido em lote, simulando a agilidade do Excel com integridade de banco de dados relacional.
2. **Lançamentos Detalhados em Horas:** Registro específico para atividades com medida de tempo, com campos de duração (`hh:mm`), descrição do atendimento e observações formais.
3. **Mês Fechado:** Trava operacional que impede adulterações em períodos já homologados pela chefia.
4. **Exportações Oficiais:**
   - **Excel (.xlsx):** Gera arquivo com uma aba para cada mês do exercício + uma aba de Resumo Anual consolidado.
   - **PDF:** Documento formatado com cabeçalho institucional brasileiro, metadados de emissão e assinaturas.
   - **CSV:** Formato aberto para integração com outros sistemas de BI governamentais.
5. **Importador de Planilhas Legadas:** Ferramenta assistida que lê arquivos `.xlsx` antigos do RH e converte linhas agregadas em lançamentos históricos no catálogo atualizado.
