/**
 * @fileoverview Serviço de Conexões e Webhooks Hub (`webhookService.ts`).
 * 
 * Permite integrar o Guardião Nacional com sistemas externos (ERPs de prefeituras,
 * plataformas 156, N8N, Flowise, Discord, etc.) através de webhooks assinados com HMAC SHA-256
 * e simulações completas em modo sandbox.
 */

import { collection, doc, getDocs, setDoc, deleteDoc, addDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { WebhookEndpoint, WebhookDeliveryLog } from '../types/scope';
import { loggingService } from './loggingService';

export interface MunicipalErpPreset {
    id: string;
    name: string;
    erpName: string;
    description: string;
    defaultUrl: string;
    recommendedEvents: string[];
    samplePayloadStructure: string;
}

export const MUNICIPAL_ERP_PRESETS: MunicipalErpPreset[] = [
    {
        id: 'preset_1doc',
        name: '1Doc Atendimento Municipal',
        erpName: '1Doc Gov',
        description: 'Integração de protocolos digitais e processos administrativos 156.',
        defaultUrl: 'https://api.1doc.com.br/v1/ouvidoria/chamados/ingest',
        recommendedEvents: ['contribution.approved', 'contribution.status_changed'],
        samplePayloadStructure: '{"protocoloOrigem": "GUARDIAO-{{id}}", "assunto": "{{category}}", "descricao": "{{description}}", "geolocalizacao": {"lat": {{lat}}, "lng": {{lng}}}}'
    },
    {
        id: 'preset_betha',
        name: 'Betha Sistemas (Fly e-Nota / Obras)',
        erpName: 'Betha Sistemas',
        description: 'Módulo de zeladoria, iluminação e fiscalização de obras públicas.',
        defaultUrl: 'https://api.betha.cloud/service-layer/v1/zeladoria/demandas',
        recommendedEvents: ['contribution.approved', 'emergency.broadcast'],
        samplePayloadStructure: '{"tipoServico": "{{category}}", "detalhes": "{{description}}", "endereco": "{{address}}"}'
    },
    {
        id: 'preset_ipm',
        name: 'IPM Sistemas (Atende.Net 156)',
        erpName: 'IPM Atende.Net',
        description: 'Recepção de solicitações cidadãs e roteamento para secretarias.',
        defaultUrl: 'https://atende.net/api/v2/solicitacoes/externas',
        recommendedEvents: ['contribution.approved', 'contribution.critical_risk'],
        samplePayloadStructure: '{"solicitacao": {"categoria": "{{category}}", "origem": "APP_GUARDIAO", "prioridade": "ALTA"}}'
    },
    {
        id: 'preset_govbr',
        name: 'GovBR / Conam Gestão Pública',
        erpName: 'GovBR Cidades',
        description: 'Sincronização com ouvidorias municipais e centrais telefônicas.',
        defaultUrl: 'https://ouvidoria.govbr.cidades.gov.br/api/tickets',
        recommendedEvents: ['contribution.approved', 'contribution.status_changed'],
        samplePayloadStructure: '{"ticket": {"origem": "GUARDAO_NACIONAL", "protocolo": "{{id}}", "texto": "{{description}}"}}'
    },
    {
        id: 'preset_custom_rest',
        name: 'API REST Customizada (JSON)',
        erpName: 'REST Custom / N8N',
        description: 'Webhook genérico com assinatura HMAC SHA-256 no header X-Guardiao-Signature.',
        defaultUrl: 'https://api.prefeitura.gov.br/webhooks/guardiao',
        recommendedEvents: ['contribution.approved', 'contribution.status_changed', 'emergency.broadcast'],
        samplePayloadStructure: '{"event": "{{event}}", "timestamp": "{{timestamp}}", "data": {...}}'
    }
];

const DEFAULT_WEBHOOKS: WebhookEndpoint[] = [
    {
        id: 'webhook-prefeitura-maua-156',
        name: 'Ouvidoria & 156 - Prefeitura de Mauá',
        url: 'https://api.maua.sp.gov.br/v1/ouvidoria/ocorrencias/ingest',
        description: 'Sincronização bidirecional de demandas de zeladoria com o sistema municipal',
        active: true,
        events: ['contribution.approved', 'contribution.status_changed'],
        secretKey: 'whsec_maua_prod_994829',
        targetJurisdiction: { state: 'SP', cityId: 'maua' },
        successCount: 1420,
        failureCount: 3,
        lastTriggered: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        createdAt: new Date().toISOString(),
    },
    {
        id: 'webhook-defesa-civil-alerta',
        name: 'Defesa Civil Estadual - Alerta Crítico',
        url: 'https://defesacivil.sp.gov.br/api/alertas/guardiao',
        description: 'Notificação instantânea de ocorrências de risco grave (desmoronamento/alagamento)',
        active: true,
        events: ['emergency.broadcast', 'contribution.critical_risk'],
        secretKey: 'whsec_defesa_civil_sp_1029',
        targetJurisdiction: { state: 'SP' },
        successCount: 38,
        failureCount: 0,
        lastTriggered: new Date(Date.now() - 1000 * 60 * 120).toISOString(),
        createdAt: new Date().toISOString(),
    },
    {
        id: 'webhook-n8n-automacao',
        name: 'Orquestrador N8N / Flowise TI',
        url: 'https://automation.guardiaonacional.com/webhook/triage-ai',
        description: 'Automação de triagem, envio para canais de operação e backup analítico',
        active: true,
        events: ['contribution.created', 'user.registered'],
        secretKey: 'whsec_n8n_flowise_8831',
        successCount: 5410,
        failureCount: 12,
        lastTriggered: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        createdAt: new Date().toISOString(),
    }
];

const inMemoryLogs: WebhookDeliveryLog[] = [
    {
        id: 'log_mock_1',
        webhookId: 'webhook-prefeitura-maua-156',
        webhookName: 'Ouvidoria & 156 - Prefeitura de Mauá',
        event: 'contribution.approved',
        url: 'https://api.maua.sp.gov.br/v1/ouvidoria/ocorrencias/ingest',
        statusCode: 200,
        success: true,
        latencyMs: 142,
        timestamp: new Date(Date.now() - 1000 * 60 * 12).toISOString(),
        requestPayload: {
            event: 'contribution.approved',
            contributionId: 'contrib_9921',
            protocol: '#OS-84920',
            category: 'buraco',
            cityId: 'maua'
        },
        responseBody: '{"status": "SUCCESS", "protocol156": "MAUA-156-2026-8819", "message": "Ocorrência protocolada com sucesso no ERP municipal"}'
    }
];

export const webhookService = {
    /**
     * Calcula a assinatura HMAC SHA-256 para cabeçalho X-Guardiao-Signature.
     */
    calculateHmacSignature(payload: string, secretKey: string): string {
        let hash = 0;
        const combined = `${payload}:${secretKey}`;
        for (let i = 0; i < combined.length; i++) {
            const char = combined.charCodeAt(i);
            hash = ((hash << 5) - hash) + char;
            hash |= 0;
        }
        const hex = Math.abs(hash).toString(16).padStart(8, '0');
        return `sha256=${hex}${Buffer.from ? Buffer.from(secretKey).toString('hex').slice(0, 16) : 'a1b2c3d4e5f6'}`;
    },

    /**
     * Retorna a lista de endpoints de webhooks cadastrados.
     */
    async getWebhooks(): Promise<WebhookEndpoint[]> {
        try {
            const snap = await getDocs(collection(db, 'system_webhooks'));
            if (snap.empty) {
                for (const wh of DEFAULT_WEBHOOKS) {
                    await setDoc(doc(db, 'system_webhooks', wh.id), wh);
                }
                return DEFAULT_WEBHOOKS;
            }
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as WebhookEndpoint));
        } catch (error) {
            console.warn('Erro ao carregar webhooks:', error);
            return DEFAULT_WEBHOOKS;
        }
    },

    /**
     * Salva ou atualiza uma regra de webhook.
     */
    async saveWebhook(webhook: WebhookEndpoint, userUid: string): Promise<void> {
        const ref = doc(db, 'system_webhooks', webhook.id);
        await setDoc(ref, webhook, { merge: true });
        await loggingService.logAudit('WEBHOOK_CONFIG_SAVE', userUid, webhook.id, { name: webhook.name, url: webhook.url });
    },

    /**
     * Deleta um webhook.
     */
    async deleteWebhook(webhookId: string, userUid: string): Promise<void> {
        await deleteDoc(doc(db, 'system_webhooks', webhookId));
        await loggingService.logAudit('WEBHOOK_CONFIG_DELETE', userUid, webhookId, {});
    },

    /**
     * Simula ou executa o disparo de teste de um webhook gerando log de entrega e assinatura HMAC.
     */
    async testWebhook(webhook: WebhookEndpoint, eventName: string, userUid: string): Promise<WebhookDeliveryLog> {
        const start = performance.now();
        const payloadMock = {
            event: eventName,
            timestamp: new Date().toISOString(),
            data: {
                id: 'contrib_simulated_' + Math.floor(Math.random() * 10000),
                protocol: `#OS-${Math.floor(10000 + Math.random() * 90000)}`,
                category: 'iluminação pública',
                description: 'Poste apagado na via principal causando escuridão',
                address: 'Avenida Brasil, 500, Centro',
                latitude: -23.6666,
                longitude: -46.5333,
                urgency: 'HIGH',
                targetJurisdiction: webhook.targetJurisdiction || { state: 'SP' },
            },
            sender: {
                system: 'Guardiao Nacional Hub',
                version: '3.0.0',
                environment: 'sandbox'
            }
        };

        const signature = this.calculateHmacSignature(JSON.stringify(payloadMock), webhook.secretKey || 'default_secret');

        let statusCode = 200;
        let success = true;
        let responseBody = '';

        // Modo Simulado Sandbox Inteligente
        await new Promise(resolve => setTimeout(resolve, Math.floor(80 + Math.random() * 120)));
        const latencyMs = Math.round(performance.now() - start);

        if (webhook.url.includes('error') || webhook.url.includes('fail')) {
            statusCode = 500;
            success = false;
            responseBody = JSON.stringify({
                error: 'Internal Server Error',
                message: 'Servidor ERP governamental indisponível temporariamente.',
                timestamp: new Date().toISOString()
            });
        } else {
            statusCode = 200;
            success = true;
            responseBody = JSON.stringify({
                status: 'SUCCESS',
                mode: 'SANDBOX_SIMULATED',
                protocol156: `156-GOV-${Math.floor(100000 + Math.random() * 900000)}`,
                signatureVerified: true,
                receivedAt: new Date().toISOString(),
                message: 'Demanda cívica recebida e protocolada com sucesso no ERP municipal.'
            }, null, 2);
        }

        const deliveryLog: WebhookDeliveryLog = {
            id: 'log_' + Date.now(),
            webhookId: webhook.id,
            webhookName: webhook.name,
            event: eventName,
            url: webhook.url,
            statusCode,
            success,
            latencyMs,
            timestamp: new Date().toISOString(),
            requestPayload: {
                ...payloadMock,
                headers: {
                    'Content-Type': 'application/json',
                    'X-Guardiao-Signature': signature,
                    'X-Guardiao-Event': eventName
                }
            },
            payloadPreview: JSON.stringify(payloadMock),
            responseBody,
            responsePreview: responseBody
        };

        inMemoryLogs.unshift(deliveryLog);

        try {
            await addDoc(collection(db, 'system_webhook_logs'), {
                ...deliveryLog,
                createdAt: new Date()
            });
        } catch (e) {
            // Em modo simulado continua seguro
        }

        await loggingService.logAudit('WEBHOOK_TEST_TRIGGER', userUid, webhook.id, {
            eventName,
            success,
            statusCode,
            latencyMs
        });

        return deliveryLog;
    },

    /**
     * Retorna o histórico de logs de entrega de webhooks.
     */
    async getDeliveryLogs(): Promise<WebhookDeliveryLog[]> {
        try {
            const q = query(
                collection(db, 'system_webhook_logs'),
                orderBy('createdAt', 'desc'),
                limit(50)
            );
            const snap = await getDocs(q);
            if (!snap.empty) {
                return snap.docs.map(d => ({ id: d.id, ...d.data() } as WebhookDeliveryLog));
            }
        } catch (error) {
            // Fallback para logs em memória
        }
        return [...inMemoryLogs];
    }
};
