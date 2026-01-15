import { db } from '../firebaseConfig';
import { doc, getDoc, setDoc, serverTimestamp } from 'firebase/firestore';
import type { CampaignSettings } from '../types/campaign';

const SETTINGS_DOC_ID = 'campaigns';

/**
 * Campaign Service - Manages automated messaging campaign configurations
 */
export const campaignService = {
    /**
     * Get campaign settings from Firestore
     */
    async getSettings(): Promise<CampaignSettings> {
        try {
            const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
            const docSnap = await getDoc(docRef);

            if (docSnap.exists()) {
                return docSnap.data() as CampaignSettings;
            }

            // Return default settings if not configured
            return {
                onApproval: true,
                onRejection: true
            };
        } catch (error) {
            console.error('[CampaignService] Error getting settings:', error);
            return {
                onApproval: true,
                onRejection: true
            };
        }
    },

    /**
     * Update campaign settings in Firestore
     */
    async updateSettings(settings: Partial<CampaignSettings>): Promise<boolean> {
        try {
            const docRef = doc(db, 'settings', SETTINGS_DOC_ID);
            await setDoc(docRef, {
                ...settings,
                updatedAt: serverTimestamp()
            }, { merge: true });

            console.log('[CampaignService] Settings updated:', settings);
            return true;
        } catch (error) {
            console.error('[CampaignService] Error updating settings:', error);
            return false;
        }
    },

    /**
     * Check if a specific campaign is enabled
     */
    async isEnabled(campaignType: 'onApproval' | 'onRejection'): Promise<boolean> {
        const settings = await this.getSettings();
        return settings[campaignType] ?? true;
    }
};
