import {
    collection,
    doc,
    onSnapshot,
    setDoc,
    updateDoc,
    deleteDoc,
    addDoc,
    query,
    orderBy,
    serverTimestamp,
    Timestamp,
    getDocs
} from 'firebase/firestore';
import { db } from '../firebaseConfig';

export interface ScheduledCampaign {
    id: string;
    title: string;
    pushTitle: string;
    pushBody: string;
    emailSubject: string;
    emailPreview: string;
    emailHtml: string;
    targetDate: string; // 'YYYY-MM-DD'
    targetTime: string; // 'HH:mm'
    scheduledAt: Timestamp | Date;
    triggerReason: string;
    category: 'cívico' | 'segurança' | 'mobilidade' | 'infraestrutura' | 'comunidade' | 'institucional';
    channels: ('push' | 'email')[];
    deepLink?: string;
    status: 'SCHEDULED' | 'SENT' | 'PAUSED' | 'FAILED';
    sentAt?: Timestamp | Date;
    lastDispatchedBy?: string;
    stats?: {
        sentPush?: number;
        sentEmail?: number;
        openRate?: number;
    };
    createdAt: any;
    updatedAt?: any;
}

// ─── Default 10 Campaigns for Q4 2026 (including 28/09/2026 Test/Kickoff) ───
export const DEFAULT_Q4_CAMPAIGNS: Omit<ScheduledCampaign, 'id' | 'createdAt'>[] = [
    {
        title: "Abertura da Semana / Teste Ativo (28/09)",
        pushTitle: "🛡️ Sua voz transforma seu bairro esta semana!",
        pushBody: "Tem um buraco, lâmpada queimada ou foco de dengue perto de você? Registre em 30 segundos no Guardião e ajude sua comunidade.",
        emailSubject: "Sua cidade começa na sua calçada: Participe esta semana com o Guardião Nacional 🛡️",
        emailPreview: "Registre ocorrências, acompanhe soluções e ajude a transformar sua rua em um lugar mais seguro para todos.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Olá, Cidadão Guardião!</h2>
                <p>Uma nova semana se inicia e o seu bairro conta com a atenção de quem vive o dia a dia nele: <strong>você</strong>.</p>
                <div style="background: #f8fafc; border-left: 4px solid #3b82f6; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 15px; color: #334155;">
                        <strong>Você sabia?</strong> No Guardião Nacional, cada registro de iluminação, asfalto, entulho ou risco de enchente gera um protocolo georreferenciado com fotos reais que é consolidado para os órgãos municipais responsáveis.
                    </p>
                </div>
                <p>Viu algo irregular no trajeto para o trabalho ou na volta da escola? Abra o Guardião agora e colabore com a sua comunidade em menos de 1 minuto.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/report/new" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Fazer Registro Cidadão Agora →</a>
                </div>
                <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Juntos construímos cidades mais seguras, transparentes e eficientes.</p>
            </div>
        `,
        targetDate: "2026-09-28",
        targetTime: "12:00",
        scheduledAt: new Date("2026-09-28T15:00:00.000Z"), // 12:00 BRT
        triggerReason: "Validação imediata do sistema de engajamento e ativação comunitária de início de semana.",
        category: "comunidade",
        channels: ["push", "email"],
        deepLink: "guardiao://report/new",
        status: "SCHEDULED"
    },
    {
        title: "Reta Final Eleições 2026 - Conscientização do Voto",
        pushTitle: "🇧🇷 Reta final das Eleições: Você já escolheu seus candidatos?",
        pushBody: "Faltam apenas 3 dias para o 1º turno! Conheça propostas, confira seu local de votação e faça valer o seu poder de transformar.",
        emailSubject: "Reta Final das Eleições 2026: Consciência, propostas e o futuro do seu município 🗳️",
        emailPreview: "A poucos dias da votação, confira seu local de voto e reflita sobre as propostas para o seu bairro.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Reta Final para as Eleições 2026! 🇧🇷</h2>
                <p>Neste domingo, milhões de brasileiros irão às urnas. O voto não é apenas uma obrigação, é a maior ferramenta democrática de transformação da sua comunidade.</p>
                <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 15px; color: #1e40af;">
                        💡 <strong>Pesquise antes de decidir:</strong> Verifique o histórico dos candidatos, seus compromissos com a saúde, segurança, infraestrutura e transporte público da sua cidade.
                    </p>
                </div>
                <p>Aproveite estes dias para baixar o <strong>e-Título</strong>, confirmar sua zona e seção eleitoral e conversar com sua família sobre as prioridades do seu bairro.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/map" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Ver Demandas da Sua Cidade no Mapa →</a>
                </div>
                <p style="font-size: 13px; color: #64748b; margin-bottom: 0;">Vote consciente. A mudança começa na sua escolha!</p>
            </div>
        `,
        targetDate: "2026-10-01",
        targetTime: "10:00",
        scheduledAt: new Date("2026-10-01T13:00:00.000Z"), // 10:00 BRT
        triggerReason: "Início da reta final de 3 dias para a eleição: preparação, verificação de seção e reflexão cívica.",
        category: "cívico",
        channels: ["push", "email"],
        deepLink: "guardiao://map",
        status: "SCHEDULED"
    },
    {
        title: "Dia da Eleição: Antes e Depois do Voto (04/10)",
        pushTitle: "🗳️ Dia da Eleição: Seu papel não termina na urna!",
        pushBody: "Leve documento com foto e sua colinha. Depois de votar, conte com o Guardião para fiscalizar os eleitos e compartilhe o app com os vizinhos!",
        emailSubject: "Hoje é Dia de Votar: O que fazer ANTES e DEPOIS da urna 🗳️",
        emailPreview: "Documentos, colinha e o poder da fiscalização contínua com o Guardião Nacional.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Hoje é o Grande Dia: Democracia e Voz Ativa! 🇧🇷</h2>
                <p>As urnas já estão abertas em todo o Brasil (das <strong>08h às 17h</strong> pelo horário de Brasília). Preparamos um guia rápido do que fazer <strong>ANTES</strong> e <strong>DEPOIS</strong> de votar:</p>
                
                <!-- Bloco ANTES DO VOTO -->
                <div style="background: #f0fdf4; border-left: 4px solid #16a34a; padding: 16px; margin: 18px 0; border-radius: 6px;">
                    <h3 style="margin-top: 0; color: #15803d; font-size: 16px;">📋 1. ANTES DE ENTRAR NA CABINE:</h3>
                    <ul style="color: #166534; padding-left: 20px; font-size: 14px; margin-bottom: 0;">
                        <li><strong>Documento Oficial:</strong> Leve documento com foto (RG, CNH, Passaporte ou e-Título com biometria).</li>
                        <li><strong>Colinha em Papel:</strong> É proibido entrar com celular na cabine de votação! Anote os números dos candidatos num papel.</li>
                        <li><strong>Chegue Cedo:</strong> Evite filas e garanta seu direito com tranquilidade.</li>
                    </ul>
                </div>

                <!-- Bloco DEPOIS DO VOTO -->
                <div style="background: #eff6ff; border-left: 4px solid #2563eb; padding: 16px; margin: 18px 0; border-radius: 6px;">
                    <h3 style="margin-top: 0; color: #1d4ed8; font-size: 16px;">🔍 2. DEPOIS DA URNA: A CIDADANIA CONTINUA!</h3>
                    <p style="color: #1e40af; font-size: 14px; margin-bottom: 8px;">
                        O voto é apenas o primeiro passo. Quem governa precisa ser fiscalizado nos 365 dias do ano.
                    </p>
                    <ul style="color: #1e40af; padding-left: 20px; font-size: 14px; margin-bottom: 0;">
                        <li><strong>Fiscalize com o Guardião:</strong> Aponte buracos, falta de luz, postos sem remédios e obras paradas com fotos e geolocalização.</li>
                        <li><strong>Potencialize a voz da comunidade:</strong> Dados reais geram cobrança legítima e direta aos órgãos públicos.</li>
                        <li><strong>Espalhe essa força:</strong> Compartilhe o aplicativo com amigos, familiares e vizinhos no WhatsApp. Quanto mais guardiões no bairro, mais rápida é a resposta!</li>
                    </ul>
                </div>

                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/home" style="background: #2563eb; color: #ffffff; text-decoration: none; padding: 14px 32px; border-radius: 8px; font-weight: 700; font-size: 15px; display: inline-block;">Abrir o Guardião & Convidar Vizinhos →</a>
                </div>

                <p style="font-size: 13px; color: #64748b; text-align: center;">Juntos transformamos cada voto em compromisso e cada calçada em cidadania.</p>
            </div>
        `,
        targetDate: "2026-10-04",
        targetTime: "08:00",
        scheduledAt: new Date("2026-10-04T11:00:00.000Z"), // 08:00 BRT
        triggerReason: "Abertura dos portões no dia da eleição: orientação de voto consciente e convocação para fiscalização cidadã contínua.",
        category: "cívico",
        channels: ["push", "email"],
        deepLink: "guardiao://home",
        status: "SCHEDULED"
    },
    {
        title: "Feriadão de 12 de Outubro (Dia das Crianças)",
        pushTitle: "🛝 Praças e calçadas seguras para o feriadão das crianças?",
        pushBody: "Viu brinquedo quebrado ou iluminação precária na pracinha do bairro? Avise a comunidade e o poder público no Guardião.",
        emailSubject: "Feriadão com as crianças: Como ajudar a manter os espaços públicos seguros e bem cuidados 🛝",
        emailPreview: "Neste feriado do Dia das Crianças, faça um giro pela pracinha da sua região e registre itens que precisem de reparo.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Feriado de lazer com proteção e respeito aos pequenos!</h2>
                <p>Neste feriado de 12 de Outubro, famílias inteiras aproveitam praças, parques e calçadas para brincar e passear ao ar livre.</p>
                <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 14px 16px; margin: 18px 0; border-radius: 4px;">
                    <p style="margin: 0; font-size: 15px; color: #92400e;">
                        ⚠️ <strong>Fique atento:</strong> brinquedos enferrujados, buracos em pistas de skate, fiação exposta e falta de iluminação podem causar acidentes graves em crianças.
                    </p>
                </div>
                <p>Se você encontrar qualquer risco em praças ou áreas de lazer públicas do seu município, fotografe e registre no Guardião Nacional com a tag <em>Praça/Parque</em>.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/report/new?category=praca" style="background: #0284c7; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Registrar Ponto de Risco na Praça →</a>
                </div>
                <p style="font-size: 13px; color: #64748b;">Bom feriado e divirtam-se com segurança!</p>
            </div>
        `,
        targetDate: "2026-10-09",
        targetTime: "17:45",
        scheduledAt: new Date("2026-10-09T20:45:00.000Z"),
        triggerReason: "Véspera de feriadão familiar: momento de maior uso de praças e espaços públicos abertos.",
        category: "infraestrutura",
        channels: ["push", "email"],
        deepLink: "guardiao://report/new?category=praca",
        status: "SCHEDULED"
    },
    {
        title: "Dia dos Professores & Segurança Escolar",
        pushTitle: "📚 Travessia e calçadas seguras na porta das escolas",
        pushBody: "Faixa apagada ou semáforo quebrado em frente à escola da sua região? Registre agora e proteja nossos estudantes e educadores.",
        emailSubject: "Educação segura: Sinalização e travessia escolar no foco desta semana 📚",
        emailPreview: "No Dia dos Professores, nosso compromisso é com o caminho seguro de estudantes e mestres.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Homenagem aos Professores com Cidadania Prática</h2>
                <p>Neste 15 de Outubro, valorizamos os educadores cuidando do ambiente onde o futuro é construído.</p>
                <p>As rotas escolares precisam de faixas de pedestres visíveis, lombadas conservadas e calçadas acessíveis para que alunos e professores cheguem com dignidade e segurança.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/report/new?category=transito" style="background: #16a34a; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Fiscalizar Rota Escolar no Mapa →</a>
                </div>
            </div>
        `,
        targetDate: "2026-10-15",
        targetTime: "07:15",
        scheduledAt: new Date("2026-10-15T10:15:00.000Z"),
        triggerReason: "Dia dos Professores no horário exato de chegada às escolas matutinas.",
        category: "mobilidade",
        channels: ["push"],
        deepLink: "guardiao://report/new?category=transito",
        status: "SCHEDULED"
    },
    {
        title: "Dia do Servidor Público (28/10)",
        pushTitle: "🏛️ Dia do Servidor: Seu chamado chega direto à equipe certa!",
        pushBody: "Sabia que cada chamado no Guardião vai com geolocalização e foto direto para a secretaria responsável? Teste hoje.",
        emailSubject: "Como a tecnologia do Guardião Nacional acelera o trabalho dos servidores municipais 🏛️",
        emailPreview: "Descubra como seu chamado bem documentado ajuda os servidores a resolver demandas urbanas com muito mais agilidade.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Dia do Servidor Público: Cidadão e Gestão em Sinergia</h2>
                <p>Servidores públicos trabalham diariamente para manter a máquina urbana funcionando: da iluminação à coleta de resíduos e obras viárias.</p>
                <p>Quando você abre uma ocorrência no Guardião com fotos nítidas e localização precisa, o servidor não perde tempo procurando o endereço: o chamado vai mastigado com dados técnicos diretamente para a ordem de serviço.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/map" style="background: #475569; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Ver Mapa da Sua Cidade →</a>
                </div>
            </div>
        `,
        targetDate: "2026-10-28",
        targetTime: "12:30",
        scheduledAt: new Date("2026-10-28T15:30:00.000Z"),
        triggerReason: "Data cívica municipal que valoriza a integração entre cidadão e poder público.",
        category: "institucional",
        channels: ["push", "email"],
        deepLink: "guardiao://map",
        status: "SCHEDULED"
    },
    {
        title: "Véspera de Finados (Mutirão Iluminação)",
        pushTitle: "💡 Iluminação pública apagada perto da sua casa?",
        pushBody: "Ruas escuras trazem insegurança. Aponte postes apagados no mapa do Guardião para acelerar a manutenção.",
        emailSubject: "Mais luz, mais segurança: Mutirão de fiscalização de iluminação pública 💡",
        emailPreview: "Aponte postes apagados e lâmpadas piscando no seu trajeto noturno.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Operação Cidade Iluminada</h2>
                <p>Nesta época do ano, a movimentação noturna cresce e a iluminação pública é o principal fator inibidor de delitos e acidentes.</p>
                <p>Viu um poste apagado, lâmpada queimada ou fiação em curto? No Guardião você marca o ponto exato no mapa para a concessionária municipal restabelecer a luz.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/report/new?category=iluminacao" style="background: #eab308; color: #000000; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 700; display: inline-block;">Apontar Poste Apagado no Mapa →</a>
                </div>
            </div>
        `,
        targetDate: "2026-10-31",
        targetTime: "18:30",
        scheduledAt: new Date("2026-10-31T21:30:00.000Z"),
        triggerReason: "Início da noite e horário de acendimento das lâmpadas públicas.",
        category: "segurança",
        channels: ["push"],
        deepLink: "guardiao://report/new?category=iluminacao",
        status: "SCHEDULED"
    },
    {
        title: "Proclamação da República (15/11)",
        pushTitle: "🇧🇷 República é a 'Coisa Pública': O que você cuida hoje?",
        pushBody: "Cidadania se faz todos os dias. Veja o mapa de melhorias resolvidas na sua cidade e celebre o poder comunitário.",
        emailSubject: "15 de Novembro: A República que construímos juntos no nosso bairro 🇧🇷",
        emailPreview: "Cuidar da coisa pública é o verdadeiro significado de ser cidadão republicano. Veja o relatório de impacto.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Res Publica: A cidade pertence a todos nós</h2>
                <p>Hoje comemoramos a Proclamação da República. A palavra 'República' vem do latim e significa literalmente <em>bem comum, coisa do povo</em>.</p>
                <p>Cada vez que você usa o Guardião Nacional para zelar por uma calçada, um bueiro ou um poste de iluminação, você está exercendo a República na prática.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/map" style="background: #059669; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Acompanhar Ocorrências da Região →</a>
                </div>
            </div>
        `,
        targetDate: "2026-11-15",
        targetTime: "10:00",
        scheduledAt: new Date("2026-11-15T13:00:00.000Z"),
        triggerReason: "Feriado cívico nacional de forte apelo reflexivo sobre cidadania participativa.",
        category: "cívico",
        channels: ["push", "email"],
        deepLink: "guardiao://map",
        status: "SCHEDULED"
    },
    {
        title: "Black Friday & Vias Comerciais",
        pushTitle: "🛍️ Indo às compras? Atenção ao trânsito e calçadas comerciais",
        pushBody: "Identificou semáforo intermitente ou calçada inacessível nas vias comerciais? Registre para garantir a acessibilidade de todos.",
        emailSubject: "Acessibilidade e segurança no comércio de rua: Participe da fiscalização cidadã 🛍️",
        emailPreview: "A maior movimentação comercial do ano exige calçadas livres, semáforos funcionando e segurança viária.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Acessibilidade no Comércio de Rua</h2>
                <p>Nesta Black Friday, calçadas cheias e trânsito intenso desafiam idosos, cadeirantes e pedestres nos centros comerciais.</p>
                <p>Se você encontrar obstáculos irregulares em calçadas ou semáforos com defeito, reporte no Guardião para acionar a fiscalização viária do município.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/report/new?category=acessibilidade" style="background: #7c3aed; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Reportar Obstáculo ou Falha Viária →</a>
                </div>
            </div>
        `,
        targetDate: "2026-11-27",
        targetTime: "15:00",
        scheduledAt: new Date("2026-11-27T18:00:00.000Z"),
        triggerReason: "Pico de tráfego de pedestres em centros urbanos na Black Friday.",
        category: "mobilidade",
        channels: ["push"],
        deepLink: "guardiao://report/new?category=acessibilidade",
        status: "SCHEDULED"
    },
    {
        title: "Operação Chuvas de Verão (Prevenção)",
        pushTitle: "⛈️ Operação Chuvas: Alerta de bueiros entupidos e áreas de risco",
        pushBody: "Bueiro entupido causa enchente. Não espere a chuva forte: registre os pontos críticos hoje no Guardião.",
        emailSubject: "Prevenção às chuvas de verão: Identifique bueiros e pontos de alagamento antes da tempestade ⛈️",
        emailPreview: "Agir antes da tempestade salva vidas e patrimônio. Ajude no mapeamento preventivo.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Dezembro chegou: Atenção às Chuvas de Verão</h2>
                <p>Com o início da temporada de temporais de verão em todo o Brasil, a prevenção é o escudo mais eficaz que temos.</p>
                <p>Bueiros tomados por lixo, bocas de lobo obstruídas e encostas sem contenção são as maiores causas de alagamentos e deslizamentos urbanos.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/report/new?category=alagamento" style="background: #dc2626; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Registrar Ponto Crítico de Alagamento →</a>
                </div>
            </div>
        `,
        targetDate: "2026-12-02",
        targetTime: "14:00",
        scheduledAt: new Date("2026-12-02T17:00:00.000Z"),
        triggerReason: "Início do mês de dezembro e abertura da temporada climática de chuvas severas.",
        category: "segurança",
        channels: ["push", "email"],
        deepLink: "guardiao://report/new?category=alagamento",
        status: "SCHEDULED"
    },
    {
        title: "Véspera de Natal & Vizinhança Solidária",
        pushTitle: "🏡 Vai viajar nas festas? Rede de vizinhança atenta e unida",
        pushBody: "Deixe seu bairro mais seguro. Acompanhe alertas da sua região no Guardião e cuide da tranquilidade de todos.",
        emailSubject: "Boas Festas e Bairro Seguro: Como a união dos vizinhos protege sua comunidade nas férias 🏡",
        emailPreview: "Dicas de segurança para quem vai viajar e como manter a comunicação do bairro ativa.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Boas Festas com Paz e Comunidade Protegida!</h2>
                <p>O fim de ano é época de confraternizar com a família. Muitos viajam e residências ficam vazias, tornando o trabalho comunitário essencial.</p>
                <p>O Guardião Nacional conecta moradores e autoridades em tempo real. Se notar movimentações suspeitas ou vazamentos de água na rua, avise imediatamente no app.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/home" style="background: #0f766e; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Abrir Guardião Nacional →</a>
                </div>
            </div>
        `,
        targetDate: "2026-12-23",
        targetTime: "11:00",
        scheduledAt: new Date("2026-12-23T14:00:00.000Z"),
        triggerReason: "Semana de viagens de Natal e Réveillon: proteção residencial e união comunitária.",
        category: "comunidade",
        channels: ["push", "email"],
        deepLink: "guardiao://home",
        status: "SCHEDULED"
    },
    {
        title: "Réveillon 2027 & Retrospectiva Cidadã",
        pushTitle: "✨ Qual é o seu desejo de melhoria para sua cidade em 2027?",
        pushBody: "Centenas de melhorias foram conquistadas pela comunidade em 2026. Em 2027, conte com o Guardião em cada esquina.",
        emailSubject: "Retrospectiva Guardião 2026: Cada denúncia e cada vitória que transformou nossa cidade ✨",
        emailPreview: "Um ano de conquistas comunitárias: veja como a participação popular fez a diferença.",
        emailHtml: `
            <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; color: #1e293b; line-height: 1.6;">
                <h2 style="color: #0f172a; margin-top: 0; font-size: 20px;">Obrigado por ser um Guardião em 2026!</h2>
                <p>Neste final de ano, celebramos cada cidadão que não se conformou e fez questão de registrar melhorias para o bem de todos.</p>
                <p>Que 2027 traga ainda mais soluções, ruas limpas, praças seguras e uma gestão pública cada vez mais próxima de você.</p>
                <div style="text-align: center; margin: 28px 0;">
                    <a href="https://guardiaonacional.com/map" style="background: #1e293b; color: #ffffff; text-decoration: none; padding: 12px 28px; border-radius: 8px; font-weight: 600; display: inline-block;">Ver Retrospectiva no Mapa →</a>
                </div>
            </div>
        `,
        targetDate: "2026-12-30",
        targetTime: "16:00",
        scheduledAt: new Date("2026-12-30T19:00:00.000Z"),
        triggerReason: "Véspera de Ano Novo com gatilho de esperança, compromisso cívico e engajamento contínuo.",
        category: "institucional",
        channels: ["push"],
        deepLink: "guardiao://map",
        status: "SCHEDULED"
    }
];

export const scheduledCampaignService = {
    /**
     * Subscribes to the scheduled_campaigns collection in real-time.
     * If the collection is empty, automatically seeds DEFAULT_Q4_CAMPAIGNS.
     */
    subscribeCampaigns(callback: (campaigns: ScheduledCampaign[]) => void) {
        const campaignsRef = collection(db, 'scheduled_campaigns');
        const q = query(campaignsRef, orderBy('scheduledAt', 'asc'));

        return onSnapshot(q, async (snapshot) => {
            if (snapshot.empty) {
                // Auto seed on first load so SysAdmin has all 10 campaigns ready
                await scheduledCampaignService.seedCampaigns(false);
                return;
            }

            const list: ScheduledCampaign[] = snapshot.docs.map(docSnap => {
                const data = docSnap.data();
                return {
                    id: docSnap.id,
                    ...data,
                    scheduledAt: data.scheduledAt?.toDate ? data.scheduledAt.toDate() : (data.scheduledAt ? new Date(data.scheduledAt) : new Date()),
                    sentAt: data.sentAt?.toDate ? data.sentAt.toDate() : (data.sentAt ? new Date(data.sentAt) : undefined),
                    createdAt: data.createdAt?.toDate ? data.createdAt.toDate() : new Date(),
                } as ScheduledCampaign;
            });

            callback(list);
        }, (error) => {
            console.error('[ScheduledCampaignService] Erro no listener:', error);
        });
    },

    /**
     * Seeds or resets default campaigns in Firestore.
     */
    async seedCampaigns(force = false) {
        const campaignsRef = collection(db, 'scheduled_campaigns');
        if (!force) {
            const existing = await getDocs(campaignsRef);
            if (!existing.empty) return;
        }

        for (let i = 0; i < DEFAULT_Q4_CAMPAIGNS.length; i++) {
            const camp = DEFAULT_Q4_CAMPAIGNS[i];
            const customId = `q4_camp_${String(i).padStart(2, '0')}_${camp.targetDate}`;
            await setDoc(doc(db, 'scheduled_campaigns', customId), {
                ...camp,
                scheduledAt: Timestamp.fromDate(new Date(camp.scheduledAt)),
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp()
            }, { merge: true });
        }
    },

    /**
     * Toggles pause/scheduled state for a campaign.
     */
    async togglePauseCampaign(campaignId: string, currentStatus: string) {
        const newStatus = currentStatus === 'PAUSED' ? 'SCHEDULED' : 'PAUSED';
        await updateDoc(doc(db, 'scheduled_campaigns', campaignId), {
            status: newStatus,
            updatedAt: serverTimestamp()
        });
        return newStatus;
    },

    /**
     * Updates an existing campaign.
     */
    async updateCampaign(campaignId: string, data: Partial<ScheduledCampaign>) {
        const updateData: any = {
            ...data,
            updatedAt: serverTimestamp()
        };
        if (data.targetDate && data.targetTime) {
            // Recompute Timestamp
            const dateTimeStr = `${data.targetDate}T${data.targetTime}:00`;
            const dateObj = new Date(dateTimeStr);
            if (!isNaN(dateObj.getTime())) {
                updateData.scheduledAt = Timestamp.fromDate(dateObj);
            }
        }
        await updateDoc(doc(db, 'scheduled_campaigns', campaignId), updateData);
    },

    /**
     * Deletes a campaign.
     */
    async deleteCampaign(campaignId: string) {
        await deleteDoc(doc(db, 'scheduled_campaigns', campaignId));
    },

    /**
     * Triggers a campaign immediately on-demand ("Disparar Agora").
     * Writes to `messages` collection (triggering sendPushNotification in Cloud Functions)
     * and updates the campaign status to 'SENT'.
     */
    async triggerCampaignNow(campaign: ScheduledCampaign, adminUid?: string) {
        const messagePayload = {
            title: campaign.pushTitle,
            body: campaign.pushBody,
            plainText: campaign.pushBody,
            content: {
                title: campaign.emailSubject,
                body: campaign.emailHtml,
            },
            channels: campaign.channels,
            type: 'system_broadcast',
            tag: campaign.category,
            segment: 'all',
            filters: {
                isTargetAll: true,
                manualListExclusive: false
            },
            source: 'scheduled_campaign',
            campaignId: campaign.id,
            deepLink: campaign.deepLink || 'guardiao://home',
            createdAt: serverTimestamp(),
            status: 'pending'
        };

        // 1. Add to messages to fire Cloud Function
        const msgRef = await addDoc(collection(db, 'messages'), messagePayload);

        // 2. Mark campaign as SENT
        await updateDoc(doc(db, 'scheduled_campaigns', campaign.id), {
            status: 'SENT',
            sentAt: serverTimestamp(),
            lastDispatchedBy: adminUid || 'admin_manual',
            dispatchedMessageId: msgRef.id,
            updatedAt: serverTimestamp()
        });

        return msgRef.id;
    }
};
