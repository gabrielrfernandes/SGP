-- =====================================================================
-- SisRH Atividades - Sistema de Registro de Atividades e Atendimento
-- Migração 001: Schema completo, Enums, Tabelas, Índices, Triggers e RLS
-- =====================================================================

-- Habilitar extensão para geração de UUID
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ---------------------------------------------------------------------
-- 1. ENUMS
-- ---------------------------------------------------------------------

DO $$ BEGIN
    CREATE TYPE perfil_usuario AS ENUM ('admin', 'gestor', 'colaborador');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE papel_equipe AS ENUM ('membro', 'coordenador');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE tipo_medida_enum AS ENUM ('quantidade', 'horas');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE acao_auditoria AS ENUM ('INSERT', 'UPDATE', 'DELETE');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

-- ---------------------------------------------------------------------
-- 2. TABELAS PRINCIPAIS
-- ---------------------------------------------------------------------

-- Perfis de Usuário (vinculados ao auth.users do Supabase)
CREATE TABLE IF NOT EXISTS public.profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    nome_completo VARCHAR(255) NOT NULL,
    email VARCHAR(255) NOT NULL UNIQUE,
    matricula_siape VARCHAR(20),
    perfil perfil_usuario NOT NULL DEFAULT 'colaborador',
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Equipes de Trabalho (permite equipes individuais ou compartilhadas ex: "Renan e Josi")
CREATE TABLE IF NOT EXISTS public.equipes (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(150) NOT NULL,
    descricao TEXT,
    sigla VARCHAR(30),
    ativo BOOLEAN NOT NULL DEFAULT true,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Membros das Equipes
CREATE TABLE IF NOT EXISTS public.equipe_membros (
    equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
    profile_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE CASCADE,
    papel papel_equipe NOT NULL DEFAULT 'membro',
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (equipe_id, profile_id)
);

-- Categorias de Atividades
CREATE TABLE IF NOT EXISTS public.categorias_atividade (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nome VARCHAR(100) NOT NULL UNIQUE,
    descricao TEXT,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- Catálogo de Atividades
CREATE TABLE IF NOT EXISTS public.atividades (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    categoria_id UUID NOT NULL REFERENCES public.categorias_atividade(id) ON DELETE RESTRICT,
    nome VARCHAR(255) NOT NULL,
    descricao TEXT,
    tipo_medida tipo_medida_enum NOT NULL DEFAULT 'quantidade',
    ativo BOOLEAN NOT NULL DEFAULT true,
    vigencia_inicio DATE NOT NULL DEFAULT CURRENT_DATE,
    vigencia_fim DATE,
    ordem INTEGER NOT NULL DEFAULT 0,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    CONSTRAINT chk_vigencia CHECK (vigencia_fim IS NULL OR vigencia_fim >= vigencia_inicio)
);

-- Atribuição de Atividades a Equipes
CREATE TABLE IF NOT EXISTS public.equipe_atividades (
    equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
    atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE CASCADE,
    atribuido_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    PRIMARY KEY (equipe_id, atividade_id)
);

-- Lançamentos Diários de Atividades
CREATE TABLE IF NOT EXISTS public.lancamentos (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE RESTRICT,
    atividade_id UUID NOT NULL REFERENCES public.atividades(id) ON DELETE RESTRICT,
    registrado_por UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    data DATE NOT NULL,
    quantidade NUMERIC(10, 2),
    horas NUMERIC(10, 2),
    duracao_minutos INTEGER,
    descricao TEXT,
    observacao TEXT,
    criado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    atualizado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    -- Garantir que ao menos uma métrica seja fornecida e positiva
    CONSTRAINT chk_medida_preenchida CHECK (
        (quantidade IS NOT NULL AND quantidade >= 0 AND horas IS NULL) OR
        (horas IS NOT NULL AND horas >= 0 AND quantidade IS NULL)
    )
);

-- Meses Fechados por Equipe (impede edições após fechamento administrativo)
CREATE TABLE IF NOT EXISTS public.meses_fechados (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    equipe_id UUID NOT NULL REFERENCES public.equipes(id) ON DELETE CASCADE,
    ano INTEGER NOT NULL,
    mes INTEGER NOT NULL CHECK (mes >= 1 AND mes <= 12),
    fechado_por UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
    fechado_em TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now()),
    motivo TEXT,
    UNIQUE (equipe_id, ano, mes)
);

-- Tabela de Auditoria (Registro de Trilha em conformidade com LGPD e controle interno)
CREATE TABLE IF NOT EXISTS public.auditoria (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    tabela VARCHAR(50) NOT NULL,
    registro_id UUID,
    acao acao_auditoria NOT NULL,
    usuario_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
    dados_antes JSONB,
    dados_depois JSONB,
    data TIMESTAMPTZ NOT NULL DEFAULT timezone('utc'::text, now())
);

-- ---------------------------------------------------------------------
-- 3. ÍNDICES DE DESEMPENHO
-- ---------------------------------------------------------------------

CREATE INDEX IF NOT EXISTS idx_lancamentos_equipe_data ON public.lancamentos(equipe_id, data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_atividade_data ON public.lancamentos(atividade_id, data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_registrado_data ON public.lancamentos(registrado_por, data);
CREATE INDEX IF NOT EXISTS idx_lancamentos_data ON public.lancamentos(data);
CREATE INDEX IF NOT EXISTS idx_meses_fechados_equipe_ano_mes ON public.meses_fechados(equipe_id, ano, mes);
CREATE INDEX IF NOT EXISTS idx_atividades_categoria ON public.atividades(categoria_id);
CREATE INDEX IF NOT EXISTS idx_equipe_membros_profile ON public.equipe_membros(profile_id);
CREATE INDEX IF NOT EXISTS idx_auditoria_tabela_data ON public.auditoria(tabela, data);

-- ---------------------------------------------------------------------
-- 4. FUNÇÕES E TRIGGERS
-- ---------------------------------------------------------------------

-- Função para atualizar coluna atualizado_em
CREATE OR REPLACE FUNCTION public.fn_set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.atualizado_em = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_profiles_updated_at
    BEFORE UPDATE ON public.profiles
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_equipes_updated_at
    BEFORE UPDATE ON public.equipes
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_atividades_updated_at
    BEFORE UPDATE ON public.atividades
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

CREATE OR REPLACE TRIGGER trg_lancamentos_updated_at
    BEFORE UPDATE ON public.lancamentos
    FOR EACH ROW EXECUTE FUNCTION public.fn_set_updated_at();

-- Trigger para bloquear alterações em meses fechados
CREATE OR REPLACE FUNCTION public.fn_check_mes_fechado()
RETURNS TRIGGER AS $$
DECLARE
    v_data DATE;
    v_equipe_id UUID;
    v_ano INTEGER;
    v_mes INTEGER;
    v_fechado BOOLEAN;
BEGIN
    IF (TG_OP = 'DELETE') THEN
        v_data := OLD.data;
        v_equipe_id := OLD.equipe_id;
    ELSE
        v_data := NEW.data;
        v_equipe_id := NEW.equipe_id;
    END IF;

    v_ano := EXTRACT(YEAR FROM v_data);
    v_mes := EXTRACT(MONTH FROM v_data);

    SELECT EXISTS (
        SELECT 1 FROM public.meses_fechados
        WHERE equipe_id = v_equipe_id AND ano = v_ano AND mes = v_mes
    ) INTO v_fechado;

    IF v_fechado THEN
        RAISE EXCEPTION 'Não é permitido criar, editar ou excluir lançamentos para a equipe neste mês pois o período já foi homologado/fechado.';
    END IF;

    IF (TG_OP = 'DELETE') THEN
        RETURN OLD;
    ELSE
        RETURN NEW;
    END IF;
END;
$$ LANGUAGE plpgsql;

CREATE OR REPLACE TRIGGER trg_lancamentos_check_mes_fechado
    BEFORE INSERT OR UPDATE OR DELETE ON public.lancamentos
    FOR EACH ROW EXECUTE FUNCTION public.fn_check_mes_fechado();

-- Trigger de Auditoria para Lancamentos, Atividades e Meses Fechados
CREATE OR REPLACE FUNCTION public.fn_auditoria_trigger()
RETURNS TRIGGER AS $$
DECLARE
    v_user_id UUID;
BEGIN
    -- Captura o usuário autenticado do Supabase se disponível
    BEGIN
        v_user_id := auth.uid();
    EXCEPTION WHEN OTHERS THEN
        v_user_id := NULL;
    END;

    IF (TG_OP = 'INSERT') THEN
        INSERT INTO public.auditoria (tabela, registro_id, acao, usuario_id, dados_depois)
        VALUES (TG_TABLE_NAME, NEW.id, 'INSERT', v_user_id, to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'UPDATE') THEN
        INSERT INTO public.auditoria (tabela, registro_id, acao, usuario_id, dados_antes, dados_depois)
        VALUES (TG_TABLE_NAME, NEW.id, 'UPDATE', v_user_id, to_jsonb(OLD), to_jsonb(NEW));
        RETURN NEW;
    ELSIF (TG_OP = 'DELETE') THEN
        INSERT INTO public.auditoria (tabela, registro_id, acao, usuario_id, dados_antes)
        VALUES (TG_TABLE_NAME, OLD.id, 'DELETE', v_user_id, to_jsonb(OLD));
        RETURN OLD;
    END IF;
    RETURN NULL;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER trg_auditoria_lancamentos
    AFTER INSERT OR UPDATE OR DELETE ON public.lancamentos
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_trigger();

CREATE OR REPLACE TRIGGER trg_auditoria_atividades
    AFTER INSERT OR UPDATE OR DELETE ON public.atividades
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_trigger();

CREATE OR REPLACE TRIGGER trg_auditoria_meses_fechados
    AFTER INSERT OR UPDATE OR DELETE ON public.meses_fechados
    FOR EACH ROW EXECUTE FUNCTION public.fn_auditoria_trigger();

-- Trigger para criar perfil automaticamente no cadastro do Supabase Auth
CREATE OR REPLACE FUNCTION public.fn_handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.profiles (id, nome_completo, email, perfil, ativo)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'nome_completo', split_part(NEW.email, '@', 1)),
        NEW.email,
        COALESCE((NEW.raw_user_meta_data->>'perfil')::public.perfil_usuario, 'colaborador'::public.perfil_usuario),
        true
    )
    ON CONFLICT (id) DO UPDATE
    SET email = EXCLUDED.email;
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.fn_handle_new_user();

-- ---------------------------------------------------------------------
-- 5. VIEWS DE AGREGAÇÃO E RELATÓRIO
-- ---------------------------------------------------------------------

-- View: Totais por Mês, Equipe e Atividade
CREATE OR REPLACE VIEW public.vw_totais_mensais_equipe_atividade AS
SELECT
    l.equipe_id,
    e.nome AS equipe_nome,
    EXTRACT(YEAR FROM l.data)::INTEGER AS ano,
    EXTRACT(MONTH FROM l.data)::INTEGER AS mes,
    l.atividade_id,
    a.nome AS atividade_nome,
    a.tipo_medida,
    c.id AS categoria_id,
    c.nome AS categoria_nome,
    COUNT(l.id) AS total_lancamentos,
    SUM(COALESCE(l.quantidade, 0)) AS total_quantidade,
    SUM(COALESCE(l.horas, 0)) AS total_horas
FROM public.lancamentos l
JOIN public.equipes e ON e.id = l.equipe_id
JOIN public.atividades a ON a.id = l.atividade_id
JOIN public.categorias_atividade c ON c.id = a.categoria_id
GROUP BY l.equipe_id, e.nome, EXTRACT(YEAR FROM l.data), EXTRACT(MONTH FROM l.data), l.atividade_id, a.nome, a.tipo_medida, c.id, c.nome;

-- View: Resumo Anual por Atividade (equivalente à planilha anual do RH)
CREATE OR REPLACE VIEW public.vw_resumo_anual_atividades AS
SELECT
    a.id AS atividade_id,
    a.nome AS atividade_nome,
    a.tipo_medida,
    c.nome AS categoria_nome,
    EXTRACT(YEAR FROM l.data)::INTEGER AS ano,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 1 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS jan,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 2 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS fev,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 3 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS mar,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 4 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS abr,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 5 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS mai,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 6 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS jun,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 7 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS jul,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 8 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS ago,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 9 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS set,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 10 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS out,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 11 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS nov,
    SUM(CASE WHEN EXTRACT(MONTH FROM l.data) = 12 THEN COALESCE(l.quantidade, l.horas, 0) ELSE 0 END) AS dez,
    SUM(COALESCE(l.quantidade, l.horas, 0)) AS total_ano
FROM public.atividades a
JOIN public.categorias_atividade c ON c.id = a.categoria_id
LEFT JOIN public.lancamentos l ON l.atividade_id = a.id
GROUP BY a.id, a.nome, a.tipo_medida, c.nome, EXTRACT(YEAR FROM l.data);

-- View: Produtividade e Totais por Usuário/Servidor
CREATE OR REPLACE VIEW public.vw_produtividade_usuarios AS
SELECT
    p.id AS usuario_id,
    p.nome_completo AS usuario_nome,
    p.email AS usuario_email,
    p.matricula_siape,
    e.id AS equipe_id,
    e.nome AS equipe_nome,
    EXTRACT(YEAR FROM l.data)::INTEGER AS ano,
    EXTRACT(MONTH FROM l.data)::INTEGER AS mes,
    COUNT(l.id) AS total_lancamentos,
    SUM(COALESCE(l.quantidade, 0)) AS total_quantidade,
    SUM(COALESCE(l.horas, 0)) AS total_horas
FROM public.lancamentos l
JOIN public.profiles p ON p.id = l.registrado_por
JOIN public.equipes e ON e.id = l.equipe_id
GROUP BY p.id, p.nome_completo, p.email, p.matricula_siape, e.id, e.nome, EXTRACT(YEAR FROM l.data), EXTRACT(MONTH FROM l.data);

-- ---------------------------------------------------------------------
-- 6. ROW LEVEL SECURITY (RLS)
-- ---------------------------------------------------------------------

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipe_membros ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categorias_atividade ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.equipe_atividades ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lancamentos ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.meses_fechados ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auditoria ENABLE ROW LEVEL SECURITY;

-- Funções auxiliares para RLS
CREATE OR REPLACE FUNCTION public.fn_is_admin()
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.profiles
        WHERE id = auth.uid() AND perfil = 'admin' AND ativo = true
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_user_teams()
RETURNS TABLE (equipe_id UUID) AS $$
    SELECT em.equipe_id
    FROM public.equipe_membros em
    WHERE em.profile_id = auth.uid();
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.fn_user_coordinated_teams()
RETURNS TABLE (equipe_id UUID) AS $$
    SELECT em.equipe_id
    FROM public.equipe_membros em
    WHERE em.profile_id = auth.uid() AND em.papel = 'coordenador';
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Políticas: PROFILES
CREATE POLICY "Profiles são visíveis por usuários autenticados"
    ON public.profiles FOR SELECT
    TO authenticated
    USING (ativo = true OR auth.uid() = id OR public.fn_is_admin());

CREATE POLICY "Usuários podem atualizar o próprio perfil"
    ON public.profiles FOR UPDATE
    TO authenticated
    USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Admin pode gerenciar todos os perfis"
    ON public.profiles FOR ALL
    TO authenticated
    USING (public.fn_is_admin());

-- Políticas: EQUIPES
CREATE POLICY "Equipes visíveis por membros ou gestores ou admin"
    ON public.equipes FOR SELECT
    TO authenticated
    USING (
        public.fn_is_admin() OR
        id IN (SELECT public.fn_user_teams()) OR
        ativo = true
    );

CREATE POLICY "Apenas admin gerencia equipes"
    ON public.equipes FOR ALL
    TO authenticated
    USING (public.fn_is_admin());

-- Políticas: EQUIPE_MEMBROS
CREATE POLICY "Membros visíveis para usuários autenticados"
    ON public.equipe_membros FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Apenas admin gerencia equipe_membros"
    ON public.equipe_membros FOR ALL
    TO authenticated
    USING (public.fn_is_admin());

-- Políticas: CATEGORIAS e ATIVIDADES
CREATE POLICY "Categorias visíveis para todos os autenticados"
    ON public.categorias_atividade FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Apenas admin gerencia categorias"
    ON public.categorias_atividade FOR ALL
    TO authenticated
    USING (public.fn_is_admin());

CREATE POLICY "Atividades visíveis para todos os autenticados"
    ON public.atividades FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Apenas admin gerencia atividades"
    ON public.atividades FOR ALL
    TO authenticated
    USING (public.fn_is_admin());

-- Políticas: EQUIPE_ATIVIDADES
CREATE POLICY "Equipe atividades visíveis por autenticados"
    ON public.equipe_atividades FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Apenas admin gerencia equipe_atividades"
    ON public.equipe_atividades FOR ALL
    TO authenticated
    USING (public.fn_is_admin());

-- Políticas: LANCAMENTOS
CREATE POLICY "Visualização de lançamentos por equipe e perfil"
    ON public.lancamentos FOR SELECT
    TO authenticated
    USING (
        public.fn_is_admin() OR
        equipe_id IN (SELECT public.fn_user_teams()) OR
        equipe_id IN (SELECT public.fn_user_coordinated_teams())
    );

CREATE POLICY "Inserção de lançamentos por membros da equipe"
    ON public.lancamentos FOR INSERT
    TO authenticated
    WITH CHECK (
        public.fn_is_admin() OR
        (
            equipe_id IN (SELECT public.fn_user_teams()) AND
            registrado_por = auth.uid() AND
            EXISTS (
                SELECT 1 FROM public.equipe_atividades ea
                WHERE ea.equipe_id = lancamentos.equipe_id AND ea.atividade_id = lancamentos.atividade_id
            )
        )
    );

CREATE POLICY "Edição de lançamentos por membros da equipe ou gestores"
    ON public.lancamentos FOR UPDATE
    TO authenticated
    USING (
        public.fn_is_admin() OR
        (
            equipe_id IN (SELECT public.fn_user_teams()) AND
            (registrado_por = auth.uid() OR equipe_id IN (SELECT public.fn_user_coordinated_teams()))
        )
    );

CREATE POLICY "Exclusão de lançamentos por membros ou gestores"
    ON public.lancamentos FOR DELETE
    TO authenticated
    USING (
        public.fn_is_admin() OR
        (
            equipe_id IN (SELECT public.fn_user_teams()) AND
            (registrado_por = auth.uid() OR equipe_id IN (SELECT public.fn_user_coordinated_teams()))
        )
    );

-- Políticas: MESES_FECHADOS
CREATE POLICY "Meses fechados visíveis por todos os autenticados"
    ON public.meses_fechados FOR SELECT
    TO authenticated
    USING (true);

CREATE POLICY "Apenas admin e coordenador da equipe podem fechar mês"
    ON public.meses_fechados FOR INSERT
    TO authenticated
    WITH CHECK (
        public.fn_is_admin() OR
        equipe_id IN (SELECT public.fn_user_coordinated_teams())
    );

CREATE POLICY "Apenas admin pode reabrir mês (excluir registro de fechamento)"
    ON public.meses_fechados FOR DELETE
    TO authenticated
    USING (public.fn_is_admin());

-- Políticas: AUDITORIA
CREATE POLICY "Auditoria visível apenas por administradores"
    ON public.auditoria FOR SELECT
    TO authenticated
    USING (public.fn_is_admin());
