/**
 * @fileoverview Serviço de Gestão No-Code e CMS Vivo (`noCodeService.ts`).
 * 
 * Permite ao SysAdmin parametrizar dinamicamente:
 * - Categorias e campos de formulário customizados
 * - Feature Flags e Remote Config por plataforma/versão/jurisdição
 * - Banners dinâmicos e Alertas de Defesa Civil
 * - Configurações do Orquestrador de IA e Moderação
 */

import { doc, getDoc, setDoc, updateDoc, collection, getDocs, deleteDoc } from 'firebase/firestore';
import { db } from '../firebaseConfig';
import type { DynamicCategory, FeatureFlag, DynamicBanner, AIOrchestratorConfig } from '../types/scope';
import { loggingService } from './loggingService';

const DEFAULT_CATEGORIES: DynamicCategory[] = [
    {
        id: 'iluminacao-publica',
        name: 'Iluminação Pública',
        slug: 'iluminacao-publica',
        description: 'Postes apagados, lâmpadas queimadas ou fiação exposta',
        icon: 'Lightbulb',
        color: '#eab308',
        slaHours: 48,
        priority: 'medium',
        active: true,
        customFields: [
            { id: 'poste_numero', label: 'Número do Poste / Identificação', type: 'text', required: false, placeholder: 'Ex: Post-402' },
            { id: 'tipo_falha', label: 'Tipo de Falha', type: 'select', required: true, options: ['Lâmpada apagada à noite', 'Acesa durante o dia', 'Poste danificado/inclinado', 'Fiação caída'] },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'pavimentacao-buracos',
        name: 'Pavimentação & Buracos',
        slug: 'pavimentacao-buracos',
        description: 'Vias esburacadas, asfalto cedendo ou crateras',
        icon: 'Car',
        color: '#ef4444',
        slaHours: 72,
        priority: 'high',
        active: true,
        customFields: [
            { id: 'tamanho_buraco', label: 'Extensão Estimada', type: 'select', required: true, options: ['Pequeno (< 50cm)', 'Médio (50cm - 1m)', 'Cratera (> 1m)'] },
            { id: 'bloqueia_via', label: 'Bloqueia o trânsito?', type: 'boolean', required: true },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'saude-dengue',
        name: 'Focos de Dengue & Vigilância',
        slug: 'saude-dengue',
        description: 'Água parada, terrenos abandonados ou criadouros de mosquitos',
        icon: 'Biohazard',
        color: '#10b981',
        slaHours: 24,
        priority: 'urgent',
        active: true,
        customFields: [
            { id: 'local_tipo', label: 'Tipo de Local', type: 'select', required: true, options: ['Imóvel abandonado', 'Terreno baldio', 'Via pública', 'Piscina desativada'] },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'saneamento-esgoto',
        name: 'Saneamento & Vazamentos',
        slug: 'saneamento-esgoto',
        description: 'Vazamento de água potável ou esgoto a céu aberto',
        icon: 'Droplets',
        color: '#06b6d4',
        slaHours: 24,
        priority: 'high',
        active: true,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'defesa-civil-risco',
        name: 'Defesa Civil & Risco Iminente',
        slug: 'defesa-civil-risco',
        description: 'Risco de deslizamento, desabamento ou enchente',
        icon: 'TriangleAlert',
        color: '#f97316',
        slaHours: 4,
        priority: 'urgent',
        active: true,
        customFields: [
            { id: 'familias_risco', label: 'Há famílias no local?', type: 'boolean', required: true },
            { id: 'tipo_risco', label: 'Tipo de Risco', type: 'select', required: true, options: ['Deslizamento de Encosta', 'Enchente / Alagamento', 'Risco Estrutural de Imóvel', 'Árvore prestes a cair'] },
        ],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

const DEFAULT_FEATURE_FLAGS: FeatureFlag[] = [
    {
        id: 'offline-graal-sync',
        key: 'FEATURE_OFFLINE_GRAAL_SYNC',
        name: 'Sincronização Offline (.graal)',
        description: 'Permite envio assíncrono de ocorrências registradas em áreas sem cobertura de internet',
        enabled: true,
        targetPlatforms: ['ios', 'android'],
        rolloutPercentage: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'ai-smart-tagging',
        key: 'FEATURE_AI_SMART_TAGGING',
        name: 'Auto-Classificação de Imagens com IA',
        description: 'Classifica fotos de ocorrências automaticamente através de modelo multimodal',
        enabled: true,
        targetPlatforms: ['ios', 'android', 'web'],
        rolloutPercentage: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'emergency-siren-push',
        key: 'FEATURE_EMERGENCY_SIREN_PUSH',
        name: 'Push de Sirene da Defesa Civil',
        description: 'Permite emissão de notificações com som de emergência contornando modo silencioso',
        enabled: true,
        targetPlatforms: ['android', 'ios'],
        rolloutPercentage: 100,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
    {
        id: 'citizen-gamification',
        key: 'FEATURE_CITIZEN_GAMIFICATION',
        name: 'Gamificação & Medalhas do Guardião',
        description: 'Sistema de pontos, medalhas de cidadão ativo e ranking cívico',
        enabled: true,
        targetPlatforms: ['ios', 'android', 'web'],
        rolloutPercentage: 80,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
    },
];

const DEFAULT_AI_CONFIG: AIOrchestratorConfig = {
    provider: 'gemini',
    modelName: 'gemini-2.5-flash',
    temperature: 0.2,
    moderationSensitivity: 3,
    autoApproveThreshold: 3,
    systemPrompt: `Você é o Auditor Central de Moderação do Guardião Nacional.
Avalie relatos públicos de cidadãos brasileiros. Identifique:
1. Severidade e urgência (1 a 5).
2. Se há conteúdo impróprio, difamação ou dados pessoais indevidos.
3. Sugira a categoria mais adequada e o órgão municipal responsável.`,
    bannedWordsRegex: '(palavrao1|ofensa2|insulto3)',
    enableSmartCategorization: true,
    enableUrgencyEstimation: true,
    updatedAt: new Date().toISOString(),
};

export const noCodeService = {
    // ─── Categorias Dinâmicas ────────────────────────────────────────────────
    async getCategories(): Promise<DynamicCategory[]> {
        try {
            const snap = await getDocs(collection(db, 'system_categories'));
            if (snap.empty) {
                // Popula padrão inicial se vazio
                for (const cat of DEFAULT_CATEGORIES) {
                    await setDoc(doc(db, 'system_categories', cat.id), cat);
                }
                return DEFAULT_CATEGORIES;
            }
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as DynamicCategory));
        } catch (error) {
            console.warn('Erro ao carregar categorias dinâmicas do Firestore. Usando cache padrão:', error);
            return DEFAULT_CATEGORIES;
        }
    },

    async saveCategory(category: DynamicCategory, userUid: string): Promise<void> {
        const catRef = doc(db, 'system_categories', category.id);
        const data = {
            ...category,
            updatedAt: new Date().toISOString(),
        };
        await setDoc(catRef, data, { merge: true });
        await loggingService.logAudit('NOCODE_CATEGORY_UPDATE', userUid, category.id, { name: category.name });
    },

    async deleteCategory(categoryId: string, userUid: string): Promise<void> {
        await deleteDoc(doc(db, 'system_categories', categoryId));
        await loggingService.logAudit('NOCODE_CATEGORY_DELETE', userUid, categoryId, {});
    },

    // ─── Feature Flags & Remote Config ───────────────────────────────────────
    async getFeatureFlags(): Promise<FeatureFlag[]> {
        try {
            const snap = await getDocs(collection(db, 'system_feature_flags'));
            if (snap.empty) {
                for (const flag of DEFAULT_FEATURE_FLAGS) {
                    await setDoc(doc(db, 'system_feature_flags', flag.id), flag);
                }
                return DEFAULT_FEATURE_FLAGS;
            }
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as FeatureFlag));
        } catch (error) {
            console.warn('Erro ao carregar Feature Flags. Usando cache padrão:', error);
            return DEFAULT_FEATURE_FLAGS;
        }
    },

    async toggleFeatureFlag(flagId: string, enabled: boolean, userUid: string): Promise<void> {
        const flagRef = doc(db, 'system_feature_flags', flagId);
        await updateDoc(flagRef, {
            enabled,
            updatedAt: new Date().toISOString(),
        });
        await loggingService.logAudit('NOCODE_FLAG_TOGGLE', userUid, flagId, { enabled });
    },

    async saveFeatureFlag(flag: FeatureFlag, userUid: string): Promise<void> {
        const flagRef = doc(db, 'system_feature_flags', flag.id);
        const data = {
            ...flag,
            updatedAt: new Date().toISOString(),
        };
        await setDoc(flagRef, data, { merge: true });
        await loggingService.logAudit('NOCODE_FLAG_SAVE', userUid, flag.id, { key: flag.key, enabled: flag.enabled });
    },

    // ─── Banners & Alertas Dinâmicos ─────────────────────────────────────────
    async getBanners(): Promise<DynamicBanner[]> {
        try {
            const snap = await getDocs(collection(db, 'system_banners'));
            return snap.docs.map(d => ({ id: d.id, ...d.data() } as DynamicBanner));
        } catch (error) {
            console.warn('Erro ao carregar banners:', error);
            return [];
        }
    },

    async saveBanner(banner: DynamicBanner, userUid: string): Promise<void> {
        const bannerRef = doc(db, 'system_banners', banner.id);
        await setDoc(bannerRef, banner, { merge: true });
        await loggingService.logAudit('NOCODE_BANNER_SAVE', userUid, banner.id, { title: banner.title, priority: banner.priority });
    },

    async deleteBanner(bannerId: string, userUid: string): Promise<void> {
        await deleteDoc(doc(db, 'system_banners', bannerId));
        await loggingService.logAudit('NOCODE_BANNER_DELETE', userUid, bannerId, {});
    },

    // ─── Orquestrador de IA & Moderação ──────────────────────────────────────
    async getAIConfig(): Promise<AIOrchestratorConfig> {
        try {
            const docSnap = await getDoc(doc(db, 'settings', 'ai_orchestrator'));
            if (docSnap.exists()) {
                return { ...DEFAULT_AI_CONFIG, ...docSnap.data() } as AIOrchestratorConfig;
            }
            await setDoc(doc(db, 'settings', 'ai_orchestrator'), DEFAULT_AI_CONFIG);
            return DEFAULT_AI_CONFIG;
        } catch (error) {
            console.warn('Erro ao carregar AI config:', error);
            return DEFAULT_AI_CONFIG;
        }
    },

    async saveAIConfig(config: AIOrchestratorConfig, userUid: string): Promise<void> {
        const data = {
            ...config,
            updatedAt: new Date().toISOString(),
        };
        await setDoc(doc(db, 'settings', 'ai_orchestrator'), data, { merge: true });
        await loggingService.logAudit('NOCODE_AI_CONFIG_UPDATE', userUid, 'ai_orchestrator', { provider: config.provider, modelName: config.modelName });
    },
};
