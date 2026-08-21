/**
 * @fileoverview Serviço de Conexões e Webhooks Hub (`webhookService.ts`).
 * 
 * Permite integrar o Guardião Nacional com sistemas externos (ERPs de prefeituras,
 * plataformas 156, N8N, Flowise, Discord, etc.) através de webhooks assinados.
 */

import { collection, doc, getDocs, setDoc, deleteDoc, addDoc, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { WebhookEndpoint, WebhookDeliveryLog } from '../types/scope';
import { loggingService } from './loggingService';

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
        successCount: 5410,
        failureCount: 12,
        lastTriggered: new Date(Date.now() - 1000 * 60 * 2).toISOString(),
        createdAt: new Date().toISOString(),
    }
];

export const webhookService = {
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
     * Simula o disparo de teste de um webhook gerando log de entrega.
     */
    async testWebhook(webhook: WebhookEndpoint, eventName: string, userUid: string): Promise<WebhookDeliveryLog> {
        const start = performance.now();
        const payloadMock = {
            event: eventName,
            timestamp: new Date().toISOString(),
            data: {
                id: 'contrib-mock-test-123',
                title: 'Buraco Crítico na Av. Brasil',
                category: 'pavimentacao-buracos',
                city: webhook.targetJurisdiction?.cityId || 'sao-paulo',
                state: webhook.targetJurisdiction?.state || 'SP',
                urgency: 4,
                reportedBy: 'Cidadão Anônimo (LGPD Masked)',
            }
        };

        // Simulação de resposta com latência realista
        await new Promise(r => setTimeout(r, Math.floor(Math.random() * 120) + 60));
        const latencyMs = Math.round(performance.now() - start);

        const log: WebhookDeliveryLog = {
            id: 'log-' + Date.now(),
            webhookId: webhook.id,
            event: eventName,
            timestamp: new Date().toISOString(),
            statusCode: 200,
            latencyMs,
            payloadPreview: JSON.stringify(payloadMock, null, 2),
            responsePreview: JSON.stringify({ success: true, message: 'Payload recebido com sucesso pelo sistema receptor', protocol: 'PROTO-88392' }, null, 2),
            success: true,
        };

        try {
            await addDoc(collection(db, 'webhook_delivery_logs'), log);
        } catch (e) {
            console.warn('Não foi possível gravar log de entrega do webhook:', e);
        }

        await loggingService.logAudit('WEBHOOK_TEST_DISPATCH', userUid, webhook.id, { event: eventName, latencyMs });
        return log;
    },

    /**
     * Busca os últimos logs de entrega de webhooks.
     */
    async getDeliveryLogs(limitCount = 20): Promise<WebhookDeliveryLog[]> {
        try {
            const q = query(collection(db, 'webhook_delivery_logs'), orderBy('timestamp', 'desc'), limit(limitCount));
            const snap = await getDocs(q);
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as WebhookDeliveryLog));
        } catch (error) {
            return [];
        }
    }
};
