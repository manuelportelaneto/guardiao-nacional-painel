/**
 * @fileoverview Serviço de Alertas e Notificações do SysAdmin (`sysadminAlertService.ts`).
 * 
 * Gerencia a fila de intervenção rápida para:
 * 1. Relatos de Teste (Google Play Reviewers / QA)
 * 2. Relatos de Alto Risco de Publicação (Risco >= 4: toxicidade, política, spam, LGPD)
 * 
 * Envia notificação por e-mail (usando template visual do Guardião) para que o SysAdmin
 * decida se mantém o relato publicado ou se remove do feed.
 */

import { db } from '../firebaseConfig';
import { collection, addDoc, doc, updateDoc, serverTimestamp, getDocs, query, where, orderBy, limit } from 'firebase/firestore';
import { notificationService } from './notificationService';

export type SysAdminAlertType = 'TEST_CONTRIBUTION' | 'HIGH_RISK_PUBLICATION';
export type SysAdminAlertStatus = 'PENDING_REVIEW' | 'KEPT_PUBLISHED' | 'REMOVED_FROM_FEED';

export interface SysAdminAlert {
    id?: string;
    contributionId: string;
    contributionTitle: string;
    contributionDescription: string;
    alertType: SysAdminAlertType;
    riskScore: number;
    relevanceScore: number;
    authorId: string;
    authorName: string;
    city?: string;
    state?: string;
    detectedReasons: string[];
    detectedTags: string[];
    status: SysAdminAlertStatus;
    notifiedEmail?: string;
    reviewedByUid?: string;
    reviewedAt?: any;
    decisionNotes?: string;
    createdAt: any;
}

