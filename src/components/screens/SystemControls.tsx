import React, { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { CLOUD_FUNCTIONS } from '../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';
import { Settings, Shield, Zap, Database, TriangleAlert, CircleCheck, RefreshCw, Globe } from 'lucide-react';
import { Progress } from '../ui/progress';

interface SystemSettings {
    showAds: boolean;
    maintenanceMode: boolean;
    enableGamification: boolean;
    autoPublish: boolean;
    enableAiImageAnalysis: boolean;
    enableAiTextAnalysis: boolean;
    notifyOnApproval: boolean;
    notifyOnRejection: boolean;
    overseasAccessEnabled: boolean;
    // Message Templates
    welcomeMessage?: string;
    approvedMessage?: string;
    rejectedMessage?: string;
    resolvedMessage?: string;
}

interface BackupStatus {
    lastBackup: string | null;
    storageUsedGB: number;
    storagePercent: number;
    isApproachingLimit: boolean;
    backupCount: number;
}

import { loggingService } from '../../services/loggingService';
import { useAuth } from '../../context/AuthContext';
import { Textarea } from '../ui/textarea';
import { Badge } from '../ui/badge';

const DEFAULT_SETTINGS: SystemSettings = {
    showAds: false,
    maintenanceMode: false,
    enableGamification: true,
    autoPublish: false,
    enableAiImageAnalysis: true,
    enableAiTextAnalysis: true,
    notifyOnApproval: true,
    notifyOnRejection: true,
    overseasAccessEnabled: false,
    welcomeMessage: "Bem-vindo ao Guardião Nacional! Estamos felizes em tê-lo conosco.",
    approvedMessage: "Sua contribuição '{title}' foi publicada e registrada no Guardião Nacional. Os dados enviados serão analisados e, após a aprovação, sua contribuição aparecerá no mapa. Obrigado por contribuir!",
    rejectedMessage: "Sua contribuição '{title}' não pôde ser aprovada. Verifique nossas diretrizes.",
    resolvedMessage: "Ótima notícia! A contribuição '{title}' foi marcada como resolvida."
};

const SystemControls: React.FC = () => {
    const { currentUser } = useAuth();
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
    const [loadingBackup, setLoadingBackup] = useState(false);
    const [aiAnalysisRunning, setAiAnalysisRunning] = useState(false);
    const [aiAnalysisResult, setAiAnalysisResult] = useState<{ processed: number; autoApproved: number; rejected: number; message: string } | null>(null);
    // Custom confirmation dialogs (replaces window.confirm)
    const [showAiConfirmDialog, setShowAiConfirmDialog] = useState(false);
    const [showBackupConfirmDialog, setShowBackupConfirmDialog] = useState(false);

    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() } as SystemSettings);
            } else {
                setSettings(DEFAULT_SETTINGS);
            }
            setLoading(false);
        }, (error) => {
            console.error("Error fetching settings:", error);
            toast.error("Erro ao carregar configurações.");
            setLoading(false);
        });

        // Fetch last backup info from audit_logs
        fetchBackupStatus();

        return () => unsubscribe();
    }, []);

    const fetchBackupStatus = async () => {
        setLoadingBackup(true);
        try {
            const q = query(
                collection(db, 'audit_logs'),
                orderBy('timestamp', 'desc'),
                limit(50)
            );
            const snapshot = await getDocs(q);

            const backupLogs = snapshot.docs
                .map(d => ({ id: d.id, ...d.data() }))
                .filter((log: any) => log.action === 'firestore_backup' || log.action === 'manual_backup');

            const lastBackup = backupLogs[0] as any;
            const storageAlert = snapshot.docs
                .map(d => d.data())
                .find((log: any) => log.action === 'storage_alert');

            // Fix: Use usage from last backup log if no alert exists (alerts only trigger at >4GB)
            let currentUsage = 0;
            if (storageAlert?.details?.currentUsageGB) {
                currentUsage = parseFloat(storageAlert.details.currentUsageGB);
            } else if (lastBackup?.details?.storageUsedGB) {
                currentUsage = parseFloat(lastBackup.details.storageUsedGB);
            }

            setBackupStatus({
                lastBackup: lastBackup?.details?.timestamp || null,
                storageUsedGB: currentUsage,
                storagePercent: (currentUsage / 5) * 100, // Recalculate percent based on 5GB limit
                isApproachingLimit: !!storageAlert,
                backupCount: backupLogs.length
            });

        } catch (error) {
            console.warn('Could not fetch backup status:', error);
        } finally {
            setLoadingBackup(false);
        }
    };

    const handleToggle = async (key: keyof SystemSettings) => {
        const newValue = !settings[key];

        // Optimistic update
        setSettings(prev => ({ ...prev, [key]: newValue }));

        try {
            const settingsRef = doc(db, 'settings', 'global');
            await setDoc(settingsRef, { [key]: newValue }, { merge: true });
            toast.success(`Configuração "${key}" atualizada!`);

            if (currentUser) {
                loggingService.logAudit('SETTINGS_UPDATE', currentUser.uid, key, {
                    oldValue: !newValue,
                    newValue: newValue
                });
            }

        } catch (error) {
            console.error("Error updating setting:", error);
            toast.error("Erro ao salvar alteração.");
            // Rollback
            setSettings(prev => ({ ...prev, [key]: !newValue }));
        }
    };

    // Extracted: runs the AI retroactive analysis (called from confirmation dialog)
    const runAiAnalysis = async () => {
        setShowAiConfirmDialog(false);
        setAiAnalysisRunning(true);
        setAiAnalysisResult(null);
        const toastId = toast.loading('Analisando contribuições com IA...');
        try {
            if (!currentUser) throw new Error('Usuário não autenticado');
            const idToken = await currentUser.getIdToken(true);

            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 120_000);

            const response = await fetch(CLOUD_FUNCTIONS.runRetroactiveAnalysis, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ data: { limit: 50 } }),
                signal: controller.signal
            });

            clearTimeout(timeout);

            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as { error?: string };
                throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
            }

            const result = await response.json() as { data?: { processed: number; autoApproved: number; rejected: number; message: string } };
            toast.dismiss(toastId);
            toast.success(result.data?.message || 'Análise concluída!');
            if (result.data) setAiAnalysisResult(result.data);

            if (currentUser) {
                loggingService.logAudit('AI_RETROACTIVE_ANALYSIS', currentUser.uid, 'multiple', { result: result.data });
            }
        } catch (e: unknown) {
            toast.dismiss(toastId);
            const err = e as { name?: string; message?: string };
            if (err.name === 'AbortError') {
                toast.error('Tempo limite excedido (2 min). A análise pode ainda estar rodando no servidor.');
            } else {
                toast.error('Erro: ' + (err.message || 'Falha desconhecida'));
            }
            console.error('AI Analysis Failed:', e);
        } finally {
            setAiAnalysisRunning(false);
        }
    };

    // Extracted: runs a manual backup (called from confirmation dialog)
    const handleManualBackup = async () => {
        setShowBackupConfirmDialog(false);
        setLoadingBackup(true);
        try {
            if (!currentUser) throw new Error('Usuário não autenticado');
            const idToken = await currentUser.getIdToken(true);
            const response = await fetch(CLOUD_FUNCTIONS.manualBackup, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${idToken}` },
                body: JSON.stringify({})
            });
            if (!response.ok) {
                const errorData = await response.json().catch(() => ({})) as { error?: string };
                throw new Error(errorData.error || `HTTP ${response.status}`);
            }
            toast.success('Backup iniciado com sucesso!');
            setTimeout(fetchBackupStatus, 5000);
        } catch (e: unknown) {
            const err = e as { message?: string };
            toast.error('Erro ao iniciar backup: ' + (err.message || 'Erro desconhecido'));
        } finally {
            setLoadingBackup(false);
        }
    };

    if (loading) {
        return <div className="p-8 flex items-center justify-center">Carregando controles...</div>;
    }

    return (
        <>
            <div className="space-y-6">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Controles do Sistema</h1>
                    <p className="text-muted-foreground">Gerencie as configurações globais do aplicativo em tempo real.</p>
                </div>

                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {/* Ads Control */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Publicidade</CardTitle>
                            <Settings className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4 mt-4">
                                <Switch
                                    id="showAds"
                                    checked={settings.showAds}
                                    onCheckedChange={() => handleToggle('showAds')}
                                />
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="showAds" className="text-sm font-medium leading-none">
                                        Exibir Anúncios
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Ativa banners e interstitials no app.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Maintenance Mode */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Manutenção</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4 mt-4">
                                <Switch
                                    id="maintenanceMode"
                                    checked={settings.maintenanceMode}
                                    onCheckedChange={() => handleToggle('maintenanceMode')}
                                />
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="maintenanceMode" className="text-sm font-medium leading-none">
                                        Modo Manutenção
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Bloqueia acesso ao app para usuários.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Gamification */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Gamificação</CardTitle>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4 mt-4">
                                <Switch
                                    id="enableGamification"
                                    checked={settings.enableGamification}
                                    onCheckedChange={() => handleToggle('enableGamification')}
                                />
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="enableGamification" className="text-sm font-medium leading-none">
                                        Sistema de XP
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Ativa badges, níveis e missões.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Overseas Access */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Acesso Internacional</CardTitle>
                            <Globe className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4 mt-4">
                                <Switch
                                    id="overseasAccessEnabled"
                                    checked={settings.overseasAccessEnabled}
                                    onCheckedChange={() => handleToggle('overseasAccessEnabled')}
                                />
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="overseasAccessEnabled" className="text-sm font-medium leading-none">
                                        Exceção P/ Exterior (Bypass WAF)
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Abertura pontual/programada para um usuário em viagem.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Messaging Campaigns */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Campanhas</CardTitle>
                            <TriangleAlert className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-4 mt-4">
                                <Switch
                                    id="notifyOnApproval"
                                    checked={settings.notifyOnApproval}
                                    onCheckedChange={() => handleToggle('notifyOnApproval')}
                                />
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="notifyOnApproval" className="text-sm font-medium leading-none">
                                        Notificar Aprovação
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Envia email ao aprovar contribuição.
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <Switch
                                    id="notifyOnRejection"
                                    checked={settings.notifyOnRejection}
                                    onCheckedChange={() => handleToggle('notifyOnRejection')}
                                />
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="notifyOnRejection" className="text-sm font-medium leading-none">
                                        Notificar Rejeição
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Envia email ao rejeitar contribuição.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Notification Templates */}
                    <Card className="md:col-span-2 lg:col-span-3">
                        <CardHeader>
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Settings className="h-4 w-4" />
                                Modelos de Notificação
                            </CardTitle>
                            <p className="text-xs text-muted-foreground">
                                Configure as mensagens automáticas enviadas aos usuários. Use <strong>{'{title}'}</strong>, <strong>{'{authorName}'}</strong> e <strong>{'{status}'}</strong> como variáveis.
                            </p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="welcomeMessage">Mensagem de Boas-vindas</Label>
                                    <Textarea
                                        id="welcomeMessage"
                                        value={settings.welcomeMessage || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, welcomeMessage: e.target.value }))}
                                        onBlur={() => handleToggle('welcomeMessage' as keyof SystemSettings)}
                                        placeholder="Mensagem enviada ao cadastrar..."
                                        className="min-h-[80px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="approvedMessage">Contribuição Aprovada</Label>
                                    <Textarea
                                        id="approvedMessage"
                                        value={settings.approvedMessage || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, approvedMessage: e.target.value }))}
                                        onBlur={() => handleToggle('approvedMessage' as keyof SystemSettings)}
                                        placeholder="Mensagem ao aprovar..."
                                        className="min-h-[80px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="rejectedMessage">Contribuição Rejeitada</Label>
                                    <Textarea
                                        id="rejectedMessage"
                                        value={settings.rejectedMessage || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, rejectedMessage: e.target.value }))}
                                        onBlur={() => handleToggle('rejectedMessage' as keyof SystemSettings)}
                                        placeholder="Mensagem ao rejeitar..."
                                        className="min-h-[80px]"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="resolvedMessage">Contribuição Resolvida (Manual)</Label>
                                    <Textarea
                                        id="resolvedMessage"
                                        value={settings.resolvedMessage || ''}
                                        onChange={(e) => setSettings(prev => ({ ...prev, resolvedMessage: e.target.value }))}
                                        onBlur={() => handleToggle('resolvedMessage' as keyof SystemSettings)}
                                        placeholder="Mensagem ao marcar como resolvido..."
                                        className="min-h-[80px]"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Auto-Publish */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Moderação</CardTitle>
                            <Shield className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center space-x-4 mt-4">
                                <Switch
                                    id="autoPublish"
                                    checked={settings.autoPublish}
                                    onCheckedChange={() => handleToggle('autoPublish')}
                                />
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="autoPublish" className="text-sm font-medium leading-none">
                                        Auto-Publicação
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Aprova automaticamente contribuições de baixo risco.
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* AI Controls */}
                    <Card>
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium">Inteligência Artificial</CardTitle>
                            <Zap className="h-4 w-4 text-muted-foreground" />
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-4 mt-4">
                                <Switch
                                    id="enableAiImage"
                                    checked={settings.enableAiImageAnalysis}
                                    onCheckedChange={() => handleToggle('enableAiImageAnalysis')}
                                />
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="enableAiImage" className="text-sm font-medium leading-none">
                                        Análise de Imagens
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Google Cloud Vision (SafeSearch)
                                    </p>
                                </div>
                            </div>

                            <div className="flex items-center space-x-4">
                                <Switch
                                    id="enableAiText"
                                    checked={settings.enableAiTextAnalysis}
                                    onCheckedChange={() => handleToggle('enableAiTextAnalysis')}
                                />
                                <div className="flex-1 space-y-1">
                                    <Label htmlFor="enableAiText" className="text-sm font-medium leading-none">
                                        Moderação de Texto
                                    </Label>
                                    <p className="text-xs text-muted-foreground">
                                        Google Cloud Natural Language
                                    </p>
                                </div>
                            </div>

                            <div className="pt-3 space-y-3">
                                {/* AI Status Badge */}
                                <div className="flex items-center justify-between text-xs">
                                    <span className="text-muted-foreground">Status da IA</span>
                                    <Badge
                                        variant="outline"
                                        className={`${settings.enableAiTextAnalysis || settings.enableAiImageAnalysis
                                            ? 'border-green-300 text-green-700 bg-green-50'
                                            : 'border-red-300 text-red-700 bg-red-50'
                                            }`}
                                    >
                                        {settings.enableAiTextAnalysis || settings.enableAiImageAnalysis
                                            ? '✓ Ativa (Gemini 1.5 Flash)'
                                            : '✗ Desativada'
                                        }
                                    </Badge>
                                </div>

                                <Button
                                    size="sm"
                                    variant="secondary"
                                    className="w-full"
                                    disabled={aiAnalysisRunning}
                                    onClick={() => setShowAiConfirmDialog(true)}
                                >
                                    {aiAnalysisRunning
                                        ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />Analisando...</>
                                        : <><Zap className="mr-2 h-4 w-4" />Forçar Análise em "Em Análise"</>
                                    }
                                </Button>

                                {/* Result box */}
                                {aiAnalysisResult && (
                                    <div className="bg-green-50 border border-green-200 rounded p-3 text-xs space-y-1">
                                        <p className="font-semibold text-green-800">✓ Análise Concluída</p>
                                        <p className="text-green-700">{aiAnalysisResult.message}</p>
                                        <div className="flex flex-col gap-1 pt-1">
                                            <span className="text-slate-600">Processados: <strong>{aiAnalysisResult.processed}</strong></span>
                                            <span className="text-green-700">Aprovados: <strong>{aiAnalysisResult.autoApproved}</strong></span>
                                            <span className="text-red-700">Rejeitados: <strong>{aiAnalysisResult.rejected}</strong></span>
                                        </div>
                                    </div>
                                )}
                            </div>
                        </CardContent>
                    </Card>

                    {/* Backup Status Card */}
                    <Card className="md:col-span-2">
                        <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                            <CardTitle className="text-sm font-medium flex items-center gap-2">
                                <Database className="h-4 w-4" />
                                Backups do Firestore
                            </CardTitle>
                            <Button
                                variant="ghost"
                                size="sm"
                                onClick={fetchBackupStatus}
                                disabled={loadingBackup}
                            >
                                <RefreshCw className={`h-4 w-4 ${loadingBackup ? 'animate-spin' : ''}`} />
                            </Button>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <Button
                                className="w-full mb-2"
                                variant="outline"
                                onClick={() => setShowBackupConfirmDialog(true)}
                                disabled={loadingBackup}
                            >
                                <Database className="mr-2 h-4 w-4" /> Fazer Backup Agora
                            </Button>
                            {backupStatus ? (
                                <>
                                    <div className="flex items-center justify-between text-sm">
                                        <span className="text-muted-foreground">Último backup:</span>
                                        <span className="font-medium">
                                            {backupStatus.lastBackup || 'Nenhum registro'}
                                        </span>
                                    </div>

                                    <div className="space-y-2">
                                        <div className="flex items-center justify-between text-sm">
                                            <span className="text-muted-foreground">Armazenamento:</span>
                                            <span className={`font-medium ${backupStatus.isApproachingLimit ? 'text-orange-500' : 'text-green-500'}`}>
                                                {backupStatus.storageUsedGB.toFixed(2)} GB / 5 GB
                                            </span>
                                        </div>
                                        <Progress
                                            value={backupStatus.storagePercent}
                                            className={backupStatus.isApproachingLimit ? 'bg-orange-100' : ''}
                                        />
                                    </div>

                                    {backupStatus.isApproachingLimit && (
                                        <div className="flex items-center gap-2 text-orange-600 text-xs bg-orange-50 p-2 rounded">
                                            <TriangleAlert className="w-4 h-4" />
                                            <span>Armazenamento próximo do limite! Considere limpar backups antigos.</span>
                                        </div>
                                    )}

                                    {!backupStatus.isApproachingLimit && backupStatus.lastBackup && (
                                        <div className="flex items-center gap-2 text-green-600 text-xs bg-green-50 p-2 rounded">
                                            <CircleCheck className="w-4 h-4" />
                                            <span>Backups automáticos funcionando normalmente.</span>
                                        </div>
                                    )}

                                    <p className="text-xs text-muted-foreground">
                                        Backups automáticos diários às 03:00 (Brasília). Retenção: 30 dias.
                                    </p>
                                </>
                            ) : (
                                <div className="text-sm text-muted-foreground">
                                    <p>⚠️ Sistema de backup ainda não configurado.</p>
                                    <p className="text-xs mt-2">
                                        Requer deploy da Cloud Function e configuração do bucket no Google Cloud Console.
                                    </p>
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </div>
            </div>

            {/* ===== AI Analysis Confirmation Dialog ===== */}
            <Dialog open={showAiConfirmDialog} onOpenChange={setShowAiConfirmDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Zap className="w-5 h-5 text-amber-500" />
                            Forçar Análise com IA
                        </DialogTitle>
                        <DialogDescription>
                            Isso irá reprocessar até <strong>50 contribuições</strong> no status
                            "Em Análise" usando o <strong>Gemini 1.5 Flash</strong>.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-2 text-sm text-muted-foreground space-y-2">
                        <p>• Contribuições aprovadas (risco ≤ 2) serão <strong>auto-publicadas</strong> se Auto-Publicação estiver ativa.</p>
                        <p>• Contribuições com conteúdo impróprio serão <strong>rejeitadas</strong> automaticamente.</p>
                        <p>• A operação pode levar até <strong>2 minutos</strong>.</p>
                    </div>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowAiConfirmDialog(false)}>Cancelar</Button>
                        <Button onClick={runAiAnalysis}>
                            <Zap className="w-4 h-4 mr-2" /> Confirmar Análise
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* ===== Backup Confirmation Dialog ===== */}
            <Dialog open={showBackupConfirmDialog} onOpenChange={setShowBackupConfirmDialog}>
                <DialogContent className="sm:max-w-md">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <Database className="w-5 h-5 text-blue-500" />
                            Backup Manual
                        </DialogTitle>
                        <DialogDescription>
                            Iniciar backup completo do Firestore agora?
                            O processo ocorre em background e pode levar alguns minutos.
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter className="gap-2">
                        <Button variant="outline" onClick={() => setShowBackupConfirmDialog(false)}>Cancelar</Button>
                        <Button onClick={handleManualBackup}>
                            <Database className="w-4 h-4 mr-2" /> Iniciar Backup
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </>
    );
};

export default SystemControls;
