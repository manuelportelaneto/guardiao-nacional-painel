import React, { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot, collection, query, orderBy, limit, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { CLOUD_FUNCTIONS } from '../../config';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
import { toast } from 'sonner';
import { Shield, Zap, Database, TriangleAlert, CircleCheck, RefreshCw, Globe } from 'lucide-react';
import { Progress } from '../ui/progress';

interface SystemSettings {
    showAds: boolean;
    maintenanceMode: boolean;
    enableGamification: boolean;
    overseasAccessEnabled: boolean;
    overseasAccessUserId?: string;
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
    overseasAccessEnabled: false,
    overseasAccessUserId: "", // NEW FIELD FOR PASSPORT
};

const SystemControls: React.FC = () => {
    const { currentUser } = useAuth();
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);
    const [backupStatus, setBackupStatus] = useState<BackupStatus | null>(null);
    const [loadingBackup, setLoadingBackup] = useState(false);
    // Custom confirmation dialogs
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

    const handleToggle = async (key: keyof SystemSettings | string, exactValue?: any) => {
        let newValue: any;

        if (exactValue !== undefined) {
            newValue = exactValue;
        } else {
            newValue = !settings[key as keyof SystemSettings];
        }

        // Optimistic update
        setSettings(prev => ({ ...prev, [key]: newValue }));

        try {
            const settingsRef = doc(db, 'settings', 'global');
            await setDoc(settingsRef, { [key]: newValue }, { merge: true });

            // Only show toast for boolean toggles to avoid spam on text fields
            if (typeof newValue === 'boolean') {
                toast.success(`Configuração "${key}" atualizada!`);
            }

            if (currentUser) {
                loggingService.logAudit('SETTINGS_UPDATE', currentUser.uid, key as string, {
                    oldValue: typeof newValue === 'boolean' ? !newValue : null,
                    newValue: newValue
                });
            }

        } catch (error) {
            console.error("Error updating setting:", error);
            toast.error("Erro ao salvar alteração.");
            // Rollback if boolean
            if (typeof newValue === 'boolean') {
                setSettings(prev => ({ ...prev, [key]: !newValue }));
            }
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
                    {/* Ads Control Temporarily Removed to avoid duplication - now managed solely in Monetization */}
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
                            {settings.overseasAccessEnabled && (
                                <div className="mt-4 p-3 bg-gray-50 border rounded space-y-2 animate-in fade-in slide-in-from-top-1">
                                    <Label htmlFor="overseasAccessUserId" className="text-xs font-semibold text-gray-700">ID do Usuário (Passaporte Temporário)</Label>
                                    <Input
                                        id="overseasAccessUserId"
                                        placeholder="Ex: uVpXyZh2... (UID do Firebase)"
                                        value={settings.overseasAccessUserId || ''}
                                        onChange={(e: React.ChangeEvent<HTMLInputElement>) => setSettings(prev => ({ ...prev, overseasAccessUserId: e.target.value }))}
                                        onBlur={() => handleToggle('overseasAccessUserId')}
                                        className="text-sm font-mono h-8"
                                    />
                                    <p className="text-[10px] text-gray-500">Este UID terá os bloqueios de geolocalização ignorados no painel e no app.</p>
                                </div>
                            )}
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
