-- =====================================================================
-- SisRH Atividades - Seed Inicial de Categorias e Catálogo de Atividades
-- =====================================================================

-- Inserção das Categorias Principais de RH
INSERT INTO public.categorias_atividade (id, nome, descricao, ordem) VALUES
    ('11111111-1111-1111-1111-111111111101', 'Folha de Pagamento', 'Operações em sistemas de pagamento, SIAPE, SIGEPE, AFD e financeiro', 10),
    ('11111111-1111-1111-1111-111111111102', 'Aposentados e Pensionistas', 'Atendimento e procedimentos para aposentados, pensionistas e prova de vida', 20),
    ('11111111-1111-1111-1111-111111111103', 'Processos e Tramitação', 'Movimentação e instrução processual em SEI, SGARH e sistemas de processos', 30),
    ('11111111-1111-1111-1111-111111111104', 'Atendimento ao Servidor', 'Atendimentos presenciais, remotos, esclarecimentos e correspondências', 40),
    ('11111111-1111-1111-1111-111111111105', 'Reuniões, Capacitação e PGD', 'Reuniões técnicas, comitês, alinhamentos, capacitações e gestão do PGD', 50),
    ('11111111-1111-1111-1111-111111111106', 'Contratos e Gestão', 'Fiscalização contratual, licitações, crachás e suporte institucional', 60)
ON CONFLICT (nome) DO NOTHING;

-- Catálogo Oficial de Atividades (Medidas em Quantidade)
INSERT INTO public.atividades (id, categoria_id, nome, descricao, tipo_medida, ativo, vigencia_inicio, ordem) VALUES
    (
        '22222222-2222-2222-2222-222222222101',
        '11111111-1111-1111-1111-111111111102',
        'Acompanhamento de pendências de prova de vida (aposentados/pensionistas)',
        'Controle, checagem e contato com beneficiários para regularização de prova de vida',
        'quantidade',
        true,
        '2024-01-01',
        1
    ),
    (
        '22222222-2222-2222-2222-222222222102',
        '11111111-1111-1111-1111-111111111102',
        'Atendimento presencial a aposentados/pensionistas (IRR ou prova de vida em residência)',
        'Atendimento presencial em balcão ou diligência domiciliar para prova de vida e orientações de IRR',
        'quantidade',
        true,
        '2024-01-01',
        2
    ),
    (
        '22222222-2222-2222-2222-222222222103',
        '11111111-1111-1111-1111-111111111101',
        'Inclusões e exclusões Fiosaúde',
        'Cadastramento, cancelamento e alterações de planos e dependentes no sistema de saúde suplementar',
        'quantidade',
        true,
        '2024-01-01',
        3
    ),
    (
        '22222222-2222-2222-2222-222222222104',
        '11111111-1111-1111-1111-111111111101',
        'Operações nos sistemas da folha (SIAPE, SIGEPE, AFD): operações financeiras, implantações, cadastros, relatórios, afastamentos',
        'Rotinas de fechamento, homologação e lançamentos sistêmicos na folha de pagamento federal',
        'quantidade',
        true,
        '2024-01-01',
        4
    ),
    (
        '22222222-2222-2222-2222-222222222105',
        '11111111-1111-1111-1111-111111111103',
        'Movimentação de processos (tramitação e emissão de declarações: SEI, SGARH, Módulos)',
        'Despacho, instrução, envio e recebimento de processos administrativos e emissão de declarações',
        'quantidade',
        true,
        '2024-01-01',
        5
    ),
    (
        '22222222-2222-2222-2222-222222222106',
        '11111111-1111-1111-1111-111111111104',
        'Requerimentos SIGEPE / SouGov',
        'Análise, deferimento, indeferimento e saneamento de requerimentos enviados pelos servidores via SouGov',
        'quantidade',
        true,
        '2024-01-01',
        6
    ),
    (
        '22222222-2222-2222-2222-222222222107',
        '11111111-1111-1111-1111-111111111101',
        'Progressões funcionais',
        'Análise de interstício, titulação, elaboração de portarias e lançamentos no SIAPE de progressão por mérito e capacitação',
        'quantidade',
        true,
        '2024-01-01',
        7
    ),
    (
        '22222222-2222-2222-2222-222222222108',
        '11111111-1111-1111-1111-111111111101',
        'RRA (análise de processos e emissão de declarações)',
        'Cálculo e formalização de Rendimentos Recebidos Acumuladamente e declarações fiscais',
        'quantidade',
        true,
        '2024-01-01',
        8
    ),
    (
        '22222222-2222-2222-2222-222222222109',
        '11111111-1111-1111-1111-111111111101',
        'Férias: alterações dentro e fora do prazo',
        'Homologação, reprogramação e ajuste de escalas de férias em conformidade com a legislação',
        'quantidade',
        true,
        '2024-01-01',
        9
    ),
    (
        '22222222-2222-2222-2222-222222222110',
        '11111111-1111-1111-1111-111111111104',
        'Atendimentos por e-mail e envio de comunicados',
        'Respostas formais a dúvidas de servidores, envio de informativos institucionais de RH',
        'quantidade',
        true,
        '2024-01-01',
        10
    ),
    (
        '22222222-2222-2222-2222-222222222111',
        '11111111-1111-1111-1111-111111111106',
        'Abertura/controle de processos de contratação de serviços e capacitação (Licitaweb)',
        'Instrução de Termos de Referência, controle de empenhos e contratações voltadas a RH',
        'quantidade',
        true,
        '2024-01-01',
        11
    ),
    (
        '22222222-2222-2222-2222-222222222112',
        '11111111-1111-1111-1111-111111111104',
        'Envio de correspondências',
        'Expedição de ofícios, cartas registradas com aviso de recebimento e notificações',
        'quantidade',
        true,
        '2024-01-01',
        12
    ),
    (
        '22222222-2222-2222-2222-222222222113',
        '11111111-1111-1111-1111-111111111101',
        'Lançamentos SGA RH',
        'Alimentação de histórico funcional e ocorrências no Sistema de Gestão Acadêmica/RH',
        'quantidade',
        true,
        '2024-01-01',
        13
    ),
    (
        '22222222-2222-2222-2222-222222222114',
        '11111111-1111-1111-1111-111111111105',
        'PGD: acompanhamento dos ciclos de trabalho',
        'Análise de planos de trabalho, entregas pactuadas e relatórios de avaliação no PGD',
        'quantidade',
        true,
        '2024-01-01',
        14
    ),
    (
        '22222222-2222-2222-2222-222222222115',
        '11111111-1111-1111-1111-111111111103',
        'Digitalização de processos físicos e tramitação no SEI',
        'Higienização, captura digital com OCR e inserção no SEI de acervos legados e pastas funcionais',
        'quantidade',
        true,
        '2024-01-01',
        15
    )
