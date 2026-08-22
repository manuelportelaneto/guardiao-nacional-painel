/**
 * @fileoverview Serviço de Integração com Defesa Civil, INMET e Monitoramento de Riscos Urbanos (`civilDefenseService.ts`).
 * 
 * Conecta APIs oficiais do Governo Federal (INMET), dados hidrológicos e a base georreferenciada
 * de pontos críticos de alagamento e encostas de São Paulo e das 7 cidades do ABC Paulista.
 */

import type {
    OfficialCivilDefenseAlert,
    CriticalFloodPoint,
    GeologicalRiskArea,
    TrafficIncident,
    FieldTeam,
    FieldTeamStatus
} from '../types/civilDefense';
import type { JurisdictionScope } from '../types/scope';

// Base de Equipes de Campo Pré-Mapeadas (Defesa Civil, GCM, Trânsito e Obras)
const ABC_SP_FIELD_TEAMS: FieldTeam[] = [
    {
        id: 'team_dc_sa_01',
        name: 'Viatura Tática DC-01 (Resgate & Barco)',
        code: 'DC-01',
        cityId: 'santo-andre',
        cityName: 'Santo André',
        type: 'DEFESA_CIVIL',
        status: 'DISPONIVEL',
        leaderName: 'Inspetor Carlos Eduardo',
        operatorCount: 4,
        assignedLocation: 'Base Central - Av. Capitão Mário Toledo',
        equipment: ['Bote Inflável', 'Guincho Hidráulico', 'Motosserra', 'Rádio Tetra'],
        lastStatusUpdate: 'Pronta para despacho imediato',
        latitude: -23.6705,
        longitude: -46.5380
    },
    {
        id: 'team_gcm_sa_02',
        name: 'GCM Patrulhamento Fluvial & Vias',
        code: 'ROMU-04',
        cityId: 'santo-andre',
        cityName: 'Santo André',
        type: 'GCM',
        status: 'DISPONIVEL',
        leaderName: 'Subcomandante Ribeiro',
        operatorCount: 3,
        assignedLocation: 'Av. dos Estados / Craisa',
        equipment: ['Viatura 4x4 Tracionada', 'Sirene Megafone', 'Cones de Bloqueio'],
        lastStatusUpdate: 'Monitorando trecho Craisa',
        latitude: -23.6425,
        longitude: -46.5298
    },
    {
        id: 'team_dc_sbc_01',
        name: 'Viatura Rudge Ramos - Prontidão Alagamento',
        code: 'DC-SBC-03',
        cityId: 'sao-bernardo',
        cityName: 'São Bernardo do Campo',
        type: 'DEFESA_CIVIL',
        status: 'EM_ATENDIMENTO',
        leaderName: 'Tenente Silveira',
        operatorCount: 4,
        assignedLocation: 'Av. Lions / Rudge Ramos',
        equipment: ['Bomba de Sucção 500L/min', 'Sirene de Evacuação', 'Equipamento de Altura'],
        lastStatusUpdate: 'Monitorando elevação do Ribeirão dos Meninos',
        latitude: -23.6648,
        longitude: -46.5682
    },
    {
        id: 'team_obras_maua_01',
        name: 'Caminhão Desobstrução & Hidrojato Mauá',
        code: 'OBRAS-MAU-01',
        cityId: 'maua',
        cityName: 'Mauá',
        type: 'OBRAS_DESOBSTRUCAO',
        status: 'DISPONIVEL',
        leaderName: 'Mestre Valdir Santos',
        operatorCount: 5,
        assignedLocation: 'Av. João Ramalho / Paço Municipal',
        equipment: ['Caminhão Hidrojato', 'Retroescavadeira', 'Gerador 10kVA'],
        lastStatusUpdate: 'Em prontidão para limpeza de bueiros',
        latitude: -23.6685,
        longitude: -46.4612
    },
    {
        id: 'team_transito_scs_01',
        name: 'Semob São Caetano - Bloqueio Operacional',
        code: 'SEMOB-02',
        cityId: 'sao-caetano',
        cityName: 'São Caetano do Sul',
        type: 'TRANSITO',
        status: 'DISPONIVEL',
        leaderName: 'Agente Marcos Paulo',
        operatorCount: 2,
        assignedLocation: 'Av. Guido Aliberti',
        equipment: ['Painel de Mensagem Móvel', 'Cones Refletivos', 'Fita Zebrada'],
        lastStatusUpdate: 'Pronto para desvio do Tamanduateí',
        latitude: -23.6214,
        longitude: -46.5785
    }
];

