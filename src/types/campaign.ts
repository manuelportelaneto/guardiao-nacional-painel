/**
 * Campaign configuration types for automated messaging
 */

export interface Campaign {
    id: string;
    name: string;
    description: string;
    enabled: boolean;
    channel: 'email' | 'push' | 'both';
    template: 'approval' | 'rejection' | 'custom';
    createdAt?: Date;
    updatedAt?: Date;
}

export interface CampaignSettings {
    onApproval: boolean;
    onRejection: boolean;
}

export const DEFAULT_CAMPAIGNS: Campaign[] = [
    {
        id: 'on_approval',
        name: 'Notificação de Aprovação',
        description: 'Envia email automático quando uma contribuição é aprovada.',
        enabled: true,
        channel: 'email',
        template: 'approval'
    },
    {
        id: 'on_rejection',
        name: 'Notificação de Rejeição',
        description: 'Envia email automático quando uma contribuição é rejeitada.',
        enabled: true,
        channel: 'email',
        template: 'rejection'
    }
];