export const sysadminAlertService = {
    /**
     * Registra alerta na fila de intervenção do SysAdmin e notifica por e-mail.
     */
    async createAlert(params: {
        contributionId: string;
        title: string;
        description: string;
        alertType: SysAdminAlertType;
        riskScore: number;
        relevanceScore: number;
        authorId: string;
        authorName: string;
        city?: string;
        state?: string;
        reasons: string[];
        tags: string[];
        sysadminEmail?: string;
    }): Promise<{ success: boolean; alertId?: string }> {
        try {
            const targetEmail = params.sysadminEmail || 'admin@guardiao.com.br';
            const alertDoc = {
                contributionId: params.contributionId,
                contributionTitle: params.title,
                contributionDescription: params.description,
                alertType: params.alertType,
                riskScore: params.riskScore,
                relevanceScore: params.relevanceScore,
                authorId: params.authorId,
                authorName: params.authorName,
                city: params.city || 'Desconhecido',
                state: params.state || 'BR',
                detectedReasons: params.reasons,
                detectedTags: params.tags,
                status: 'PENDING_REVIEW' as SysAdminAlertStatus,
                notifiedEmail: targetEmail,
                createdAt: serverTimestamp()
            };

            const docRef = await addDoc(collection(db, 'sysadmin_alerts'), alertDoc);

            // Marca a contribuição com flag de alerta SysAdmin para rastreamento
            try {
                const contribRef = doc(db, 'contributions', params.contributionId);
                await updateDoc(contribRef, {
                    hasSysAdminAlert: true,
                    sysAdminAlertType: params.alertType,
                    sysAdminAlertStatus: 'PENDING_REVIEW'
                });
            } catch (e) {
                // Em modo teste ou documento simulado, ignora erro de update
            }

            // Dispara notificação por e-mail com template visual
            await this.sendAlertEmail({
                alertId: docRef.id,
                toEmail: targetEmail,
                alertType: params.alertType,
                contributionId: params.contributionId,
                title: params.title,
                description: params.description,
                authorName: params.authorName,
                riskScore: params.riskScore,
                tags: params.tags
            });

            return { success: true, alertId: docRef.id };
        } catch (error) {
            console.error('Erro ao registrar alerta do SysAdmin:', error);
            return { success: false };
        }
    },

    /**
     * Envia e-mail formatado para a caixa postal do SysAdmin
     */
    async sendAlertEmail(data: {
        alertId: string;
        toEmail: string;
        alertType: SysAdminAlertType;
        contributionId: string;
        title: string;
        description: string;
        authorName: string;
        riskScore: number;
        tags: string[];
    }): Promise<boolean> {
        const isTest = data.alertType === 'TEST_CONTRIBUTION';
        const panelReviewUrl = `https://guardiao-painel-admin.web.app/admin/moderation?tab=sysadmin&alertId=${data.alertId}`;

        const badgeColor = isTest ? '#8B5CF6' : '#EF4444';
        const badgeLabel = isTest ? '🧪 RELATO DE TESTE / GOOGLE REVIEWER' : '⚠️ RELATO DE ALTO RISCO (NÍVEL ' + data.riskScore + ')';

        const subject = isTest
            ? `[SysAdmin Alerta] Novo Relato de Teste Publicado: "${data.title.substring(0, 40)}..."`
            : `[SysAdmin Alerta] Relato de Alto Risco Publicado: "${data.title.substring(0, 40)}..."`;

        const html = `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; color: #1e293b; line-height: 1.5;">
                <div style="background-color: #0f172a; padding: 20px; border-radius: 12px 12px 0 0; text-align: center;">
                    <h2 style="color: #ffffff; margin: 0; font-size: 18px;">🛡️ Central de Governança Guardião Nacional</h2>
                    <span style="display: inline-block; margin-top: 10px; background-color: ${badgeColor}; color: white; padding: 4px 12px; border-radius: 20px; font-size: 11px; font-weight: bold; letter-spacing: 0.5px;">
                        ${badgeLabel}
                    </span>
                </div>

                <div style="background-color: #ffffff; padding: 24px; border: 1px solid #e2e8f0; border-top: none; border-radius: 0 0 12px 12px;">
                    <p style="margin-top: 0;">Olá, <strong>SysAdmin</strong>,</p>
                    <p>Uma nova contribuição necessita da sua atenção e conferência de segurança:</p>

                    <div style="background-color: #f8fafc; border-left: 4px solid ${badgeColor}; padding: 16px; border-radius: 6px; margin: 16px 0;">
                        <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Título do Relato:</p>
                        <p style="margin: 0 0 12px 0; font-size: 16px; font-weight: bold; color: #0f172a;">${data.title}</p>

                        <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Descrição:</p>
                        <p style="margin: 0 0 12px 0; font-size: 13px; color: #334155; font-style: italic;">"${data.description}"</p>

                        <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Autor:</p>
                        <p style="margin: 0; font-size: 13px; color: #334155;">${data.authorName}</p>
                    </div>

                    <div style="margin: 16px 0;">
                        <p style="margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #64748b; font-weight: bold;">Tags de IA Detectadas:</p>
                        <p style="margin: 0; font-family: monospace; font-size: 12px; color: #475569;">${data.tags.join(' • ')}</p>
                    </div>

                    <div style="background-color: #f1f5f9; padding: 14px; border-radius: 8px; font-size: 12px; color: #475569; margin-bottom: 20px;">
                        ${isTest 
                            ? 'ℹ️ <strong>Importante:</strong> Este relato foi mantido aprovado no momento do envio para não bloquear a equipe do Google Reviewers durante a homologação do app.'
                            : '⚠️ <strong>Atenção:</strong> Este relato foi classificado como alto risco devido a palavras agressivas, propaganda política ou anúncio comercial.'}
                    </div>

                    <div style="text-align: center; margin: 24px 0;">
                        <a href="${panelReviewUrl}" style="background-color: #2563eb; color: #ffffff; text-decoration: none; padding: 12px 24px; border-radius: 8px; font-weight: bold; font-size: 13px; display: inline-block;">
                            Revisar no Painel do SysAdmin ➔
                        </a>
                    </div>

                    <p style="font-size: 11px; color: #94a3b8; text-align: center; margin-bottom: 0;">
                        Guardião Nacional • Fila de Auditoria de Segurança
                    </p>
                </div>
            </div>
        `;

        return notificationService.sendEmail({
            to: [data.toEmail],
            subject,
            html
        });
    },

    /**
     * Decisão do SysAdmin: Manter Publicado ou Remover do Feed
     */
    async resolveAlert(params: {
        alertId: string;
        contributionId: string;
        decision: 'KEPT_PUBLISHED' | 'REMOVED_FROM_FEED';
        reviewerUid: string;
        notes?: string;
    }): Promise<{ success: boolean }> {
        try {
            // 1. Atualiza o alerta
            const alertRef = doc(db, 'sysadmin_alerts', params.alertId);
            await updateDoc(alertRef, {
                status: params.decision,
                reviewedByUid: params.reviewerUid,
                reviewedAt: serverTimestamp(),
                decisionNotes: params.notes || null
            });

            // 2. Atualiza a contribuição se a decisão for remover
            const contribRef = doc(db, 'contributions', params.contributionId);
            if (params.decision === 'REMOVED_FROM_FEED') {
                await updateDoc(contribRef, {
                    status: 'Rejeitado',
                    sysAdminAlertStatus: 'REMOVED_FROM_FEED',
                    rejectionReason: params.notes || 'Removido por auditoria de segurança do SysAdmin'
                });
            } else {
                await updateDoc(contribRef, {
                    sysAdminAlertStatus: 'KEPT_PUBLISHED'
                });
            }

            return { success: true };
        } catch (error) {
            console.error('Erro ao resolver alerta do SysAdmin:', error);
            return { success: false };
        }
    }
};
