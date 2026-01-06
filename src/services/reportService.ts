import { utils, writeFile } from 'xlsx';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { format } from 'date-fns';
import { ptBR } from 'date-fns/locale';

export interface ReportData {
    id: string;
    title: string;
    description: string;
    category: string;
    status: string;
    address?: string;
    city?: string;
    state?: string;
    createdAt: { toDate: () => Date } | Date | string | number;
    userId: string;
    imageUrl?: string;
    tags?: string[];
}

/**
 * Serviço para geração de relatórios técnicos (PDF e Excel)
 */
export const reportService = {
    /**
     * Anonimiza o ID do usuário para privacidade
     */
    anonimizeUserId(userId: string): string {
        if (!userId) return 'USR-ANON';
        return `USR-${userId.substring(0, 4)}...${userId.substring(userId.length - 4)}`;
    },

    /**
     * Formata a data para exibição
     */
    formatDate(date: { toDate: () => Date } | Date | string | number): string {
        if (!date) return 'N/A';
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const d = (date as any).toDate ? (date as any).toDate() : new Date(date as string | number | Date);
        return format(d, "dd/MM/yyyy HH:mm", { locale: ptBR });
    },

    /**
     * Gera e baixa um arquivo Excel (.xlsx)
     */
    async exportToExcel(data: ReportData[], cityName: string) {
        const worksheetData = data.map(item => ({
            'ID Ocorrência': item.id,
            'Título': item.title || 'Sem título',
            'Descrição': item.description || 'Sem descrição',
            'Categoria': item.category || 'N/A',
            'Status': item.status || 'Pendente',
            'Endereço': item.address || `${item.city || ''}, ${item.state || ''}`,
            'Data/Hora': this.formatDate(item.createdAt),
            'ID Usuário': item.userId, // Full ID requested by user
            'Tags': (item.tags || []).join(', ')
        }));

        const worksheet = utils.json_to_sheet(worksheetData);
        const workbook = utils.book_new();
        utils.book_append_sheet(workbook, worksheet, 'Ocorrências');

        const fileName = `Relatorio_${cityName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.xlsx`;
        writeFile(workbook, fileName);
    },

    /**
     * Gera e baixa um arquivo PDF (.pdf)
     */
    async exportToPDF(data: ReportData[], cityName: string) {
        const doc = new jsPDF();
        const now = new Date();
        const dateStr = format(now, "dd/MM/yyyy HH:mm");

        // Cabeçalho do Documento
        doc.setFontSize(18);
        doc.setTextColor(0, 51, 102);
        doc.text('Relatório Técnico de Ocorrências', 14, 20);

        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(`Município: ${cityName}`, 14, 28);
        doc.text(`Gerado em: ${dateStr}`, 14, 34);

        const tableColumn = [
            "ID",
            "Data/Hora",
            "Categoria",
            "Título/Descrição",
            "Status",
            "Local"
        ];

        const tableRows = data.map(item => [
            item.id.substring(0, 6) + '...',
            this.formatDate(item.createdAt),
            item.category || 'N/A',
            `${item.title || 'S/T'}\n${(item.description || '').substring(0, 100)}${(item.description?.length || 0) > 100 ? '...' : ''}`,
            item.status || 'Pendente',
            item.address || `${item.city || ''}, ${item.state || ''}`
        ]);

        autoTable(doc, {
            head: [tableColumn],
            body: tableRows,
            startY: 45,
            theme: 'grid',
            headStyles: { fillColor: [0, 51, 102], textColor: [255, 255, 255], fontSize: 9 },
            styles: { fontSize: 8, cellPadding: 2, valign: 'middle' },
            columnStyles: {
                0: { cellWidth: 15 },
                1: { cellWidth: 25 },
                2: { cellWidth: 25 },
                3: { cellWidth: 65 },
                4: { cellWidth: 25 },
                5: { cellWidth: 35 }
            }
        });

        // Add Footer
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const pageCount = (doc as any).internal.getNumberOfPages();
        for (let i = 1; i <= pageCount; i++) {
            doc.setPage(i);
            doc.setFontSize(8);
            doc.setTextColor(150);
            doc.text(`Página ${i} de ${pageCount}`, 190, 285, { align: 'right' });
            doc.text(`Guardião Nacional - Sistema de Gestão Municipal`, 14, 285);
        }

        const fileName = `Relatorio_${cityName.replace(/\s+/g, '_')}_${format(new Date(), 'yyyy-MM-dd')}.pdf`;
        doc.save(fileName);
    }
};
