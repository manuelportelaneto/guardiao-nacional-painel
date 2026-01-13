import React, { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { toast } from 'sonner';
import { Settings, Shield, Zap } from 'lucide-react';

interface SystemSettings {
    showAds: boolean;
    maintenanceMode: boolean;
    enableGamification: boolean;
    autoPublish: boolean;
}

import { loggingService } from '../../services/loggingService';
import { useAuth } from '../../context/AuthContext';

const DEFAULT_SETTINGS: SystemSettings = {
    showAds: false,
    maintenanceMode: false,
    enableGamification: true,
    autoPublish: false
};

const SystemControls: React.FC = () => {
    const { currentUser } = useAuth();
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        // ... (same as before)
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
        return () => unsubscribe();
    }, []);

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
                                    Ativa ou desativa banners de publicidade em todo o aplicativo.
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
                                    Bloqueia o acesso ao aplicativo para usuários comuns.
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
                                    Habilita ou desabilita o ganho de XP e níveis.
                                </p>
                            </div>
                        </div>
                    </CardContent>
                </Card>


                {/* AI & Moderation */}
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">IA & Moderação</CardTitle>
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
            </div>
        </div >
    );
};

export default SystemControls;
