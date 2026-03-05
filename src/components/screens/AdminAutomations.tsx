
import React, { useState, useEffect, useMemo } from 'react';
import {
    Plus, Trash2, Save, Zap, Cloud, Settings2, BarChart3,
    Database, Mail, Bell, Shield,
    Globe, GitBranch, Webhook, RefreshCw, ChevronRight,
    AlertTriangle, CheckCircle2, Eye, Server, Cpu,
    MapPin, BrainCircuit, Users, Layers
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { toast } from 'sonner';
import { collection, getDocs, query, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';

import { automationService } from '../../services/automationService';
import type {
    AutomationRule,
    Condition,
    AutomationAction,
    TriggerType
} from '../../types/automation';

// ─── Cloud Functions Catalog ────────────────────────────────────────────────
interface CloudFunction {
    id: string;
    name: string;
    description: string;
    type: 'trigger' | 'http' | 'scheduled' | 'callable';
    trigger: string;
    region: string;
    category: string;
    icon: React.ReactNode;
    status: 'active' | 'warning' | 'inactive';
    collection?: string;
}

const CLOUD_FUNCTIONS: CloudFunction[] = [
    // ─── Triggers Firestore ─────────────────────────────────────
    {
        id: 'onContributionCreated',
        name: 'Moderação Automática',
        description: 'Ao criar uma contribuição, executa análise híbrida IA+Regex. Classifica risco, sugere categoria e aprova/rejeita automaticamente com base no limiar configurado.',
        type: 'trigger',
        trigger: 'contributions/{contributionId} (onCreate)',
        region: 'southamerica-east1',
        category: 'Moderação',
        icon: <BrainCircuit className="w-5 h-5" />,
        status: 'active',
        collection: 'contributions'
    },
    {
        id: 'onContributionUpdated',
        name: 'Contadores de Cidade',
        description: 'Quando uma contribuição muda de status (para Aprovado), incrementa os contadores da cidade correspondente na coleção city_data.',
        type: 'trigger',
        trigger: 'contributions/{id} (onUpdate)',
        region: 'southamerica-east1',
        category: 'Dados',
        icon: <BarChart3 className="w-5 h-5" />,
        status: 'active',
        collection: 'contributions'
    },
    {
        id: 'onContributionStatusChanged',
        name: 'Notificação de Status',
        description: 'Notifica o autor quando sua contribuição é aprovada, rejeitada ou movida para análise.',
        type: 'trigger',
        trigger: 'contributions/{id} (onUpdate)',
        region: 'southamerica-east1',
        category: 'Notificações',
        icon: <Bell className="w-5 h-5" />,
        status: 'active',
        collection: 'contributions'
    },
    {
        id: 'onContributionDeleted',
        name: 'Limpeza de Contribuição',
        description: 'Remove recursos vinculados (imagens, notificações) quando uma contribuição é excluída.',
        type: 'trigger',
        trigger: 'contributions/{id} (onDelete)',
        region: 'southamerica-east1',
        category: 'Manutenção',
        icon: <Trash2 className="w-5 h-5" />,
        status: 'active',
        collection: 'contributions'
    },
    {
        id: 'onContributionInteraction',
        name: 'Notificação de Interação',
        description: 'Notifica o autor quando recebe apoios, comentários ou interações na sua contribuição.',
        type: 'trigger',
        trigger: 'contributions/{id}/interactions/{iid} (onCreate)',
        region: 'southamerica-east1',
        category: 'Notificações',
        icon: <Users className="w-5 h-5" />,
        status: 'active',
        collection: 'contributions'
    },
    {
        id: 'onUserNotificationCreated',
        name: 'Push via FCM',
        description: 'Quando uma notificação é criada na subcoleção do usuário, envia push notification via Firebase Cloud Messaging.',
        type: 'trigger',
        trigger: 'users/{userId}/notifications/{nid} (onCreate)',
        region: 'southamerica-east1',
        category: 'Notificações',
        icon: <Bell className="w-5 h-5" />,
        status: 'active',
        collection: 'users'
    },
    {
        id: 'sendPushNotification',
        name: 'Mensageria Multicanal',
        description: 'Processa mensagens do painel admin: envia push FCM (por tópico ou IDs), e-mails via Brevo (firestore-send-email), e registra SMS para futura integração.',
        type: 'trigger',
        trigger: 'messages/{msgId} (onCreate)',
        region: 'us-central1',
        category: 'Mensageria',
        icon: <Mail className="w-5 h-5" />,
        status: 'active',
        collection: 'messages'
    },
    {
        id: 'onContributionWebhookCreated',
        name: 'Webhook (Criação)',
        description: 'Dispara webhooks registrados quando uma nova contribuição é criada, permitindo integrações externas (CRM, ERP, 156).',
        type: 'trigger',
        trigger: 'contributions/{id} (onCreate)',
        region: 'southamerica-east1',
        category: 'Integrações',
        icon: <Webhook className="w-5 h-5" />,
        status: 'active',
        collection: 'contributions'
    },
    {
        id: 'onContributionWebhookUpdated',
        name: 'Webhook (Atualização)',
        description: 'Dispara webhooks registrados quando uma contribuição é atualizada (mudança de status, etc.).',
        type: 'trigger',
        trigger: 'contributions/{id} (onUpdate)',
        region: 'southamerica-east1',
        category: 'Integrações',
        icon: <Webhook className="w-5 h-5" />,
        status: 'active',
        collection: 'contributions'
    },
    {
        id: 'onUserCreated',
        name: 'Onboarding de Usuário',
        description: 'Inicializa perfil do novo usuário: define patente, XP, subscreve tópicos FCM por cidade e envia notificação de boas-vindas.',
        type: 'trigger',
        trigger: 'users/{userId} (onCreate)',
        region: 'southamerica-east1',
        category: 'Auth',
        icon: <Users className="w-5 h-5" />,
        status: 'active',
        collection: 'users'
    },
    {
        id: 'onSupportTicketCreated',
        name: 'Alerta de Ticket',
        description: 'Notifica administradores quando um novo ticket de suporte é criado por um cidadão.',
        type: 'trigger',
        trigger: 'support_tickets/{id} (onCreate)',
        region: 'southamerica-east1',
        category: 'Suporte',
        icon: <AlertTriangle className="w-5 h-5" />,
        status: 'active',
        collection: 'support_tickets'
    },
    {
        id: 'onSupportTicketUpdated',
        name: 'Resposta de Ticket',
        description: 'Notifica o cidadão quando seu ticket de suporte é respondido ou atualizado pela equipe.',
        type: 'trigger',
        trigger: 'support_tickets/{id} (onUpdate)',
        region: 'southamerica-east1',
        category: 'Suporte',
        icon: <CheckCircle2 className="w-5 h-5" />,
        status: 'active',
        collection: 'support_tickets'
    },
    {
        id: 'onOfflineContributionReceived',
        name: 'Mesh P2P Sync',
        description: 'Processa contribuições recebidas via sincronização offline P2P (Modo Contingência), validando integridade e hash SHA-256.',
        type: 'trigger',
        trigger: 'offline_contributions/{id} (onCreate)',
        region: 'southamerica-east1',
        category: 'Offline',
        icon: <GitBranch className="w-5 h-5" />,
        status: 'active',
        collection: 'offline_contributions'
    },

    // ─── HTTP Functions ──────────────────────────────────────────
    {
        id: 'api',
        name: 'REST API Gateway',
        description: 'Express.js middleware que expõe endpoints autenticados para processamento de arquivos Graal, webhooks e operações administrativas.',
        type: 'http',
        trigger: 'HTTPS (Express Router)',
        region: 'us-central1',
        category: 'API',
        icon: <Globe className="w-5 h-5" />,
        status: 'active'
    },
    {
        id: 'publicApiV1',
        name: 'API Pública v1',
        description: 'API REST pública para consulta de contribuições aprovadas. Usada por PowerBI, Sistema 156 e ferramentas externas. Autenticação via API Key.',
        type: 'http',
        trigger: 'HTTPS (GET /api/v1/...)',
        region: 'us-central1',
        category: 'API',
        icon: <Server className="w-5 h-5" />,
        status: 'active'
    },
    {
        id: 'shareBadge',
        name: 'Share Badge OG',
        description: 'Gera página dinâmica com meta tags Open Graph para compartilhamento social de conquistas (badges/patentes).',
        type: 'http',
        trigger: 'HTTPS (GET /shareBadge)',
        region: 'us-central1',
        category: 'Social',
        icon: <Eye className="w-5 h-5" />,
        status: 'active'
    },
    {
        id: 'generateApiKey',
        name: 'Gerar API Key',
        description: 'Endpoint admin para gerar novas API Keys de acesso ao sistema para integrações externas.',
        type: 'callable',
        trigger: 'Callable (Admin)',
        region: 'us-central1',
        category: 'Gestão',
        icon: <Shield className="w-5 h-5" />,
        status: 'active'
    },
    {
        id: 'inviteAdminUser',
        name: 'Convite Admin',
        description: 'Envia convite por email para novos administradores do sistema, definindo role e permissões iniciais.',
        type: 'callable',
        trigger: 'Callable (Super Admin)',
        region: 'us-central1',
        category: 'Auth',
        icon: <Mail className="w-5 h-5" />,
        status: 'active'
    },

    // ─── Scheduled Functions ─────────────────────────────────────
    {
        id: 'scheduledBackup',
        name: 'Backup Automático',
        description: 'Executa backup programado das coleções críticas do Firestore para Cloud Storage. Mantém retenção de 30 dias.',
        type: 'scheduled',
        trigger: 'Cron (diário 03:00 BRT)',
        region: 'southamerica-east1',
        category: 'Infraestrutura',
        icon: <Database className="w-5 h-5" />,
        status: 'active'
    },
    {
        id: 'cleanupOldNotifications',
        name: 'Limpeza de Notificações',
        description: 'Remove notificações lidas com mais de 30 dias de todas as subcoleções de usuários para otimizar custos.',
        type: 'scheduled',
        trigger: 'Cron (semanal)',
        region: 'southamerica-east1',
        category: 'Manutenção',
        icon: <RefreshCw className="w-5 h-5" />,
        status: 'active'
    },
    {
        id: 'syncUserFcmTopics',
        name: 'Sync FCM Topics',
        description: 'Sincroniza tópicos FCM dos usuários com base na cidade e estado do perfil, garantindo segmentação push correta.',
        type: 'callable',
        trigger: 'Callable (Auth)',
        region: 'southamerica-east1',
        category: 'Notificações',
        icon: <MapPin className="w-5 h-5" />,
        status: 'active'
    },
    {
        id: 'enrichCityData',
        name: 'Enriquecimento de Cidades',
        description: 'Enriquece dados de cidades com informações do IBGE (população, área, IDH) para dashboards analytics.',
        type: 'callable',
        trigger: 'Callable (Admin)',
        region: 'us-central1',
        category: 'Dados',
        icon: <Layers className="w-5 h-5" />,
        status: 'active'
    },
    {
        id: 'recalculateCityCounts',
        name: 'Recálculo de Contadores',
        description: 'Recalcula contadores de contribuições aprovadas por cidade. Utilizado após migrações ou correções de dados.',
        type: 'callable',
        trigger: 'Callable (Admin)',
        region: 'us-central1',
        category: 'Migração',
        icon: <RefreshCw className="w-5 h-5" />,
        status: 'active'
    },
    {
        id: 'runRetroactiveAnalysis',
        name: 'Análise Retroativa',
        description: 'Re-executa análise de IA (Gemini) em contribuições existentes que não foram previamente analisadas.',
        type: 'callable',
        trigger: 'Callable (Admin)',
        region: 'us-central1',
        category: 'Moderação',
        icon: <BrainCircuit className="w-5 h-5" />,
        status: 'active'
    },
];

// ─── Extensions Catalog ─────────────────────────────────────────────────────
interface FirebaseExtension {
    id: string;
    name: string;
    description: string;
    provider: string;
    version: string;
    status: 'active' | 'inactive';
    config: Record<string, string>;
    icon: React.ReactNode;
}

const FIREBASE_EXTENSIONS: FirebaseExtension[] = [
    {
        id: 'firestore-send-email',
        name: 'Trigger Email from Firestore',
        description: 'Monitora a coleção "mail" e envia e-mails automaticamente via SMTP (Brevo/Sendinblue). SPF, DKIM e DMARC configurados para máxima entregabilidade.',
        provider: 'Firebase',
        version: '0.1.12',
        status: 'active',
        config: {
            'SMTP Host': 'smtp-relay.brevo.com',
            'Porta': '587 (TLS)',
            'Coleção': 'mail',
            'Autenticação': 'SPF + DKIM + DMARC (Cloudflare DNS)',
            'Remetente': 'noreply@guardiaonacional.com'
        },
        icon: <Mail className="w-5 h-5" />
    },
];

// ─── Firestore Security Rules Summary ───────────────────────────────────────
interface SecurityRule {
    collection: string;
    read: string;
    write: string;
    description: string;
}

const SECURITY_RULES: SecurityRule[] = [
    { collection: 'settings/ads_config', read: 'Autenticado', write: 'Admin', description: 'Configurações de anúncios' },
    { collection: 'settings/system', read: 'Autenticado', write: 'Admin', description: 'Configurações do sistema' },
    { collection: 'contributions', read: 'Público', write: 'Autenticado (próprias)', description: 'Ocorrências do cidadão' },
    { collection: 'users/{uid}', read: 'Próprio + Admin', write: 'Próprio + Admin', description: 'Perfil do usuário' },
    { collection: 'users/{uid}/notifications', read: 'Próprio', write: 'Functions (server)', description: 'Notificações pessoais' },
    { collection: 'messages', read: 'Admin', write: 'Admin', description: 'Mensagens de broadcast' },
    { collection: 'mail', read: 'Admin', write: 'Admin + Functions', description: 'Fila de emails (Brevo)' },
    { collection: 'ad_exempt_users', read: 'Autenticado', write: 'Admin', description: 'Livro dos Guardiões (isentos de ads)' },
    { collection: 'subscriber_cities', read: 'Autenticado', write: 'Admin', description: 'Cidades Assinantes (ad-free)' },
    { collection: 'automation_rules', read: 'Admin', write: 'Admin', description: 'Regras de automação custom' },
    { collection: 'webhooks', read: 'Admin', write: 'Admin', description: 'Webhooks registrados' },
    { collection: 'support_tickets', read: 'Autenticado', write: 'Autenticado', description: 'Tickets de suporte' },
    { collection: 'city_data', read: 'Público', write: 'Functions', description: 'Dados IBGE das cidades' },
];

// ─── Helper Components ──────────────────────────────────────────────────────
function StatusBadge({ status }: { status: 'active' | 'warning' | 'inactive' }) {
    const styles: Record<string, string> = {
        active: 'bg-emerald-100 text-emerald-800 hover:bg-emerald-100',
        warning: 'bg-amber-100 text-amber-800 hover:bg-amber-100',
        inactive: 'bg-gray-100 text-gray-600 hover:bg-gray-100'
    };
    const labels: Record<string, string> = { active: 'Ativo', warning: 'Aviso', inactive: 'Inativo' };
    return <Badge className={styles[status]}>{labels[status]}</Badge>;
}

function TypeBadge({ type }: { type: string }) {
    const styles: Record<string, string> = {
        trigger: 'bg-blue-100 text-blue-800 hover:bg-blue-100',
        http: 'bg-purple-100 text-purple-800 hover:bg-purple-100',
        scheduled: 'bg-orange-100 text-orange-800 hover:bg-orange-100',
        callable: 'bg-cyan-100 text-cyan-800 hover:bg-cyan-100'
    };
    const labels: Record<string, string> = { trigger: 'Trigger', http: 'HTTP', scheduled: 'Agendado', callable: 'Callable' };
    return <Badge className={styles[type] || 'bg-gray-100 text-gray-600'}>{labels[type] || type}</Badge>;
}

// ─── Stats Card ─────────────────────────────────────────────────────────────
function StatsCard({ title, value, description, icon, color }: {
    title: string; value: string | number; description: string; icon: React.ReactNode; color: string;
}) {
    return (
        <Card className="relative overflow-hidden">
            <CardContent className="p-6">
                <div className="flex items-center justify-between">
                    <div>
                        <p className="text-sm font-medium text-gray-500">{title}</p>
                        <p className="text-3xl font-bold text-gray-900 mt-1">{value}</p>
                        <p className="text-xs text-gray-400 mt-1">{description}</p>
                    </div>
                    <div className={`w-12 h-12 rounded-xl ${color} flex items-center justify-center`}>
                        {icon}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════
const AdminAutomations: React.FC = () => {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);
    const [selectedCategory, setSelectedCategory] = useState<string>('all');
    const [expandedFn, setExpandedFn] = useState<string | null>(null);

    // Stats
    const [stats, setStats] = useState({
        totalMessages: 0,
        totalEmails: 0,
        totalContributions: 0,
        totalExemptUsers: 0,
        totalSubscriberCities: 0,
    });

    // Form
    const [newName, setNewName] = useState('');
    const [newTrigger, setNewTrigger] = useState<TriggerType>('contribution_created');
    const [conditions, setConditions] = useState<Condition[]>([]);
    const [actions, setActions] = useState<AutomationAction[]>([]);

    useEffect(() => {
        loadRules();
        loadStats();
    }, []);

    const loadRules = async () => {
        try {
            setLoading(true);
            const data = await automationService.getRules();
            setRules(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadStats = async () => {
        try {
            // Messages count
            const msgSnap = await getDocs(query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(100)));
            const sentMessages = msgSnap.docs.filter(d => d.data().status === 'sent').length;

            // Emails count
            const mailSnap = await getDocs(query(collection(db, 'mail'), limit(100)));

            // Contributions count from system settings
            const settingsDoc = await getDoc(doc(db, 'settings', 'system'));
            const totalContribs = settingsDoc.exists() ? (settingsDoc.data().totalContributions || 0) : 0;

            // Exempt users
            const exemptSnap = await getDocs(collection(db, 'ad_exempt_users'));

            // Subscriber cities
            const citiesSnap = await getDocs(collection(db, 'subscriber_cities'));

            setStats({
                totalMessages: sentMessages,
                totalEmails: mailSnap.size,
                totalContributions: totalContribs,
                totalExemptUsers: exemptSnap.size,
                totalSubscriberCities: citiesSnap.size,
            });
        } catch (err) {
            console.error('Stats load error:', err);
        }
    };

    // ─── Custom Rules CRUD ──────────────────────────────────────────────
    const handleCreateRule = async () => {
        if (!newName) return toast.error("Nome é obrigatório");
        if (actions.length === 0) return toast.error("Adicione pelo menos uma ação");
        try {
            await automationService.createRule({ name: newName, active: true, trigger: newTrigger, conditions, actions });
            toast.success("Regra criada com sucesso!");
            setIsCreateOpen(false);
            resetForm();
            loadRules();
        } catch (error) {
            toast.error("Erro ao criar regra.");
        }
    };

    const resetForm = () => { setNewName(''); setNewTrigger('contribution_created'); setConditions([]); setActions([]); };

    const toggleRule = async (id: string, currentStatus: boolean) => {
        try {
            await automationService.toggleRule(id, !currentStatus);
            setRules(rules.map(r => r.id === id ? { ...r, active: !currentStatus } : r));
            toast.success(currentStatus ? "Regra pausada." : "Regra ativada.");
        } catch { toast.error("Erro ao atualizar."); }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza?")) return;
        try {
            await automationService.deleteRule(id);
            setRules(rules.filter(r => r.id !== id));
            toast.success("Regra removida.");
        } catch { toast.error("Erro ao remover."); }
    };

    const addCondition = () => setConditions([...conditions, { field: 'riskLevel', operator: 'greater_than', value: '3' }]);
    const updateCondition = (index: number, field: keyof Condition, val: any) => {
        const newConds = [...conditions];
        newConds[index] = { ...newConds[index], [field]: val };
        setConditions(newConds);
    };
    const removeCondition = (index: number) => setConditions(conditions.filter((_, i) => i !== index));

    const addAction = () => setActions([...actions, { type: 'log_event', config: { message: 'Automation Triggered' } }]);
    const updateAction = (index: number, field: any, val: any) => {
        const newActions = [...actions];
        if (field === 'type') {
            newActions[index].type = val;
            newActions[index].config = val === 'call_webhook' ? { targetUrl: '' } : { message: 'Log' };
        } else {
            newActions[index].config = { ...newActions[index].config, [field]: val };
        }
        setActions(newActions);
    };
    const removeAction = (index: number) => setActions(actions.filter((_, i) => i !== index));

    // Filtered cloud functions
    const categories = useMemo(() => {
        const cats = new Set(CLOUD_FUNCTIONS.map(f => f.category));
        return ['all', ...Array.from(cats).sort()];
    }, []);

    const filteredFunctions = useMemo(() => {
        if (selectedCategory === 'all') return CLOUD_FUNCTIONS;
        return CLOUD_FUNCTIONS.filter(f => f.category === selectedCategory);
    }, [selectedCategory]);

    const activeFunctions = CLOUD_FUNCTIONS.filter(f => f.status === 'active').length;

    return (
        <div className="p-4 sm:p-6 space-y-6 bg-gray-50 min-h-screen pt-16 md:pt-6">
            {/* Header */}
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Zap className="h-6 w-6 text-yellow-500" /> Central de Automações
                    </h1>
                    <p className="text-sm text-gray-500">
                        {CLOUD_FUNCTIONS.length} Cloud Functions • {FIREBASE_EXTENSIONS.length} Extensão • {rules.length} Regras Custom
                    </p>
                </div>
            </div>

            {/* Stats Row */}
            <div className="grid grid-cols-2 md:grid-cols-5 gap-3">
                <StatsCard
                    title="Cloud Functions"
                    value={activeFunctions}
                    description={`${CLOUD_FUNCTIONS.length} total registradas`}
                    icon={<Cloud className="w-6 h-6 text-white" />}
                    color="bg-blue-500"
                />
                <StatsCard
                    title="Msgs Enviadas"
                    value={stats.totalMessages}
                    description="Push + Email"
                    icon={<Bell className="w-6 h-6 text-white" />}
                    color="bg-emerald-500"
                />
                <StatsCard
                    title="E-mails na Fila"
                    value={stats.totalEmails}
                    description="Via Brevo SMTP"
                    icon={<Mail className="w-6 h-6 text-white" />}
                    color="bg-indigo-500"
                />
                <StatsCard
                    title="Guardiões"
                    value={stats.totalExemptUsers}
                    description="Isentos de anúncios"
                    icon={<Shield className="w-6 h-6 text-white" />}
                    color="bg-amber-500"
                />
                <StatsCard
                    title="Cidades"
                    value={stats.totalSubscriberCities}
                    description="Municípios assinantes"
                    icon={<MapPin className="w-6 h-6 text-white" />}
                    color="bg-teal-500"
                />
            </div>

            {/* Tabs */}
            <Tabs defaultValue="functions" className="w-full">
                <TabsList className="w-full justify-start flex-wrap h-auto gap-1">
                    <TabsTrigger value="functions" className="gap-1"><Cloud className="w-4 h-4" /> Cloud Functions</TabsTrigger>
                    <TabsTrigger value="extensions" className="gap-1"><Cpu className="w-4 h-4" /> Extensões</TabsTrigger>
                    <TabsTrigger value="rules" className="gap-1"><Settings2 className="w-4 h-4" /> Regras Custom</TabsTrigger>
                    <TabsTrigger value="security" className="gap-1"><Shield className="w-4 h-4" /> Firestore Rules</TabsTrigger>
                </TabsList>

                {/* ═══ TAB 1: Cloud Functions ═══ */}
                <TabsContent value="functions" className="space-y-4">
                    {/* Category Filter */}
                    <div className="flex flex-wrap gap-2">
                        {categories.map(cat => (
                            <button
                                key={cat}
                                onClick={() => setSelectedCategory(cat)}
                                className={`px-3 py-1.5 rounded-full text-xs font-medium transition-all ${selectedCategory === cat
                                    ? 'bg-blue-600 text-white shadow-md'
                                    : 'bg-white text-gray-600 border hover:bg-gray-50'
                                    }`}
                            >
                                {cat === 'all' ? `Todas (${CLOUD_FUNCTIONS.length})` : cat}
                            </button>
                        ))}
                    </div>

                    {/* Functions List */}
                    <div className="space-y-3">
                        {filteredFunctions.map(fn => (
                            <Card
                                key={fn.id}
                                className={`transition-all cursor-pointer hover:shadow-md ${expandedFn === fn.id ? 'ring-2 ring-blue-200' : ''}`}
                                onClick={() => setExpandedFn(expandedFn === fn.id ? null : fn.id)}
                            >
                                <CardContent className="p-4">
                                    <div className="flex items-center gap-4">
                                        <div className="w-10 h-10 rounded-xl bg-slate-100 flex items-center justify-center text-slate-600 flex-shrink-0">
                                            {fn.icon}
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2 flex-wrap">
                                                <h3 className="font-semibold text-sm">{fn.name}</h3>
                                                <StatusBadge status={fn.status} />
                                                <TypeBadge type={fn.type} />
                                            </div>
                                            <p className="text-xs text-gray-500 mt-0.5 font-mono">{fn.id}</p>
                                        </div>
                                        <ChevronRight className={`w-4 h-4 text-gray-400 transition-transform flex-shrink-0 ${expandedFn === fn.id ? 'rotate-90' : ''}`} />
                                    </div>

                                    {expandedFn === fn.id && (
                                        <div className="mt-4 pt-4 border-t space-y-3">
                                            <p className="text-sm text-gray-600 leading-relaxed">{fn.description}</p>
                                            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                                                <div className="p-2.5 bg-slate-50 rounded-lg">
                                                    <span className="text-gray-400 uppercase tracking-wider font-medium">Trigger</span>
                                                    <p className="font-mono text-gray-700 mt-1">{fn.trigger}</p>
                                                </div>
                                                <div className="p-2.5 bg-slate-50 rounded-lg">
                                                    <span className="text-gray-400 uppercase tracking-wider font-medium">Região</span>
                                                    <p className="font-mono text-gray-700 mt-1">{fn.region}</p>
                                                </div>
                                                <div className="p-2.5 bg-slate-50 rounded-lg">
                                                    <span className="text-gray-400 uppercase tracking-wider font-medium">Categoria</span>
                                                    <p className="font-mono text-gray-700 mt-1">{fn.category}</p>
                                                </div>
                                            </div>
                                            {fn.collection && (
                                                <div className="text-xs text-gray-400 flex items-center gap-1">
                                                    <Database className="w-3 h-3" /> Coleção: <code className="bg-gray-100 px-1 rounded">{fn.collection}</code>
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* ═══ TAB 2: Extensions ═══ */}
                <TabsContent value="extensions" className="space-y-4">
                    {FIREBASE_EXTENSIONS.map(ext => (
                        <Card key={ext.id} className="border-l-4 border-l-indigo-500">
                            <CardHeader className="pb-3">
                                <div className="flex items-center gap-3">
                                    <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center text-indigo-600">
                                        {ext.icon}
                                    </div>
                                    <div>
                                        <CardTitle className="text-lg flex items-center gap-2">
                                            {ext.name}
                                            <StatusBadge status={ext.status} />
                                        </CardTitle>
                                        <CardDescription>{ext.provider} • v{ext.version}</CardDescription>
                                    </div>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-gray-600 mb-4">{ext.description}</p>
                                <div className="bg-slate-50 rounded-lg p-4">
                                    <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">Configuração</h4>
                                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                                        {Object.entries(ext.config).map(([key, val]) => (
                                            <div key={key} className="flex justify-between text-sm p-2 bg-white rounded">
                                                <span className="text-gray-500 font-medium">{key}</span>
                                                <span className="text-gray-800 font-mono text-xs">{val}</span>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </TabsContent>

                {/* ═══ TAB 3: Custom Rules ═══ */}
                <TabsContent value="rules" className="space-y-4">
                    <div className="flex justify-end">
                        <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                            <DialogTrigger asChild>
                                <Button><Plus className="w-4 h-4 mr-2" /> Nova Regra</Button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                                <DialogHeader>
                                    <DialogTitle>Criar Nova Automação</DialogTitle>
                                    <DialogDescription>Configure gatilhos, condições e ações.</DialogDescription>
                                </DialogHeader>
                                <div className="space-y-6 py-4">
                                    <div className="space-y-2">
                                        <Label>Nome da Regra</Label>
                                        <Input placeholder="Ex: Alerta de Alto Risco" value={newName} onChange={e => setNewName(e.target.value)} />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Gatilho (Trigger)</Label>
                                        <Select value={newTrigger} onValueChange={(v: any) => setNewTrigger(v)}>
                                            <SelectTrigger><SelectValue /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="contribution_created">Nova Contribuição Criada</SelectItem>
                                                <SelectItem value="status_updated">Status Atualizado</SelectItem>
                                                <SelectItem value="risk_level_change">Mudança de Risco</SelectItem>
                                            </SelectContent>
                                        </Select>
                                    </div>
                                    <div className="space-y-2 border p-4 rounded bg-slate-50">
                                        <div className="flex justify-between items-center mb-2">
                                            <Label>Condições (SE)</Label>
                                            <Button variant="outline" size="sm" onClick={addCondition}>Adicionar +</Button>
                                        </div>
                                        {conditions.length === 0 && <p className="text-xs text-gray-500 italic">Nenhuma condição (Executar sempre)</p>}
                                        {conditions.map((cond, idx) => (
                                            <div key={idx} className="flex gap-2 items-center mb-2">
                                                <Select value={cond.field} onValueChange={v => updateCondition(idx, 'field', v)}>
                                                    <SelectTrigger className="w-1/3"><SelectValue placeholder="Campo" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="riskLevel">Risco</SelectItem>
                                                        <SelectItem value="category">Categoria</SelectItem>
                                                        <SelectItem value="status">Status</SelectItem>
                                                        <SelectItem value="city">Cidade</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Select value={cond.operator} onValueChange={v => updateCondition(idx, 'operator', v)}>
                                                    <SelectTrigger className="w-1/3"><SelectValue placeholder="Op" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="equals">Igual a</SelectItem>
                                                        <SelectItem value="not_equals">Diferente</SelectItem>
                                                        <SelectItem value="greater_than">Maior que</SelectItem>
                                                        <SelectItem value="less_than">Menor que</SelectItem>
                                                        <SelectItem value="contains">Contém</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                <Input className="flex-1" placeholder="Valor" value={cond.value} onChange={e => updateCondition(idx, 'value', e.target.value)} />
                                                <Button variant="ghost" size="icon" onClick={() => removeCondition(idx)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                            </div>
                                        ))}
                                    </div>
                                    <div className="space-y-2 border p-4 rounded bg-slate-50">
                                        <div className="flex justify-between items-center mb-2">
                                            <Label>Ações (ENTÃO)</Label>
                                            <Button variant="outline" size="sm" onClick={addAction}>Adicionar +</Button>
                                        </div>
                                        {actions.map((action, idx) => (
                                            <div key={idx} className="space-y-2 mb-4 p-3 border bg-white rounded">
                                                <div className="flex justify-between">
                                                    <Label className="text-xs text-gray-500">Ação #{idx + 1}</Label>
                                                    <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAction(idx)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                                                </div>
                                                <Select value={action.type} onValueChange={v => updateAction(idx, 'type', v)}>
                                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="log_event">Logar Evento</SelectItem>
                                                        <SelectItem value="call_webhook">Chamar Webhook</SelectItem>
                                                        <SelectItem value="send_email">Enviar Email</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                                {action.type === 'call_webhook' && (
                                                    <Input placeholder="URL do Webhook" value={action.config.targetUrl || ''} onChange={e => updateAction(idx, 'targetUrl', e.target.value)} />
                                                )}
                                                {(action.type === 'log_event' || action.type === 'create_notification') && (
                                                    <Input placeholder="Mensagem" value={action.config.message || ''} onChange={e => updateAction(idx, 'message', e.target.value)} />
                                                )}
                                                {action.type === 'send_email' && (
                                                    <Input placeholder="Email Destinatário" value={action.config.recipient || ''} onChange={e => updateAction(idx, 'recipient', e.target.value)} />
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                </div>
                                <DialogFooter>
                                    <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                                    <Button onClick={handleCreateRule}><Save className="w-4 h-4 mr-2" /> Salvar</Button>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {rules.map(rule => (
                            <Card key={rule.id} className={rule.active ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300 opacity-75'}>
                                <CardHeader className="pb-2">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2">
                                                <CardTitle className="text-lg">{rule.name}</CardTitle>
                                                {rule.active ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge> : <Badge variant="secondary">Pausado</Badge>}
                                            </div>
                                            <CardDescription className="text-xs mt-1">Trigger: {rule.trigger}</CardDescription>
                                        </div>
                                        <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id, rule.active)} />
                                    </div>
                                </CardHeader>
                                <CardContent>
                                    <div className="space-y-2 text-sm">
                                        <div className="p-2 bg-slate-50 rounded">
                                            <p className="font-semibold text-xs text-gray-500 uppercase">Condições:</p>
                                            {rule.conditions.length === 0 ? <p className="text-gray-400 italic">Sempre</p> : (
                                                <ul className="list-disc list-inside">
                                                    {rule.conditions.map((c, i) => <li key={i}>{c.field} {c.operator === 'greater_than' ? '>' : c.operator === 'equals' ? '=' : c.operator} {c.value}</li>)}
                                                </ul>
                                            )}
                                        </div>
                                        <div className="p-2 bg-slate-50 rounded">
                                            <p className="font-semibold text-xs text-gray-500 uppercase">Ações:</p>
                                            <ul className="list-disc list-inside">
                                                {rule.actions.map((a, i) => <li key={i}>{a.type === 'call_webhook' ? `Webhook: ${a.config.targetUrl?.slice(0, 20)}...` : a.type}</li>)}
                                            </ul>
                                        </div>
                                        <div className="flex justify-between text-xs text-gray-400 pt-2 border-t">
                                            <span>Execuções: {rule.executionCount || 0}</span>
                                            {rule.lastExecutedAt && <span>Última: {new Date(rule.lastExecutedAt.toDate()).toLocaleDateString()}</span>}
                                        </div>
                                        <Button variant="ghost" size="sm" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(rule.id)}>
                                            <Trash2 className="w-4 h-4 mr-2" /> Excluir
                                        </Button>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>

                    {!loading && rules.length === 0 && (
                        <div className="text-center py-16 bg-white rounded-lg border border-dashed">
                            <Settings2 className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                            <h3 className="text-lg font-medium text-gray-900">Nenhuma regra custom configurada</h3>
                            <p className="text-gray-500">Crie regras para automatizar ações do painel.</p>
                        </div>
                    )}
                </TabsContent>

                {/* ═══ TAB 4: Security Rules ═══ */}
                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-500" /> Firestore Security Rules
                            </CardTitle>
                            <CardDescription>Resumo das regras de segurança aplicadas às coleções do Firestore.</CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="overflow-x-auto">
                                <table className="w-full text-sm">
                                    <thead>
                                        <tr className="border-b bg-slate-50">
                                            <th className="text-left p-3 font-semibold text-gray-600">Coleção</th>
                                            <th className="text-left p-3 font-semibold text-gray-600">Leitura</th>
                                            <th className="text-left p-3 font-semibold text-gray-600">Escrita</th>
                                            <th className="text-left p-3 font-semibold text-gray-600">Descrição</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SECURITY_RULES.map((rule, i) => (
                                            <tr key={i} className="border-b hover:bg-slate-50/50">
                                                <td className="p-3 font-mono text-xs text-blue-700">{rule.collection}</td>
                                                <td className="p-3">
                                                    <Badge className={
                                                        rule.read === 'Público' ? 'bg-green-100 text-green-800 hover:bg-green-100' :
                                                            rule.read.includes('Admin') ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                                                                'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                                    }>
                                                        {rule.read}
                                                    </Badge>
                                                </td>
                                                <td className="p-3">
                                                    <Badge className={
                                                        rule.write.includes('Admin') ? 'bg-red-100 text-red-800 hover:bg-red-100' :
                                                            rule.write.includes('Functions') ? 'bg-purple-100 text-purple-800 hover:bg-purple-100' :
                                                                'bg-blue-100 text-blue-800 hover:bg-blue-100'
                                                    }>
                                                        {rule.write}
                                                    </Badge>
                                                </td>
                                                <td className="p-3 text-gray-500 text-xs">{rule.description}</td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminAutomations;