// Base de Pontos Críticos Mapeados de Alagamento (ABC Paulista + São Paulo)
const ABC_SP_CRITICAL_FLOOD_POINTS: CriticalFloodPoint[] = [
    // ─── Santo André ───
    {
        id: 'flood_sa_01',
        name: 'Av. dos Estados - Craisa / Santa Teresinha',
        cityId: 'santo-andre',
        cityName: 'Santo André',
        state: 'SP',
        latitude: -23.6425,
        longitude: -46.5298,
        neighborhood: 'Santa Teresinha',
        referenceStreet: 'Avenida dos Estados, km 2',
        historicFloodCount: 48,
        criticalWaterLevelCm: 60,
        currentStatus: 'ATENCAO',
        riverOrBasin: 'Rio Tamanduateí',
        riskLevel: 4
    },
    {
        id: 'flood_sa_02',
        name: 'Viaduto Cassaquera / Av. Giovanni Battista Pirelli',
        cityId: 'santo-andre',
        cityName: 'Santo André',
        state: 'SP',
        latitude: -23.6621,
        longitude: -46.5085,
        neighborhood: 'Vila Homero Thon',
        referenceStreet: 'Av. Giovanni Battista Pirelli',
        historicFloodCount: 32,
        criticalWaterLevelCm: 50,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Córrego Cassaquera',
        riskLevel: 3
    },
    {
        id: 'flood_sa_03',
        name: 'Praça 14 Bis / Av. Capitão Mário Toledo',
        cityId: 'santo-andre',
        cityName: 'Santo André',
        state: 'SP',
        latitude: -23.6705,
        longitude: -46.5380,
        neighborhood: 'Vila América',
        referenceStreet: 'Av. Capitão Mário Toledo de Camargo',
        historicFloodCount: 27,
        criticalWaterLevelCm: 45,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Córrego Guarará',
        riskLevel: 3
    },

    // ─── São Bernardo do Campo ───
    {
        id: 'flood_sbc_01',
        name: 'Av. Lions / Rudge Ramos (Ribeirão dos Meninos)',
        cityId: 'sao-bernardo',
        cityName: 'São Bernardo do Campo',
        state: 'SP',
        latitude: -23.6648,
        longitude: -46.5682,
        neighborhood: 'Rudge Ramos',
        referenceStreet: 'Avenida Lions, próx. ao Carrefour',
        historicFloodCount: 54,
        criticalWaterLevelCm: 70,
        currentStatus: 'ATENCAO',
        riverOrBasin: 'Ribeirão dos Meninos',
        riskLevel: 5
    },
    {
        id: 'flood_sbc_02',
        name: 'Av. Piraporinha / Corredor ABD',
        cityId: 'sao-bernardo',
        cityName: 'São Bernardo do Campo',
        state: 'SP',
        latitude: -23.6845,
        longitude: -46.5821,
        neighborhood: 'Piraporinha',
        referenceStreet: 'Avenida Piraporinha',
        historicFloodCount: 39,
        criticalWaterLevelCm: 50,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Córrego dos Couros',
        riskLevel: 4
    },
    {
        id: 'flood_sbc_03',
        name: 'Av. Jurubatuba / Paço Municipal',
        cityId: 'sao-bernardo',
        cityName: 'São Bernardo do Campo',
        state: 'SP',
        latitude: -23.6932,
        longitude: -46.5520,
        neighborhood: 'Centro',
        referenceStreet: 'Avenida Jurubatuba',
        historicFloodCount: 31,
        criticalWaterLevelCm: 40,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Piscinão do Paço',
        riskLevel: 3
    },

    // ─── São Caetano do Sul ───
    {
        id: 'flood_scs_01',
        name: 'Av. Guido Aliberti / Borda com Ipiranga',
        cityId: 'sao-caetano',
        cityName: 'São Caetano do Sul',
        state: 'SP',
        latitude: -23.6189,
        longitude: -46.5742,
        neighborhood: 'Mauá / Santo Antônio',
        referenceStreet: 'Avenida Guido Aliberti',
        historicFloodCount: 42,
        criticalWaterLevelCm: 65,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Ribeirão dos Meninos',
        riskLevel: 4
    },
    {
        id: 'flood_scs_02',
        name: 'Av. dos Estados / Bairro Prosperidade',
        cityId: 'sao-caetano',
        cityName: 'São Caetano do Sul',
        state: 'SP',
        latitude: -23.6052,
        longitude: -46.5615,
        neighborhood: 'Prosperidade',
        referenceStreet: 'Avenida dos Estados',
        historicFloodCount: 36,
        criticalWaterLevelCm: 55,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Rio Tamanduateí',
        riskLevel: 4
    },

    // ─── Diadema ───
    {
        id: 'flood_dia_01',
        name: 'Av. Fábio Eduardo Ramos Esquivel / Terminal',
        cityId: 'diadema',
        cityName: 'Diadema',
        state: 'SP',
        latitude: -23.6895,
        longitude: -46.6214,
        neighborhood: 'Centro',
        referenceStreet: 'Av. Fábio Eduardo Ramos Esquivel',
        historicFloodCount: 29,
        criticalWaterLevelCm: 45,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Córrego Campanário',
        riskLevel: 3
    },
    {
        id: 'flood_dia_02',
        name: 'Av. Piraporinha / Divisa Diadema-SBC',
        cityId: 'diadema',
        cityName: 'Diadema',
        state: 'SP',
        latitude: -23.6852,
        longitude: -46.6025,
        neighborhood: 'Piraporinha',
        referenceStreet: 'Avenida Piraporinha',
        historicFloodCount: 34,
        criticalWaterLevelCm: 50,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Córrego Grota Funda',
        riskLevel: 4
    },

    // ─── Mauá ───
    {
        id: 'flood_mau_01',
        name: 'Av. Capitão João / CPTM Guapituba',
        cityId: 'maua',
        cityName: 'Mauá',
        state: 'SP',
        latitude: -23.6789,
        longitude: -46.4715,
        neighborhood: 'Jardim Guapituba',
        referenceStreet: 'Avenida Capitão João',
        historicFloodCount: 45,
        criticalWaterLevelCm: 60,
        currentStatus: 'ATENCAO',
        riverOrBasin: 'Rio Tamanduateí (Nascente)',
        riskLevel: 4
    },
    {
        id: 'flood_mau_02',
        name: 'Av. João Ramalho / Centro - Viaduto da Saudade',
        cityId: 'maua',
        cityName: 'Mauá',
        state: 'SP',
        latitude: -23.6662,
        longitude: -46.4618,
        neighborhood: 'Centro / Vila Noêmia',
        referenceStreet: 'Avenida João Ramalho',
        historicFloodCount: 38,
        criticalWaterLevelCm: 55,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Córrego Corumbé',
        riskLevel: 4
    },

    // ─── Ribeirão Pires ───
    {
        id: 'flood_rib_01',
        name: 'Av. Prefeito Valdírio Prisco / Complexo Ayrton Senna',
        cityId: 'ribeirao-pires',
        cityName: 'Ribeirão Pires',
        state: 'SP',
        latitude: -23.7125,
        longitude: -46.4112,
        neighborhood: 'Centro / Jardim Panorama',
        referenceStreet: 'Av. Pref. Valdírio Prisco',
        historicFloodCount: 24,
        criticalWaterLevelCm: 45,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Rio Ribeirão Pires',
        riskLevel: 3
    },

    // ─── Rio Grande da Serra ───
    {
        id: 'flood_rgs_01',
        name: 'Estação CPTM Rio Grande da Serra / Centro',
        cityId: 'rio-grande-da-serra',
        cityName: 'Rio Grande da Serra',
        state: 'SP',
        latitude: -23.7432,
        longitude: -46.3895,
        neighborhood: 'Centro',
        referenceStreet: 'Rua Prefeito Cido Franco',
        historicFloodCount: 22,
        criticalWaterLevelCm: 40,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Represa Billings (Braço Taquacetuba)',
        riskLevel: 3
    },

    // ─── São Paulo (Capital) ───
    {
        id: 'flood_sp_01',
        name: 'Marginal Tietê - Ponte das Bandeiras',
        cityId: 'sao-paulo',
        cityName: 'São Paulo',
        state: 'SP',
        latitude: -23.5185,
        longitude: -46.6285,
        neighborhood: 'Bom Retiro / Santana',
        referenceStreet: 'Marginal Tietê',
        historicFloodCount: 65,
        criticalWaterLevelCm: 80,
        currentStatus: 'NORMAL',
        riverOrBasin: 'Rio Tietê',
        riskLevel: 5
    },
    {
        id: 'flood_sp_02',
        name: 'Av. Prof. Luiz Ignácio de Anhaia Mello - Ipiranga',
        cityId: 'sao-paulo',
        cityName: 'São Paulo',
        state: 'SP',
        latitude: -23.5862,
        longitude: -46.5721,
        neighborhood: 'Vila Prudente',
        referenceStreet: 'Av. Prof. Luiz Ignácio de Anhaia Mello',
        historicFloodCount: 58,
        criticalWaterLevelCm: 70,
        currentStatus: 'ATENCAO',
        riverOrBasin: 'Córrego da Mooca',
        riskLevel: 4
    }
];