ON CONFLICT (id) DO NOTHING;

-- Catálogo Oficial de Atividades (Medidas em Horas)
INSERT INTO public.atividades (id, categoria_id, nome, descricao, tipo_medida, ativo, vigencia_inicio, ordem) VALUES
    (
        '33333333-3333-3333-3333-333333333201',
        '11111111-1111-1111-1111-111111111104',
        'Atendimento presencial personalizado (orientações sobre RRA, aposentadorias, averbações, aplicativos)',
        'Sessões de esclarecimento individualizado com simulações de aposentadoria e cálculos complexos',
        'horas',
        true,
        '2024-01-01',
        16
    ),
    (
        '33333333-3333-3333-3333-333333333202',
        '11111111-1111-1111-1111-111111111105',
        'Gerenciamento de conflitos',
        'Mediações e reuniões com equipes e chefias para pacificação e melhoria do clima de trabalho',
        'horas',
        true,
        '2024-01-01',
        17
    ),
    (
        '33333333-3333-3333-3333-333333333203',
        '11111111-1111-1111-1111-111111111105',
        'Reuniões, alinhamentos e capacitações',
        'Participação em comitês (ex: CDI, CPPD, CIS), alinhamentos técnicos internos e capacitações recebidas/ministradas',
        'horas',
        true,
        '2024-01-01',
        18
    ),
    (
        '33333333-3333-3333-3333-333333333204',
        '11111111-1111-1111-1111-111111111106',
        'Fiscalização de contratos (Empresa Valor e empresa de emissão de crachás)',
        'Acompanhamento da execução, glosas, ateste de faturas e reuniões com prepostos',
        'horas',
        true,
        '2024-01-01',
        19
    )
ON CONFLICT (id) DO NOTHING;

-- Equipes Iniciais do RH
INSERT INTO public.equipes (id, nome, descricao, sigla, ativo) VALUES
    ('44444444-4444-4444-4444-444444444301', 'Equipe de Folha e Benefícios', 'Responsável pelo processamento da folha SIAPE, Fiosaúde e adicionais', 'EFOLHA', true),
    ('44444444-4444-4444-4444-444444444302', 'Equipe de Aposentados e Atendimento', 'Equipe dedicada ao atendimento presencial e prova de vida', 'EAPOSENT', true),
    ('44444444-4444-4444-4444-444444444303', 'Renan e Josi (Gestão de Carreiras e SEI)', 'Dupla responsável por progressões funcionais, tramitações no SEI e PGD', 'E-RJ', true)
ON CONFLICT (id) DO NOTHING;

-- Atribuição Inicial de Atividades às Equipes
-- Vincula todas as atividades do catálogo às equipes correspondentes
INSERT INTO public.equipe_atividades (equipe_id, atividade_id)
SELECT e.id, a.id
FROM public.equipes e
CROSS JOIN public.atividades a
WHERE e.id = '44444444-4444-4444-4444-444444444301' 
  AND a.categoria_id IN ('11111111-1111-1111-1111-111111111101', '11111111-1111-1111-1111-111111111103', '11111111-1111-1111-1111-111111111105')
ON CONFLICT DO NOTHING;

INSERT INTO public.equipe_atividades (equipe_id, atividade_id)
SELECT e.id, a.id
FROM public.equipes e
CROSS JOIN public.atividades a
WHERE e.id = '44444444-4444-4444-4444-444444444302' 
  AND a.categoria_id IN ('11111111-1111-1111-1111-111111111102', '11111111-1111-1111-1111-111111111104', '11111111-1111-1111-1111-111111111105')
ON CONFLICT DO NOTHING;

INSERT INTO public.equipe_atividades (equipe_id, atividade_id)
SELECT e.id, a.id
FROM public.equipes e
CROSS JOIN public.atividades a
WHERE e.id = '44444444-4444-4444-4444-444444444303'
ON CONFLICT DO NOTHING;
