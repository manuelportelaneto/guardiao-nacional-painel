import React, { useState, useEffect, useCallback } from 'react';
import { doc, setDoc, onSnapshot, collection, getDocs } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';
import { toast } from 'sonner';
import {
    DollarSign, Save, Smartphone, LayoutTemplate, CircleAlert, Users, MapPin,
    Monitor, WifiOff, RefreshCw, Eye, EyeOff, CheckCircle2, XCircle, Building2
} from 'lucide-react';
import { loggingService } from '../../services/loggingService';
import { useAuth } from '../../context/AuthContext';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MonetizationHistory } from './MonetizationHistory';
import { Checkbox } from '../ui/checkbox';

interface AdsConfig {
    showAds: boolean;
    showAdsMobile: boolean;
    showAdsDesktop: boolean;
    admobAppId: string;
    admobBannerUnitId: string;
    admobInterstitialUnitId: string;
    admobRewardedUnitId: string;
    adsensePublisherId: string;
    adsenseSlotId: string;
    adsenseSlotList: string;
    adsenseSlotModal: string;
    adsenseSlotTop: string;
    targetCities: string;
    targetProfiles: string[];
    cityOverrides: Record<string, boolean>;
}

const DEFAULT_CONFIG: AdsConfig = {
    showAds: false,
    showAdsMobile: false,
    showAdsDesktop: false,
    admobAppId: '',
    admobBannerUnitId: '',
    admobInterstitialUnitId: '',
    admobRewardedUnitId: '',
    adsensePublisherId: '',
    adsenseSlotId: '',
    adsenseSlotList: '',
    adsenseSlotModal: '',
    adsenseSlotTop: '',
    targetCities: '',
    targetProfiles: ['Cidadão', 'Vip'],
    cityOverrides: {}
};