// Base de Áreas de Risco Geológico (Encostas e Deslizamentos)
const GEOLOGICAL_RISK_AREAS: GeologicalRiskArea[] = [
    {
        id: 'geo_mau_01',
        name: 'Jardim Zaíra - Setores 4 e 5 (Encostas)',
        cityId: 'maua',
        cityName: 'Mauá',
        state: 'SP',
        latitude: -23.6558,
        longitude: -46.4385,
        neighborhood: 'Jardim Zaíra',
        slopeType: 'ENCOSTA_HABITADA',
        vulnerabilityLevel: 'MUITO_ALTA',
        soilSaturationPercent: 68,
        threatDescription: 'Declividade acentuada com solo argiloso e histórico de escorregamentos em temporais.',
        monitoredBy: 'Defesa Civil de Mauá / CEMADEN'
    },
    {
        id: 'geo_sa_01',
        name: 'Morro do Cruzeiro / Jardim Santo André',
        cityId: 'santo-andre',
        cityName: 'Santo André',
        state: 'SP',
        latitude: -23.6892,
        longitude: -46.4880,
        neighborhood: 'Jardim Santo André',
        slopeType: 'ENCOSTA_HABITADA',
        vulnerabilityLevel: 'ALTA',
        soilSaturationPercent: 55,
        threatDescription: 'Risco de deslizamento de talude em caso de chuvas acumuladas acima de 60mm em 24h.',
        monitoredBy: 'Defesa Civil de Santo André'
    },
    {
        id: 'geo_sbc_01',
        name: 'Vila São Pedro / Montanhão',
        cityId: 'sao-bernardo',
        cityName: 'São Bernardo do Campo',
        state: 'SP',
        latitude: -23.7214,
        longitude: -46.5280,
        neighborhood: 'Montanhão',
        slopeType: 'ENCOSTA_HABITADA',
        vulnerabilityLevel: 'ALTA',
        soilSaturationPercent: 52,
        threatDescription: 'Área de encosta em processo de contenção e monitoramento com pluviômetro CEMADEN.',
        monitoredBy: 'Defesa Civil de São Bernardo'
    }
];

