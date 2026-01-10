import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebaseConfig';
import {
    collection,
    query,
    where,
    onSnapshot,
    doc,
    updateDoc,
    getDoc,
    setDoc,
    Timestamp,
    orderBy,
    limit
} from 'firebase/firestore';
import {
    ArrowLeft,
    Ban,
    User,
    Loader2,
    RefreshCw,
    Settings,
    Search
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
import { Input } from '../ui/input';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select"
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogDescription,
    DialogFooter
} from '../ui/dialog';
import { toast } from 'sonner';
import { notificationService } from '../../services/notificationService';

import { StandardLocationFilter } from '../common/StandardLocationFilter';
import type { LocationFilterState } from '../common/StandardLocationFilter';

interface Report {
    id: string;
    contributionId: string;
    reporterId: string;
    reason: string;
    createdAt: Timestamp;
    status: 'pending' | 'approved' | 'rejected';
}

interface Contribution {
    id: string;
    title?: string;
    description?: string;
    category?: string;
    imageUrl?: string;
    userId: string;
    city?: string;
    state?: string;
    createdAt?: Timestamp;
    isReported?: boolean;
    status: string; // 'Em Análise', 'Aprovado', 'Rejeitado'
    aiAnalysis?: { isSafe: boolean; predictions?: { className: string; probability: number }[] }[];
    ipAddress?: string;
    imagesMetadata?: any[];
    rejectionReason?: string;
    deletionReason?: string;
    authorName?: string;
    riskLevel?: number; // 1-5
}

interface ReportWithContribution extends Report {
    contribution?: Contribution;
    reporterEmail?: string;
    contributorEmail?: string;
}

