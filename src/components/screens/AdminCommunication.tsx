import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MessageSquare, TrendingUp, History, Send, Settings as SettingsIcon, TriangleAlert } from 'lucide-react';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { useAuth } from '../../context/AuthContext';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Textarea } from '../ui/textarea';
import { toast } from 'sonner';
import { loggingService } from '../../services/loggingService';
import MarketingScreen from './MarketingScreen';
import MessageComposer from './MessageComposer';
import MessageHistory from './MessageHistory';

interface SystemSettings {
    notifyOnApproval: boolean;
    notifyOnRejection: boolean;
    welcomeMessage?: string;
    approvedMessage?: string;
    rejectedMessage?: string;
    resolvedMessage?: string;
}

const DEFAULT_SETTINGS: SystemSettings = {
    notifyOnApproval: true,
    notifyOnRejection: true,
    welcomeMessage: "Bem-vindo ao Guardião Nacional! Estamos felizes em tê-lo conosco.",
    approvedMessage: "Sua contribuição '{title}' foi publicada e registrada no Guardião Nacional. Os dados enviados serão analisados e, após a aprovação, sua contribuição aparecerá no mapa. Obrigado por contribuir!",
    rejectedMessage: "Sua contribuição '{title}' não pôde ser aprovada. Verifique nossas diretrizes.",
    resolvedMessage: "Ótima notícia! A contribuição '{title}' foi marcada como resolvida."
};

const AdminCommunication: React.FC = () => {
    const { currentUser } = useAuth();
    const [activeTab, setActiveTab] = useState('compose');
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);

    React.useEffect(() => {
        const settingsRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() } as SystemSettings);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleToggle = async (key: keyof SystemSettings, exactValue?: string | boolean) => {
        let newValue = exactValue !== undefined ? exactValue : !settings[key as keyof SystemSettings];
        setSettings((prev: SystemSettings) => ({ ...prev, [key]: newValue }));
        try {
            await setDoc(doc(db, 'settings', 'global'), { [key]: newValue }, { merge: true });
            if (typeof newValue === 'boolean') toast.success(`Configuração atualizada!`);
            if (currentUser) loggingService.logAudit('SETTINGS_UPDATE', currentUser.uid, key, { newValue });
        } catch (error) {
            toast.error("Erro ao salvar.");
            if (typeof newValue === 'boolean') setSettings((prev: SystemSettings) => ({ ...prev, [key]: !newValue }));
        }
    };

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Comunicação e Engajamento</h1>
                <p className="text-muted-foreground">Central de mensagens, notificações push e campanhas de marketing.</p>
            </div>

            <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="compose" className="gap-2">
                        <Send className="w-4 h-4" />
                        Nova Mensagem
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="w-4 h-4" />
                        Histórico
                    </TabsTrigger>
                    <TabsTrigger value="marketing" className="gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Marketing (Banners)
                    </TabsTrigger>
                    <TabsTrigger value="config" className="gap-2">
                        <SettingsIcon className="w-4 h-4" />
                        Configurações
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="compose" className="pt-4 grid gap-6 grid-cols-1 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <MessageComposer />
                    </div>
                    <div className="lg:col-span-1">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 space-y-4">
                            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" /> Dicas de Engajamento
                            </h3>
                            <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                                <li>Use títulos curtos e diretos.</li>
                                <li>Adicione imagens para aumentar a taxa de cliques em 40%.</li>
                                <li>Segmente por localização para evitar spam.</li>
                                <li>Horários de pico: 11h e 18h.</li>
                            </ul>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="history" className="pt-4">
                    <MessageHistory />
                </TabsContent>

                <TabsContent value="marketing" className="pt-4">
                    <MarketingScreen />
                </TabsContent>

                <TabsContent value="config" className="pt-4 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Messaging Campaigns */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Campanhas</CardTitle>
                                <TriangleAlert className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="space-y-4 text-xs">
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
                        <Card className="md:col-span-2">
                            <CardHeader className="space-y-1">
                                <CardTitle className="text-sm font-medium flex items-center gap-2">
                                    <SettingsIcon className="h-4 w-4" />
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
                                            onChange={(e) => setSettings((prev: SystemSettings) => ({ ...prev, welcomeMessage: e.target.value }))}
                                            onBlur={(e) => handleToggle('welcomeMessage', e.target.value)}
                                            placeholder="Mensagem enviada ao cadastrar..."
                                            className="min-h-[80px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="approvedMessage">Contribuição Aprovada</Label>
                                        <Textarea
                                            id="approvedMessage"
                                            value={settings.approvedMessage || ''}
                                            onChange={(e) => setSettings((prev: SystemSettings) => ({ ...prev, approvedMessage: e.target.value }))}
                                            onBlur={(e) => handleToggle('approvedMessage', e.target.value)}
                                            placeholder="Mensagem ao aprovar..."
                                            className="min-h-[80px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="rejectedMessage">Contribuição Rejeitada</Label>
                                        <Textarea
                                            id="rejectedMessage"
                                            value={settings.rejectedMessage || ''}
                                            onChange={(e) => setSettings((prev: SystemSettings) => ({ ...prev, rejectedMessage: e.target.value }))}
                                            onBlur={(e) => handleToggle('rejectedMessage', e.target.value)}
                                            placeholder="Mensagem ao rejeitar..."
                                            className="min-h-[80px]"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="resolvedMessage">Contribuição Resolvida (Manual)</Label>
                                        <Textarea
                                            id="resolvedMessage"
                                            value={settings.resolvedMessage || ''}
                                            onChange={(e) => setSettings((prev: SystemSettings) => ({ ...prev, resolvedMessage: e.target.value }))}
                                            onBlur={(e) => handleToggle('resolvedMessage', e.target.value)}
                                            placeholder="Mensagem ao marcar como resolvido..."
                                            className="min-h-[80px]"
                                        />
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminCommunication;
