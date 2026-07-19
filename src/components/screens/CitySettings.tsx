import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Checkbox } from '../ui/checkbox';
import { Webhook, Save, ArrowLeft, Menu, LayoutDashboard, ClipboardList, Building2, BarChart3, Settings, LogOut, ShieldAlert, Compass, Tags } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const CITY_NAMES: { [key: string]: string } = {
    'maua': 'Mauá',
    'santo-andre': 'Santo André',
    'sao-caetano': 'São Caetano do Sul',
    'sao-paulo': 'São Paulo'
};

const CATEGORIES_LIST = [
    { id: 'iluminacao', label: 'Iluminação Pública' },
    { id: 'asfalto', label: 'Asfalto e Buracos' },
    { id: 'lixo', label: 'Lixo e Entulho' },
    { id: 'seguranca', label: 'Segurança Comunitária' },
    { id: 'acessibilidade', label: 'Acessibilidade' },
    { id: 'outros', label: 'Outros Problemas Zeladoria' }
];

const CitySettings: React.FC = () => {
    const { cityId } = useParams<{ cityId: string }>();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    // Configurações da Cidade
    const [webhookUrl, setWebhookUrl] = useState('');
    const [serviceRadiusKm, setServiceRadiusKm] = useState('15');
    const [centerLat, setCenterLat] = useState('-23.5505');
    const [centerLng, setCenterLng] = useState('-46.6333');
    const [allowAnonymous, setAllowAnonymous] = useState(true);
    const [defaultSlaDays, setDefaultSlaDays] = useState('5');
    const [activeCategories, setActiveCategories] = useState<string[]>(['iluminacao', 'asfalto', 'lixo', 'seguranca', 'acessibilidade', 'outros']);

    const cityName = CITY_NAMES[cityId || ''] || cityId;

    useEffect(() => {
        const fetchSettings = async () => {
            if (!cityId) return;
            try {
                const docRef = doc(db, 'cities', cityId);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const data = snap.data();
                    const s = data.settings || {};
                    
                    setWebhookUrl(data.webhookUrl || s.webhookUrl || '');
                    setServiceRadiusKm(String(s.serviceRadiusKm !== undefined ? s.serviceRadiusKm : '15'));
                    setCenterLat(String(s.centerCoords?.lat !== undefined ? s.centerCoords.lat : '-23.5505'));
                    setCenterLng(String(s.centerCoords?.lng !== undefined ? s.centerCoords.lng : '-46.6333'));
                    setAllowAnonymous(s.allowAnonymous !== undefined ? s.allowAnonymous : true);
                    setDefaultSlaDays(String(s.defaultSlaDays !== undefined ? s.defaultSlaDays : '5'));
                    setActiveCategories(s.activeCategories || ['iluminacao', 'asfalto', 'lixo', 'seguranca', 'acessibilidade', 'outros']);
                }
            } catch (error) {
                console.error("Error fetching settings:", error);
                toast.error("Erro ao carregar configurações");
            } finally {
                setLoading(false);
            }
        };
        fetchSettings();
    }, [cityId]);

    const handleSave = async () => {
        if (!cityId) return;
        setSaving(true);
        try {
            const docRef = doc(db, 'cities', cityId);

            await updateDoc(docRef, {
                'settings.webhookUrl': webhookUrl,
                'settings.serviceRadiusKm': Number(serviceRadiusKm),
                'settings.centerCoords': { lat: Number(centerLat), lng: Number(centerLng) },
                'settings.allowAnonymous': allowAnonymous,
                'settings.defaultSlaDays': Number(defaultSlaDays),
                'settings.activeCategories': activeCategories,
                'webhookUrl': webhookUrl, // compatibilidade retroativa
                updatedAt: new Date()
            });

            toast.success("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Error saving settings:", error);
            toast.error("Erro ao salvar configurações municipais.");
        } finally {
            setSaving(false);
        }
    };

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleBack = () => {
        navigate(`/city/${cityId}/dashboard`);
    };

    const handleCategoryChange = (categoryId: string, checked: boolean) => {
        if (checked) {
            setActiveCategories(prev => [...prev, categoryId]);
        } else {
            setActiveCategories(prev => prev.filter(id => id !== categoryId));
        }
    };

    // Navegação lateral
    const navigateToDashboard = () => { navigate(`/city/${cityId}/dashboard`); setSidebarOpen(false); };
    const navigateToTasks = () => { navigate(`/city/${cityId}/tasks`); setSidebarOpen(false); };
    const navigateToDepartments = () => { navigate(`/city/${cityId}/departments`); setSidebarOpen(false); };

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80">
                            <SheetHeader>
                                <SheetTitle>Menu - {cityName}</SheetTitle>
                            </SheetHeader>

                            <nav className="flex flex-col gap-2 mt-6">
                                <Button variant="ghost" className="justify-start hover:bg-orange-50 hover:text-orange-600" onClick={navigateToDashboard}>
                                    <LayoutDashboard className="mr-2 h-4 w-4" /> Dashboard
                                </Button>
                                <Button variant="ghost" className="justify-start hover:bg-orange-50 hover:text-orange-600" onClick={navigateToTasks}>
                                    <ClipboardList className="mr-2 h-4 w-4" /> Tarefas
                                </Button>
                                <Button variant="ghost" className="justify-start hover:bg-orange-50 hover:text-orange-600" onClick={navigateToDepartments}>
                                    <Building2 className="mr-2 h-4 w-4" /> Secretarias
                                </Button>
                                <Button variant="ghost" className="justify-start hover:bg-orange-50 hover:text-orange-600">
                                    <BarChart3 className="mr-2 h-4 w-4" /> Relatórios
                                </Button>
                                <Button variant="secondary" className="justify-start bg-orange-50 text-orange-700" onClick={() => setSidebarOpen(false)}>
                                    <Settings className="mr-2 h-4 w-4" /> Configurações
                                </Button>
                            </nav>

                            <div className="absolute bottom-6 left-6 right-6 space-y-2">
                                <Button variant="outline" className="w-full" onClick={handleBack}>
                                    <ArrowLeft className="mr-2 h-4 w-4" /> Voltar
                                </Button>
                                <Button variant="destructive" className="w-full" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" /> Sair
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Configurações - {cityName}</h1>
                        <p className="text-gray-500">Parâmetros operacionais e integrações municipais</p>
                    </div>
                </div>
                
                <Button onClick={handleSave} disabled={loading || saving} className="bg-orange-600 hover:bg-orange-700 text-white font-semibold flex items-center gap-2">
                    <Save className="h-4 w-4" />
                    {saving ? 'Salvando...' : 'Salvar Tudo'}
                </Button>
            </div>

            {loading ? (
                <div className="text-center py-12 text-slate-500">Carregando parâmetros...</div>
            ) : (
                <div className="max-w-4xl space-y-6">
                    {/* CARD 1: Limites Geográficos e Operação */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-800">
                                <Compass className="h-5 w-5 text-orange-600" />
                                Parâmetros Geográficos
                            </CardTitle>
                            <CardDescription>
                                Defina as coordenadas geográficas do centro administrativo e o raio útil de atuação para geofencing dos cidadãos.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="centerLat">Latitude do Centro</Label>
                                    <Input
                                        id="centerLat"
                                        type="number"
                                        step="0.000001"
                                        value={centerLat}
                                        onChange={(e) => setCenterLat(e.target.value)}
                                        placeholder="-23.5505"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="centerLng">Longitude do Centro</Label>
                                    <Input
                                        id="centerLng"
                                        type="number"
                                        step="0.000001"
                                        value={centerLng}
                                        onChange={(e) => setCenterLng(e.target.value)}
                                        placeholder="-46.6333"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="serviceRadius">Raio de Atendimento (km)</Label>
                                    <Input
                                        id="serviceRadius"
                                        type="number"
                                        value={serviceRadiusKm}
                                        onChange={(e) => setServiceRadiusKm(e.target.value)}
                                        placeholder="15"
                                    />
                                </div>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CARD 2: Regras de Negócio e SLA */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-800">
                                <ShieldAlert className="h-5 w-5 text-orange-600" />
                                Regras de Negócio & SLA
                            </CardTitle>
                            <CardDescription>
                                Parâmetros para controle de identidade, privacidade e prazos máximos para curadoria e respostas das secretarias.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="flex items-center justify-between p-4 bg-slate-50 border border-slate-100 rounded-xl">
                                <div className="space-y-0.5">
                                    <Label className="text-sm font-semibold text-slate-800">Permitir Denúncias Anônimas</Label>
                                    <p className="text-xs text-slate-500">Permite que cidadãos enviem contribuições sem expor seu nome nos feeds públicos.</p>
                                </div>
                                <Switch
                                    checked={allowAnonymous}
                                    onCheckedChange={setAllowAnonymous}
                                />
                            </div>

                            <div className="space-y-2 max-w-xs">
                                <Label htmlFor="defaultSla">Tempo Limite de SLA Padrão (Dias)</Label>
                                <Input
                                    id="defaultSla"
                                    type="number"
                                    value={defaultSlaDays}
                                    onChange={(e) => setDefaultSlaDays(e.target.value)}
                                    placeholder="5"
                                />
                                <p className="text-[10px] text-slate-400">Prazo padrão de encerramento interno das ocorrências.</p>
                            </div>
                        </CardContent>
                    </Card>

                    {/* CARD 3: Categorias de Ocorrência Ativas */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-800">
                                <Tags className="h-5 w-5 text-orange-600" />
                                Categorias de Ocorrência Ativas
                            </CardTitle>
                            <CardDescription>
                                Selecione quais tipos de ocorrências e problemas urbanos estão disponíveis para reporte pelos cidadãos neste município.
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                {CATEGORIES_LIST.map(cat => (
                                    <div key={cat.id} className="flex items-center space-x-3 p-3 bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-lg">
                                        <Checkbox 
                                            id={`cat-${cat.id}`} 
                                            checked={activeCategories.includes(cat.id)}
                                            onCheckedChange={(checked) => handleCategoryChange(cat.id, !!checked)}
                                        />
                                        <Label htmlFor={`cat-${cat.id}`} className="text-sm font-medium leading-none cursor-pointer">
                                            {cat.label}
                                        </Label>
                                    </div>
                                ))}
                            </div>
                        </CardContent>
                    </Card>

                    {/* CARD 4: Webhook de Ocorrências */}
                    <Card>
                        <CardHeader>
                            <CardTitle className="flex items-center gap-2 text-slate-800">
                                <Webhook className="h-5 w-5 text-orange-600" />
                                Webhook de Ocorrências
                            </CardTitle>
                            <CardDescription>
                                Configure uma URL para receber notificações em tempo real (POST) sempre que uma ocorrência for criada ou mudar de status.
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="webhookUrl">URL do Webhook (POST)</Label>
                                <Input
                                    id="webhookUrl"
                                    placeholder="https://sua-ouvidoria.gov.br/api/webhook"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                />
                                <p className="text-xs text-gray-500">
                                    O payload enviado conterá: id, status, categoria, localização e dados do cidadão (se público).
                                </p>
                            </div>

                            <div className="bg-slate-50 dark:bg-slate-900 p-4 rounded-lg border border-slate-200 dark:border-slate-800 mt-4">
                                <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Exemplo de Payload</h4>
                                <pre className="text-xs font-mono text-slate-700 dark:text-slate-300 overflow-x-auto">
                                    {`{
  "event": "contribution_updated",
  "timestamp": "2024-02-03T14:30:00Z",
  "data": {
    "id": "doc_123",
    "status": "completed",
    "category": "infraestrutura",
    "location": { "_latitude": -23.1, "_longitude": -46.4 }
  }
}`}
                                </pre>
                            </div>
                        </CardContent>
                    </Card>
                </div>
            )}
        </div>
    );
};

export default CitySettings;
