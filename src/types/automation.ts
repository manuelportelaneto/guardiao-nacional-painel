
export type TriggerType = 'contribution_created' | 'status_updated' | 'risk_level_change';

export type ActionType = 'send_email' | 'call_webhook' | 'create_notification' | 'log_event';

export type ConditionOperator = 'equals' | 'not_equals' | 'contains' | 'greater_than' | 'less_than';

export interface Condition {
    field: string; // e.g., 'riskLevel', 'category', 'status'
    operator: ConditionOperator;
    value: any;
}

export interface AutomationAction {
    type: ActionType;
    config: {
        // Dynamic config based on action type
        targetUrl?: string; // For webhook
        templateId?: string; // For email
        recipient?: string; // For email ('admin', 'user', or specific email)
        message?: string; // For notification/log
        headers?: Record<string, string>; // For webhook
    };
}

export interface AutomationRule {
    id: string;
    name: string;
    description?: string;
    active: boolean;
    trigger: TriggerType;
    conditions: Condition[];
    actions: AutomationAction[];
    createdAt: any; // Firestore Timestamp
    updatedAt: any;
    lastExecutedAt?: any;
    executionCount?: number;
}

export interface AutomationLog {
    id: string;
    ruleId: string;
    ruleName: string;
    triggerEvent: TriggerType;
    entityId: string; // ID of the contribution/entity that triggered it
    status: 'success' | 'failure' | 'partial';
    executedActions: {
        type: ActionType;
        status: 'success' | 'failure';
        error?: string;
        timestamp: any;
    }[];
    createdAt: any;
}
