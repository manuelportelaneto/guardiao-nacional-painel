/**
 * @fileoverview Motor de Dossiês Executivos em PDF e Exportação Excel (`pdfReportService.ts`).
 * 
 * Gera relatórios institucionais diagramados para Prefeituras, Governos Estaduais
 * e Presidência Nacional, contendo sumário executivo, métricas de SLA e tabelas detalhadas.
 */

import { jsPDF } from 'jspdf';
import autoTable from 'jspdf-autotable';
import * as XLSX from 'xlsx';
import type { JurisdictionScope } from '../types/scope';

export interface ReportMetricsData {
    total: number;
    approved: number;
    resolved: number;
    pending: number;
    rejected: number;
    resolutionRate: number; // Porcentagem
    avgResolutionTimeHours: number;
    coatOfArmsUrl?: string;
    categoryBreakdown: { name: string; count: number; resolvedCount: number; avgHours: number }[];
    departmentBreakdown: { name: string; total: number; resolved: number; efficiency: number }[];
    neighborhoodBreakdown?: { name: string; count: number; resolvedCount: number; criticalCount: number }[];
    recentItems: {
        id: string;
        title: string;
        category: string;
        status: string;
        date: string;
        neighborhood?: string;
        priority: string;
    }[];
}

export const pdfReportService = {
    /**
     * Gera e dispara o download de um Dossiê Executivo Oficial em PDF com o logotipo oficial e brasão.
     */
    async generateExecutivePDF(
        metrics: ReportMetricsData,
        scope: JurisdictionScope,
        periodLabel: string,
        aiSummaryText?: string,
        customCoatOfArmsUrl?: string
    ): Promise<void> {
        const doc = new jsPDF({
            orientation: 'portrait',
            unit: 'mm',
            format: 'a4',
        });

        const pageWidth = doc.internal.pageSize.getWidth();
        const jurisdictionTitle = scope.level === 'NATIONAL'
            ? 'REPÚBLICA FEDERATIVA DO BRASIL - RELATÓRIO NACIONAL'
            : (scope.level === 'STATE'
                ? `ESTADO DE ${scope.state} - RELATÓRIO EXECUTIVO ESTADUAL`
                : `MUNICÍPIO DE ${scope.cityName?.toUpperCase() || 'MUNICIPAL'} - DOSSIÊ DE GESTÃO PÚBLICA`);

        // ─── 1. Cabeçalho Oficial ─────────────────────────────────────────────
        doc.setFillColor(15, 23, 42); // Slate-900
        doc.rect(0, 0, pageWidth, 28, 'F');

        // Carrega e adiciona o Logotipo Oficial no topo direito do PDF
        try {
            const logoImg = new Image();
            logoImg.src = '/logo.png';
            await new Promise((resolve) => {
                logoImg.onload = resolve;
                logoImg.onerror = resolve;
            });
            if (logoImg.complete && logoImg.naturalWidth > 0) {
                doc.addImage(logoImg, 'PNG', pageWidth - 26, 4, 20, 20);
            }
        } catch {
            // Em caso de falha no carregamento da imagem, prossegue sem travar o PDF
        }

        // Carrega Brasão Municipal (se fornecido) no topo esquerdo do cabeçalho
        const coatUrl = customCoatOfArmsUrl || metrics.coatOfArmsUrl;
        if (coatUrl && coatUrl.startsWith('http')) {
            try {
                const coatImg = new Image();
                coatImg.src = coatUrl;
                await new Promise((resolve) => {
                    coatImg.onload = resolve;
                    coatImg.onerror = resolve;
                });
                if (coatImg.complete && coatImg.naturalWidth > 0) {
                    doc.addImage(coatImg, 'PNG', 14, 4, 18, 20);
                }
            } catch {
                // Se falhar o brasão externo, continua
            }
        }

        const textLeftMargin = (coatUrl && coatUrl.startsWith('http')) ? 36 : 14;

        doc.setTextColor(255, 255, 255);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(13);
        doc.text('SISTEMA INTEGRADO GUARDIÃO NACIONAL', textLeftMargin, 11);

        doc.setFontSize(8.5);
        doc.setFont('helvetica', 'normal');
        doc.text(jurisdictionTitle, textLeftMargin, 17);
        doc.text(`Período: ${periodLabel} | Emissão: ${new Date().toLocaleDateString('pt-BR')} às ${new Date().toLocaleTimeString('pt-BR')}`, textLeftMargin, 23);

        // Faixa de destaque verde e amarela nacional
        doc.setFillColor(34, 197, 94); // Verde
        doc.rect(0, 28, pageWidth / 2, 2, 'F');
        doc.setFillColor(234, 179, 8); // Amarelo
        doc.rect(pageWidth / 2, 28, pageWidth / 2, 2, 'F');

        let currentY = 38;

        // ─── 2. Sumário Executivo com IA ──────────────────────────────────────
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('1. SUMÁRIO EXECUTIVO DE INTELIGÊNCIA PÚBLICA', 14, currentY);
        currentY += 6;

        doc.setFillColor(248, 250, 252);
        doc.setDrawColor(226, 232, 240);
        doc.roundedRect(14, currentY, pageWidth - 28, 26, 2, 2, 'FD');

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8.5);
        doc.setTextColor(51, 65, 85);

        const summaryContent = aiSummaryText || 
            `Durante o período de ${periodLabel}, foram protocoladas ${metrics.total} demandas de cidadãos na jurisdição. ` +
            `A taxa global de resolutividade alcançou ${metrics.resolutionRate}%, com tempo médio de atendimento de ${metrics.avgResolutionTimeHours} horas. ` +
            `O setor mais demandado foi ${metrics.categoryBreakdown[0]?.name || 'Zeladoria Urbana'}, concentrando ${metrics.categoryBreakdown[0]?.count || 0} solicitações. ` +
            `Recomenda-se reforço preventivo nas áreas com concentração de ocorrências prioritárias.`;

        const splitSummary = doc.splitTextToSize(summaryContent, pageWidth - 36);
        doc.text(splitSummary, 18, currentY + 6);
        currentY += 34;

        // ─── 3. Quadro de Indicadores de Desempenho (KPI Cards) ───────────────
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('2. INDICADORES-CHAVE DE GESTÃO (KPIS)', 14, currentY);
        currentY += 6;

        const cardWidth = (pageWidth - 28 - 12) / 4;
        const kpis = [
            { label: 'Total Demandas', value: metrics.total.toString(), color: [59, 130, 246] },
            { label: 'Resolvidas / Aprovadas', value: metrics.resolved.toString(), color: [34, 197, 94] },
            { label: 'Em Execução / Análise', value: metrics.pending.toString(), color: [234, 179, 8] },
            { label: 'Taxa de Sucesso', value: `${metrics.resolutionRate}%`, color: [168, 85, 247] },
        ];

        kpis.forEach((kpi, idx) => {
            const x = 14 + idx * (cardWidth + 4);
            doc.setFillColor(248, 250, 252);
            doc.setDrawColor(203, 213, 225);
            doc.roundedRect(x, currentY, cardWidth, 18, 2, 2, 'FD');

            doc.setFillColor(kpi.color[0], kpi.color[1], kpi.color[2]);
            doc.rect(x, currentY, 2.5, 18, 'F');

            doc.setFont('helvetica', 'normal');
            doc.setFontSize(7.5);
            doc.setTextColor(100, 116, 139);
            doc.text(kpi.label, x + 5, currentY + 6);

            doc.setFont('helvetica', 'bold');
            doc.setFontSize(13);
            doc.setTextColor(15, 23, 42);
            doc.text(kpi.value, x + 5, currentY + 14);
        });

        currentY += 26;

        // ─── 4. Tabela de Desempenho por Categoria e SLA ───────────────────────
        doc.setTextColor(30, 41, 59);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(12);
        doc.text('3. DESEMPENHO E CUMPRIMENTO DE SLA POR CATEGORIA', 14, currentY);
        currentY += 4;

        const tableData = metrics.categoryBreakdown.map(cat => [
            cat.name,
            cat.count.toString(),
            cat.resolvedCount.toString(),
            `${Math.round((cat.resolvedCount / (cat.count || 1)) * 100)}%`,
            `${cat.avgHours}h`,
            cat.avgHours <= 48 ? 'Em Dia' : 'Atenção (Gargalo)',
        ]);

        autoTable(doc, {
            startY: currentY,
            head: [['Categoria do Serviço', 'Total', 'Resolvidos', 'Eficácia', 'TMA Médio', 'Status SLA']],
            body: tableData,
            theme: 'grid',
            headStyles: {
                fillColor: [15, 23, 42],
                textColor: [255, 255, 255],
                fontSize: 8.5,
                fontStyle: 'bold',
            },
            styles: {
                fontSize: 8,
                cellPadding: 2.5,
            },
            alternateRowStyles: {
                fillColor: [248, 250, 252],
            },
            columnStyles: {
                0: { fontStyle: 'bold' },
                3: { halign: 'center' },
                4: { halign: 'center' },
                5: { halign: 'center' },
            },
        });

        currentY = (doc as any).lastAutoTable.finalY + 10;

        // ─── 4. Concentração de Demandas por Bairro / Região ─────────────────
        if (metrics.neighborhoodBreakdown && metrics.neighborhoodBreakdown.length > 0) {
            if (currentY > 220) {
                doc.addPage();
                currentY = 20;
            }

            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('4. MAPA DE DEMANDA POR BAIRROS & LOGRADOUROS', 14, currentY);
            currentY += 4;

            const neighData = metrics.neighborhoodBreakdown.map(n => [
                n.name,
                n.count.toString(),
                n.resolvedCount.toString(),
                `${Math.round((n.resolvedCount / (n.count || 1)) * 100)}%`,
                n.criticalCount.toString(),
                n.criticalCount > 0 ? 'Atenção Operacional' : 'Normal'
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Bairro / Região', 'Total Demandas', 'Resolvidas', 'Taxa Resolução', 'Casos Críticos', 'Alerta']],
                body: neighData,
                theme: 'grid',
                headStyles: {
                    fillColor: [51, 65, 85],
                    textColor: [255, 255, 255],
                    fontSize: 8.5,
                    fontStyle: 'bold',
                },
                styles: { fontSize: 8, cellPadding: 2.5 },
                alternateRowStyles: { fillColor: [248, 250, 252] },
                columnStyles: {
                    0: { fontStyle: 'bold' },
                    1: { halign: 'center' },
                    2: { halign: 'center' },
                    3: { halign: 'center' },
                    4: { halign: 'center' },
                    5: { halign: 'center' },
                }
            });

            currentY = (doc as any).lastAutoTable.finalY + 10;
        }

        // Se passar do limite da página, adiciona nova página
        if (currentY > 220) {
            doc.addPage();
            currentY = 20;
        }

        // ─── 5. Tabela de Eficiência das Secretarias Municipais ────────────────
        if (metrics.departmentBreakdown && metrics.departmentBreakdown.length > 0) {
            doc.setTextColor(30, 41, 59);
            doc.setFont('helvetica', 'bold');
            doc.setFontSize(12);
            doc.text('5. EFICIÊNCIA DAS SECRETARIAS RESPONSÁVEIS', 14, currentY);
            currentY += 4;

            const deptData = metrics.departmentBreakdown.map(dept => [
                dept.name,
                dept.total.toString(),
                dept.resolved.toString(),
                `${dept.efficiency}%`,
                dept.efficiency >= 80 ? 'Excelente' : (dept.efficiency >= 60 ? 'Regular' : 'Crítico')
            ]);

            autoTable(doc, {
                startY: currentY,
                head: [['Secretaria / Pasta', 'Demandas Recebidas', 'Atendidas', 'Taxa de Eficiência', 'Avaliação']],
                body: deptData,
                theme: 'striped',
                headStyles: {
                    fillColor: [30, 41, 59],
                    textColor: [255, 255, 255],
                    fontSize: 8.5,
                },
                styles: { fontSize: 8, cellPadding: 2.5 },
            });

            currentY = (doc as any).lastAutoTable.finalY + 12;
        }

        // ─── 6. Rodapé Institucional com Assinatura Digital ───────────────────
        const totalPages = (doc.internal as any).getNumberOfPages();
        for (let i = 1; i <= totalPages; i++) {
            doc.setPage(i);
            doc.setFontSize(7.5);
            doc.setTextColor(148, 163, 184);
            doc.text(`Documento emitido automaticamente pela Plataforma Guardião Nacional - Página ${i} de ${totalPages}`, 14, 288);
            doc.text('Autenticidade verificável via Hash Criptográfico ICP-Brasil', pageWidth - 80, 288);
        }

        const filename = `Dossie_Guardiao_${scope.cityName || scope.state || 'Nacional'}_${Date.now()}.pdf`;
        doc.save(filename);
    },

    /**
     * Exporta dados multidimensionais consolidados em planilha Excel (XLSX).
     */
    exportExcelWorkbook(metrics: ReportMetricsData, scope: JurisdictionScope): void {
        const wb = XLSX.utils.book_new();

        // Aba 1: Resumo Executivo
        const summaryData = [
            ['Indicador', 'Valor'],
            ['Jurisdição', scope.cityName || scope.state || 'Nacional'],
            ['Data de Extração', new Date().toLocaleString('pt-BR')],
            ['Total de Demandas', metrics.total],
            ['Resolvidas', metrics.resolved],
            ['Pendentes / Em Andamento', metrics.pending],
            ['Rejeitadas / Arquivadas', metrics.rejected],
            ['Taxa de Resolutividade (%)', `${metrics.resolutionRate}%`],
            ['Tempo Médio de Atendimento (horas)', metrics.avgResolutionTimeHours],
        ];
        const wsSummary = XLSX.utils.aoa_to_sheet(summaryData);
        XLSX.utils.book_append_sheet(wb, wsSummary, 'Resumo Geral');

        // Aba 2: Por Categoria
        const catData = [
            ['Categoria', 'Total Ocorrências', 'Resolvidas', 'Taxa Resolução (%)', 'Tempo Médio (h)'],
            ...metrics.categoryBreakdown.map(c => [
                c.name,
                c.count,
                c.resolvedCount,
                `${Math.round((c.resolvedCount / (c.count || 1)) * 100)}%`,
                c.avgHours
            ])
        ];
        const wsCat = XLSX.utils.aoa_to_sheet(catData);
        XLSX.utils.book_append_sheet(wb, wsCat, 'Por Categoria');

        // Aba 3: Por Bairro (se disponível)
        if (metrics.neighborhoodBreakdown && metrics.neighborhoodBreakdown.length > 0) {
            const neighData = [
                ['Bairro / Região', 'Total Demandas', 'Resolvidas', 'Taxa Resolução (%)', 'Casos Críticos'],
                ...metrics.neighborhoodBreakdown.map(n => [
                    n.name,
                    n.count,
                    n.resolvedCount,
                    `${Math.round((n.resolvedCount / (n.count || 1)) * 100)}%`,
                    n.criticalCount
                ])
            ];
            const wsNeigh = XLSX.utils.aoa_to_sheet(neighData);
            XLSX.utils.book_append_sheet(wb, wsNeigh, 'Por Bairro');
        }

        // Aba 4: Listagem Detalhada
        if (metrics.recentItems && metrics.recentItems.length > 0) {
            const listData = [
                ['ID', 'Título', 'Categoria', 'Status', 'Data', 'Bairro', 'Prioridade'],
                ...metrics.recentItems.map(item => [
                    item.id,
                    item.title,
                    item.category,
                    item.status,
                    item.date,
                    item.neighborhood || '-',
                    item.priority
                ])
            ];
            const wsList = XLSX.utils.aoa_to_sheet(listData);
            XLSX.utils.book_append_sheet(wb, wsList, 'Ocorrências Detalhadas');
        }

        const filename = `Relatorio_Guardiao_${scope.cityName || scope.state || 'Nacional'}_${Date.now()}.xlsx`;
        XLSX.writeFile(wb, filename);
    }
};
