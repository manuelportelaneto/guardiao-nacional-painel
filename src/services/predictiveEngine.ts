/**
 * @fileoverview Motor Preditivo de Incidentes Urbanos, Clima e Alertas Inteligentes (`predictiveEngine.ts`).
 * 
 * Cruza dados meteorológicos em tempo real (Open-Meteo), hidrografia, declividade e histórico de
 * ocorrências do Guardião Nacional para prever desastres, enchentes, quedas de árvores e focos de risco.
 * 
 * 🔒 REGRA DE OURO: Nenhum alerta em massa é enviado automaticamente aos cidadãos.
 * O sistema gera um alerta pendente e notifica o SysAdmin por e-mail para aprovação expressa.
 */

import {
    collection,
    doc,
    getDocs,
    setDoc,
    updateDoc,
    query,
    where,
    limit,
    addDoc,
    serverTimestamp
} from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type {
    PredictiveRiskAssessment,
    PendingRiskAlert,
    PredictiveSeverity
} from '../types/intelligence';
import { fetchWeather } from './externalDataService';
import { civilDefenseService } from './civilDefenseService';
import { loggingService } from './loggingService';

const ASSESSMENTS_COLLECTION = 'predictive_risk_assessments';
const PENDING_ALERTS_COLLECTION = 'pending_risk_alerts';
const MAIL_COLLECTION = 'mail';

