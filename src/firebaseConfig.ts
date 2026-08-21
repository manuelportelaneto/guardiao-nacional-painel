/**
 * @fileoverview Inicialização e Configuração Central do Firebase (`src/firebaseConfig.ts`).
 * 
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * É o ponto único de inicialização do SDK do Firebase para o painel administrativo.
 * Todos os serviços (Autenticação, Banco de Dados, Storage, Push Notifications, Cloud Functions)
 * são inicializados aqui e exportados como singletons para consumo em toda a aplicação.
 * 
 * 🏛️ CONCEITOS E DECISÕES DE SEGURANÇA:
 * 1. 🔐 VARIÁVEIS DE AMBIENTE (VITE_FIREBASE_*):
 *    As chaves do Firebase são injetadas em tempo de build via variáveis de ambiente do Vite (`.env`).
 *    Embora as chaves do Firebase sejam consideradas "semi-públicas" (o Google as protege por domínio
 *    autorizado e regras de segurança), é boa prática não commitá-las no código-fonte.
 *    O arquivo `.env` nunca deve ser versionado no Git (já está no `.gitignore`).
 * 
 * 2. 🤖 PROTEÇÃO ANTI-BOT COM FIREBASE APP CHECK + RECAPTCHA ENTERPRISE:
 *    O Firebase App Check valida que as requisições ao Firestore e Storage são originadas
 *    por um cliente legítimo (o painel real), e não por scripts maliciosos ou ferramentas
 *    de automação. A integração usa o ReCaptcha Enterprise do Google, que é ativado apenas 
 *    quando `VITE_RECAPTCHA_SITE_KEY` está configurado. Se a chave estiver ausente (ambiente
 *    de dev local sem .env), o App Check é ignorado com um aviso no console.
 * 
 * 3. 🌎 REGIÃO GEOGRÁFICA DA CLOUD FUNCTION (`southamerica-east1`):
 *    As Cloud Functions são iniciadas na região de São Paulo (southamerica-east1) para 
 *    minimizar latência de rede para usuários e servidores brasileiros.
 * 
 * 4. 📳 RESILIÊNCIA DO FIREBASE MESSAGING:
 *    FCM (Firebase Cloud Messaging) para notificações push requer um Service Worker registrado 
 *    no navegador. Em ambientes onde o Service Worker não está disponível (ex: iframes, abas 
 *    privadas, navegadores sem suporte), a inicialização falha silenciosamente com um `try/catch`,
 *    garantindo que o restante da aplicação funcione normalmente sem crash.
 */
import { initializeApp, getApps, getApp } from "firebase/app";
import { initializeAppCheck, ReCaptchaEnterpriseProvider } from "firebase/app-check";
import { getAuth } from "firebase/auth";
import {
    getFirestore,
    initializeFirestore,
    persistentLocalCache,
    persistentMultipleTabManager
} from "firebase/firestore";
import { getStorage } from "firebase/storage";
import { getMessaging } from "firebase/messaging";
import { getFunctions } from "firebase/functions";

// Firebase configuration usando variáveis de ambiente
const firebaseConfig = {
    apiKey: import.meta.env.VITE_FIREBASE_API_KEY,
    authDomain: import.meta.env.VITE_FIREBASE_AUTH_DOMAIN,
    projectId: import.meta.env.VITE_FIREBASE_PROJECT_ID,
    storageBucket: import.meta.env.VITE_FIREBASE_STORAGE_BUCKET,
    messagingSenderId: import.meta.env.VITE_FIREBASE_MESSAGING_SENDER_ID,
    appId: import.meta.env.VITE_FIREBASE_APP_ID,
    measurementId: import.meta.env.VITE_FIREBASE_MEASUREMENT_ID
};

// Inicializa o Firebase Singleton
const app = getApps().length === 0 ? initializeApp(firebaseConfig) : getApp();

// Proteção Anti-Bot via App Check (GCP)
export let appCheck: any;
if (typeof window !== "undefined") {
    const recaptchaKey = import.meta.env.VITE_RECAPTCHA_SITE_KEY;
    if (recaptchaKey) {
        appCheck = initializeAppCheck(app, {
            provider: new ReCaptchaEnterpriseProvider(recaptchaKey),
            isTokenAutoRefreshEnabled: true
        });
    } else {
        console.warn("App Check skipped: VITE_RECAPTCHA_SITE_KEY not provided.");
    }
}

// Inicialização resiliente do Firestore (previne falhas de assert interno em watch streams e WebChannel)
let firestoreDb: any;
try {
    firestoreDb = initializeFirestore(app, {
        localCache: persistentLocalCache({
            tabManager: persistentMultipleTabManager()
        }),
        experimentalAutoDetectLongPolling: true
    });
} catch {
    firestoreDb = getFirestore(app);
}

// Exporta as instâncias dos serviços que vamos usar
export const auth = getAuth(app);
export const db = firestoreDb;
export const storage = getStorage(app);
export const functions = getFunctions(app, 'southamerica-east1');

// Messaging resilience for browsers without Service Worker support
let messagingInstance: any = null;
try {
    if (typeof window !== "undefined") {
        messagingInstance = getMessaging(app);
    }
} catch (e) {
    console.warn("Firebase Messaging not supported or blocked in this environment.", e);
}
export const messaging = messagingInstance;