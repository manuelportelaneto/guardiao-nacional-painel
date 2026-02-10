
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

    // --- Rule Management ---

    getRules: async (): Promise<AutomationRule[]> => {
        const q = query(collection(db, 'automations')); // We might want to filter or sort
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutomationRule));
    },

    getLogs: async (limitCount = 50): Promise<AutomationLog[]> => {
        const q = query(collection(db, 'automation_logs'), orderBy('createdAt', 'desc'), limit(limitCount));
        const snapshot = await getDocs(q);
        return snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutomationLog));
    },

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

    toggleRule: async (id: string, active: boolean): Promise<void> => {
        await updateDoc(doc(db, 'automations', id), { active, updatedAt: Timestamp.now() });
    },

    deleteRule: async (id: string): Promise<void> => {
        await deleteDoc(doc(db, 'automations', id));
    },

    // --- Engine Core ---

    /**
     * Main entry point. Call this when an event happens (e.g. new contribution).
     */
    runAutomation: async (trigger: TriggerType, entity: any) => {
        console.log(`[Automation] Processing trigger: ${trigger} for entity ${entity.id}`);

        // 1. Fetch active rules for this trigger
        const q = query(
            collection(db, 'automations'),
            where('active', '==', true),
            where('trigger', '==', trigger)
        );
        const snapshot = await getDocs(q);
        const rules = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AutomationRule));

        if (rules.length === 0) return;

        console.log(`[Automation] Found ${rules.length} active rules for trigger ${trigger}`);

        // 2. Evaluate and Execute each rule
        for (const rule of rules) {
            if (automationService.evaluateConditions(rule.conditions, entity)) {
                console.log(`[Automation] Rule matched: ${rule.name} (${rule.id})`);
                await automationService.executeRule(rule, entity, trigger);
            }
        }
    },

    evaluateConditions: (conditions: Condition[], data: any): boolean => {
        if (!conditions || conditions.length === 0) return true; // No conditions = always run

        return conditions.every(condition => {
            const dataValue = data[condition.field]; // Simple field access. For nested, would need helper.
            return automationService.compare(dataValue, condition.operator, condition.value);
        });
    },

    compare: (a: any, operator: ConditionOperator, b: any): boolean => {
        switch (operator) {
            case 'equals': return a == b; // Loose equality for flexibility
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

    executeRule: async (rule: AutomationRule, entity: any, trigger: TriggerType) => {
        const actionResults = [];
        let ruleStatus: 'success' | 'failure' | 'partial' = 'success';

        for (const action of rule.actions) {
            try {
                await automationService.executeAction(action, entity);
                actionResults.push({ type: action.type, status: 'success', timestamp: new Date() });
            } catch (error: any) {
                console.error(`[Automation] Action failed in rule ${rule.name}:`, error);
                actionResults.push({ type: action.type, status: 'failure', error: error.message, timestamp: new Date() });
                ruleStatus = 'partial'; // Or failure depending on policy
            }
        }

        // Log Execution
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

        // Update Rule Statistics
        await updateDoc(doc(db, 'automations', rule.id), {
            lastExecutedAt: Timestamp.now(),
            executionCount: increment(1)
        });
    },

    executeAction: async (action: AutomationAction, entity: any) => {
        switch (action.type) {
            case 'log_event':
                console.log(`[ACTION LOG] ${action.config.message || 'Event logged'}`, entity);
                break;

            case 'call_webhook': {
                if (!action.config.targetUrl) throw new Error("Missing targetUrl for webhook");
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
                if (!response.ok) throw new Error(`Webhook failed: ${response.statusText}`);
                break;
            }

            case 'send_email':
                // Placeholder: In a real app, this would trigger a Helper Function or use an Extension
                // For now, we'll just log it or add to a 'mail' collection if using Firebase Extensions
                console.log(`[ACTION EMAIL] Sending email to ${action.config.recipient}`, entity);
                // Example: await addDoc(collection(db, 'mail'), { to: ..., message: ... });
                break;

            case 'create_notification':
                // Placeholder
                console.log(`[ACTION NOTIF] Creating notification: ${action.config.message}`);
                break;

            default:
                console.warn(`Unknown action type: ${(action as any).type}`);
        }
    }
};