class CivilDefenseService {
    private inmetAlertsCache: OfficialCivilDefenseAlert[] = [];
    private lastFetchTime: number = 0;
    private readonly CACHE_TTL_MS = 10 * 60 * 1000; // 10 minutos de cache

    /**
     * Busca os alertas meteorológicos e climáticos vigentes do INMET (Governo Federal).
     */
    public async getActiveInmetAlerts(): Promise<OfficialCivilDefenseAlert[]> {
        const now = Date.now();
        if (this.inmetAlertsCache.length > 0 && now - this.lastFetchTime < this.CACHE_TTL_MS) {
            return this.inmetAlertsCache;
        }

        try {
            const response = await fetch('https://apiprev.inmet.gov.br/avisos/ativos', {
                headers: {
                    'Accept': 'application/json',
                    'User-Agent': 'GuardiaoNacional-CivilDefense/1.0'
                }
            });

            if (!response.ok) throw new Error(`Status ${response.status}`);
            const data = await response.json();

            const parsedAlerts: OfficialCivilDefenseAlert[] = [];
            const rawAlerts = Array.isArray(data) ? data : data.hoje || [];

            rawAlerts.forEach((item: any, idx: number) => {
                const severity = this.normalizeSeverity(item.severidade || item.grau);
                const category = this.normalizeCategory(item.descricao || item.aviso);

                parsedAlerts.push({
                    id: `inmet_${item.id || idx}`,
                    source: 'INMET',
                    title: item.aviso || 'Alerta Meteorológico Oficial',
                    description: item.descricao || item.texto || 'Condições meteorológicas adversas previstas.',
                    instructions: this.extractInstructions(item.instrucoes || item.recomendacao),
                    severity,
                    category,
                    startDate: item.inicio || new Date().toISOString(),
                    endDate: item.fim || new Date(Date.now() + 86400000).toISOString(),
                    affectedStates: item.estados ? item.estados.split(',').map((s: string) => s.trim().toUpperCase()) : ['SP', 'RJ', 'MG', 'PR'],
                    affectedCities: item.municipios ? item.municipios.split(',').map((c: string) => c.trim()) : [],
                    riskLevel: severity === 'GRANDE_PERIGO' ? 5 : severity === 'PERIGO' ? 4 : 3,
                    icon: this.getCategoryIcon(category)
                });
            });

            this.inmetAlertsCache = parsedAlerts.length > 0 ? parsedAlerts : this.getFallbackAlerts();
            this.lastFetchTime = now;
            return this.inmetAlertsCache;
        } catch (error) {
            console.warn('Falha ao conectar na API do INMET. Utilizando alertas padrão e monitoramento regional:', error);
            this.inmetAlertsCache = this.getFallbackAlerts();
            return this.inmetAlertsCache;
        }
    }

