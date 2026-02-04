import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { db } from '../../firebaseConfig';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Webhook, Save, ArrowLeft, Menu, LayoutDashboard, ClipboardList, Building2, BarChart3, Settings, LogOut } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';

const CITY_NAMES: { [key: string]: string } = {
    'maua': 'Mauá',
    'santo-andre': 'Santo André',
    'sao-caetano': 'São Caetano do Sul',
    'sao-paulo': 'São Paulo'
};

const CitySettings: React.FC = () => {
    const { cityId } = useParams<{ cityId: string }>();
    const navigate = useNavigate();
    const { logout } = useAuth();

    const [webhookUrl, setWebhookUrl] = useState('');
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [sidebarOpen, setSidebarOpen] = useState(false);

    const cityName = CITY_NAMES[cityId || ''] || cityId;

    useEffect(() => {
        const fetchSettings = async () => {
            if (!cityId) return;
            try {
                // Try to get from 'cities' collection
                // Assuming document ID is the normalized cityId ("maua", "sao-paulo") or we query by field.
                // For simplicity in this demo, accessing doc by cityId.
                const docRef = doc(db, 'cities', cityId);
                const snap = await getDoc(docRef);

                if (snap.exists()) {
                    const data = snap.data();
                    setWebhookUrl(data.webhookUrl || data.settings?.webhookUrl || '');
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

            // Allow partial update (merge)
            await updateDoc(docRef, {
                'settings.webhookUrl': webhookUrl,
                'webhookUrl': webhookUrl, // Flat backup
                updatedAt: new Date()
            });

            toast.success("Configurações salvas com sucesso!");
        } catch (error) {
            console.error("Error saving settings:", error);
            // If doc doesn't exist, we might need setDoc instead of updateDoc, 
            // but assuming city doc exists from admin creation.
            toast.error("Erro ao salvar. Verifique se a cidade existe.");
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

    // Navigation Helpers
    const navigateToDashboard = () => { navigate(`/city/${cityId}/dashboard`); setSidebarOpen(false); };
    const navigateToTasks = () => { navigate(`/city/${cityId}/tasks`); setSidebarOpen(false); };
    const navigateToDepartments = () => { navigate(`/city/${cityId}/departments`); setSidebarOpen(false); };


    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Sidebar Menu */}
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
                        <p className="text-gray-500">Integrações e parâmetros do sistema</p>
                    </div>
                </div>
            </div>

            <div className="max-w-4xl space-y-6">
                <Card>
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Webhook className="h-5 w-5 text-blue-600" />
                            Webhook de Ocorrências
                        </CardTitle>
                        <CardDescription>
                            Configure uma URL para receber notificações em tempo real (POST) sempre que uma ocorrência for criada ou mudar de status.
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <label className="text-sm font-medium text-gray-700">URL do Webhook (POST)</label>
                            <div className="flex gap-2">
                                <Input
                                    placeholder="https://sua-ouvidoria.gov.br/api/webhook"
                                    value={webhookUrl}
                                    onChange={(e) => setWebhookUrl(e.target.value)}
                                    disabled={loading}
                                />
                                <Button onClick={handleSave} disabled={loading || saving} className="min-w-[100px] bg-blue-600 hover:bg-blue-700">
                                    {saving ? 'Salvando...' : (
                                        <>
                                            <Save className="mr-2 h-4 w-4" /> Salvar
                                        </>
                                    )}
                                </Button>
                            </div>
                            <p className="text-xs text-gray-500">
                                O payload enviado conterá: id, status, categoria, localização e dados do cidadão (se público).
                            </p>
                        </div>

                        <div className="bg-slate-50 p-4 rounded-lg border border-slate-200 mt-4">
                            <h4 className="text-xs font-semibold uppercase text-slate-500 mb-2">Exemplo de Payload</h4>
                            <pre className="text-xs font-mono text-slate-700 overflow-x-auto">
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
        </div>
    );
};

export default CitySettings;
