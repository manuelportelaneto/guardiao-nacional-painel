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
    Timestamp
} from 'firebase/firestore';
import {
    ArrowLeft,
    Flag,
    CheckCircle,
    XCircle,
    Ban,
    MapPin,
    User,
    AlertTriangle,
    Loader2,
    RefreshCw
} from 'lucide-react';
import { Card, CardContent, CardHeader } from '../ui/card';
import { Button } from '../ui/button';
import { Badge } from '../ui/badge';
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
}

interface ReportWithContribution extends Report {
    contribution?: Contribution;
    reporterEmail?: string;
    contributorEmail?: string;
}

const AdminModeration: React.FC = () => {
    const navigate = useNavigate();
    const [reports, setReports] = useState<ReportWithContribution[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);
    const [selectedReport, setSelectedReport] = useState<ReportWithContribution | null>(null);
    const [actionLoading, setActionLoading] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState<{
        open: boolean;
        action: 'approve' | 'reject' | 'ban' | null;
        report: ReportWithContribution | null;
    }>({ open: false, action: null, report: null });

    // Fetch reports with contributions
    useEffect(() => {
        setLoading(true);
        setError(null);

        // Simple query without orderBy to avoid composite index requirement
        const reportsQuery = query(
            collection(db, 'reports'),
            where('status', '==', 'pending')
        );

        const unsubscribe = onSnapshot(
            reportsQuery,
            async (snapshot) => {
                try {
                    setError(null);
                    const reportsData: ReportWithContribution[] = [];

                    for (const docSnap of snapshot.docs) {
                        const reportData = docSnap.data() as Report;
                        const report: ReportWithContribution = {
                            ...reportData,
                            id: docSnap.id
                        };

                        // Fetch contribution details
                        try {
                            const contribDoc = await getDoc(doc(db, 'contributions', reportData.contributionId));
                            if (contribDoc.exists()) {
                                report.contribution = {
                                    id: contribDoc.id,
                                    ...contribDoc.data()
                                } as Contribution;
                            }

                            // Fetch reporter email
                            if (reportData.reporterId) {
                                const reporterDoc = await getDoc(doc(db, 'users', reportData.reporterId));
                                if (reporterDoc.exists()) {
                                    report.reporterEmail = reporterDoc.data().email;
                                }
                            }

                            // Fetch contributor email
                            if (report.contribution?.userId) {
                                const contributorDoc = await getDoc(doc(db, 'users', report.contribution.userId));
                                if (contributorDoc.exists()) {
                                    report.contributorEmail = contributorDoc.data().email;
                                }
                            }
                        } catch (fetchError) {
                            console.error('Error fetching related data:', fetchError);
                        }

                        reportsData.push(report);
                    }

                    // Sort by createdAt desc in client
                    reportsData.sort((a, b) => {
                        const aTime = a.createdAt?.toMillis() || 0;
                        const bTime = b.createdAt?.toMillis() || 0;
                        return bTime - aTime;
                    });

                    setReports(reportsData);
                    setLoading(false);
                } catch (processError) {
                    console.error('Error processing reports:', processError);
                    setError('Erro ao processar denúncias.');
                    setLoading(false);
                }
            },
            (err: any) => {
                // Error callback for permission denied or other errors
                console.error('Firestore snapshot error:', err);
                if (err.code === 'permission-denied') {
                    setError('Acesso negado. Você precisa ter permissões de administrador para acessar esta página. Verifique se seu usuário tem role "admin" ou "super_admin" no Firestore.');
                } else if (err.code === 'failed-precondition') {
                    setError('Índice do Firestore necessário. Por favor, crie o índice composto necessário no console do Firebase.');
                } else {
                    setError(`Erro ao carregar denúncias: ${err.message || 'Tente novamente mais tarde.'}`);
                }
                setLoading(false);
            }
        );

        return () => unsubscribe();
    }, []);

    // Approve report (remove content)
    const handleApprove = async (report: ReportWithContribution) => {
        setActionLoading(true);
        try {
            // Update report status
            await updateDoc(doc(db, 'reports', report.id), {
                status: 'approved',
                reviewedAt: Timestamp.now()
            });

            // Mark contribution as hidden/removed
            if (report.contributionId) {
                await updateDoc(doc(db, 'contributions', report.contributionId), {
                    isRemoved: true,
                    isReported: true,
                    removedAt: Timestamp.now(),
                    removedReason: report.reason
                });

                // Send notification email to the contributor
                if (report.contributorEmail && report.contribution?.title) {
                    await notificationService.sendContentRemovedEmail(
                        report.contributorEmail,
                        'Cidadão', // Generic name as we only fetched email
                        report.contribution.title,
                        report.reason
                    );
                }
            }

            toast.success('Denúncia aprovada. Conteúdo removido.');
            setConfirmDialog({ open: false, action: null, report: null });
        } catch (error) {
            console.error('Error approving report:', error);
            toast.error('Erro ao aprovar denúncia.');
        } finally {
            setActionLoading(false);
        }
    };

    // Reject report (keep content)
    const handleReject = async (report: ReportWithContribution) => {
        setActionLoading(true);
        try {
            // Update report status
            await updateDoc(doc(db, 'reports', report.id), {
                status: 'rejected',
                reviewedAt: Timestamp.now()
            });

            // Remove reported flag from contribution
            if (report.contributionId) {
                await updateDoc(doc(db, 'contributions', report.contributionId), {
                    isReported: false
                });
            }

            toast.success('Denúncia rejeitada. Conteúdo mantido.');
            setConfirmDialog({ open: false, action: null, report: null });
        } catch (error) {
            console.error('Error rejecting report:', error);
            toast.error('Erro ao rejeitar denúncia.');
        } finally {
            setActionLoading(false);
        }
    };

    // Ban user
    const handleBanUser = async (report: ReportWithContribution) => {
        setActionLoading(true);
        try {
            // Ban the contributor
            if (report.contribution?.userId) {
                await updateDoc(doc(db, 'users', report.contribution.userId), {
                    isBanned: true,
                    bannedAt: Timestamp.now(),
                    bannedReason: `Conteúdo reportado: ${report.reason}`
                });
            }

            // Also approve the report
            await handleApprove(report);

            toast.success('Usuário banido com sucesso.');
        } catch (error) {
            console.error('Error banning user:', error);
            toast.error('Erro ao banir usuário.');
        } finally {
            setActionLoading(false);
        }
    };

    const formatDate = (timestamp?: Timestamp) => {
        if (!timestamp) return 'N/A';
        return timestamp.toDate().toLocaleDateString('pt-BR', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit'
        });
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

    if (loading) {
        return (
            <div className="flex items-center justify-center h-screen">
                <Loader2 className="h-8 w-8 animate-spin text-blue-600" />
            </div>
        );
    }

    if (error) {
        return (
            <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/admin')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Moderação de Conteúdo
                    </h1>
                </div>
                <Card className="p-12 text-center border-red-200 bg-red-50">
                    <AlertTriangle className="h-16 w-16 text-red-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-red-900">
                        Erro de Permissão
                    </h3>
                    <p className="text-red-700 mt-2 max-w-md mx-auto">
                        {error}
                    </p>
                    <Button
                        variant="outline"
                        className="mt-6"
                        onClick={() => window.location.reload()}
                    >
                        <RefreshCw className="h-4 w-4 mr-2" />
                        Tentar Novamente
                    </Button>
                </Card>
            </div>
        );
    }

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen">
            {/* Header */}
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => navigate('/admin')}
                    >
                        <ArrowLeft className="h-5 w-5" />
                    </Button>
                    <div>
                        <h1 className="text-2xl font-bold text-gray-900">
                            Moderação de Conteúdo
                        </h1>
                        <p className="text-gray-500">
                            {reports.length} denúncia(s) pendente(s)
                        </p>
                    </div>
                </div>
                <Button
                    variant="outline"
                    onClick={() => window.location.reload()}
                    className="gap-2"
                >
                    <RefreshCw className="h-4 w-4" />
                    Atualizar
                </Button>
            </div>

            {/* Reports List */}
            {reports.length === 0 ? (
                <Card className="p-12 text-center">
                    <CheckCircle className="h-16 w-16 text-green-500 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-900">
                        Nenhuma denúncia pendente
                    </h3>
                    <p className="text-gray-500 mt-2">
                        Todas as denúncias foram revisadas.
                    </p>
                </Card>
            ) : (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {reports.map((report) => (
                        <Card
                            key={report.id}
                            className="hover:shadow-lg transition-shadow cursor-pointer"
                            onClick={() => setSelectedReport(report)}
                        >
                            <CardHeader className="pb-2">
                                <div className="flex items-start justify-between">
                                    <Badge variant="destructive" className="gap-1">
                                        <Flag className="h-3 w-3" />
                                        {getReasonLabel(report.reason)}
                                    </Badge>
                                    <span className="text-xs text-gray-500">
                                        {formatDate(report.createdAt)}
                                    </span>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {/* Contribution Preview */}
                                {report.contribution?.imageUrl && (
                                    <img
                                        src={report.contribution.imageUrl}
                                        alt="Conteúdo reportado"
                                        className="w-full h-32 object-cover rounded-lg"
                                    />
                                )}
                                <p className="text-sm text-gray-700 line-clamp-2">
                                    {report.contribution?.description || 'Sem descrição'}
                                </p>

                                {/* Location */}
                                {report.contribution?.city && (
                                    <div className="flex items-center gap-1 text-xs text-gray-500">
                                        <MapPin className="h-3 w-3" />
                                        {report.contribution.city}, {report.contribution.state}
                                    </div>
                                )}

                                {/* Contributor */}
                                <div className="flex items-center gap-1 text-xs text-gray-500">
                                    <User className="h-3 w-3" />
                                    {report.contributorEmail || 'Usuário desconhecido'}
                                </div>

                                {/* Actions */}
                                <div className="flex gap-2 pt-2">
                                    <Button
                                        size="sm"
                                        variant="outline"
                                        className="flex-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDialog({ open: true, action: 'reject', report });
                                        }}
                                    >
                                        <XCircle className="h-4 w-4 mr-1" />
                                        Manter
                                    </Button>
                                    <Button
                                        size="sm"
                                        variant="destructive"
                                        className="flex-1"
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setConfirmDialog({ open: true, action: 'approve', report });
                                        }}
                                    >
                                        <CheckCircle className="h-4 w-4 mr-1" />
                                        Remover
                                    </Button>
                                </div>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            )}

            {/* Detail Modal */}
            <Dialog open={!!selectedReport} onOpenChange={() => setSelectedReport(null)}>
                <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                    <DialogHeader>
                        <DialogTitle className="flex items-center gap-2">
                            <AlertTriangle className="h-5 w-5 text-orange-500" />
                            Detalhes da Denúncia
                        </DialogTitle>
                    </DialogHeader>

                    {selectedReport && (
                        <div className="space-y-4">
                            {/* Image */}
                            {selectedReport.contribution?.imageUrl && (
                                <img
                                    src={selectedReport.contribution.imageUrl}
                                    alt="Conteúdo reportado"
                                    className="w-full h-64 object-cover rounded-lg"
                                />
                            )}

                            {/* Description */}
                            <div>
                                <h4 className="font-semibold text-gray-900">Descrição</h4>
                                <p className="text-gray-700">
                                    {selectedReport.contribution?.description || 'Sem descrição'}
                                </p>
                            </div>

                            {/* Report Info */}
                            <div className="grid grid-cols-2 gap-4 p-4 bg-gray-50 rounded-lg">
                                <div>
                                    <span className="text-xs text-gray-500">Motivo</span>
                                    <p className="font-medium">{getReasonLabel(selectedReport.reason)}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500">Reportado em</span>
                                    <p className="font-medium">{formatDate(selectedReport.createdAt)}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500">Reportado por</span>
                                    <p className="font-medium">{selectedReport.reporterEmail || 'N/A'}</p>
                                </div>
                                <div>
                                    <span className="text-xs text-gray-500">Autor do conteúdo</span>
                                    <p className="font-medium">{selectedReport.contributorEmail || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Actions */}
                            <div className="flex gap-3">
                                <Button
                                    variant="outline"
                                    className="flex-1"
                                    onClick={() => {
                                        setSelectedReport(null);
                                        setConfirmDialog({ open: true, action: 'reject', report: selectedReport });
                                    }}
                                >
                                    <XCircle className="h-4 w-4 mr-2" />
                                    Rejeitar Denúncia
                                </Button>
                                <Button
                                    variant="destructive"
                                    className="flex-1"
                                    onClick={() => {
                                        setSelectedReport(null);
                                        setConfirmDialog({ open: true, action: 'approve', report: selectedReport });
                                    }}
                                >
                                    <CheckCircle className="h-4 w-4 mr-2" />
                                    Remover Conteúdo
                                </Button>
                                <Button
                                    variant="destructive"
                                    onClick={() => {
                                        setSelectedReport(null);
                                        setConfirmDialog({ open: true, action: 'ban', report: selectedReport });
                                    }}
                                >
                                    <Ban className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            {/* Confirmation Dialog */}
            <Dialog open={confirmDialog.open} onOpenChange={(open) => !open && setConfirmDialog({ open: false, action: null, report: null })}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>
                            {confirmDialog.action === 'approve' && 'Confirmar Remoção'}
                            {confirmDialog.action === 'reject' && 'Confirmar Rejeição'}
                            {confirmDialog.action === 'ban' && 'Confirmar Banimento'}
                        </DialogTitle>
                        <DialogDescription>
                            {confirmDialog.action === 'approve' && 'O conteúdo será removido permanentemente. Deseja continuar?'}
                            {confirmDialog.action === 'reject' && 'A denúncia será rejeitada e o conteúdo permanecerá visível. Deseja continuar?'}
                            {confirmDialog.action === 'ban' && 'O usuário será banido e não poderá mais usar a plataforma. Deseja continuar?'}
                        </DialogDescription>
                    </DialogHeader>
                    <DialogFooter>
                        <Button
                            variant="outline"
                            onClick={() => setConfirmDialog({ open: false, action: null, report: null })}
                            disabled={actionLoading}
                        >
                            Cancelar
                        </Button>
                        <Button
                            variant={confirmDialog.action === 'reject' ? 'default' : 'destructive'}
                            onClick={() => {
                                if (!confirmDialog.report) return;
                                if (confirmDialog.action === 'approve') handleApprove(confirmDialog.report);
                                if (confirmDialog.action === 'reject') handleReject(confirmDialog.report);
                                if (confirmDialog.action === 'ban') handleBanUser(confirmDialog.report);
                            }}
                            disabled={actionLoading}
                        >
                            {actionLoading ? (
                                <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                                'Confirmar'
                            )}
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </div>
    );
};

export default AdminModeration;