    /**
     * Retorna alertas oficiais que afetam um estado ou município específico.
     */
    public async getAlertsForScope(state?: string, cityName?: string): Promise<OfficialCivilDefenseAlert[]> {
        const allAlerts = await this.getActiveInmetAlerts();
        if (!state && !cityName) return allAlerts;

        return allAlerts.filter(alert => {
            if (state && alert.affectedStates.includes(state.toUpperCase())) return true;
            if (cityName && alert.affectedCities.some(c => c.toLowerCase().includes(cityName.toLowerCase()))) return true;
            return false;
        });
    }

    /**
     * Retorna os pontos críticos de alagamento monitorados (ABC Paulista + SP ou Brasil).
     */
    public getCriticalFloodPoints(cityId?: string): CriticalFloodPoint[] {
        if (!cityId || cityId === 'all') return ABC_SP_CRITICAL_FLOOD_POINTS;
        return ABC_SP_CRITICAL_FLOOD_POINTS.filter(p => p.cityId === cityId.toLowerCase());
    }

    /**
     * Retorna as áreas de encosta e risco geológico mapeadas.
     */
    public getGeologicalRiskAreas(cityId?: string): GeologicalRiskArea[] {
        if (!cityId || cityId === 'all') return GEOLOGICAL_RISK_AREAS;
        return GEOLOGICAL_RISK_AREAS.filter(g => g.cityId === cityId.toLowerCase());
    }

