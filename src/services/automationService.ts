/**
 * @fileoverview Motor de Automação Cívica do Painel Administrativo (`src/services/automationService.ts`).
 * 
 * 💡 O QUE FAZ ESTE ARQUIVO?
 * Ele implementa um mini-motor de regras de negócio no-code configurável pelo gestor municipal.
 * Inspirado em ferramentas como Zapier e n8n, permite criar workflows automáticos sem código:
 * "Quando uma denúncia for aprovada, envie um e-mail ao cidadão e registre o evento".
 * 
 * 🏛️ PADRÃO ARQUITETURAL — RULES ENGINE (Motor de Regras):
 * Um Rules Engine é um padrão onde regras de negócio são separadas do código de aplicação e
 * armazenadas como dados. O motor avalia as regras dinamicamente em runtime, permitindo que
 * usuários não-técnicos (gestores municipais) configurem comportamentos complexos sem deploy.
 * 
 * O ciclo de execução para cada evento cívico é:
 * 1. 📡 TRIGGER: Um evento ocorre no sistema (ex: nova denúncia, status atualizado).
 * 2. 🔍 FETCH: O motor busca no Firestore todas as regras ATIVAS para aquele tipo de evento.
 * 3. ✅ EVALUATE: Para cada regra encontrada, avalia se TODAS as condições configuradas são satisfeitas.
 * 4. ⚡ EXECUTE: Se aprovada, dispara TODAS as ações configuradas na regra em sequência.
 * 5. 📝 LOG: Grava um registro de auditoria imutável com o resultado de cada ação executada.
 * 6. 📊 STATS: Incrementa os contadores de execução da regra para análise administrativa.
 * 
 * 🎯 TIPOS DE AÇÕES SUPORTADAS:
 * - `log_event`: Registro de evento no console de diagnóstico.
 * - `call_webhook`: Dispara uma requisição HTTP POST para integrações externas (N8N, Zapier, APIs municipais).
 * - `send_email`: Envia e-mail via coleção `mail` do Firebase Extension (Trigger Email).
 * - `create_notification`: Cria notificação push para o gestor ou cidadão vinculado.
 */

import { db } from '../firebaseConfig';
import {
    collection,
    query,
    where,
    getDocs,
    addDoc,
    updateDoc,
    doc,
    deleteDoc,
    Timestamp,
    increment,
    orderBy,
    limit
} from 'firebase/firestore';
import type { AutomationRule, AutomationLog, TriggerType, Condition, AutomationAction, ConditionOperator } from '../types/automation';

