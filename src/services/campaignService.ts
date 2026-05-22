/**
 * @fileoverview Serviço de Gestão de Campanhas de Mensageria e Notificações (`src/services/campaignService.ts`).
 * 
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Ele gerencia as diretrizes e regras de disparo de campanhas e notificações eletrônicas automatizadas 
 * do Guardião Nacional (e-mails transacionais via Brevo, mensagens push e SMS).
 * O serviço lê e atualiza as configurações globais de disparos persistidas no Firestore na coleção `settings/campaigns`.
 * Por exemplo, permite que os administradores ativem/desativem em tempo real o envio de e-mails automáticos ao cidadão
 * quando sua denúncia de infraestrutura é aprovada ou rejeitada por um gestor municipal.
 */

import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { CampaignSettings } from '../types/campaign';

// Identificador único do documento de configurações globais de campanhas no Firestore
const SETTINGS_DOC_ID = 'campaigns';

export const campaignService = {
    /**
     * Recupera as configurações globais de campanhas ativas do banco de dados Firestore.
     * Retorna um fallback seguro caso o documento ainda não tenha sido parametrizado.
     */
    async getSettings(): Promise<CampaignSettings> {
        try {
            const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data() as CampaignSettings;
            }

            // Fallback preventivo: assume que os disparos automáticos de e-mail estão ativos por padrão
            return {
                onApproval: true,
                onRejection: true
            };
        } catch (error) {
            console.error('[CampaignService] Erro ao recuperar configurações de disparo:', error);
            return {
                onApproval: true,
                onRejection: true
            };
        }
    },

    /**
     * Atualiza as diretrizes de envio de campanhas mesclando de forma segura (`merge: true`)
     * as novas flags no Firestore e registrando o timestamp gerado no servidor.
     */
    async updateSettings(settings: Partial<CampaignSettings>): Promise<boolean> {
        try {
            const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
            await setDoc(docRef, {
                ...settings,
                updatedAt: serverTimestamp() // Usa o relógio atômico do Firebase para auditoria de modificação
            }, { merge: true });

            console.log('[CampaignService] Diretrizes de campanhas atualizadas com sucesso:', settings);
            return true;
        } catch (error) {
            console.error('[CampaignService] Falha ao persistir alterações das diretrizes de campanhas:', error);
            return false;
        }
    },

    /**
     * Auxiliar rápido para consultar programaticamente se um fluxo específico de notificação 
     * (ex: aprovação ou rejeição de denúncia) está habilitado na nuvem.
     */
    async isEnabled(campaignType: 'onApproval' | 'onRejection'): Promise<boolean> {
        const settings = await this.getSettings();
        return settings[campaignType] ?? true; // Retorna true caso a flag esteja omitida no banco
    }
};

