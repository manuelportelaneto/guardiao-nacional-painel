import React, { useState, useEffect } from 'react';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { toast } from 'sonner';
import { DollarSign, Save, Smartphone, LayoutTemplate, CircleAlert, Users, MapPin } from 'lucide-react';
import { loggingService } from '../../services/loggingService';
import { useAuth } from '../../context/AuthContext';
import { Checkbox } from '../ui/checkbox';

interface AdsConfig {
    showAds: boolean;
    admobAppId: string;
    admobBannerUnitId: string;
    admobInterstitialUnitId: string;
    adsensePublisherId: string;
    adsenseSlotId: string;
    targetCities: string;
    targetProfiles: string[];
}

const DEFAULT_CONFIG: AdsConfig = {
    showAds: false,
    admobAppId: '',
    admobBannerUnitId: '',
    admobInterstitialUnitId: '',
    adsensePublisherId: '',
    adsenseSlotId: '',
    targetCities: '',
    targetProfiles: ['Cidadão', 'Vip']
};

const AdminMonetization: React.FC = () => {
    const { currentUser } = useAuth();
    const [config, setConfig] = useState<AdsConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);

    useEffect(() => {
        const configRef = doc(db, 'settings', 'monetization');
        const unsubscribe = onSnapshot(configRef, (docSnap) => {
            if (docSnap.exists()) {
                setConfig({ ...DEFAULT_CONFIG, ...docSnap.data() } as AdsConfig);
            } else {
                setConfig(DEFAULT_CONFIG);
            }
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const handleChange = (field: keyof AdsConfig, value: any) => {
        setConfig(prev => ({ ...prev, [field]: value }));
    };

    const handleSave = async () => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'monetization'), config, { merge: true });

            // Sync showAds with global settings if it exists there
            await setDoc(doc(db, 'settings', 'global'), { showAds: config.showAds }, { merge: true });

            toast.success("Configurações de monetização salvas com sucesso!");

            if (currentUser) {
                loggingService.logAudit('SETTINGS_UPDATE' as any, currentUser.uid, 'settings', config);
            }
        } catch (error) {
            console.error("Error saving monetization settings:", error);
            toast.error("Erro ao salvar configurações.");
        } finally {
            setSaving(false);
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-500">Carregando painel de monetização...</div>;

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 font-outfit flex items-center gap-2">
                        <DollarSign className="h-8 w-8 text-green-600" />
                        Monetização & Anúncios
                    </h1>
                    <p className="text-muted-foreground">
                        Gerencie as chaves e a exibição do AdSense (Web) e AdMob (App).
                    </p>
                </div>
                <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar Alterações'}
                </Button>
            </div>

            <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3 text-yellow-800 text-sm">
                <CircleAlert className="h-5 w-5 shrink-0" />
                <p>
                    <strong>Atenção:</strong> Alterar as chaves de anúncio pode levar algumas horas para ser propagado em todos os clientes devido ao cache.
                </p>
            </div>

            <Card className="border-green-100 shadow-sm">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <LayoutTemplate className="h-5 w-5 text-gray-400" />
                        Status Global
                    </CardTitle>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center space-x-4">
                        <Switch
                            id="showAds"
                            checked={config.showAds}
                            onCheckedChange={(c) => handleChange('showAds', c)}
                        />
                        <div className="flex-1 space-y-1">
                            <Label htmlFor="showAds" className="text-sm font-medium leading-none">
                                Habilitar Anúncios na Plataforma
                            </Label>
                            <p className="text-xs text-muted-foreground">
                                Quando desativado, nenhum anúncio será exibido, independente das chaves configuradas abaixo.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <div className="grid md:grid-cols-2 gap-6">
                {/* AdMob Settings */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <Smartphone className="h-5 w-5 text-blue-500" />
                            Configurações AdMob (Mobile)
                        </CardTitle>
                        <CardDescription>
                            Chaves usadas pelos aplicativos iOS e Android.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="admobAppId">App ID</Label>
                            <Input
                                id="admobAppId"
                                value={config.admobAppId}
                                onChange={(e) => handleChange('admobAppId', e.target.value)}
                                placeholder="ca-app-pub-xxxxxxxxxxxxxxxx~yyyyyyyyyy"
                                className="font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="admobBannerUnitId">Bloco Banner ID</Label>
                            <Input
                                id="admobBannerUnitId"
                                value={config.admobBannerUnitId}
                                onChange={(e) => handleChange('admobBannerUnitId', e.target.value)}
                                placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/zzzzzzzzzz"
                                className="font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="admobInterstitialUnitId">Bloco Interstitial ID</Label>
                            <Input
                                id="admobInterstitialUnitId"
                                value={config.admobInterstitialUnitId}
                                onChange={(e) => handleChange('admobInterstitialUnitId', e.target.value)}
                                placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/wwwwwwwwww"
                                className="font-mono text-sm"
                            />
                        </div>
                    </CardContent>
                </Card>

                {/* AdSense Settings */}
                <Card className="shadow-sm">
                    <CardHeader>
                        <CardTitle className="text-lg flex items-center gap-2">
                            <LayoutTemplate className="h-5 w-5 text-orange-500" />
                            Configurações AdSense (Web/Painel)
                        </CardTitle>
                        <CardDescription>
                            Chaves usadas na versão Web para exibição lateral e rodapé.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label htmlFor="adsensePublisherId">Publisher ID</Label>
                            <Input
                                id="adsensePublisherId"
                                value={config.adsensePublisherId}
                                onChange={(e) => handleChange('adsensePublisherId', e.target.value)}
                                placeholder="pub-xxxxxxxxxxxxxxxx"
                                className="font-mono text-sm"
                            />
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="adsenseSlotId">Slot ID Padrão</Label>
                            <Input
                                id="adsenseSlotId"
                                value={config.adsenseSlotId}
                                onChange={(e) => handleChange('adsenseSlotId', e.target.value)}
                                placeholder="1234567890"
                                className="font-mono text-sm"
                            />
                        </div>
                    </CardContent>
                </Card>
            </div>

            {/* Configurações de Segmentação */}
            <Card className="shadow-sm border-blue-100">
                <CardHeader>
                    <CardTitle className="text-lg flex items-center gap-2">
                        <Users className="h-5 w-5 text-blue-500" />
                        Segmentação (Público-Alvo)
                    </CardTitle>
                    <CardDescription>
                        Filtre quem deverá ver anúncios no aplicativo guardião-nacional.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <MapPin className="h-4 w-4 text-gray-500" />
                            Cidades Alvo
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Digite os nomes das cidades separados por vírgula (ex: São Paulo, Campinas). Deixe em branco para exibir em todas.
                        </p>
                        <Input
                            id="targetCities"
                            value={config.targetCities || ''}
                            onChange={(e) => handleChange('targetCities', e.target.value)}
                            placeholder="Cidades..."
                            className="text-sm"
                        />
                    </div>

                    <div className="space-y-3">
                        <Label className="flex items-center gap-2 text-sm font-semibold">
                            <Users className="h-4 w-4 text-gray-500" />
                            Perfis de Usuário
                        </Label>
                        <p className="text-xs text-muted-foreground">
                            Selecione quais perfis sociais verão os anúncios nas telas do aplicativo e site.
                        </p>
                        <div className="flex gap-4">
                            {['Cidadão', 'Vip', 'Servidor', 'Motorista', 'Jornalista'].map((role) => (
                                <div key={role} className="flex items-center space-x-2">
                                    <Checkbox
                                        id={`role-${role}`}
                                        checked={config.targetProfiles?.includes(role)}
                                        onCheckedChange={(checked) => {
                                            const current = config.targetProfiles || [];
                                            const updated = checked
                                                ? [...current, role]
                                                : current.filter(r => r !== role);
                                            handleChange('targetProfiles', updated);
                                        }}
                                    />
                                    <Label htmlFor={`role-${role}`} className="text-sm cursor-pointer">{role}</Label>
                                </div>
                            ))}
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
};

export default AdminMonetization;
