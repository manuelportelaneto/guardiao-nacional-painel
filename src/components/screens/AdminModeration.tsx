import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebaseConfig';
import { CLOUD_FUNCTIONS } from '../../config';
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
    Settings,
    Shield,
    Zap,
    Play
} from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
// Select imports removed as they are unused
import {
    Dialog,
    DialogContent,
    DialogHeader,
    DialogTitle,
    DialogFooter
} from '../ui/dialog';
import { toast } from 'sonner';
import { moderationService, type ModerationItem } from '../../services/moderationService';
import { useAuth } from '../../context/AuthContext';
import { useModerationStore } from '../../stores/moderationStore';
import { ModerationCard } from './moderation/ModerationCard';
import { ModerationFilters } from './moderation/ModerationFilters';
import { ModerationDetails } from './moderation/ModerationDetails';
import { ReplyDialog, ConfirmActionDialog } from './moderation';
import type { Contribution } from '../../types/contribution';
import { notificationService } from '../../services/notificationService';
import { loggingService } from '../../services/loggingService';
import { automationService } from '../../services/automationService';
import { Switch } from '../ui/switch';

interface SystemSettings {
    autoPublish: boolean;
    aiImageAnalysis: boolean;
    aiTextAnalysis: boolean;
    aiAnalysisLevel: 'low' | 'medium' | 'high';
}

const DEFAULT_SETTINGS: SystemSettings = {
    autoPublish: false,
    aiImageAnalysis: true,
    aiTextAnalysis: true,
    aiAnalysisLevel: 'medium'
};

interface Report {
    id: string;
    contributionId: string;
    reporterId: string;
    reason: string;
    createdAt: Timestamp;
    status: 'pending' | 'approved' | 'rejected';
}

interface ReportWithContribution extends Report {
    contribution?: Contribution;
    reporterEmail?: string;
    contributorEmail?: string;
}

interface LocationFilterState {
    state?: string;
    city?: string;
}