const AdminMonetization: React.FC = () => {
    const { currentUser } = useAuth();
    const [config, setConfig] = useState<AdsConfig>(DEFAULT_CONFIG);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [showPreview, setShowPreview] = useState(false);
    const [cities, setCities] = useState<Array<{ id: string; name: string }>>([]);
    const [citySearch, setCitySearch] = useState('');
    const [loadingCities, setLoadingCities] = useState(false);

    // Listen to Firestore config
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

    // Load cities for municipal control
    const loadCities = useCallback(async () => {
        setLoadingCities(true);
        try {
            // Try to fetch from Firestore territories (if available)
            const snapshot = await getDocs(collection(db, 'cities'));
            if (!snapshot.empty) {
                setCities(snapshot.docs.slice(0, 200).map(d => ({ id: d.id, name: d.data().name || d.id })));
            }
        } catch {
            // Fallback: get from contributions city field
        } finally {
            setLoadingCities(false);
        }
    }, []);

    useEffect(() => { loadCities(); }, [loadCities]);

    const handleChange = (field: keyof AdsConfig, value: AdsConfig[keyof AdsConfig]) => {
        const newConfig = { ...config, [field]: value };
        setConfig(newConfig);
        // Auto-save changes for booleans (Toggles) instantly
        if (typeof value === 'boolean') {
            saveConfig(newConfig, true);
        }
    };

    const handleCityOverride = (cityId: string, enabled: boolean) => {
        const newConfig = {
            ...config,
            cityOverrides: { ...config.cityOverrides, [cityId]: enabled }
        };
        setConfig(newConfig);
        saveConfig(newConfig, true);
    };

    const disableAllAds = async () => {
        const updated = { ...config, showAds: false, showAdsMobile: false, showAdsDesktop: false, cityOverrides: {} };
        setConfig(updated);
        await saveConfig(updated, false);
        toast.warning('Todos os anúncios foram desativados globalmente!');
    };

    const saveConfig = async (configToSave: AdsConfig = config, silent: boolean = false) => {
        setSaving(true);
        try {
            await setDoc(doc(db, 'settings', 'monetization'), configToSave, { merge: true });
            // Sync key flags to global settings for app consumption
            await setDoc(doc(db, 'settings', 'global'), {
                showAds: configToSave.showAds,
                showAdsMobile: configToSave.showAdsMobile,
                showAdsDesktop: configToSave.showAdsDesktop
            }, { merge: true });

            if (!silent) toast.success('Configurações salvas com sucesso!');

            if (currentUser) {
                loggingService.logAudit('SETTINGS_UPDATE' as any, currentUser.uid, 'settings', configToSave);
            }
        } catch (error) {
            console.error('Error saving monetization settings:', error);
            toast.error('Erro ao salvar configurações.');
        } finally {
            setSaving(false);
        }
    };

    const handleSave = () => saveConfig(config, false);

    const activeCitiesCount = Object.values(config.cityOverrides || {}).filter(Boolean).length;
    const filteredCities = cities.filter(c =>
        !citySearch || c.name.toLowerCase().includes(citySearch.toLowerCase())
    );

    if (loading) return (
        <div className="p-8 text-center text-gray-500 flex items-center justify-center gap-2">
            <RefreshCw className="h-4 w-4 animate-spin" /> Carregando painel de monetização...
        </div>
    );

    return (
        <div className="space-y-6 max-w-5xl mx-auto">
            {/* Header */}
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight text-gray-900 font-outfit flex items-center gap-2">
                        <DollarSign className="h-8 w-8 text-green-600" />
                        Monetização & Anúncios
                    </h1>
                    <p className="text-muted-foreground mt-1">
                        Gerencie AdMob (app mobile portrait) e AdSense (desktop web). Controle global, por plataforma e por município.
                    </p>
                </div>
                <div className="flex items-center gap-2">
                    <Button
                        variant="outline"
                        onClick={() => setShowPreview(!showPreview)}
                        className="gap-2"
                    >
                        {showPreview ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                        {showPreview ? 'Ocultar' : 'Preview'}
                    </Button>
                    <Button
                        variant="destructive"
                        onClick={disableAllAds}
                        disabled={saving}
                        className="gap-2"
                        size="sm"
                    >
                        <XCircle className="h-4 w-4" />
                        Desativar Todos
                    </Button>
                    <Button onClick={handleSave} disabled={saving} className="bg-green-600 hover:bg-green-700 gap-2">
                        <Save className="h-4 w-4" />
                        {saving ? 'Salvando...' : 'Salvar Alterações'}
                    </Button>
                </div>
            </div>

            <Tabs defaultValue="settings" className="w-full">
                <TabsList className="mb-6 grid w-full max-w-sm grid-cols-2">
                    <TabsTrigger value="settings" className="font-semibold">Configurações Base</TabsTrigger>
                    <TabsTrigger value="history" className="font-semibold">Histórico de Extratos</TabsTrigger>
                </TabsList>

                <TabsContent value="settings" className="space-y-6">
                    {/* Alert */}
                    <div className="bg-yellow-50 border border-yellow-200 p-4 rounded-lg flex gap-3 text-yellow-800 text-sm">
                        <CircleAlert className="h-5 w-5 shrink-0" />
                        <p>
                            <strong>Atenção:</strong> As configurações são propagadas em tempo real via Firestore. Os IDs do AdMob e AdSense podem ser inseridos agora e serão usados pelo app/web assim que salvos, sem necessidade de redeploy.
                        </p>
                    </div>

                    {/* Ad Preview */}
                    {showPreview && (
                        <Card className="border-2 border-dashed border-brand/30 bg-slate-50">
                            <CardHeader>
                                <CardTitle className="text-base flex items-center gap-2">
                                    <Eye className="h-4 w-4" /> Preview dos Banners
                                </CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">AdMob — App Mobile (Portrait)</p>
                                    <div
                                        className="w-full border-2 border-dashed border-blue-300 rounded-lg flex items-center justify-center bg-blue-50"
                                        style={{ height: 60 }}
                                    >
                                        <div className="text-center">
                                            <p className="text-xs font-semibold text-blue-600 uppercase">AdMob Banner</p>
                                            <p className="text-[10px] text-blue-400">
                                                {config.admobBannerUnitId || 'Unidade não configurada'} · Portrait Only
                                            </p>
                                        </div>
                                    </div>
                                </div>
                                <Separator />
                                <div>
                                    <p className="text-xs text-muted-foreground mb-2 uppercase tracking-wide">AdSense — Desktop Web</p>
                                    <div className="w-full border-2 border-dashed border-orange-300 rounded-lg flex items-center justify-center bg-orange-50" style={{ height: 90 }}>
                                        <div className="text-center">
                                            <p className="text-xs font-semibold text-orange-600 uppercase">AdSense Banner</p>
                                            <p className="text-[10px] text-orange-400">
                                                pub: {config.adsensePublisherId || 'não configurado'} · slot: {config.adsenseSlotId || 'não configurado'}
                                            </p>
                                        </div>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    )}

                    {/* Status Global */}
                    <Card className="border-green-100 shadow-sm">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <LayoutTemplate className="h-5 w-5 text-gray-400" />
                                Controle Global de Anúncios
                            </CardTitle>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center space-x-4 p-4 bg-gray-50 rounded-lg">
                                <Switch
                                    id="showAds"
                                    checked={config.showAds}
                                    onCheckedChange={(c) => handleChange('showAds', c)}
                                />
                                <div className="flex-1">
                                    <Label htmlFor="showAds" className="text-sm font-semibold leading-none flex items-center gap-2">
                                        {config.showAds
                                            ? <CheckCircle2 className="h-4 w-4 text-green-600" />
                                            : <XCircle className="h-4 w-4 text-red-500" />
                                        }
                                        {config.showAds ? 'Anúncios ATIVOS' : 'Anúncios DESATIVADOS'}
                                    </Label>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        Interruptor mestre — quando desativado, nenhum anúncio é exibido independente dos toggles abaixo.
                                    </p>
                                </div>
                                <Badge variant={config.showAds ? 'default' : 'secondary'} className={config.showAds ? 'bg-green-600' : ''}>
                                    {config.showAds ? 'Ativo' : 'Inativo'}
                                </Badge>
                            </div>

                            <Separator />

                            {/* Por Plataforma */}
                            <div className="grid md:grid-cols-2 gap-4">
                                <div className={`flex items-center space-x-4 p-4 rounded-lg border transition-all ${config.showAdsMobile && config.showAds ? 'border-blue-200 bg-blue-50' : 'bg-gray-50'}`}>
                                    <Switch
                                        id="showAdsMobile"
                                        checked={config.showAdsMobile}
                                        onCheckedChange={(c) => handleChange('showAdsMobile', c)}
                                        disabled={!config.showAds}
                                    />
                                    <div className="flex-1">
                                        <Label htmlFor="showAdsMobile" className="text-sm font-semibold leading-none flex items-center gap-2">
                                            <Smartphone className="h-4 w-4 text-blue-500" />
                                            AdMob — App Mobile (Portrait)
                                        </Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Exibido apenas em dispositivos nativos (Android/iOS) com tela vertical
                                        </p>
                                    </div>
                                </div>
                                <div className={`flex items-center space-x-4 p-4 rounded-lg border transition-all ${config.showAdsDesktop && config.showAds ? 'border-orange-200 bg-orange-50' : 'bg-gray-50'}`}>
                                    <Switch
                                        id="showAdsDesktop"
                                        checked={config.showAdsDesktop}
                                        onCheckedChange={(c) => handleChange('showAdsDesktop', c)}
                                        disabled={!config.showAds}
                                    />
                                    <div className="flex-1">
                                        <Label htmlFor="showAdsDesktop" className="text-sm font-semibold leading-none flex items-center gap-2">
                                            <Monitor className="h-4 w-4 text-orange-500" />
                                            AdSense — Desktop Web
                                        </Label>
                                        <p className="text-xs text-muted-foreground mt-1">
                                            Exibido apenas em computadores (Windows, macOS, Linux) com largura ≥ 1024px
                                        </p>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Configurações de Plataforma */}
                    <div className="grid md:grid-cols-2 gap-6">
                        {/* AdMob */}
                        <Card className="shadow-sm border-blue-100">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Smartphone className="h-5 w-5 text-blue-500" />
                                    Configurações AdMob
                                </CardTitle>
                                <CardDescription>
                                    Chaves para iOS e Android nativos via Capacitor.
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
                                    <Label htmlFor="admobBannerUnitId">Banner Unit ID</Label>
                                    <Input
                                        id="admobBannerUnitId"
                                        value={config.admobBannerUnitId}
                                        onChange={(e) => handleChange('admobBannerUnitId', e.target.value)}
                                        placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/1111111111"
                                        className="font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="admobInterstitialUnitId">Interstitial Unit ID</Label>
                                    <Input
                                        id="admobInterstitialUnitId"
                                        value={config.admobInterstitialUnitId}
                                        onChange={(e) => handleChange('admobInterstitialUnitId', e.target.value)}
                                        placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/2222222222"
                                        className="font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="admobRewardedUnitId">Rewarded Unit ID</Label>
                                    <Input
                                        id="admobRewardedUnitId"
                                        value={config.admobRewardedUnitId}
                                        onChange={(e) => handleChange('admobRewardedUnitId', e.target.value)}
                                        placeholder="ca-app-pub-xxxxxxxxxxxxxxxx/3333333333"
                                        className="font-mono text-sm"
                                    />
                                </div>
                            </CardContent>
                        </Card>

                        {/* AdSense */}
                        <Card className="shadow-sm border-orange-100">
                            <CardHeader>
                                <CardTitle className="text-lg flex items-center gap-2">
                                    <Monitor className="h-5 w-5 text-orange-500" />
                                    Configurações AdSense
                                </CardTitle>
                                <CardDescription>
                                    Chaves para a versão Web em desktops.
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="space-y-2">
                                    <Label htmlFor="adsensePublisherId">Publisher ID</Label>
                                    <Input
                                        id="adsensePublisherId"
                                        value={config.adsensePublisherId}
                                        onChange={(e) => handleChange('adsensePublisherId', e.target.value)}
                                        placeholder="ca-pub-xxxxxxxxxxxxxxxx"
                                        className="font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adsenseSlotId">Slot Padrão</Label>
                                    <Input
                                        id="adsenseSlotId"
                                        value={config.adsenseSlotId}
                                        onChange={(e) => handleChange('adsenseSlotId', e.target.value)}
                                        placeholder="1234567890"
                                        className="font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adsenseSlotList">Slot — Listas</Label>
                                    <Input
                                        id="adsenseSlotList"
                                        value={config.adsenseSlotList}
                                        onChange={(e) => handleChange('adsenseSlotList', e.target.value)}
                                        placeholder="slot ID para listas"
                                        className="font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adsenseSlotModal">Slot — Modal</Label>
                                    <Input
                                        id="adsenseSlotModal"
                                        value={config.adsenseSlotModal}
                                        onChange={(e) => handleChange('adsenseSlotModal', e.target.value)}
                                        placeholder="slot ID para modais"
                                        className="font-mono text-sm"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="adsenseSlotTop">Slot — Topo</Label>
                                    <Input
                                        id="adsenseSlotTop"
                                        value={config.adsenseSlotTop}
                                        onChange={(e) => handleChange('adsenseSlotTop', e.target.value)}
                                        placeholder="slot ID para topo de página"
                                        className="font-mono text-sm"
                                    />
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    {/* Controle Municipal / Por Cidade */}
                    <Card className="shadow-sm border-purple-100">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Building2 className="h-5 w-5 text-purple-500" />
                                Controle Municipal de Anúncios
                                {activeCitiesCount > 0 && (
                                    <Badge className="bg-purple-600 ml-2">{activeCitiesCount} ativas</Badge>
                                )}
                            </CardTitle>
                            <CardDescription>
                                Override por cidade: sobrescreve o controle global para municípios específicos.
                                Útil para campanhas locais ou desativar anúncios em cidades específicas.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center gap-3">
                                <Input
                                    placeholder="Buscar cidade..."
                                    value={citySearch}
                                    onChange={(e) => setCitySearch(e.target.value)}
                                    className="max-w-xs"
                                />
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={loadCities}
                                    disabled={loadingCities}
                                    className="gap-1"
                                >
                                    <RefreshCw className={`h-3 w-3 ${loadingCities ? 'animate-spin' : ''}`} />
                                    Atualizar
                                </Button>
                                {activeCitiesCount > 0 && (
                                    <Button
                                        variant="ghost"
                                        size="sm"
                                        onClick={() => handleChange('cityOverrides', {})}
                                        className="text-red-500 gap-1"
                                    >
                                        <XCircle className="h-3 w-3" />
                                        Limpar overrides
                                    </Button>
                                )}
                            </div>

                            {cities.length === 0 ? (
                                <div className="text-center py-8 text-muted-foreground text-sm flex flex-col items-center gap-2">
                                    <WifiOff className="h-8 w-8 text-gray-300" />
                                    <span>Nenhuma cidade carregada. As cidades aparecem automaticamente quando houver usuários cadastrados.</span>
                                </div>
                            ) : (
                                <div className="max-h-64 overflow-y-auto space-y-1 border rounded-lg p-3">
                                    {filteredCities.map(city => (
                                        <div key={city.id} className="flex items-center justify-between py-2 px-3 rounded hover:bg-gray-50">
                                            <div className="flex items-center gap-2">
                                                <MapPin className="h-3 w-3 text-gray-400" />
                                                <span className="text-sm text-gray-700">{city.name}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <Switch
                                                    id={`city-${city.id}`}
                                                    checked={config.cityOverrides?.[city.id] === true}
                                                    onCheckedChange={(c) => handleCityOverride(city.id, c)}
                                                />
                                                <Badge
                                                    variant="outline"
                                                    className={`text-[10px] ${config.cityOverrides?.[city.id] ? 'border-green-300 text-green-700' : 'border-gray-200 text-gray-400'}`}
                                                >
                                                    {config.cityOverrides?.[city.id] ? 'Ativo' : 'Global'}
                                                </Badge>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </CardContent>
                    </Card>

                    {/* Segmentação de Público */}
                    <Card className="shadow-sm border-blue-100">
                        <CardHeader>
                            <CardTitle className="text-lg flex items-center gap-2">
                                <Users className="h-5 w-5 text-blue-500" />
                                Segmentação de Público-Alvo
                            </CardTitle>
                            <CardDescription>
                                Selecione quais perfis verão anúncios no aplicativo.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label className="flex items-center gap-2 text-sm font-semibold">
                                    <MapPin className="h-4 w-4 text-gray-500" />
                                    Cidades para override via texto (IDs ou nomes, separados por vírgula)
                                </Label>
                                <Input
                                    value={config.targetCities || ''}
                                    onChange={(e) => handleChange('targetCities', e.target.value)}
                                    placeholder="São Paulo, Campinas... (deixe em branco = todas)"
                                    className="text-sm"
                                />
                            </div>
                            <div className="space-y-3">
                                <Label className="text-sm font-semibold">Perfis de Usuário</Label>
                                <div className="flex gap-4 flex-wrap">
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
                                                    const newConfig = { ...config, targetProfiles: updated };
                                                    setConfig(newConfig);
                                                    saveConfig(newConfig, true);
                                                }}
                                            />
                                            <Label htmlFor={`role-${role}`} className="text-sm cursor-pointer">{role}</Label>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* Save Button (sticky bottom) */}
                    <div className="flex justify-end pt-2">
                        <Button onClick={handleSave} disabled={saving} size="lg" className="bg-green-600 hover:bg-green-700 gap-2">
                            <Save className="h-5 w-5" />
                            {saving ? 'Salvando...' : 'Salvar Todas as Configurações'}
                        </Button>
                    </div>
                </TabsContent>

                <TabsContent value="history" className="focus-visible:outline-none focus:outline-none">
                    <MonetizationHistory />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminMonetization;
