import React, { useState } from 'react';
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter,
} from '../ui/dialog';
import { Button } from '../ui/button';
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import { FileDown, FileSpreadsheet, Loader2 } from 'lucide-react';
import { contributionService } from '../../services/contributionService';
import { reportService } from '../../services/reportService';
import { toast } from 'sonner';

interface ReportDialogProps {
    open: boolean;
    onOpenChange: (open: boolean) => void;
    cityId: string | undefined;
    cityName: string;
}

export const ReportDialog: React.FC<ReportDialogProps> = ({ open, onOpenChange, cityId, cityName }) => {
    const [loading, setLoading] = useState(false);
    const [statusFilter, setStatusFilter] = useState('all');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [period, setPeriod] = useState('30'); // days

    const handleExport = async (format: 'pdf' | 'excel') => {
        if (!cityId) {
            toast.error('Cidade não identificada.');
            return;
        }
        setLoading(true);
        try {
            const startDate = new Date();
            startDate.setDate(startDate.getDate() - parseInt(period));

            const data = await contributionService.getCityContributions(cityId, {
                status: statusFilter,
                category: categoryFilter,
                startDate: period === 'all' ? undefined : startDate
            });

            if (data.length === 0) {
                toast.error('Nenhuma ocorrência encontrada para os filtros selecionados.');
                return;
            }

            if (format === 'pdf') {
                await reportService.exportToPDF(data, cityName);
            } else {
                await reportService.exportToExcel(data, cityName);
            }

            toast.success(`Relatório ${format.toUpperCase()} gerado com sucesso!`);
            onOpenChange(false);
        } catch (error) {
            console.error('Export error:', error);
            toast.error('Erro ao gerar relatório. Verifique os dados e tente novamente.');
        } finally {
            setLoading(false);
        }
    };

    return (
        <Dialog open={open} onOpenChange={onOpenChange}>
            <DialogContent className="sm:max-w-[425px]">
                <DialogHeader>
                    <DialogTitle>Gerar Relatórios - {cityName}</DialogTitle>
                    <DialogDescription>
                        Configure os filtros para exportar os dados das ocorrências.
                    </DialogDescription>
                </DialogHeader>

                <div className="grid gap-4 py-4">
                    <div className="grid gap-2">
                        <Label htmlFor="period">Período</Label>
                        <Select value={period} onValueChange={setPeriod}>
                            <SelectTrigger>
                                <SelectValue placeholder="Selecione o período" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="7">Últimos 7 dias</SelectItem>
                                <SelectItem value="30">Últimos 30 dias</SelectItem>
                                <SelectItem value="90">Últimos 90 dias</SelectItem>
                                <SelectItem value="all">Todo o histórico</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="status">Status</Label>
                        <Select value={statusFilter} onValueChange={setStatusFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todos os status" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todos</SelectItem>
                                <SelectItem value="Em Análise">Em Análise</SelectItem>
                                <SelectItem value="Aprovado">Aprovado</SelectItem>
                                <SelectItem value="Agendado">Agendado</SelectItem>
                                <SelectItem value="Resolvido">Resolvido</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>

                    <div className="grid gap-2">
                        <Label htmlFor="category">Categoria</Label>
                        <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                            <SelectTrigger>
                                <SelectValue placeholder="Todas as categorias" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="all">Todas</SelectItem>
                                <SelectItem value="infrastructure">Infraestrutura</SelectItem>
                                <SelectItem value="security">Segurança</SelectItem>
                                <SelectItem value="health">Saúde</SelectItem>
                                <SelectItem value="environment">Meio Ambiente</SelectItem>
                                <SelectItem value="leisure">Lazer</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>

                <DialogFooter className="flex flex-col sm:flex-row gap-2">
                    <Button
                        variant="outline"
                        className="flex-1 gap-2 border-orange-200 text-orange-700 hover:bg-orange-50"
                        onClick={() => handleExport('excel')}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileSpreadsheet className="h-4 w-4" />}
                        Excel
                    </Button>
                    <Button
                        className="flex-1 gap-2 bg-orange-600 hover:bg-orange-700"
                        onClick={() => handleExport('pdf')}
                        disabled={loading}
                    >
                        {loading ? <Loader2 className="h-4 w-4 animate-spin" /> : <FileDown className="h-4 w-4" />}
                        PDF
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
};