const AdminModeration: React.FC = () => {
    const navigate = useNavigate();
    const { currentUser } = useAuth();
    const [reports, setReports] = useState<ReportWithContribution[]>([]);

    // Lists
    const [moderationQueue, setModerationQueue] = useState<ModerationItem[]>([]);
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
    // Store State
    const {
        confirmDialog,
        openConfirmDialog,
        closeConfirmDialog,
        replyDialog,
        openReplyDialog,
        closeReplyDialog,
        approvalRating,
        setApprovalRating,
        rejectionReason,
        setRejectionReason,
        replyText,
        setReplyText,
        useDefaultReply,
        setUseDefaultReply
    } = useModerationStore();

    const [activeTab, setActiveTab] = useState('reports');
    const [collapsedFilters, setCollapsedFilters] = useState(true);
    const [settings, setSettings] = useState<SystemSettings>(DEFAULT_SETTINGS);
    const [runningAnalysis, setRunningAnalysis] = useState(false);

    useEffect(() => {
        const settingsRef = doc(db, 'settings', 'global');
        const unsubscribe = onSnapshot(settingsRef, (docSnap) => {
            if (docSnap.exists()) {
                setSettings({ ...DEFAULT_SETTINGS, ...docSnap.data() } as SystemSettings);
            }
        });
        return () => unsubscribe();
    }, []);

    const handleToggle = async (key: keyof SystemSettings, exactValue?: any) => {
        let newValue = exactValue !== undefined ? exactValue : !settings[key as keyof SystemSettings];
        setSettings((prev: SystemSettings) => ({ ...prev, [key]: newValue }));
        try {
            await setDoc(doc(db, 'settings', 'global'), { [key]: newValue }, { merge: true });
            if (typeof newValue === 'boolean') toast.success(`Configuração atualizada!`);
            if (currentUser) loggingService.logAudit('SETTINGS_UPDATE', currentUser.uid, key, { newValue });
        } catch (error) {
            toast.error("Erro ao salvar.");
            if (typeof newValue === 'boolean') setSettings((prev: SystemSettings) => ({ ...prev, [key]: !newValue }));
        }
    };

    const runRetroactiveAI = async () => {
        setRunningAnalysis(true);
        toast.info("Iniciando análise retroativa...");
        try {
            if (!currentUser) throw new Error('Usuário não autenticado');
            const idToken = await currentUser.getIdToken(true);

            const response = await fetch(CLOUD_FUNCTIONS.runRetroactiveAnalysis, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                    'Authorization': `Bearer ${idToken}`
                },
                body: JSON.stringify({ data: { limit: 50 } })
            });
            if (response.ok) toast.success("Análise em andamento. Verifique em instantes.");
            else toast.error("Erro ao chamar função de IA.");
        } catch (e) {
            toast.error("Erro de conexão ou autenticação.");
        } finally {
            setRunningAnalysis(false);
        }
    };

    // Helper: Mask User Data
    const getDisplayUser = (id: string, name?: string) => {
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


                // ...

                // 1. Queue (Em Análise) - dedicated query to ensure we see ALL pending items
                const unsubscribeQueue = onSnapshot(query(contributionsRef, where('status', '==', 'Em Análise')), (snapshot) => {
                    const queueItems = snapshot.docs.map(d => {
                        const contrib = { id: d.id, ...d.data() } as Contribution;
                        const { score, reasons } = moderationService.calculatePriority(contrib);
                        return {
                            ...contrib,
                            priorityScore: score,
                            priorityReasons: reasons
                        } as ModerationItem;
                    });

                    // Smart Sort: Priority Score (Desc) -> Oldest First
                    queueItems.sort((a, b) => {
                        if (b.priorityScore !== a.priorityScore) {
                            return b.priorityScore - a.priorityScore; // Higher score first
                        }
                        const timeA = a.createdAt?.toDate ? a.createdAt.toDate().getTime() : 0;
                        const timeB = b.createdAt?.toDate ? b.createdAt.toDate().getTime() : 0;
                        return timeA - timeB; // Older first if same score
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

                    // Trigger Automation (Rejeitado)
                    // We need to fetch contribution data ideally, but we have report.contribution which is likely partial
                    // We'll pass what we have
                    if (report.contribution) {
                        await automationService.runAutomation('status_updated', { ...report.contribution, id: report.contributionId, status: 'Rejeitado', rejectionReason: reason });
                    }

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
                    // Trigger Automation (Lixo)
                    if (report.contribution) {
                        await automationService.runAutomation('status_updated', { ...report.contribution, id: report.contributionId, status: 'Lixo' });
                    }
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
            closeConfirmDialog();
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

                // Trigger Automation
                await automationService.runAutomation('status_updated', { ...contrib, status: 'Aprovado' });

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

                    // Send Email Notification (if campaign enabled)
                    try {
                        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
                        const settings = settingsDoc.data() || {};
                        if (settings.notifyOnApproval !== false) {
                            const userDoc = await getDoc(userRef);
                            const userData = userDoc.data();
                            if (userData?.email) {
                                await notificationService.sendContentApprovedEmail(
                                    userData.email,
                                    userData.name || 'Cidadão',
                                    contrib.title || 'Contribuição'
                                );
                            }
                        }
                    } catch (emailErr) {
                        console.error('Failed to send approval email:', emailErr);
                        // Don't fail the approval if email fails
                    }
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

                // Trigger Automation
                await automationService.runAutomation('status_updated', { ...contrib, status: 'Rejeitado', rejectionReason: reason });


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

                    // Send Email Notification (if campaign enabled)
                    try {
                        const settingsDoc = await getDoc(doc(db, 'settings', 'global'));
                        const settings = settingsDoc.data() || {};
                        if (settings.notifyOnRejection !== false) {
                            const userRef = doc(db, 'users', contrib.userId);
                            const userDoc = await getDoc(userRef);
                            const userData = userDoc.data();
                            if (userData?.email) {
                                await notificationService.sendContentRemovedEmail(
                                    userData.email,
                                    userData.name || 'Cidadão',
                                    contrib.title || 'Contribuição',
                                    reason
                                );
                            }
                        }
                    } catch (emailErr) {
                        console.error('Failed to send rejection email:', emailErr);
                        // Don't fail the rejection if email fails
                    }
                }

                toast.success("Rejeitado com motivo.");
                if (currentUser) loggingService.logAudit('CONTRIBUTION_REJECT', currentUser.uid, contrib.id, { reason });
            }

            closeConfirmDialog();
            setRejectionReason('');
            setApprovalRating(5); // Reset
        } catch (err) {
            console.error(err);
            toast.error("Erro na ação.");
        } finally {
            setActionLoading(false);
        }
    };

    // Unified Confirm Handler
    const handleConfirmAction = () => {
        if (confirmDialog.action?.includes('contrib') || confirmDialog.action?.includes('approved')) {
            handleQueueAction();
        } else if (confirmDialog.report) {
            handleReportAction(confirmDialog.action as any);
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
            closeReplyDialog();
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
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 bg-gray-50 min-h-screen pt-4 md:pt-6">
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
                <div className="overflow-x-auto -mx-4 px-4 md:mx-0 md:px-0">
                    <TabsList className="flex w-max min-w-full md:grid md:w-full md:grid-cols-5 h-auto gap-1 md:gap-2">
                        <TabsTrigger value="reports" className="text-xs md:text-sm px-3 py-2 whitespace-nowrap">
                            Denúncias ({reports.length})
                        </TabsTrigger>
                        <TabsTrigger value="queue" className="text-xs md:text-sm px-3 py-2 whitespace-nowrap">
                            Em Análise ({moderationQueue.length})
                        </TabsTrigger>
                        <TabsTrigger value="approved" className="text-xs md:text-sm px-3 py-2 whitespace-nowrap">
                            Aprovados ({approvedList.length})
                        </TabsTrigger>
                        <TabsTrigger value="rejected" className="text-xs md:text-sm px-3 py-2 whitespace-nowrap">
                            Rejeitados ({rejectedList.length})
                        </TabsTrigger>
                        <TabsTrigger value="trash" className="text-xs md:text-sm px-3 py-2 whitespace-nowrap">
                            Lixo ({trashList.length})
                        </TabsTrigger>
                        <TabsTrigger value="config" className="text-xs md:text-sm px-3 py-2 whitespace-nowrap gap-2">
                            <Settings className="w-4 h-4" />
                            Configurações
                        </TabsTrigger>
                    </TabsList>
                </div>

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
                                    onAction={(action, i) => openConfirmDialog(action as any, i, undefined)}
                                    onReply={(i) => openReplyDialog(i)}
                                />
                            ))}
                            {filterList(tab === 'queue' ? moderationQueue : tab === 'approved' ? approvedList : tab === 'rejected' ? rejectedList : trashList).length === 0 && (
                                <div className="col-span-3 text-center py-12 text-gray-500 border border-dashed rounded">Lista vazia.</div>
                            )}
                        </div>
                    </TabsContent>
                ))}

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

                <TabsContent value="config" className="mt-6 space-y-6">
                    <div className="grid gap-6 md:grid-cols-2">
                        {/* Moderation Controls */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Moderação Automática</CardTitle>
                                <Shield className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="space-y-4 pt-4">
                                <div className="flex items-center space-x-4">
                                    <Switch
                                        id="autoPublish"
                                        checked={settings.autoPublish}
                                        onCheckedChange={() => handleToggle('autoPublish')}
                                    />
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="autoPublish" className="text-sm font-medium leading-none">
                                            Auto-Publicar
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Publicar automaticamente novas contribuições sem análise humana.
                                        </p>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Artificial Intelligence */}
                        <Card>
                            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                                <CardTitle className="text-sm font-medium">Inteligência Artificial</CardTitle>
                                <Zap className="h-4 w-4 text-muted-foreground" />
                            </CardHeader>
                            <CardContent className="space-y-6 pt-4 text-xs">
                                <div className="flex items-center space-x-4 mt-2">
                                    <Switch
                                        id="aiImageAnalysis"
                                        checked={settings.aiImageAnalysis}
                                        onCheckedChange={() => handleToggle('aiImageAnalysis')}
                                    />
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="aiImageAnalysis" className="text-sm font-medium leading-none">
                                            Análise de Imagem (IA)
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Detectar automaticamente nudes, violência e armas em fotos.
                                        </p>
                                    </div>
                                </div>
                                <div className="flex items-center space-x-4">
                                    <Switch
                                        id="aiTextAnalysis"
                                        checked={settings.aiTextAnalysis}
                                        onCheckedChange={() => handleToggle('aiTextAnalysis')}
                                    />
                                    <div className="flex-1 space-y-1">
                                        <Label htmlFor="aiTextAnalysis" className="text-sm font-medium leading-none">
                                            Filtro de Conteúdo (NLP)
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Bloquear palavras de baixo calão e discurso de ódio.
                                        </p>
                                    </div>
                                </div>
                                <div className="pt-4 border-t border-dashed">
                                    <div className="flex items-center justify-between mb-2">
                                        <div className="space-y-0.5">
                                            <Label className="text-sm font-semibold">Integridade do banco</Label>
                                            <p className="text-[10px] text-muted-foreground">Analisar itens antigos com regras atuais</p>
                                        </div>
                                        <Button
                                            size="sm"
                                            onClick={runRetroactiveAI}
                                            disabled={runningAnalysis}
                                            className="h-8 gap-2 bg-gradient-to-r from-indigo-600 to-purple-600 border-none shadow-md hover:shadow-lg hover:from-indigo-700 hover:to-purple-700 text-white transition-all flex items-center justify-center p-0 w-8 md:w-auto md:px-3"
                                        >
                                            {runningAnalysis ? (
                                                <RefreshCw className="h-4 w-4 animate-spin" />
                                            ) : (
                                                <Play className="h-4 w-4 fill-current" />
                                            )}
                                            <span className="hidden md:inline">Iniciar Varredura IA</span>
                                        </Button>
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
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
                        <Button variant="destructive" onClick={() => { openConfirmDialog('approve_remove_content', undefined, selectedReport || undefined); setSelectedReport(null); }}>Remover Conteúdo</Button>
                        <Button variant="secondary" onClick={() => { openConfirmDialog('reject', undefined, selectedReport || undefined); setSelectedReport(null); }}>Ignorar Denúncia</Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* Extracted Dialog Components */}
            <ReplyDialog
                open={replyDialog.open}
                contribution={replyDialog.contribution}
                onClose={closeReplyDialog}
                onSubmit={handleReplyAction}
                replyText={replyText}
                setReplyText={setReplyText}
                useDefaultReply={useDefaultReply}
                setUseDefaultReply={setUseDefaultReply}
                isLoading={actionLoading}
            />

            <ConfirmActionDialog
                open={confirmDialog.open}
                action={confirmDialog.action}
                onClose={closeConfirmDialog}
                onConfirm={handleConfirmAction}
                isLoading={actionLoading}
                approvalRating={approvalRating}
                setApprovalRating={setApprovalRating}
                rejectionReason={rejectionReason}
                setRejectionReason={setRejectionReason}
            />

        </div >
    );
};

export default AdminModeration;
