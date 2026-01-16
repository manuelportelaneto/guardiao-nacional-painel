import React, { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { CLOUD_FUNCTIONS } from '../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { toast } from 'sonner';
import { Settings, Shield, Zap, Database, AlertTriangle, CheckCircle, RefreshCw } from 'lucide-react';
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

const DEFAULT_SETTINGS: SystemSettings = {
    showAds: false,
    maintenanceMode: false,
    enableGamification: true,
    autoPublish: false,
    enableAiImageAnalysis: true,
    enableAiTextAnalysis: true,
    notifyOnApproval: true,
    notifyOnRejection: true
};

const SystemControls: React.FC = () => {
    const { currentUser } = useAuth();
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
    const [loadingBackup, setLoadingBackup] = useState(false);

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

if (loading) {
    return <div className="p-8 flex items-center justify-center">Carregando controles...</div>;
}

return (
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

            {/* Messaging Campaigns */}
            <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                    <CardTitle className="text-sm font-medium">Campanhas</CardTitle>
                    <AlertTriangle className="h-4 w-4 text-muted-foreground" />
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

                    <div className="pt-2">
                        <Button
                            size="sm"
                            variant="secondary"
                            className="w-full"
                            onClick={async () => {
                                if (!confirm('Isso irá reprocessar as contribuições "Em Análise". Continuar?')) return;
                                const toastId = toast.loading('Analisando contribuições...');
                                try {
                                    if (!currentUser) throw new Error("Usuário não autenticado");

                                    // Get ID Token for manual auth
                                    const idToken = await currentUser.getIdToken();

                                    const response = await fetch(CLOUD_FUNCTIONS.runRetroactiveAnalysis, {
                                        method: 'POST',
                                        headers: {
                                            'Content-Type': 'application/json',
                                            'Authorization': `Bearer ${idToken}`
                                        },
                                        body: JSON.stringify({ data: { limit: 50, force: true } })
                                    });

                                    if (!response.ok) {
                                        const errorData = await response.json().catch(() => ({}));
                                        throw new Error(errorData.error || `HTTP ${response.status}`);
                                    }

                                    const result = await response.json();
                                    toast.dismiss(toastId);
                                    toast.success(result.data?.message || "Análise concluída!");

                                    if (currentUser) {
                                        loggingService.logAudit('AI_RETROACTIVE_ANALYSIS', currentUser.uid, 'multiple', {
                                            result: result.data
                                        });
                                    }
                                } catch (e: any) {
                                    toast.dismiss(toastId);
                                    toast.error('Erro: ' + e.message);
                                    console.error("AI Analysis Trigger Failed:", e);
                                }
                            }}
                        >
                            <Zap className="mr-2 h-4 w-4" /> Forçar Análise em "Em Análise"
                        </Button>
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
                        onClick={async () => {
                            if (!confirm('Iniciar backup manual agora?')) return;
                            setLoadingBackup(true);
                            try {
                                if (!currentUser) throw new Error('Usuário não autenticado');
                                const idToken = await currentUser.getIdToken();

                                const response = await fetch(CLOUD_FUNCTIONS.manualBackup, {
                                    method: 'POST',
                                    headers: {
                                        'Content-Type': 'application/json',
                                        'Authorization': `Bearer ${idToken}`
                                    },
                                    body: JSON.stringify({})
                                });

                                if (!response.ok) {
                                    const errorData = await response.json().catch(() => ({}));
                                    throw new Error(errorData.error || `HTTP ${response.status}`);
                                }

                                toast.success('Backup iniciado com sucesso!');
                                setTimeout(fetchBackupStatus, 5000);
                            } catch (e: any) {
                                toast.error('Erro ao iniciar backup: ' + e.message);
                                console.error('Backup Failed:', e);
                            } finally {
                                setLoadingBackup(false);
                            }
                        }}
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
                                    <AlertTriangle className="w-4 h-4" />
                                    <span>Armazenamento próximo do limite! Considere limpar backups antigos.</span>
                                </div>
                            )}

                            {!backupStatus.isApproachingLimit && backupStatus.lastBackup && (
                                <div className="flex items-center gap-2 text-green-600 text-xs bg-green-50 p-2 rounded">
                                    <CheckCircle className="w-4 h-4" />
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
);
};

export default SystemControls;
