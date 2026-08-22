/**
 * @fileoverview Catálogo de Templates Oficiais de Comunicação Municipal
 * Fornece modelos pré-formatados em 1 clique para agilizar a emissão de
 * comunicados, obras, vacinação e alertas da Defesa Civil pelos gestores públicos.
 */

export interface OfficialTemplate {
    id: string;
    category: 'TRANSITO_OBRAS' | 'SAUDE_VACINACAO' | 'DEFESA_CIVIL' | 'SANEAMENTO_ENERGIA' | 'EVENTOS_CULTURA' | 'SERVICOS_CIDADAO';
    title: string;
    icon: string;
    badgeText: string;
    defaultSubject: string;
    defaultBody: string;
    isEmergency?: boolean;
    defaultChannels: {
        push: boolean;
        internal: boolean;
        email: boolean;
        sms: boolean;
    };
}

export const OFFICIAL_COMMUNICATION_TEMPLATES: OfficialTemplate[] = [
    {
        id: 'tpl_obras_interdicao',
        category: 'TRANSITO_OBRAS',
        title: 'Interdição de Via / Obras Emergenciais',
        icon: '🚧',
        badgeText: 'Obras & Trânsito',
        defaultSubject: 'Interdição Temporária de Via para Obras de Infraestrutura',
        defaultBody: '<p>A <strong>Secretaria Municipal de Mobilidade Urbana e Obras</strong> informa que a via estará <strong>parcialmente/totalmente interditada</strong> para serviços de recapeamento e manutenção asfáltica.</p><p><strong>Previsão de Duração:</strong> Das 08h00 às 17h00.<br/><strong>Rotas Alternativas:</strong> Utilize os corredores vicinais sinalizados pelos agentes do Departamento de Trânsito.</p><p>Agradecemos a compreensão de todos para a melhoria da nossa cidade.</p>',
        isEmergency: false,
        defaultChannels: { push: true, internal: true, email: false, sms: false }
    },
    {
        id: 'tpl_saude_vacinacao',
        category: 'SAUDE_VACINACAO',
        title: 'Campanha de Vacinação & Saúde',
        icon: '💉',
        badgeText: 'Saúde Pública',
        defaultSubject: 'Campanha Municipal de Vacinação: Proteja sua Família',
        defaultBody: '<p>A <strong>Secretaria Municipal de Saúde</strong> convoca todos os munícipes para a <strong>Campanha de Imunização</strong>.</p><p><strong>Locais de Atendimento:</strong> Todas as Unidades Básicas de Saúde (UBS) do município, de segunda a sexta, das 07h às 19h.<br/><strong>Documentos Necessários:</strong> Documento oficial com foto, cartão do SUS e caderneta de vacinação.</p><p>Vacinas salvam vidas. Compareça à UBS mais próxima!</p>',
        isEmergency: false,
        defaultChannels: { push: true, internal: true, email: true, sms: false }
    },
    {
        id: 'tpl_defesa_civil_chuvas',
        category: 'DEFESA_CIVIL',
        title: 'Alerta Meteorológico & Risco de Alagamento',
        icon: '🌊',
        badgeText: 'Defesa Civil',
        defaultSubject: '🚨 ALERTA DEFESA CIVIL: Previsão de Chuvas Fortes e Rajadas de Vento',
        defaultBody: '<p>A <strong>Coordenadoria Municipal de Defesa Civil</strong> emite alerta de <strong>Atenção/Perigo</strong> para acumulados significativos de chuva nas próximas horas.</p><p><strong>Recomendações Importantes:</strong></p><ul><li>Evite transitar por vias alagadas ou próximas a córregos.</li><li>Não se abrigue debaixo de árvores durante tempestades e descargas elétricas.</li><li>Moradores de encostas: ao sinal de trincas ou movimentação de terra, evacue e ligue <strong>199</strong>.</li></ul><p>Emergências: <strong>Defesa Civil (199)</strong> ou <strong>Corpo de Bombeiros (193)</strong>.</p>',
        isEmergency: true,
        defaultChannels: { push: true, internal: true, email: false, sms: false }
    },
    {
        id: 'tpl_saneamento_agua',
        category: 'SANEAMENTO_ENERGIA',
        title: 'Interrupção Programada no Abastecimento de Água',
        icon: '💧',
        badgeText: 'Saneamento Básico',
        defaultSubject: 'Manutenção Preventiva na Rede de Distribuição de Água',
        defaultBody: '<p>Informamos que, devido a serviços de manutenção corretiva e preventiva na adutora de distribuição, o fornecimento de água poderá apresentar <strong>instabilidade temporária</strong> nos bairros informados.</p><p><strong>Início dos Trabalhos:</strong> 08h00.<br/><strong>Previsão de Normalização:</strong> Gradual a partir das 20h00 do mesmo dia.</p><p>Recomendamos o uso consciente do volume armazenado em caixas d’água durante o período.</p>',
        isEmergency: false,
        defaultChannels: { push: true, internal: true, email: false, sms: false }
    },
    {
        id: 'tpl_energia_poda',
        category: 'SANEAMENTO_ENERGIA',
        title: 'Poda Preventiva & Manutenção na Rede Elétrica',
        icon: '⚡',
        badgeText: 'Zeladoria Urbana',
        defaultSubject: 'Serviço de Poda Preventiva e Manutenção na Iluminação Pública',
        defaultBody: '<p>A equipe de <strong>Zeladoria Urbana e Meio Ambiente</strong> realizará a desobstrução e poda de galhos próximos à rede de alta tensão para evitar quedas e interrupções no fornecimento elétrico.</p><p>O trânsito local poderá operar em sistema de meia-pista durante a operação dos caminhões com cesto aéreo.</p>',
        isEmergency: false,
        defaultChannels: { push: true, internal: true, email: false, sms: false }
    },
    {
        id: 'tpl_combate_dengue',
        category: 'SAUDE_VACINACAO',
        title: 'Mutirão de Combate à Dengue & Zoonoses',
        icon: '🦟',
        badgeText: 'Vigilância em Saúde',
        defaultSubject: 'Mutirão Municipal contra o Mosquito Aedes aegypti',
        defaultBody: '<p>Os <strong>Agentes de Combate a Endemias</strong> estarão percorrendo as ruas do bairro neste sábado para vistoria de quintais, eliminação de criadouros e conscientização preventiva.</p><p>Receba bem os agentes devidamente uniformizados e identificados com crachá oficial da Prefeitura.</p><p><em>Dengue se combate todo dia. Não deixe água parada!</em></p>',
        isEmergency: false,
        defaultChannels: { push: true, internal: true, email: false, sms: false }
    },
    {
        id: 'tpl_audiencia_publica',
        category: 'SERVICOS_CIDADAO',
        title: 'Audiência Pública / Orçamento Participativo',
        icon: '🏛️',
        badgeText: 'Gestão Democrática',
        defaultSubject: 'Audiência Pública: Participe da Construção do Futuro do Município',
        defaultBody: '<p>A <strong>Prefeitura Municipal</strong> convida toda a população para a <strong>Audiência Pública de Prestação de Contas e Orçamento Participativo</strong>.</p><p><strong>Data & Horário:</strong> Próxima Quinta-Feira às 19h00.<br/><strong>Local:</strong> Plenário da Câmara Municipal com transmissão ao vivo pelos canais oficiais.</p><p>Sua voz é fundamental para definir as prioridades de investimento nos bairros.</p>',
        isEmergency: false,
        defaultChannels: { push: true, internal: true, email: true, sms: false }
    }
];