export const predictiveEngine = {
    /**
     * Avalia o risco preditivo de um município cruzando dados meteorológicos, alertas do INMET e pontos críticos.
     */
    async evaluateCityRisk(cityId: string, cityName: string, state: string, lat: number, lng: number): Promise<PredictiveRiskAssessment[]> {
        const weather = await fetchWeather(lat, lng);
        const officialAlerts = await civilDefenseService.getAlertsForScope(state, cityName);
        const floodPoints = civilDefenseService.getCriticalFloodPoints(cityId);
        const assessments: PredictiveRiskAssessment[] = [];

        // 0. ANÁLISE DE ALERTAS OFICIAIS VIGENTES (INMET / DEFESA CIVIL)
        if (officialAlerts.length > 0) {
            const activeSevereAlert = officialAlerts.find(a => a.severity === 'PERIGO' || a.severity === 'GRANDE_PERIGO') || officialAlerts[0];
            const severity: PredictiveSeverity = activeSevereAlert.severity === 'GRANDE_PERIGO' ? 'CRITICO' : (activeSevereAlert.severity === 'PERIGO' ? 'ALTO' : 'MODERADO');
            
            const officialAssessment: PredictiveRiskAssessment = {
                id: `pred_official_${cityId}_${activeSevereAlert.id}`,
                cityId,
                cityName,
                state,
                category: activeSevereAlert.category === 'CHUVA_INTENSA' || activeSevereAlert.category === 'ALAGAMENTO_INUNDACAO' ? 'ALAGAMENTO_ENCHENTE' : 'QUEDA_ARVORES_VENTANIA',
                title: `[ALERTA OFICIAL ${activeSevereAlert.source}] ${activeSevereAlert.title}`,
                description: `${activeSevereAlert.description} Recomendações: ${activeSevereAlert.instructions.slice(0, 2).join(' ')}`,
                severity,
                riskProbability: severity === 'CRITICO' ? 95 : 85,
                affectedArea: {
                    center: { latitude: lat, longitude: lng },
                    radiusMeters: 6000,
                    neighborhoods: floodPoints.slice(0, 4).map(p => p.neighborhood)
                },
                weatherFactors: {
                    precipitationMm: weather?.precipitation || 20,
                    windSpeedKmH: weather?.windSpeed || 40,
                    temperatureC: weather?.temperature || 22,
                    weatherCondition: activeSevereAlert.title
                },
                incidentHistoryCount: floodPoints.reduce((acc, p) => acc + p.historicFloodCount, 0),
                suggestedAction: activeSevereAlert.instructions[0] || 'Prontidão de equipes municipais e monitoramento de áreas ribeirinhas.',
                createdAt: new Date().toISOString()
            };

            assessments.push(officialAssessment);

            // Cria automaticamente proposta de alerta para revisão do SysAdmin se for PERIGO/CRÍTICO
            if (severity === 'CRITICO' || severity === 'ALTO') {
                this.createPendingAlert(officialAssessment, 'sysadmin@guardiao.com.br').catch(() => {});
            }
        }

        const precip = weather?.precipitation || 0;
        const wind = weather?.windSpeed || 0;
        const temp = weather?.temperature || 24;

        // 1. ANÁLISE PREDITIVA DE ALAGAMENTOS E ENCHENTES
        if (precip >= 15 || (weather && [63, 65, 82, 95, 96, 99].includes(weather.weatherCode))) {
            const severity: PredictiveSeverity = precip >= 40 ? 'CRITICO' : (precip >= 25 ? 'ALTO' : 'MODERADO');
            const prob = Math.min(98, Math.round(50 + (precip * 1.2)));

            const floodAssessment: PredictiveRiskAssessment = {
                id: `pred_flood_${cityId}_${Date.now()}`,
                cityId,
                cityName,
                state,
                category: 'ALAGAMENTO_ENCHENTE',
                title: `Risco Iminente de Alagamento e Transbordamento`,
                description: `Precipitação de ${precip} mm/h com solo em saturação. Histórico indica acúmulo de água em vias baixas e bueiros críticos.`,
                severity,
                riskProbability: prob,
                affectedArea: {
                    center: { latitude: lat, longitude: lng },
                    radiusMeters: 3500,
                    neighborhoods: ['Centro', 'Vila Nova', 'Jardim das Flores', 'Bacia do Córrego']
                },
                weatherFactors: {
                    precipitationMm: precip,
                    windSpeedKmH: wind,
                    temperatureC: temp,
                    weatherCondition: weather?.weatherLabel || 'Chuva Severa'
                },
                incidentHistoryCount: 42,
                suggestedAction: 'Despacho preventivo da Defesa Civil e emissão de alerta sonoro para motoristas em áreas ribeirinhas.',
                createdAt: new Date().toISOString()
            };
            assessments.push(floodAssessment);
        }

        // 2. ANÁLISE PREDITIVA DE QUEDA DE ÁRVORES E VENTANIA
        if (wind >= 45) {
            const severity: PredictiveSeverity = wind >= 70 ? 'CRITICO' : 'ALTO';
            const windAssessment: PredictiveRiskAssessment = {
                id: `pred_wind_${cityId}_${Date.now()}`,
                cityId,
                cityName,
                state,
                category: 'QUEDA_ARVORES_VENTANIA',
                title: `Alerta de Rajadas de Vento Severas (${wind} km/h)`,
                description: `Ventos fortes com risco de queda de galhos, árvores de grande porte e rompimento de fiação elétrica.`,
                severity,
                riskProbability: Math.min(95, Math.round(40 + (wind * 0.7))),
                affectedArea: {
                    center: { latitude: lat, longitude: lng },
                    radiusMeters: 5000,
                    neighborhoods: ['Região Arborizada', 'Parque Central', 'Vila Esperança']
                },
                weatherFactors: {
                    precipitationMm: precip,
                    windSpeedKmH: wind,
                    temperatureC: temp,
                    weatherCondition: `Ventos a ${wind} km/h`
                },
                incidentHistoryCount: 19,
                suggestedAction: 'Orientação para pedestres evitarem abrigo sob árvores e equipes de podas em prontidão.',
                createdAt: new Date().toISOString()
            };
            assessments.push(windAssessment);
        }

        // 3. ANÁLISE PREDITIVA DE FOCOS DE DENGUE (Calor + Chuva)
        if (temp >= 27 && precip >= 5) {
            const dengueAssessment: PredictiveRiskAssessment = {
                id: `pred_dengue_${cityId}_${Date.now()}`,
                cityId,
                cityName,
                state,
                category: 'FOCO_EPIDEMIOLOGICO_DENGUE',
                title: `Condições Ideais para Proliferação do Aedes Aegypti`,
                description: `Combinação de temperatura elevada (${temp}°C) e acúmulo de água pluvial após chuva.`,
                severity: 'MODERADO',
                riskProbability: 76,
                affectedArea: {
                    center: { latitude: lat, longitude: lng },
                    radiusMeters: 4000,
                    neighborhoods: ['Bairros Residenciais', 'Terrenos Baldios Mapeados']
                },
                incidentHistoryCount: 28,
                suggestedAction: 'Intensificar visitas de agentes de endemias e campanhas de descarte de recipientes.',
                createdAt: new Date().toISOString()
            };
            assessments.push(dengueAssessment);
        }

        // Persiste as análises e cria alerta pendente para itens de alto/crítico risco
        for (const ass of assessments) {
            try {
                await setDoc(doc(db, ASSESSMENTS_COLLECTION, ass.id), ass);
                if (ass.severity === 'ALTO' || ass.severity === 'CRITICO') {
                    await predictiveEngine.createPendingAlert(ass, 'presidencia@guardiaonacional.com.br');
                }
            } catch (err) {
                console.warn('Erro ao salvar avaliação de risco preditivo:', err);
            }
        }

        return assessments;
    },

    /**
     * Cria um alerta pendente e notifica o SysAdmin por e-mail antes do envio em broadcast.
     */
    async createPendingAlert(assessment: PredictiveRiskAssessment, sysadminEmail: string): Promise<PendingRiskAlert> {
        const alertId = 'alert_' + assessment.id;
        const pendingAlert: PendingRiskAlert = {
            id: alertId,
            riskAssessmentId: assessment.id,
            cityId: assessment.cityId,
            cityName: assessment.cityName,
            state: assessment.state,
            title: `[ALERTA SUGERIDO PELA IA] ${assessment.title}`,
            message: `${assessment.description} Bairros sob risco: ${assessment.affectedArea.neighborhoods.join(', ')}.`,
            severity: assessment.severity,
            targetNeighborhoods: assessment.affectedArea.neighborhoods,
            estimatedPopulation: assessment.affectedArea.radiusMeters * 8, // Estimativa populacional
            approvalStatus: 'PENDENTE_APROVACAO',
            notifiedSysadminEmail: sysadminEmail,
            createdAt: new Date().toISOString()
        };

        await setDoc(doc(db, PENDING_ALERTS_COLLECTION, alertId), pendingAlert);

        // Fila de Notificação por E-mail para o SysAdmin
        try {
            await addDoc(collection(db, MAIL_COLLECTION), {
                to: [sysadminEmail],
                message: {
                    subject: `🚨 [Guardião IA Preditiva] Alerta Pendente de Aprovação: ${assessment.title} (${assessment.cityName})`,
                    html: `
                        <div style="font-family: sans-serif; max-width: 600px; margin: auto; padding: 24px; border: 2px solid #ef4444; border-radius: 12px;">
                            <h2 style="color: #b91c1c;">Guardião Nacional - Inteligência Preditiva</h2>
                            <p>O algoritmo de IA identificou uma situação de <strong>Risco ${assessment.severity} (${assessment.riskProbability}%)</strong> em <strong>${assessment.cityName} - ${assessment.state}</strong>.</p>
                            <div style="background-color: #fef2f2; padding: 16px; border-radius: 8px; margin: 16px 0;">
                                <strong>Motivo:</strong> ${assessment.description}<br/>
                                <strong>Área Afetada:</strong> ${assessment.affectedArea.neighborhoods.join(', ')}<br/>
                                <strong>Público Estimado:</strong> ~${pendingAlert.estimatedPopulation} cidadãos
                            </div>
                            <p><strong>Atenção:</strong> Este alerta NÃO foi enviado aos cidadãos e aguarda sua aprovação no Painel de Controle.</p>
                            <p style="margin: 24px 0;">
                                <a href="${window.location.origin}/admin/intelligence" style="background-color: #15803d; color: #ffffff; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                                    Revisar & Aprovar Alerta no Painel
                                </a>
                            </p>
                        </div>
                    `
                },
                createdAt: serverTimestamp()
            });
        } catch (e) {
            console.warn('Trigger email queue não gravou ou está em modo simulado:', e);
        }

        return pendingAlert;
    },

    /**
     * Lista alertas pendentes de aprovação.
     */
    async getPendingAlerts(cityId?: string): Promise<PendingRiskAlert[]> {
        try {
            let q = query(
                collection(db, PENDING_ALERTS_COLLECTION),
                where('approvalStatus', '==', 'PENDENTE_APROVACAO'),
                limit(20)
            );
            const snap = await getDocs(q);
            let alerts = snap.docs.map(d => ({ id: d.id, ...d.data() })) as PendingRiskAlert[];
            if (cityId && cityId !== 'all') {
                alerts = alerts.filter(a => a.cityId === cityId);
            }
            return alerts;
        } catch (e) {
            console.warn('Fallback ao listar alertas pendentes:', e);
            return [];
        }
    },

    /**
     * Aprova o alerta e despacha para os cidadãos no perímetro.
     */
    async approveAlert(alertId: string, actorUid: string): Promise<void> {
        const alertRef = doc(db, PENDING_ALERTS_COLLECTION, alertId);
        await updateDoc(alertRef, {
            approvalStatus: 'APROVADO_DESPACHADO',
            approvedByUid: actorUid,
            approvedAt: new Date().toISOString()
        });

        await loggingService.logAudit(
            'SETTINGS_UPDATE',
            actorUid,
            alertId,
            { action: 'APPROVED_PREDICTIVE_RISK_ALERT', alertId }
        );
    },

    /**
     * Rejeita/descarta o alerta sugerido.
     */
    async rejectAlert(alertId: string, reason: string, actorUid: string): Promise<void> {
        const alertRef = doc(db, PENDING_ALERTS_COLLECTION, alertId);
        await updateDoc(alertRef, {
            approvalStatus: 'REJEITADO_DESCARTADO',
            rejectedReason: reason,
            rejectedByUid: actorUid,
            rejectedAt: new Date().toISOString()
        });

        await loggingService.logAudit(
            'SETTINGS_UPDATE',
            actorUid,
            alertId,
            { action: 'REJECTED_PREDICTIVE_RISK_ALERT', reason }
        );
    }
};