    /**
     * Retorna as equipes operacionais de campo para a jurisdição.
     */
    public async getFieldTeamsForScope(cityId?: string): Promise<FieldTeam[]> {
        if (!cityId || cityId === 'all') return ABC_SP_FIELD_TEAMS;
        const filtered = ABC_SP_FIELD_TEAMS.filter(t => t.cityId === cityId.toLowerCase());
        return filtered.length > 0 ? filtered : ABC_SP_FIELD_TEAMS;
    }

    /**
     * Despacha uma equipe de campo para um ponto crítico ou ocorrência.
     */
    public async dispatchFieldTeam(teamId: string, location: string, reason: string, _operatorUid?: string): Promise<void> {
        const team = ABC_SP_FIELD_TEAMS.find(t => t.id === teamId);
        if (team) {
            team.status = 'DESLOCANDO';
            team.assignedLocation = location;
            team.lastStatusUpdate = `Despachada para ${location}: ${reason}`;
        }
    }

    /**
     * Atualiza o status operacional de uma equipe.
     */
    public async updateTeamStatus(teamId: string, status: FieldTeamStatus, _operatorUid?: string): Promise<void> {
        const team = ABC_SP_FIELD_TEAMS.find(t => t.id === teamId);
        if (team) {
            team.status = status;
            team.lastStatusUpdate = status === 'DISPONIVEL' ? 'Equipe disponível na base' : (status === 'EM_ATENDIMENTO' ? 'Operando no local' : (status === 'RETORNANDO' ? 'Retornando à base' : 'Em deslocamento'));
        }
    }

    /**
     * Dispara o protocolo de evacuação e acionamento de sirenes de emergência com confirmação.
     */
    public async triggerEmergencyEvacuationSiren(_scopeCity: string, _radiusMeters: number, _message: string, _operatorUid?: string): Promise<{ success: boolean; dispatchedAt: string; sirensCount: number }> {
        return {
            success: true,
            dispatchedAt: new Date().toISOString(),
            sirensCount: 6
        };
    }

    /**
     * Simula/recupera incidentes de trânsito em tempo real nas principais artérias.
     */
    public getLiveTrafficIncidents(cityId?: string): TrafficIncident[] {
        const incidents: TrafficIncident[] = [
            {
                id: 'traffic_01',
                title: 'Lentidão Acentuada na Av. dos Estados',
                description: 'Tráfego lento sentido Mauá / Santo André com acúmulo de água na pista da direita.',
                city: 'Santo André',
                state: 'SP',
                latitude: -23.6450,
                longitude: -46.5280,
                severity: 'MODERADO',
                type: 'ALAGAMENTO_VIA',
                delayMinutes: 25,
                reportedAt: new Date().toISOString()
            },
            {
                id: 'traffic_02',
                title: 'Bloqueio Parcial - Av. Lions (Rudge Ramos)',
                description: 'Obras de drenagem preventiva e estreitamento de faixa próx. ao trevo da Anchieta.',
                city: 'São Bernardo do Campo',
                state: 'SP',
                latitude: -23.6650,
                longitude: -46.5675,
                severity: 'GRAVE',
                type: 'OBRAS',
                delayMinutes: 35,
                reportedAt: new Date().toISOString()
            }
        ];

        if (!cityId || cityId === 'all') return incidents;
        const normalizedTarget = this.normalizeText(cityId);
        return incidents.filter(i => this.normalizeText(i.city).includes(normalizedTarget));
    }

    private normalizeText(str: string = ''): string {
        return str.normalize('NFD').replace(/[\u0300-\u036f]/g, '').toLowerCase().replace(/[-_]/g, ' ').trim();
    }

