import React from 'react';
import { toast } from 'sonner';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
    TrendingUp,
    MousePointer2,
    Eye,
    Calendar,
    ArrowUpRight
} from 'lucide-react';
import {
    Line,
    LineChart,
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer
} from 'recharts';
import { doc, onSnapshot, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Input } from '../ui/input';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Badge } from '../ui/badge';
import { Filter, Download, DollarSign, MapPin } from 'lucide-react';

const mockCampaignData = [
    { name: 'Semana 1', conversions: 400, clicks: 2400 },
    { name: 'Semana 2', conversions: 300, clicks: 1398 },
    { name: 'Semana 3', conversions: 200, clicks: 9800 },
    { name: 'Semana 4', conversions: 278, clicks: 3908 },
];

const MarketingScreen: React.FC = () => {
    const [showAds, setShowAds] = React.useState(false);
    const [disabledCities, setDisabledCities] = React.useState<string[]>([]);
    const [newCity, setNewCity] = React.useState('');
    const [loading, setLoading] = React.useState(true);

    // Extracts State
    const [extractMonth, setExtractMonth] = React.useState('2026-03');
    const [extractPlatform, setExtractPlatform] = React.useState('all');

    React.useEffect(() => {
        const settingsRef = doc(db, 'settings', 'global');
        const unsub = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                const data = docSnap.data();
                setShowAds(data.showAds || false);
                setDisabledCities(data.adDisabledCities || []);
            }
            setLoading(false);
        });
        return () => unsub();
    }, []);

    const handleSaveSetting = async (key: string, value: any) => {
        try {
            await setDoc(doc(db, 'settings', 'global'), { [key]: value }, { merge: true });
            toast.success('Configuração salva!');
        } catch (e) {
            toast.error('Erro ao salvar.');
        }
    };

    const addDisabledCity = () => {
        if (!newCity.trim()) return;
        const updated = [...new Set([...disabledCities, newCity.trim()])];
        setDisabledCities(updated);
        handleSaveSetting('adDisabledCities', updated);
        setNewCity('');
    };

    const removeDisabledCity = (city: string) => {
        const updated = disabledCities.filter(c => c !== city);
        setDisabledCities(updated);
        handleSaveSetting('adDisabledCities', updated);
    };

    if (loading) return <div className="p-8 text-center">Carregando...</div>;

    return (
        <div className="space-y-6 pb-12">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Monetização & Marketing</h1>
                    <p className="text-muted-foreground">Gerencie a veiculação de anúncios e acompanhe o faturamento das campanhas.</p>
                </div>
                <div className="flex items-center gap-4 bg-gray-50 border p-2 rounded-lg pr-4">
                    <div className="flex flex-col items-end">
                        <Label htmlFor="global-ads" className="text-xs font-bold uppercase text-gray-500">Exibição Global</Label>
                        <span className="text-[10px] text-gray-400">Ativar/Desativar todos os anúncios</span>
                    </div>
                    <Switch
                        id="global-ads"
                        checked={showAds}
                        onCheckedChange={(val) => { setShowAds(val); handleSaveSetting('showAds', val); }}
                    />
                </div>
            </div>

            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card className="bg-gradient-to-br from-blue-500 to-blue-600 text-white">
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Faturamento Estimado</CardTitle>
                        <DollarSign className="h-4 w-4 opacity-70" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ 14.250,00</div>
                        <p className="text-xs opacity-80 flex items-center">
                            <ArrowUpRight className="mr-1 h-3 w-3" /> +15% vs mês anterior
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Impressões Totais</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">124.5k</div>
                        <p className="text-xs text-muted-foreground">Visualizações de anúncios</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cliques (CTR)</CardTitle>
                        <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12.1%</div>
                        <p className="text-xs text-green-500">Alta performance</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">CPM Médio</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">R$ 4.20</div>
                        <p className="text-xs text-muted-foreground">Custo por mil impressões</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-6 grid-cols-1 lg:grid-cols-3">

                {/* 1. Restrição por Cidade */}
                <Card className="lg:col-span-1 border-amber-100 bg-amber-50/30">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-amber-900">
                            <MapPin className="w-5 h-5" /> Cidades Sem Anúncios
                        </CardTitle>
                        <CardDescription>
                            Desative anúncios em cidades com parcerias especiais ou assinantes (Ex: Guardião ABC).
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="flex gap-2">
                            <Input
                                placeholder="Nome da Cidade"
                                value={newCity}
                                onChange={e => setNewCity(e.target.value)}
                                onKeyDown={e => e.key === 'Enter' && addDisabledCity()}
                            />
                            <Button onClick={addDisabledCity} size="sm">Adicionar</Button>
                        </div>
                        <div className="flex flex-wrap gap-2 pt-2">
                            {disabledCities.length === 0 ? (
                                <p className="text-xs text-muted-foreground italic">Nenhuma cidade restringida.</p>
                            ) : (
                                disabledCities.map(city => (
                                    <Badge key={city} variant="secondary" className="pl-3 pr-1 py-1 gap-1">
                                        {city}
                                        <Button
                                            variant="ghost"
                                            size="sm"
                                            className="h-4 w-4 p-0 hover:bg-transparent text-gray-400 hover:text-red-500"
                                            onClick={() => removeDisabledCity(city)}
                                        >
                                            ×
                                        </Button>
                                    </Badge>
                                ))
                            )}
                        </div>
                    </CardContent>
                </Card>

                {/* 2. Performance Chart */}
                <Card className="lg:col-span-2">
                    <CardHeader>
                        <CardTitle>Performance das Plataformas</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[250px]">
                        <ResponsiveContainer width="100%" height="100%">
                            <LineChart data={mockCampaignData}>
                                <CartesianGrid strokeDasharray="3 3" vertical={false} />
                                <XAxis dataKey="name" />
                                <YAxis />
                                <Tooltip />
                                <Line type="monotone" dataKey="clicks" stroke="#3b82f6" strokeWidth={2} name="Cliques" />
                                <Line type="monotone" dataKey="conversions" stroke="#10b981" strokeWidth={2} name="Conversões" />
                            </LineChart>
                        </ResponsiveContainer>
                    </CardContent>
                </Card>

                {/* 3. Extratos das Campanhas (NEW) */}
                <Card className="lg:col-span-3">
                    <CardHeader className="flex flex-row items-center justify-between">
                        <div>
                            <CardTitle>Extratos de Campanhas</CardTitle>
                            <CardDescription>Acompanhe os rendimentos por plataforma e mês.</CardDescription>
                        </div>
                        <div className="flex items-center gap-2">
                            <Select value={extractMonth} onValueChange={setExtractMonth}>
                                <SelectTrigger className="w-[140px]">
                                    <Calendar className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Mês" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="2026-03">Março 2026</SelectItem>
                                    <SelectItem value="2026-02">Fevereiro 2026</SelectItem>
                                    <SelectItem value="2026-01">Janeiro 2026</SelectItem>
                                </SelectContent>
                            </Select>
                            <Select value={extractPlatform} onValueChange={setExtractPlatform}>
                                <SelectTrigger className="w-[140px]">
                                    <Filter className="w-4 h-4 mr-2" />
                                    <SelectValue placeholder="Plataforma" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="all">Todas</SelectItem>
                                    <SelectItem value="meta">Meta Ads</SelectItem>
                                    <SelectItem value="google">Google Ads</SelectItem>
                                    <SelectItem value="local">Local Direct</SelectItem>
                                </SelectContent>
                            </Select>
                            <Button variant="outline" size="sm">
                                <Download className="w-4 h-4 mr-2" /> Exportar
                            </Button>
                        </div>
                    </CardHeader>
                    <CardContent>
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Campanha / Plataforma</TableHead>
                                    <TableHead>Mês</TableHead>
                                    <TableHead>Impressões</TableHead>
                                    <TableHead>Cliques</TableHead>
                                    <TableHead>Investimento</TableHead>
                                    <TableHead>Receita</TableHead>
                                    <TableHead className="text-right">ROI</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {[
                                    { name: 'Segurança Verão', platform: 'Meta Ads', month: 'Mar/26', imp: '150k', clk: '12k', spend: 'R$ 2.400', rev: 'R$ 9.800', roi: '4.08x' },
                                    { name: 'Guardiaonacional.com Banners', platform: 'Google Ads', month: 'Mar/26', imp: '450k', clk: '2.5k', spend: 'R$ 1.200', rev: 'R$ 3.100', roi: '2.58x' },
                                    { name: 'Patrocínio Local - Prefeituras', platform: 'Local Direct', month: 'Mar/26', imp: '50k', clk: 'N/A', spend: 'R$ 0', rev: 'R$ 4.500', roi: 'Inf.' },
                                ].map((row, i) => (
                                    <TableRow key={i}>
                                        <TableCell>
                                            <div className="font-medium">{row.name}</div>
                                            <div className="text-[10px] text-muted-foreground uppercase">{row.platform}</div>
                                        </TableCell>
                                        <TableCell>{row.month}</TableCell>
                                        <TableCell>{row.imp}</TableCell>
                                        <TableCell>{row.clk}</TableCell>
                                        <TableCell className="text-gray-500">{row.spend}</TableCell>
                                        <TableCell className="font-bold text-green-600">{row.rev}</TableCell>
                                        <TableCell className="text-right font-medium">{row.roi}</TableCell>
                                    </TableRow>
                                ))}
                            </TableBody>
                        </Table>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default MarketingScreen;
