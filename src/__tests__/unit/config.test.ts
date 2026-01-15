import { describe, it, expect } from 'vitest';
import {
    FIREBASE_PROJECT_ID,
    FIREBASE_REGION,
    CLOUD_FUNCTIONS,
    APP_DEFAULTS,
    FEATURE_FLAGS,
    ADMIN_ROLES,
    CITY_ADMIN_ROLES,
    ALL_AUTHORIZED_ROLES
} from '../../config';

describe('config', () => {
    describe('Firebase Configuration', () => {
        it('should have correct project ID', () => {
            expect(FIREBASE_PROJECT_ID).toBe('procuradoria-cidada-72130');
        });

        it('should have correct region', () => {
            expect(FIREBASE_REGION).toBe('southamerica-east1');
        });
    });

    describe('CLOUD_FUNCTIONS', () => {
        it('should have all required function URLs', () => {
            expect(CLOUD_FUNCTIONS.generateApiKey).toContain('generateApiKey');
            expect(CLOUD_FUNCTIONS.revokeApiKey).toContain('revokeApiKey');
            expect(CLOUD_FUNCTIONS.runRetroactiveAnalysis).toContain('runRetroactiveAnalysis');
            expect(CLOUD_FUNCTIONS.manualBackup).toContain('manualBackup');
        });

        it('should use correct base URL format', () => {
            const baseUrl = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;
            expect(CLOUD_FUNCTIONS.generateApiKey).toContain(FIREBASE_REGION);
            expect(CLOUD_FUNCTIONS.generateApiKey).toContain(FIREBASE_PROJECT_ID);
        });
    });

    describe('APP_DEFAULTS', () => {
        it('should have sensible default values', () => {
            expect(APP_DEFAULTS.defaultPageSize).toBeGreaterThan(0);
            expect(APP_DEFAULTS.maxPageSize).toBeGreaterThan(APP_DEFAULTS.defaultPageSize);
            expect(APP_DEFAULTS.aiAnalysisLimit).toBeGreaterThan(0);
            expect(APP_DEFAULTS.backupRetentionDays).toBeGreaterThan(0);
        });

        it('should have storage limits defined', () => {
            expect(APP_DEFAULTS.storageLimitGB).toBe(5);
            expect(APP_DEFAULTS.storageAlertThresholdGB).toBeLessThan(APP_DEFAULTS.storageLimitGB);
        });
    });

    describe('FEATURE_FLAGS', () => {
        it('should have all features defined', () => {
            expect(typeof FEATURE_FLAGS.enableAiAnalysis).toBe('boolean');
            expect(typeof FEATURE_FLAGS.enableBackups).toBe('boolean');
            expect(typeof FEATURE_FLAGS.enableCampaigns).toBe('boolean');
            expect(typeof FEATURE_FLAGS.enableWebhooks).toBe('boolean');
        });
    });

    describe('Role Configuration', () => {
        it('should define admin roles', () => {
            expect(ADMIN_ROLES).toContain('super_admin');
            expect(ADMIN_ROLES).toContain('admin');
            expect(ADMIN_ROLES).toContain('presidente');
        });

        it('should define city admin roles', () => {
            expect(CITY_ADMIN_ROLES).toContain('governador');
            expect(CITY_ADMIN_ROLES).toContain('prefeito');
            expect(CITY_ADMIN_ROLES).toContain('city_admin');
        });

        it('should have all roles in ALL_AUTHORIZED_ROLES', () => {
            ADMIN_ROLES.forEach(role => {
                expect(ALL_AUTHORIZED_ROLES).toContain(role);
            });
            CITY_ADMIN_ROLES.forEach(role => {
                expect(ALL_AUTHORIZED_ROLES).toContain(role);
            });
        });
    });
});
