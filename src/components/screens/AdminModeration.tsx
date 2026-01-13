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
    limit,
    addDoc,
    increment // Import increment
} from 'firebase/firestore';
import {
    ArrowLeft,
    User,
    Loader2,
    RefreshCw,
    Star // Import Star
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Switch } from '../ui/switch';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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
import { loggingService } from '../../services/loggingService';
import { useAuth } from '../../context/AuthContext';

import { ModerationCard } from './moderation/ModerationCard';
import { ModerationFilters } from './moderation/ModerationFilters';
import { ModerationDetails } from './moderation/ModerationDetails';

interface Report {
    id: string;
    contributionId: string;
    reporterId: string;
    reason: string;
    createdAt: Timestamp;
    status: 'pending' | 'approved' | 'rejected';
}

import type { Contribution } from '../../types/contribution';

// Local Contribution interface removed in favor of shared type

interface ReportWithContribution extends Report {
    contribution?: Contribution;
    reporterEmail?: string;
    contributorEmail?: string;
}

const AdminModeration: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [reports, setReports] = useState<ReportWithContribution[]>([]);

    // ... (rest of state)

    // ... (inside handleReportAction)

    // ...

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

    // Reply State
    const [replyDialog, setReplyDialog] = useState<{ open: boolean; contribution: Contribution | null }>({ open: false, contribution: null });
    // autoPublish removed
    const [replyText, setReplyText] = useState('');
    const [useDefaultReply, setUseDefaultReply] = useState(false);
    const defaultReplyText = "Agradecemos sua contribuição! Ela é muito importante para a melhoria da nossa cidade. Encaminharemos para o setor responsável.";

    const [activeTab, setActiveTab] = useState('reports');
    // Rating State
    const [approvalRating, setApprovalRating] = useState(5); // Default 5 stars
    const [collapsedFilters, setCollapsedFilters] = useState(true); // Default collapsed as per request

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
                // Removed autoPublish listener from here
                const unsubscribeSettings = onSnapshot(settingsRef, (_doc) => {
                    // Logic moved to SystemControls
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

                if (currentUser) loggingService.logAudit('CONTRIBUTION_REJECT', currentUser.uid, report.contributionId, { reason: rejectionReason, source: 'report' });

            } else if (action === 'approve') {
                // Legacy / Direct Delete (Keep as fallback or for other contexts)
                if (report.contributionId) {
                    await updateDoc(doc(db, 'contributions', report.contributionId), { status: 'Lixo', deletionReason: 'Removido via Denúncia' });
                }
                await updateDoc(doc(db, 'reports', report.id), { status: 'approved' });
                toast.success("Conteúdo movido para Lixo.");

                if (currentUser) loggingService.logAudit('CONTRIBUTION_REJECT', currentUser.uid, report.contributionId, { reason: 'Lixo', source: 'report_trash' });

            } else if (action === 'reject') {
                await updateDoc(doc(db, 'reports', report.id), { status: 'rejected' });
                toast.success("Denúncia ignorada/rejeitada.");

            } else if (action === 'ban') {
                toast.info("Funcionalidade de banimento em breve.");
            }

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
                // Approve with Rating
                await updateDoc(doc(db, 'contributions', contrib.id), {
                    status: 'Aprovado',
                    rating: approvalRating, // Save Admin Rating
                    approvedAt: Timestamp.now()
                });

                // Notify User (Alert)
                if (contrib.userId) {
                    await addDoc(collection(db, 'users', contrib.userId, 'notifications'), {
                        title: 'Contribuição Aprovada! 🎉',
                        message: `Sua contribuição "${contrib.title}" foi aprovada e já está no mapa!`,
                        type: 'success',
                        link: '/history', // Link to history
                        read: false,
                        createdAt: Timestamp.now()
                    });

                    // Update Gamification (Ratings Received)
                    // We increment the ratingsReceived counter if it exists, or set it.
                    // Also increment approved count maybe?
                    // For now, satisfy "Aguardar Avaliações" mission which checks 'ratingsReceived'
                    const userRef = doc(db, 'users', contrib.userId);
                    // Increment ratingsReceived safely
                    await setDoc(userRef, {
                        interactions: {
                            ratingsReceived: increment(1)
                        }
                    }, { merge: true });
                }

                toast.success("Aprovado com sucesso!");
                if (currentUser) loggingService.logAudit('CONTRIBUTION_APPROVE', currentUser.uid, contrib.id, { rating: approvalRating });

            } else if (action === 'reject_contrib' || action === 'reject_approved') {
                const reason = rejectionReason || 'Sem motivo especificado';
                await updateDoc(doc(db, 'contributions', contrib.id), {
                    status: 'Rejeitado',
                    rejectionReason: reason,
                    rejectedAt: Timestamp.now()
                });

                // Notify User (Alert) - Rejected
                if (contrib.userId) {
                    await addDoc(collection(db, 'users', contrib.userId, 'notifications'), {
                        title: 'Contribuição Recusada',
                        message: `Sua contribuição "${contrib.title}" não pôde ser aceita. Motivo: ${reason}`,
                        type: 'error',
                        link: '/history', // Link to history (Filtered by Rejected ideally, but history root is fine)
                        read: false,
                        createdAt: Timestamp.now()
                    });
                }

                toast.success("Rejeitado com motivo.");
                if (currentUser) loggingService.logAudit('CONTRIBUTION_REJECT', currentUser.uid, contrib.id, { reason });
            }
            setConfirmDialog({ open: false, action: null, report: null, contribution: null });
            setRejectionReason('');
            setApprovalRating(5); // Reset
        } catch (err) {
            console.error(err);
            toast.error("Erro na ação.");
        } finally {
            setActionLoading(false);
        }
    };

    const handleReplyAction = async () => {
        if (!replyDialog.contribution) return;
        setActionLoading(true);
        try {
            await updateDoc(doc(db, 'contributions', replyDialog.contribution.id), {
                reply: replyText,
                replyDate: Timestamp.now(),
                // Optionally update status to 'Resolvido' or just keep it? Usually a reply implies some action.
                // Keeping status as is, or maybe user wants to mark valid?
                // Request says "responder (adicionando um texto)". Doesn't specify status change.
            });
            toast.success("Resposta enviada com sucesso!");
            setReplyDialog({ open: false, contribution: null });
            setReplyText('');
            setUseDefaultReply(false);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao enviar resposta.");
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



    if (loading && !reports.length && !moderationQueue.length && !approvedList.length && !rejectedList.length && !trashList.length) {
        return (
            <div className="flex items-center justify-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>
        );
    }
    if (error) return <div>Error: {error}</div>; // Simple error fallback

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen pt-16 md:pt-6">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}><ArrowLeft className="h-5 w-5" /></Button>
                    <div><h1 className="text-2xl font-bold">Moderação</h1><p className="text-sm text-gray-500">Gestão de Conteúdo</p></div>
                </div>
                {/* Settings removed (moved to System Controls) */}
                <div className="flex gap-2">
                    <Button variant="outline" size="sm" onClick={() => window.location.reload()}><RefreshCw className="h-4 w-4" /></Button>
                </div>
            </div>

            {/* Filters */}
            <ModerationFilters
                searchTerm={searchTerm}
                setSearchTerm={setSearchTerm}
                categoryFilter={categoryFilter}
                setCategoryFilter={setCategoryFilter}
                locationFilter={locationFilter}
                setLocationFilter={setLocationFilter}
                collapsed={collapsedFilters}
                setCollapsed={setCollapsedFilters}
                activeTab={activeTab}
            />

            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
                <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 h-auto gap-2">
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
                                <ModerationCard
                                    key={item.id}
                                    item={item}
                                    tab={tab}
                                    onClick={(i) => setSelectedContribution(i)}
                                    onAction={(action, i) => setConfirmDialog({ open: true, action: action as any, contribution: i, report: null })}
                                    onReply={(i) => setReplyDialog({ open: true, contribution: i })}
                                />
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

            {/* Settings Dialog Removed */}

            {/* Details Dialog (Unified for Queue & Approved) */}
            <ModerationDetails
                contribution={selectedContribution}
                onClose={() => setSelectedContribution(null)}
            />

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

            {/* Reply Dialog */}
            <Dialog open={replyDialog.open} onOpenChange={(open) => !open && setReplyDialog({ open: false, contribution: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Responder Contribuição</DialogTitle>
                        <DialogDescription>
                            Envie uma resposta ao cidadão sobre esta contribuição.
                        </DialogDescription>
                    </DialogHeader>
                    <div className="space-y-4 py-2">
                        <div className="flex items-center space-x-2">
                            <Switch id="default-reply" checked={useDefaultReply} onCheckedChange={(checked) => {
                                setUseDefaultReply(checked);
                                if (checked) setReplyText(defaultReplyText);
                                else setReplyText('');
                            }} />
                            <Label htmlFor="default-reply">Usar resposta padrão</Label>
                        </div>
                        <div className="space-y-2">
                            <Label>Texto da Resposta</Label>
                            <textarea
                                className="w-full min-h-[100px] p-2 border rounded-md"
                                value={replyText}
                                onChange={(e) => {
                                    setReplyText(e.target.value);
                                    if (useDefaultReply && e.target.value !== defaultReplyText) setUseDefaultReply(false);
                                }}
                                placeholder="Digite sua resposta aqui..."
                            />
                        </div>
                    </div>
                    <DialogFooter>
                        <Button variant="outline" onClick={() => setReplyDialog({ open: false, contribution: null })}>Cancelar</Button>
                        <Button onClick={handleReplyAction} disabled={!replyText.trim() || actionLoading}>
                            {actionLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : 'Enviar Resposta'}
                        </Button>
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

                    {confirmDialog.action === 'approve_contrib' && (
                        <div className="py-4 space-y-4">
                            <div className="space-y-2">
                                <Label>Avaliação do Relato (Qualidade)</Label>
                                <div className="flex items-center gap-2">
                                    {[1, 2, 3, 4, 5].map((star) => (
                                        <button
                                            key={star}
                                            onClick={() => setApprovalRating(star)}
                                            className={`p-1 transition-colors ${approvalRating >= star ? 'text-yellow-400' : 'text-gray-300'}`}
                                            type="button"
                                        >
                                            <Star className="w-8 h-8 fill-current" />
                                        </button>
                                    ))}
                                    <span className="text-sm font-bold ml-2 text-gray-700">{approvalRating}/5</span>
                                </div>
                                <p className="text-xs text-gray-500">Essa nota conta para a reputação do usuário.</p>
                            </div>
                        </div>
                    )}

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

        </div >
    );
};

export default AdminModeration;
