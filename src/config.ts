/**
 * Centralized Configuration for Admin Panel
 * 
 * This file contains all configuration values that may change:
 * - Firebase Function URLs
 * - API endpoints
 * - Feature flags
 * - Environment-specific settings
 */

// Firebase Project Config
export const FIREBASE_PROJECT_ID = 'procuradoria-cidada-72130';
export const FIREBASE_REGION = 'southamerica-east1';

// Base URL for Cloud Functions
const FUNCTIONS_BASE_URL = `https://${FIREBASE_REGION}-${FIREBASE_PROJECT_ID}.cloudfunctions.net`;

/**
 * Cloud Function Endpoints
 * All Firebase Function URLs are centralized here for easy maintenance
 */
export const CLOUD_FUNCTIONS = {
    // API Management
    generateApiKey: `${FUNCTIONS_BASE_URL}/generateApiKey`,
    revokeApiKey: `${FUNCTIONS_BASE_URL}/revokeApiKey`,

    // AI Analysis
    runRetroactiveAnalysis: `${FUNCTIONS_BASE_URL}/runRetroactiveAnalysis`,

    // Backup
    manualBackup: `${FUNCTIONS_BASE_URL}/manualBackup`,
    getBackupStatus: `${FUNCTIONS_BASE_URL}/getBackupStatus`,

    // Webhooks (if needed in future)
    createWebhook: `${FUNCTIONS_BASE_URL}/createWebhook`,
    deleteWebhook: `${FUNCTIONS_BASE_URL}/deleteWebhook`,
} as const;

/**
 * App Settings Defaults
 */
export const APP_DEFAULTS = {
    // Pagination
    defaultPageSize: 20,
    maxPageSize: 100,

    // Analysis
    aiAnalysisLimit: 50,

    // Backup
    backupRetentionDays: 30,
    storageAlertThresholdGB: 4,
    storageLimitGB: 5,
} as const;

/**
 * Feature Flags
 * Toggle features during development or for A/B testing
 */
export const FEATURE_FLAGS = {
    enableAiAnalysis: true,
    enableBackups: true,
    enableCampaigns: true,
    enableWebhooks: true,
} as const;

/**
 * Role Hierarchy
 */
export const ADMIN_ROLES = ['super_admin', 'admin', 'presidente'] as const;
export const CITY_ADMIN_ROLES = ['governador', 'prefeito', 'city_admin'] as const;
export const ALL_AUTHORIZED_ROLES = ['super_admin', 'admin', 'presidente', 'governador', 'prefeito', 'city_admin', 'servidor'] as const;
