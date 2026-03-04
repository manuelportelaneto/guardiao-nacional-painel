import { useState, useEffect } from 'react';
import { collection, doc, setDoc, onSnapshot, query, orderBy, deleteDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '../ui/select';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '../ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger, DialogFooter } from '../ui/dialog';
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import {
    Plus, AlertCircle, BarChart3, Trash2, Calendar, Smartphone, Monitor
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { loggingService } from '../../services/loggingService';

interface AdsReport {
    id: string;
    month: string; // YYYY-MM format
    platform: 'AdMob' | 'AdSense' | 'Direto' | 'Outros';
    revenue: number;
    impressions: number;
    clicks: number;
    createdAt?: any;
    createdBy?: string;
}

export function MonetizationHistory() {
    const { currentUser } = useAuth();
    const [reports, setReports] = useState<AdsReport[]>([]);
    const [loading, setLoading] = useState(true);

    // Filters
    const [filterPlatform, setFilterPlatform] = useState<string>('all');

    // Form State
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [formData, setFormData] = useState({
        month: new Date().toISOString().slice(0, 7), // YYYY-MM
        platform: 'AdMob',
        revenue: '',
        impressions: '',
        clicks: ''
    });

    useEffect(() => {
        const q = query(collection(db, 'ads_reports'), orderBy('month', 'desc'));
        const unsub = onSnapshot(q, (snapshot) => {
            const data: AdsReport[] = [];
            snapshot.forEach(doc => {
                data.push({ id: doc.id, ...doc.data() } as AdsReport);
            });
            setReports(data);
            setLoading(false);
        }, (error) => {
            console.error("Error fetching reports", error);
            toast.error("Erro ao carregar os relatórios.");
            setLoading(false);
        });

        return () => unsub();
    }, []);

    const handleAddReport = async () => {
        if (!formData.month || !formData.revenue || !formData.platform) {
            toast.error("Preencha os campos obrigatórios.");
            return;
        }

        setIsSubmitting(true);
        try {
            const newDocRef = doc(collection(db, 'ads_reports'));
            const newReport = {
                id: newDocRef.id,
                month: formData.month,
                platform: formData.platform,
                revenue: parseFloat(formData.revenue.replace(',', '.')) || 0,
                impressions: parseInt(formData.impressions, 10) || 0,
                clicks: parseInt(formData.clicks, 10) || 0,
                createdAt: serverTimestamp(),
                createdBy: currentUser?.uid
            };

            await setDoc(newDocRef, newReport);

            if (currentUser) {
                loggingService.logAudit('REPORT_CREATED' as any, currentUser.uid, 'ads_reports', { id: newDocRef.id, month: formData.month });
            }

            toast.success("Extrato registrado com sucesso!");
            setIsAddModalOpen(false);
            setFormData({
                month: new Date().toISOString().slice(0, 7),
                platform: 'AdMob',
                revenue: '',
                impressions: '',
                clicks: ''
            });

        } catch (error) {
            console.error(error);
            toast.error("Falha ao registrar extrato.");
        } finally {
            setIsSubmitting(false);
        }
    };

    const handleDelete = async (id: string) => {
        if (!window.confirm("Você tem certeza que deseja deletar este extrato?")) return;

        try {
            await deleteDoc(doc(db, 'ads_reports', id));
            toast.success("Extrato deletado.");
            if (currentUser) {
                loggingService.logAudit('REPORT_DELETED' as any, currentUser.uid, 'ads_reports', { id });
            }
        } catch (error) {
            console.error(error);
            toast.error("Falha ao deletar extrato.");
        }
    };

    const filteredReports = reports.filter(r =>
        filterPlatform === 'all' ? true : r.platform === filterPlatform
    );

    const totalRevenue = filteredReports.reduce((sum, r) => sum + r.revenue, 0);

    return (
        <div className="space-y-6">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-2xl font-bold tracking-tight text-gray-900 font-outfit flex items-center gap-2">
                        <BarChart3 className="h-6 w-6 text-indigo-600" />
                        Extratos e Campanhas
                    </h2>
                    <p className="text-muted-foreground mt-1">
                        Gerencie e visualize a performance financeira (AdSense, AdMob, Direto).
                    </p>
                </div>

                <div className="flex items-center gap-2">
                    <Select value={filterPlatform} onValueChange={setFilterPlatform}>
                        <SelectTrigger className="w-[180px]">
                            <SelectValue placeholder="Filtrar Plataforma" />
                        </SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas as Plataformas</SelectItem>
                            <SelectItem value="AdMob">AdMob (App)</SelectItem>
                            <SelectItem value="AdSense">AdSense (Web)</SelectItem>
                            <SelectItem value="Direto">Anúncios Diretos</SelectItem>
                            <SelectItem value="Outros">Outras</SelectItem>
                        </SelectContent>
                    </Select>

                    <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
                        <DialogTrigger asChild>
                            <Button className="bg-indigo-600 hover:bg-indigo-700 gap-2">
                                <Plus className="h-4 w-4" /> Novo Extrato
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Adicionar Extrato de Monetização</DialogTitle>
                            </DialogHeader>
                            <div className="grid gap-4 py-4">
                                <div className="grid gap-2">
                                    <Label htmlFor="month">Mês de Referência</Label>
                                    <Input
                                        id="month"
                                        type="month"
                                        value={formData.month}
                                        onChange={(e) => setFormData({ ...formData, month: e.target.value })}
                                    />
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="platform">Plataforma</Label>
                                    <Select
                                        value={formData.platform}
                                        onValueChange={(val) => setFormData({ ...formData, platform: val })}
                                    >
                                        <SelectTrigger>
                                            <SelectValue />
                                        </SelectTrigger>
                                        <SelectContent>
                                            <SelectItem value="AdMob">AdMob (Mobile)</SelectItem>
                                            <SelectItem value="AdSense">AdSense (Web)</SelectItem>
                                            <SelectItem value="Direto">Anúncios Diretos</SelectItem>
                                            <SelectItem value="Outros">Outras Parcerias</SelectItem>
                                        </SelectContent>
                                    </Select>
                                </div>
                                <div className="grid gap-2">
                                    <Label htmlFor="revenue">Receita Gerada (BRL)</Label>
                                    <Input
                                        id="revenue"
                                        type="number"
                                        step="0.01"
                                        placeholder="Ex: 1540.50"
                                        value={formData.revenue}
                                        onChange={(e) => setFormData({ ...formData, revenue: e.target.value })}
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="grid gap-2">
                                        <Label htmlFor="impressions">Impressões</Label>
                                        <Input
                                            id="impressions"
                                            type="number"
                                            placeholder="Ex: 50000"
                                            value={formData.impressions}
                                            onChange={(e) => setFormData({ ...formData, impressions: e.target.value })}
                                        />
                                    </div>
                                    <div className="grid gap-2">
                                        <Label htmlFor="clicks">Cliques</Label>
                                        <Input
                                            id="clicks"
                                            type="number"
                                            placeholder="Ex: 1250"
                                            value={formData.clicks}
                                            onChange={(e) => setFormData({ ...formData, clicks: e.target.value })}
                                        />
                                    </div>
                                </div>
                            </div>
                            <DialogFooter>
                                <Button variant="outline" onClick={() => setIsAddModalOpen(false)}>Cancelar</Button>
                                <Button disabled={isSubmitting} onClick={handleAddReport}>
                                    {isSubmitting ? 'Salvando...' : 'Salvar Relatório'}
                                </Button>
                            </DialogFooter>
                        </DialogContent>
                    </Dialog>
                </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
                <Card className="bg-gradient-to-br from-indigo-50 to-white shadow-sm border-indigo-100">
                    <CardHeader className="pb-2">
                        <CardDescription className="font-medium text-indigo-800">Receita Total Acumulada</CardDescription>
                        <CardTitle className="text-3xl text-indigo-900">
                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(totalRevenue)}
                        </CardTitle>
                    </CardHeader>
                </Card>
                <Card className="bg-gradient-to-br from-slate-50 to-white shadow-sm border-slate-100">
                    <CardHeader className="pb-2">
                        <CardDescription className="font-medium text-slate-600">Total de Registros</CardDescription>
                        <CardTitle className="text-3xl text-slate-800">
                            {filteredReports.length}
                        </CardTitle>
                    </CardHeader>
                </Card>
            </div>

            <Card className="shadow-sm overflow-hidden border-slate-200">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader className="bg-slate-50">
                            <TableRow>
                                <TableHead className="w-[120px]">Mês</TableHead>
                                <TableHead>Plataforma</TableHead>
                                <TableHead className="text-right">Receita</TableHead>
                                <TableHead className="text-right">Impressões</TableHead>
                                <TableHead className="text-right">Cliques</TableHead>
                                <TableHead className="text-center w-[80px]">Ações</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {loading ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-8 text-muted-foreground">
                                        Carregando extratos...
                                    </TableCell>
                                </TableRow>
                            ) : filteredReports.length === 0 ? (
                                <TableRow>
                                    <TableCell colSpan={6} className="text-center py-12">
                                        <AlertCircle className="h-10 w-10 text-slate-300 mx-auto mb-3" />
                                        <p className="text-slate-500 font-medium">Nenhum relatório encontrado.</p>
                                        <p className="text-slate-400 text-sm mt-1">Adicione o primeiro extrato manual no botão acima.</p>
                                    </TableCell>
                                </TableRow>
                            ) : (
                                filteredReports.map((row) => (
                                    <TableRow key={row.id}>
                                        <TableCell className="font-medium flex items-center gap-2">
                                            <Calendar className="h-4 w-4 text-slate-400" />
                                            {row.month}
                                        </TableCell>
                                        <TableCell>
                                            <Badge variant="outline" className={
                                                row.platform === 'AdMob' ? 'border-blue-200 text-blue-700 bg-blue-50' :
                                                    row.platform === 'AdSense' ? 'border-orange-200 text-orange-700 bg-orange-50' :
                                                        'border-slate-200 text-slate-700 bg-slate-50'
                                            }>
                                                {row.platform === 'AdMob' && <Smartphone className="h-3 w-3 mr-1" />}
                                                {row.platform === 'AdSense' && <Monitor className="h-3 w-3 mr-1" />}
                                                {row.platform}
                                            </Badge>
                                        </TableCell>
                                        <TableCell className="text-right font-bold text-emerald-700">
                                            {new Intl.NumberFormat('pt-BR', { style: 'currency', currency: 'BRL' }).format(row.revenue)}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-600">
                                            {row.impressions ? new Intl.NumberFormat('pt-BR').format(row.impressions) : '-'}
                                        </TableCell>
                                        <TableCell className="text-right text-slate-600">
                                            {row.clicks ? new Intl.NumberFormat('pt-BR').format(row.clicks) : '-'}
                                        </TableCell>
                                        <TableCell className="text-center">
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8 text-red-500 hover:text-red-700 hover:bg-red-50"
                                                onClick={() => handleDelete(row.id)}
                                            >
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        </TableCell>
                                    </TableRow>
                                ))
                            )}
                        </TableBody>
                    </Table>
                </div>
            </Card>
        </div>
    );
}