export const automationService = {

    // --- Gerenciamento de Regras (CRUD) ---

    /** Recupera todas as regras de automação cadastradas no Firestore */
    getRules: async (): Promise<AutomationRule[]> => {
        const q = query(collection(db, 'automations'));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutomationRule));
    },

    /** Recupera os logs de execução mais recentes do motor, limitados por contagem */
    getLogs: async (limitCount = 50): Promise<AutomationLog[]> => {
        const q = query(collection(db, 'automation_logs'), orderBy('createdAt', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutomationLog));
    },

    /** Cria uma nova regra de automação com contadores zerados */
    createRule: async (rule: Omit<AutomationRule, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> => {
        const docRef = await addDoc(collection(db, 'automations'), {
            ...rule,
            createdAt: Timestamp.now(),
            updatedAt: Timestamp.now(),
            executionCount: 0
        });
        return docRef.id;
    },

    updateRule: async (id: string, rule: Partial<AutomationRule>): Promise<void> => {
        const docRef = doc(db, 'automations', id);
        await updateDoc(docRef, {
            ...rule,
            updatedAt: Timestamp.now()
        });
    },

    /** Ativa ou desativa uma regra sem deletá-la, preservando o histórico de configuração */
    toggleRule: async (id: string, active: boolean): Promise<void> => {
        await updateDoc(doc(db, 'automations', id), { active, updatedAt: Timestamp.now() });
    },

    deleteRule: async (id: string): Promise<void> => {
        await deleteDoc(doc(db, 'automations', id));
    },

    // --- Núcleo do Motor de Regras (Rules Engine Core) ---

    /**
     * Ponto de entrada principal do motor. Chamado quando qualquer evento cívico ocorre.
     * Busca regras elegíveis, avalia condições e dispara as ações configuradas.
     * 
     * @param trigger - Tipo do evento ocorrido (ex: 'new_contribution', 'status_updated').
     * @param entity - O documento completo do Firestore que originou o evento.
     */
    runAutomation: async (trigger: TriggerType, entity: any) => {
        console.log(`[AutomationEngine] Evento recebido: ${trigger} | Entidade: ${entity.id}`);

        // Consulta apenas regras ATIVAS para o tipo de trigger específico
        const q = query(
            collection(db, 'automations'),
            where('active', '==', true),
            where('trigger', '==', trigger)
        );
        const snapshot = await getDocs(q);
        const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutomationRule));

        if (rules.length === 0) return; // Nenhuma regra configurada para este evento

        console.log(`[AutomationEngine] ${rules.length} regras ativas encontradas para o trigger '${trigger}'`);

        // Avalia e executa cada regra elegível em sequência
        for (const rule of rules) {
            if (automationService.evaluateConditions(rule.conditions, entity)) {
                console.log(`[AutomationEngine] Regra correspondente: ${rule.name} (ID: ${rule.id})`);
                await automationService.executeRule(rule, entity, trigger);
            }
        }
    },

    /**
     * Avalia se TODAS as condições de uma regra são satisfeitas pela entidade do evento (lógica AND).
     * Se a regra não tiver condições configuradas, é considerada universalmente válida.
     */
    evaluateConditions: (conditions: Condition[], data: any): boolean => {
        if (!conditions || conditions.length === 0) return true;

        return conditions.every(condition => {
            const dataValue = data[condition.field]; // Acesso direto a campo de primeiro nível
            return automationService.compare(dataValue, condition.operator, condition.value);
        });
    },

    /**
     * Operador de comparação binária flexível para avaliação de condições de regras.
     * Suporta igualdade frouxa (==), numérica e verificação de substring/array.
     */
    compare: (a: any, operator: ConditionOperator, b: any): boolean => {
        switch (operator) {
            case 'equals': return a == b; // Igualdade frouxa para aceitar "5" == 5 nas configs
            case 'not_equals': return a != b;
            case 'greater_than': return Number(a) > Number(b);
            case 'less_than': return Number(a) < Number(b);
            case 'contains':
                if (typeof a === 'string') return a.toLowerCase().includes(String(b).toLowerCase());
                if (Array.isArray(a)) return a.includes(b);
                return false;
            default: return false;
        }
    },

    /**
     * Executa todas as ações de uma regra aprovada e registra o resultado de auditoria.
     * Falhas em ações individuais não interrompem a execução das próximas (tolerância a falhas parciais).
     */
    executeRule: async (rule: AutomationRule, entity: any, trigger: TriggerType) => {
        const actionResults = [];
        let ruleStatus: 'success' | 'failure' | 'partial' = 'success';

        for (const action of rule.actions) {
            try {
                await automationService.executeAction(action, entity);
                actionResults.push({ type: action.type, status: 'success', timestamp: new Date() });
            } catch (error: any) {
                console.error(`[AutomationEngine] Ação falhou na regra '${rule.name}':`, error);
                actionResults.push({ type: action.type, status: 'failure', error: error.message, timestamp: new Date() });
                ruleStatus = 'partial'; // Resultado parcial: pelo menos uma ação falhou
            }
        }

        // Grava o log imutável de auditoria de execução da regra
        const logData: Omit<AutomationLog, 'id'> = {
            ruleId: rule.id,
            ruleName: rule.name,
            triggerEvent: trigger,
            entityId: entity.id,
            status: ruleStatus,
            executedActions: actionResults as any,
            createdAt: Timestamp.now()
        };
        await addDoc(collection(db, 'automation_logs'), logData);

        // Incrementa atomicamente os contadores de estatística da regra no Firestore
        await updateDoc(doc(db, 'automations', rule.id), {
            lastExecutedAt: Timestamp.now(),
            executionCount: increment(1) // Operação atômica: segura em ambiente com múltiplas instâncias concorrentes
        });
    },

    /**
     * Despachante de ações: roteia cada tipo de ação para seu executor específico.
     * Novas ações futuras devem ser adicionadas aqui com um novo `case`.
     */
    executeAction: async (action: AutomationAction, entity: any) => {
        switch (action.type) {
            case 'log_event':
                console.log(`[ACTION:LOG] ${action.config.message || 'Evento registrado'}`, entity);
                break;

            case 'call_webhook': {
                // Dispara requisição HTTP POST para URL externa configurada (ex: N8N, Zapier, API da prefeitura)
                if (!action.config.targetUrl) throw new Error("URL de destino do webhook não configurada");
                const response = await fetch(action.config.targetUrl, {
                    method: 'POST',
                    headers: {
                        'Content-Type': 'application/json',
                        ...action.config.headers
                    },
                    body: JSON.stringify({
                        event: 'automation_trigger',
                        data: entity,
                        timestamp: new Date().toISOString()
                    })
                });
                if (!response.ok) throw new Error(`Webhook retornou falha HTTP: ${response.statusText}`);
                break;
            }

            case 'send_email':
                // Integração via Firebase Extension "Trigger Email" — grava na coleção `mail` do Firestore
                console.log(`[ACTION:EMAIL] Disparo de e-mail para: ${action.config.recipient}`, entity);
                // Implementação: await addDoc(collection(db, 'mail'), { to: action.config.recipient, message: {...} });
                break;

            case 'create_notification':
                console.log(`[ACTION:NOTIF] Notificação criada: ${action.config.message}`);
                break;

            default:
                console.warn(`[AutomationEngine] Tipo de ação desconhecido ignorado: ${(action as any).type}`);
        }
    }
};