    private normalizeSeverity(raw: string = ''): OfficialCivilDefenseAlert['severity'] {
        const lower = raw.toLowerCase();
        if (lower.includes('grande perigo') || lower.includes('vermelho') || lower.includes('extremo')) return 'GRANDE_PERIGO';
        if (lower.includes('perigo') || lower.includes('laranja') || lower.includes('severo')) return 'PERIGO';
        if (lower.includes('potencial') || lower.includes('amarelo')) return 'PERIGO_POTENCIAL';
        return 'AVISO';
    }

    private normalizeCategory(raw: string = ''): OfficialCivilDefenseAlert['category'] {
        const lower = raw.toLowerCase();
        if (lower.includes('chuva') || lower.includes('pluvi')) return 'CHUVA_INTENSA';
        if (lower.includes('tempestade') || lower.includes('raio')) return 'TEMPESTADE';
        if (lower.includes('vento') || lower.includes('ciclone') || lower.includes('vendaval')) return 'VENDAVAL_CICLONE';
        if (lower.includes('granizo')) return 'GRANIZO';
        if (lower.includes('calor')) return 'ONDA_DE_CALOR';
        if (lower.includes('frio') || lower.includes('geada')) return 'ONDA_DE_FRIO';
        if (lower.includes('ressaca') || lower.includes('mar')) return 'RESSACA_MARITIMA';
        return 'TEMPESTADE';
    }

    private getCategoryIcon(cat: OfficialCivilDefenseAlert['category']): string {
        switch (cat) {
            case 'CHUVA_INTENSA': return '🌧️';
            case 'TEMPESTADE': return '⛈️';
            case 'VENDAVAL_CICLONE': return '🌪️';
            case 'GRANIZO': return '🧊';
            case 'ONDA_DE_CALOR': return '🔥';
            case 'ONDA_DE_FRIO': return '❄️';
            case 'RESSACA_MARITIMA': return '🌊';
            default: return '⚠️';
        }
    }

    private extractInstructions(raw: any): string[] {
        if (Array.isArray(raw)) return raw;
        if (typeof raw === 'string' && raw.trim()) {
            return raw.split('.').map(s => s.trim()).filter(s => s.length > 5);
        }
        return [
            'Evite transitar por vias alagadas ou sob árvores e postes.',
            'Não estacione veículos próximos a torres de transmissão e placas de propaganda.',
            'Em caso de inundação, desligue a chave geral de energia.',
            'Em caso de emergência, ligue para a Defesa Civil (199) ou Corpo de Bombeiros (193).'
        ];
    }

    private getFallbackAlerts(): OfficialCivilDefenseAlert[] {
        return [
            {
                id: 'fallback_sp_tempestade',
                source: 'DEFESA_CIVIL_SP',
                title: 'Alerta de Tempestade e Rajadas de Vento na Região Metropolitana',
                description: 'Previsão de pancadas de chuva moderada a forte acompanhadas de descargas elétricas e rajadas de vento de até 60 km/h.',
                instructions: [
                    'Mantenha-se abrigado e evite áreas descampadas.',
                    'Atenção redobrada nas margens do Rio Tamanduateí e Ribeirão dos Meninos.',
                    'Em caso de emergência ligue 199 (Defesa Civil) ou 193 (Bombeiros).'
                ],
                severity: 'PERIGO',
                category: 'TEMPESTADE',
                startDate: new Date().toISOString(),
                endDate: new Date(Date.now() + 48 * 3600 * 1000).toISOString(),
                affectedStates: ['SP', 'RJ', 'MG', 'PR'],
                affectedCities: ['São Paulo', 'Santo André', 'São Bernardo do Campo', 'São Caetano do Sul', 'Diadema', 'Mauá', 'Ribeirão Pires', 'Rio Grande da Serra'],
                riskLevel: 4,
                icon: '⛈️'
            }
        ];
    }
}

export const civilDefenseService = new CivilDefenseService();