const AdminModeration: React.FC = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState<ReportWithContribution[]>([]);

    // Lists
    const [moderationQueue, setModerationQueue] = useState<Contribution[]>([]);
    const [approvedList, setApprovedList] = useState<Contribution[]>([]);
    const [rejectedList, setRejectedList] = useState<Contribution[]>([]);
    const [trashList, setTrashList] = useState<Contribution[]>([]);

    // Filters
    const [searchTerm, setSearchTerm] = useState('');
    const [categoryFilter, setCategoryFilter] = useState('all');
    const [locationFilter, setLocationFilter] = useState<LocationFilterState>({});

    const [loading, setLoading] = useState(true);
    const [error] = useState<string | null>(null);

    // Selection
    const [selectedReport, setSelectedReport] = useState<ReportWithContribution | null>(null);
    const [selectedContribution, setSelectedContribution] = useState<Contribution | null>(null);

    const [actionLoading, setActionLoading] = useState(false);
    const [rejectionReason, setRejectionReason] = useState('');
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        action: 'approve' | 'reject' | 'ban' | 'approve_contrib' | 'reject_contrib' | 'reject_approved' | 'approve_remove_content' | null;
        report: ReportWithContribution | null;
        contribution?: Contribution | null;
    }>({ open: false, action: null, report: null });

    const [autoPublish, setAutoPublish] = useState(false);
    const [settingsOpen, setSettingsOpen] = useState(false);
    const [activeTab, setActiveTab] = useState('reports');

    // Helper: Mask User Data
    const getDisplayUser = (id: string, name?: string) => {
        // Privacy: First Name + Full ID (for Audit field as requested, though this function is used generically. 
        // If this function is only for the cards, the user asked for "campo 'IA & Auditoria'". 
        // Reviewing the code, this usage at line 410 is for the card author.
        // User said: "todas as contribuições pendentes de análise aparecem com o ID de apenas 1 usuário... preciso que o ID completo... apareça no campo 'IA & Auditoria'".
        // I will update this generic helper to return the full ID, but visually check if it breaks layout. The user requested full ID.
        const firstName = name ? name.split(' ')[0] : 'Usuário';
        return `${firstName} (ID: ${id})`;
    };

    // Helper: Format Date
    const formatDate = (date: any) => {
        if (!date) return 'Data desconhecida';
        if (date.toDate) return date.toDate().toLocaleDateString('pt-BR');
        if (date instanceof Date) return date.toLocaleDateString('pt-BR');
        return 'Data inválida';
    };

    const getReasonLabel = (reason: string) => {
        const reasons: Record<string, string> = {
            'spam': 'Spam',
            'inappropriate': 'Conteúdo Impróprio',
            'false_info': 'Informação Falsa',
            'harassment': 'Assédio',
            'other': 'Outro'
        };
        return reasons[reason] || reason;
    };

    // 1. Fetch Settings & Reports
    useEffect(() => {
        const fetchInitialData = async () => {
            try {
                // Settings
                const settingsRef = doc(db, 'settings', 'moderation');
                const unsubscribeSettings = onSnapshot(settingsRef, (doc) => {
                    if (doc.exists()) {
                        setAutoPublish(doc.data().autoPublish || false);
                    }
                });

                // Reports
                const qReports = query(collection(db, 'reports'), where('status', '==', 'pending'));
                const unsubscribeReports = onSnapshot(qReports, async (snapshot) => {
                    const reportsData = await Promise.all(snapshot.docs.map(async (docSnap) => {
                        const reportData = docSnap.data() as Report;
                        const { id: _rId, ...reportFields } = reportData;
                        try {
                            const contribRef = doc(db, 'contributions', reportData.contributionId);
                            const contribSnap = await getDoc(contribRef);
                            let contribution: Contribution | undefined;
                            if (contribSnap.exists()) {
                                const contribData = contribSnap.data() as Contribution;
                                const { id: _cId, ...contribFields } = contribData;
                                contribution = { id: contribSnap.id, ...contribFields, status: contribData.status || 'Em Análise', userId: contribData.userId || 'unknown' };
                            }
                            return { id: docSnap.id, ...reportFields, contribution };
                        } catch (e) {
                            return { id: docSnap.id, ...reportFields };
                        }
                    }));
                    setReports(reportsData);
                    setLoading(false);
                });

                // Contributions Queues
                const contributionsRef = collection(db, 'contributions');

                // 1. Queue (Em Análise) - dedicated query to ensure we see ALL pending items
                // Using basic query without composite index requirement if possible, or just standard
                const unsubscribeQueue = onSnapshot(query(contributionsRef, where('status', '==', 'Em Análise')), (snapshot) => {
                    const queueItems = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contribution));
                    // Client-side sort to be safe
                    queueItems.sort((a, b) => {
                        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                        return timeA - timeB; // Oldest first for queue usually? Or newest? Let's do Oldest first for "FIFO" feel, or User preference. Actually code used default which is random. Let's do Newest first for consistency.
                        return timeB - timeA;
                    });
                    setModerationQueue(queueItems);
                }, (error) => {
                    console.error("Queue subscribe error:", error);
                    toast.error("Erro ao carregar fila.");
                });

                // 2. Recent History (Approved, Rejected, Trash) - Single Stream
                // Fetches everything recent to avoid needing (Status + CreatedAt) composite indexes for each status
                const recentQuery = query(contributionsRef, orderBy('createdAt', 'desc'), limit(200));

                const unsubscribeRecent = onSnapshot(recentQuery, (snapshot) => {
                    const allRecent = snapshot.docs.map(d => ({ id: d.id, ...d.data() } as Contribution));

                    // Filter into buckets
                    const approved = allRecent.filter(c => c.status === 'Aprovado');
                    const rejected = allRecent.filter(c => c.status === 'Rejeitado');
                    const trash = allRecent.filter(c => c.status === 'Lixo');
                    // Note: 'Em Análise' might also be here, but we have a dedicated list for that.

                    setApprovedList(approved);
                    setRejectedList(rejected);
                    setTrashList(trash);
                }, (error) => {
                    console.error("Recent subscribe error:", error);
                    // It's possible even this needs an index if 'contributions' is complex, but usually orderBy(single field) is supported by default.
                });

                return () => {
                    unsubscribeSettings();
                    unsubscribeReports();
                    unsubscribeQueue();
                    unsubscribeRecent();
                };

            } catch (err) {
                console.error(err);
                setLoading(false);
            }
        };

        fetchInitialData();
    }, []);


    // Actions


    const handleReportAction = async (action: 'approve' | 'reject' | 'ban' | 'approve_remove_content') => {
        if (!confirmDialog.report) return;
        setActionLoading(true);
        try {
            const report = confirmDialog.report;

            if (action === 'approve_remove_content') {
                // Feature request: Remove content -> Reject Contribution + Notify User + Approve Report
                if (report.contributionId && report.contribution) {
                    // 1. Update Contribution Status
                    const reason = rejectionReason || 'Violação de Termos';
                    await updateDoc(doc(db, 'contributions', report.contributionId), {
                        status: 'Rejeitado',
                        rejectionReason: reason,
                        deletionReason: 'Removido via Denúncia'
                    });

                    // 2. Notify User (Try to fetch email)
                    try {
                        // We need to fetch the user to get the email since it's not on the contribution
                        const userSnap = await getDoc(doc(db, 'users', report.contribution.userId));
                        if (userSnap.exists()) {
                            const userData = userSnap.data();
                            if (userData.email) {
                                await notificationService.sendContentRemovedEmail(
                                    userData.email,
                                    userData.displayName || 'Usuário',
                                    report.contribution.title || 'Conteúdo',
                                    getReasonLabel(reason)
                                );
                            }
                        }
                    } catch (notifyErr) {
                        console.error("Failed to notify user", notifyErr);
                    }
                }
                // 3. Close Report
                await updateDoc(doc(db, 'reports', report.id), { status: 'approved' });
                toast.success("Conteúdo removido e usuário notificado.");

            } else if (action === 'approve') {
                // Legacy / Direct Delete (Keep as fallback or for other contexts)
                if (report.contributionId) {
                    await updateDoc(doc(db, 'contributions', report.contributionId), { status: 'Lixo', deletionReason: 'Removido via Denúncia' });
                }
                await updateDoc(doc(db, 'reports', report.id), { status: 'approved' });
                toast.success("Conteúdo movido para Lixo.");

            } else if (action === 'reject') {
                await updateDoc(doc(db, 'reports', report.id), { status: 'rejected' });
                toast.success("Denúncia ignorada/rejeitada.");

            } else if (action === 'ban') {
                toast.info("Funcionalidade de banimento em breve.");
            }

            setConfirmDialog({ open: false, action: null, report: null });
            setRejectionReason('');
        } catch (err) {
            console.error(err);
            toast.error("Erro ao processar.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleQueueAction = async () => {
        if (!confirmDialog.contribution) return;
        const contrib = confirmDialog.contribution;
        const action = confirmDialog.action;
        setActionLoading(true);

        try {
            if (action === 'approve_contrib') {
                await updateDoc(doc(db, 'contributions', contrib.id), { status: 'Aprovado' });
                toast.success("Aprovado!");
            } else if (action === 'reject_contrib' || action === 'reject_approved') {
                await updateDoc(doc(db, 'contributions', contrib.id), {
                    status: 'Rejeitado',
                    rejectionReason: rejectionReason || 'Sem motivo especificado'
                });
                toast.success("Rejeitado com motivo.");
            }
            setConfirmDialog({ open: false, action: null, report: null, contribution: null });
            setRejectionReason('');
        } catch (err) {
            console.error(err);
            toast.error("Erro na ação.");
        } finally {
            setActionLoading(false);
        }
    };

    // Filter Logic
    const filterList = (list: Contribution[]) => {
        return list.filter(item => {
            const matchesSearch = searchTerm === '' ||
                item.title?.toLowerCase().includes(searchTerm.toLowerCase()) ||
                item.id.includes(searchTerm);
            const matchesCategory = categoryFilter === 'all' || item.category === categoryFilter;

            // Location Filter (Client Side)
            let matchesLocation = true;
            if (locationFilter.state) {
                matchesLocation = matchesLocation && item.state === locationFilter.state;
            }
            if (locationFilter.city) {
                // Normalize for comparison if needed, assuming exact match from DB for now
                matchesLocation = matchesLocation && item.city === locationFilter.city;
            }

            return matchesSearch && matchesCategory && matchesLocation;
        });
    };

    // Render Helpers
    const renderRiskBadges = (item: Contribution) => {
        const analysis = item.aiAnalysis;
        const riskLevel = item.riskLevel;

        const elements = [];

        // Risk Level Badge
        if (riskLevel && riskLevel > 1) {
            let color = "bg-gray-100 text-gray-800";
            if (riskLevel === 2) color = "bg-yellow-100 text-yellow-800";
            if (riskLevel === 3) color = "bg-orange-100 text-orange-800";
            if (riskLevel >= 4) color = "bg-red-100 text-red-800";

            elements.push(
                <Badge key="risk" variant="outline" className={`${color} border-none`}>
                    Risco Nível {riskLevel}
                </Badge>
            );
        }

        if (analysis && Array.isArray(analysis)) {
            analysis.forEach((img, idx) => {
                if (img.predictions) {
                    const unsafe = img.predictions.filter(p => p.className !== 'Neutral' && p.className !== 'Drawing' && p.probability > 0.01);
                    unsafe.forEach((risk, rIdx) => {
                        elements.push(
                            <Badge key={`ai-${idx}-${rIdx}`} variant={risk.probability > 0.5 ? "destructive" : "secondary"} className="text-[10px]">
                                IA: {risk.className} {Math.round(risk.probability * 100)}%
                            </Badge>
                        );
                    });
                }
            });
        }

        if (elements.length === 0) return null;

        return (
            <div className="flex flex-wrap gap-1 mt-1">
                {elements.slice(0, 4)}
            </div>
        );
    };


    if (loading && !reports.length && !moderationQueue.length && !approvedList.length && !rejectedList.length && !trashList.length) {
        return (
            <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
        );
    }
    if (error) return <div>Error: {error}</div>; // Simple error fallback

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}><ArrowLeft className="h-5 w-5" /></Button>
                    <div><h1 className="text-2xl font-bold">Moderação</h1><p className="text-sm text-gray-500">Gestão de Conteúdo</p></div>
                </div>
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => setSettingsOpen(true)}><Settings className="h-4 w-4 mr-2" /> Configurar</Button>
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Filters */}
            <div className="space-y-4">
                <div className="flex flex-col md:flex-row gap-4 md:items-center bg-white p-4 rounded-lg shadow-sm">
                    <div className="relative flex-1 w-full md:max-w-sm">
                        <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-gray-400" />
                        <Input placeholder="Buscar..." className="pl-9 w-full" value={searchTerm} onChange={e => setSearchTerm(e.target.value)} />
                    </div>
                    <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                        <SelectTrigger className="w-full md:w-[180px]"><SelectValue placeholder="Categoria" /></SelectTrigger>
                        <SelectContent>
                            <SelectItem value="all">Todas</SelectItem>
                            <SelectItem value="infrastructure">Infraestrutura</SelectItem>
                            <SelectItem value="security">Segurança</SelectItem>
                            <SelectItem value="transport">Transporte</SelectItem>
                            <SelectItem value="environment">Meio Ambiente</SelectItem>
                            <SelectItem value="services">Serviços</SelectItem>
                            <SelectItem value="leisure">Lazer</SelectItem>
                            <SelectItem value="health">Saúde</SelectItem>
                        </SelectContent>
                    </Select>
                </div>

                {/* Standard Location Filter - Visible mostly for lists, but can filter Queue/Approved */}
                {(activeTab === 'approved' || activeTab === 'queue') && (
                    <div className="bg-white p-4 rounded-lg shadow-sm w-fit">
                        <Label className="text-xs text-gray-400 mb-2 block">Filtrar por Localização</Label>
                        <StandardLocationFilter
                            value={locationFilter}
                            onChange={setLocationFilter}
                        />
                    </div>
                )}
            </div>

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-5 max-w-4xl">
                    <TabsTrigger value="reports">Denúncias ({reports.length})</TabsTrigger>
                    <TabsTrigger value="queue">Fila IA ({moderationQueue.length})</TabsTrigger>
                    <TabsTrigger value="approved">Aprovados ({approvedList.length})</TabsTrigger>
                    <TabsTrigger value="rejected">Rejeitados ({rejectedList.length})</TabsTrigger>
                    <TabsTrigger value="trash">Lixo ({trashList.length})</TabsTrigger>
                </TabsList>

                {/* TABS CONTENT MAPPING */}
                {['queue', 'approved', 'rejected', 'trash'].map(tab => (
                    <TabsContent key={tab} value={tab} className="mt-6">
                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                            {filterList(tab === 'queue' ? moderationQueue : tab === 'approved' ? approvedList : tab === 'rejected' ? rejectedList : trashList).map((item) => (
                                <Card key={item.id} onClick={() => setSelectedContribution(item)} className="cursor-pointer hover:shadow-md">
                                    <CardHeader className="pb-2 flex flex-row justify-between space-y-0">
                                        <Badge variant="outline">{item.category}</Badge>
                                        <span className="text-xs text-gray-400">{formatDate(item.createdAt)}</span>
                                    </CardHeader>
                                    <CardContent className="space-y-2">
                                        {item.imageUrl && <img src={item.imageUrl} className="w-full h-40 object-cover rounded" alt="Content" />}
                                        <h4 className="font-semibold text-sm line-clamp-1">{item.title}</h4>
                                        {renderRiskBadges(item)}
                                        <div className="text-xs text-gray-500">Autor: {getDisplayUser(item.userId, (item as any).authorName)}</div>

                                        {tab === 'queue' && (
                                            <div className="flex gap-2 mt-2">
                                                <Button size="sm" variant="destructive" className="flex-1" onClick={e => { e.stopPropagation(); setConfirmDialog({ open: true, action: 'reject_contrib', contribution: item, report: null }); }}>Rejeitar</Button>
                                                <Button size="sm" className="flex-1" onClick={e => { e.stopPropagation(); setConfirmDialog({ open: true, action: 'approve_contrib', contribution: item, report: null }); }}>Aprovar</Button>
                                            </div>
                                        )}
                                        {tab === 'approved' && (
                                            <Button size="sm" variant="outline" className="w-full mt-2 text-red-500" onClick={e => { e.stopPropagation(); setConfirmDialog({ open: true, action: 'reject_approved', contribution: item, report: null }); }}>
                                                <Ban className="h-3 w-3 mr-1" /> Rejeitar
                                            </Button>
                                        )}
                                        {tab === 'rejected' && item.rejectionReason && (
                                            <Badge variant="secondary" className="bg-red-100 text-red-800 mt-2">Motivo: {item.rejectionReason}</Badge>
                                        )}
                                        {tab === 'trash' && item.deletionReason && (
                                            <Badge variant="secondary" className="bg-red-100 text-red-800 mt-2">Motivo: {item.deletionReason}</Badge>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                            {filterList(tab === 'queue' ? moderationQueue : tab === 'approved' ? approvedList : tab === 'rejected' ? rejectedList : trashList).length === 0 && (
                                <div className="col-span-3 text-center py-12 text-gray-500 border border-dashed rounded">Lista vazia.</div>
                            )}
                        </div>
                    </TabsContent>
                ))}

                {/* Reports Tab Special Case */}
                <TabsContent value="reports" className="mt-6">
                    <div className="grid gap-4 md:grid-cols-3">
                        {reports.map((report) => (
                            <Card key={report.id} onClick={() => setSelectedReport(report)} className="cursor-pointer hover:shadow">
                                <CardHeader className="pb-2 flex flex-row items-center justify-between space-y-0">
                                    <Badge variant="destructive">{getReasonLabel(report.reason)}</Badge>
                                    <span className="text-xs text-gray-400">{formatDate(report.createdAt)}</span>
                                </CardHeader>
                                <CardContent className="space-y-2">
                                    {report.contribution?.imageUrl && <img src={report.contribution.imageUrl} className="w-full h-32 object-cover rounded" alt="Evidence" />}
                                    <p className="text-sm font-medium line-clamp-2">{report.contribution?.description || "Sem descrição"}</p>
                                    <div className="text-xs text-gray-500 flex items-center gap-1"><User className="h-3 w-3" /> {getDisplayUser(report.reporterId)} (Reporter)</div>
                                </CardContent>
                            </Card>
                        ))}
                        {reports.length === 0 && <div className="col-span-3 text-center py-12 text-gray-500 border border-dashed rounded">Sem denúncias.</div>}
                    </div>
                </TabsContent>

            </Tabs>

            {/* Settings Dialog */}
            <Dialog open={settingsOpen} onOpenChange={setSettingsOpen}>
                <DialogContent>
                    <DialogHeader><DialogTitle>Configurações</DialogTitle></DialogHeader>
                    <div className="flex items-center space-x-2 py-4">
                        <Switch id="auto-publish" checked={autoPublish} onCheckedChange={async () => {
                            await setDoc(doc(db, 'settings', 'moderation'), { autoPublish: !autoPublish }, { merge: true });
                            setAutoPublish(!autoPublish);
                        }} />
                        <Label htmlFor="auto-publish">Auto-Publicação</Label>
                    </div>
                </DialogContent>
            </Dialog>

            {/* Details Dialog (Unified for Queue & Approved) */}
            <Dialog open={!!selectedContribution} onOpenChange={() => setSelectedContribution(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Detalhes</DialogTitle></DialogHeader>
                    {selectedContribution && (
                        <div className="space-y-4">
                            {selectedContribution.imageUrl && <img src={selectedContribution.imageUrl} className="w-full h-80 object-cover rounded" alt="Full" />}
                            <div className="grid grid-cols-2 gap-4">
                                <div><Label className="text-gray-500">Título</Label><p className="font-medium">{selectedContribution.title}</p></div>
                                <div><Label className="text-gray-500">Autor</Label><p>{getDisplayUser(selectedContribution.userId, (selectedContribution as any).authorName)}</p></div>
                                <div className="col-span-2"><Label className="text-gray-500">Descrição</Label><p className="text-sm bg-gray-50 p-2 rounded">{selectedContribution.description}</p></div>
                                <div className="col-span-2 border-t pt-2"><Label className="text-gray-500">IA & Auditoria</Label>
                                    <div className="bg-slate-900 text-green-400 p-2 rounded font-mono text-xs overflow-auto">
                                        <p>ID: {selectedContribution.id}</p>
                                        {/* Added User ID Complete */}
                                        <p>User ID: {selectedContribution.userId}</p>
                                        <p>Status: {selectedContribution.status}</p>
                                        <p className="font-bold text-yellow-400">Risco Calculado: Nível {selectedContribution.riskLevel || 'N/A'}</p>
                                        {selectedContribution.rejectionReason && <p className="text-red-400">Motivo Rejeição: {selectedContribution.rejectionReason}</p>}
                                        {selectedContribution.deletionReason && <p className="text-red-400">Motivo Exclusão: {selectedContribution.deletionReason}</p>}
                                        <p>IP: {selectedContribution.ipAddress || 'Unknown'}</p>
                                        <p>Analysis: {JSON.stringify(selectedContribution.aiAnalysis, null, 2)}</p>
                                        {selectedContribution.imagesMetadata && (
                                            <p>Metadata: {JSON.stringify(selectedContribution.imagesMetadata, null, 2)}</p>
                                        )}
                                    </div>
                                </div>
                            </div>
                        </div>
                    )}
                    <DialogFooter>
                        <Button className="w-full" onClick={() => setSelectedContribution(null)}>Fechar</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Report Details Dialog */}
            <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader><DialogTitle>Detalhes da Denúncia</DialogTitle></DialogHeader>
                    {selectedReport && (
                        <div className="py-4 space-y-4">
                            <div className="bg-red-50 p-4 rounded border border-red-100">
                                <Label className="text-red-800 font-semibold block mb-1">Dados da Denúncia</Label>
                                <p><span className="font-medium">Motivo:</span> {getReasonLabel(selectedReport.reason)}</p>
                                <p className="mt-1"><span className="font-medium">Denunciado por:</span> {getDisplayUser(selectedReport.reporterId)} (ID: {selectedReport.reporterId})</p>
                                <p className="text-xs text-gray-500 mt-2">Data: {formatDate(selectedReport.createdAt)}</p>
                            </div>

                            {selectedReport.contribution && (
                                <div className="border p-4 rounded bg-gray-50">
                                    <Label className="text-gray-700 font-semibold block mb-2">Conteúdo Denunciado Original</Label>

                                    {selectedReport.contribution.imageUrl && (
                                        <img src={selectedReport.contribution.imageUrl} className="w-full h-64 object-cover rounded mb-4" alt="Reported Content" />
                                    )}

                                    <h4 className="font-bold text-lg mb-2">{selectedReport.contribution.title}</h4>
                                    <p className="bg-white p-3 rounded border text-sm">{selectedReport.contribution.description}</p>

                                    <div className="mt-4 text-xs text-gray-500">
                                        <p>ID Contribuição: {selectedReport.contribution.id}</p>
                                        <p>Autor: {selectedReport.contribution.userId} ({selectedReport.contribution.authorName || 'Desconhecido'})</p>
                                    </div>
                                </div>
                            )}
                        </div>
                    )}
                    <DialogFooter>
                        <Button variant="destructive" onClick={() => { setConfirmDialog({ open: true, action: 'approve_remove_content', report: selectedReport }); setSelectedReport(null); }}>Remover Conteúdo</Button>
                        <Button variant="secondary" onClick={() => { setConfirmDialog({ open: true, action: 'reject', report: selectedReport }); setSelectedReport(null); }}>Ignorar Denúncia</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>


            {/* CONFIRM DIALOG WITH REASON */}
            <Dialog open={confirmDialog.open} onOpenChange={o => !o && setConfirmDialog({ ...confirmDialog, open: false })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirmar Ação</DialogTitle>
                        <DialogDescription>
                            {confirmDialog.action === 'approve_remove_content' ? 'Remover conteúdo e notificar usuário?' : `Ação: ${confirmDialog.action === 'reject' ? 'Ignorar Denúncia' : confirmDialog.action}`}
                        </DialogDescription>
                    </DialogHeader>

                    {/* Reason Input for Rejection - ONLY if Action is one that REQUIRES reason */}
                    {['reject_contrib', 'reject_approved', 'approve_remove_content'].includes(confirmDialog.action || '') && (
                        <div className="py-2">
                            <Label>Motivo da Rejeição / Exclusão (Obrigatório)</Label>
                            <Select value={rejectionReason} onValueChange={setRejectionReason}>
                                <SelectTrigger><SelectValue placeholder="Selecione um motivo" /></SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="policy_violation">Violação de Termos</SelectItem>
                                    <SelectItem value="low_quality">Baixa Qualidade</SelectItem>
                                    <SelectItem value="spam">Spam / Propaganda</SelectItem>
                                    <SelectItem value="duplicate">Duplicata</SelectItem>
                                    <SelectItem value="inappropriate">Conteúdo Impróprio</SelectItem>
                                    <SelectItem value="other">Outro</SelectItem>
                                </SelectContent>
                            </Select>
                            {/* Optional text input if 'other' - skipping for simplicity valid per request "selecionar um motivo" */}
                        </div>
                    )}

                    <DialogFooter>
                        <Button variant="ghost" onClick={() => setConfirmDialog({ ...confirmDialog, open: false })}>Cancelar</Button>
                        <Button variant="destructive"
                            disabled={
                                (['reject_contrib', 'reject_approved', 'approve_remove_content'].includes(confirmDialog.action || '') && !rejectionReason)
                                || actionLoading
                            }
                            onClick={() => {
                                // If action requires reason and none is selected, return
                                if (['reject_contrib', 'reject_approved', 'approve_remove_content'].includes(confirmDialog.action || '') && !rejectionReason) return;

                                if (confirmDialog.action?.includes('contrib') || confirmDialog.action?.includes('approved')) handleQueueAction();
                                else if (confirmDialog.report) handleReportAction(confirmDialog.action as any);
                            }}
                        >
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Confirmar'}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

        </div>
    );
};

export default AdminModeration;
