import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import {
    TrendingUp,
    Target,
    MousePointer2,
    Eye,
    Plus,
    Calendar,
    ArrowUpRight
} from 'lucide-react';
import {
    XAxis,
    YAxis,
    CartesianGrid,
    Tooltip,
    ResponsiveContainer,
    LineChart,
    Line
} from 'recharts';

const mockCampaignData = [
    { name: 'Semana 1', conversions: 400, clicks: 2400 },
    { name: 'Semana 2', conversions: 300, clicks: 1398 },
    { name: 'Semana 3', conversions: 200, clicks: 9800 },
    { name: 'Semana 4', conversions: 278, clicks: 3908 },
];

const MarketingScreen: React.FC = () => {
    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <div>
                    <h1 className="text-3xl font-bold tracking-tight">Marketing & Campanhas</h1>
                    <p className="text-muted-foreground">Gerencie anúncios, promoções e análise de conversão.</p>
                </div>
                <Button className="bg-blue-600 hover:bg-blue-700">
                    <Plus className="mr-2 h-4 w-4" /> Nova Campanha
                </Button>
            </div>

            {/* Overview Stats */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Impressões Totais</CardTitle>
                        <Eye className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">124.5k</div>
                        <p className="text-xs text-green-500 flex items-center">
                            <ArrowUpRight className="mr-1 h-3 w-3" /> +12% desde o último mês
                        </p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Cliques (CTR)</CardTitle>
                        <MousePointer2 className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">12.1%</div>
                        <p className="text-xs text-muted-foreground">Média do setor: 8.5%</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">Conversões</CardTitle>
                        <Target className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">+2,430</div>
                        <p className="text-xs text-blue-500">Novos Guardiões via Ads</p>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                        <CardTitle className="text-sm font-medium">ROI Estimado</CardTitle>
                        <TrendingUp className="h-4 w-4 text-muted-foreground" />
                    </CardHeader>
                    <CardContent>
                        <div className="text-2xl font-bold">4.2x</div>
                        <p className="text-xs text-muted-foreground">Retorno sobre investimento</p>
                    </CardContent>
                </Card>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
                {/* Performance Chart */}
                <Card>
                    <CardHeader>
                        <CardTitle>Performance de Cliques vs Conversões</CardTitle>
                    </CardHeader>
                    <CardContent className="h-[300px]">
                        <ResponsiveContainer width="100%" height="100%" minWidth={0}>
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

                {/* Active Campaigns */}
                <Card>
                    <CardHeader>
                        <CardTitle>Campanhas Ativas</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="space-y-4">
                            {[
                                { name: 'Verão Seguro 2026', budget: 'R$ 500/dia', status: 'Ativa', color: 'bg-green-100 text-green-700' },
                                { name: 'Mutirão Limpa ABC', budget: 'R$ 200/dia', status: 'Pausada', color: 'bg-yellow-100 text-yellow-700' },
                                { name: 'Recrutamento de Fiscais', budget: 'R$ 1.200/dia', status: 'Ativa', color: 'bg-green-100 text-green-700' },
                            ].map((c, i) => (
                                <div key={i} className="flex items-center justify-between p-3 border rounded-lg hover:bg-gray-50 transition-colors">
                                    <div className="flex items-center gap-3">
                                        <div className="h-10 w-10 rounded bg-blue-100 flex items-center justify-center text-blue-600">
                                            <Calendar className="h-5 w-5" />
                                        </div>
                                        <div>
                                            <p className="font-medium text-sm">{c.name}</p>
                                            <p className="text-xs text-muted-foreground">{c.budget}</p>
                                        </div>
                                    </div>
                                    <span className={`text-[10px] px-2 py-1 rounded-full font-bold uppercase ${c.color}`}>
                                        {c.status}
                                    </span>
                                </div>
                            ))}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default MarketingScreen;
