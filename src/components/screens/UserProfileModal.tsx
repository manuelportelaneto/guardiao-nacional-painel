import React, { useState, useEffect } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '../ui/dialog';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Avatar, AvatarFallback } from '../ui/avatar';
import {
    Calendar, MapPin,
    Trophy, Star, History
} from 'lucide-react';
import { collection, query, where, getDocs, orderBy } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import type { UserManagement } from '../../services/userService';
import { USER_RANKS } from '../../types/userRanks';

interface UserProfileModalProps {
    user: UserManagement | null;
    open: boolean;
    onClose: () => void;
}

interface UserContribution {
    id: string;
    title: string;
    description: string;
    status: string;
    createdAt: any;
    city: string;
    category: string;
    likes: number;
}

import ContributionDetailModal from './ContributionDetailModal';

// ... (inside component)
const UserProfileModal: React.FC<UserProfileModalProps> = ({ user, open, onClose }) => {
    const [contributions, setContributions] = useState<UserContribution[]>([]);
    const [loadingContribs, setLoadingContribs] = useState(false);

    // New State for Detail Modal
    const [selectedContribution, setSelectedContribution] = useState<any>(null);
    const [detailModalOpen, setDetailModalOpen] = useState(false);

    useEffect(() => {
        if (user && open) {
            fetchContributions(user.id);
        }
    }, [user, open]);

    const fetchContributions = async (userId: string) => {
        setLoadingContribs(true);
        try {
            const q = query(
                collection(db, 'contributions'),
                where('userId', '==', userId),
                orderBy('createdAt', 'desc')
            );
            const snapshot = await getDocs(q);
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as UserContribution[];
            setContributions(data);
        } catch (error) {
            console.error("Error loading contributions:", error);
        } finally {
            setLoadingContribs(false);
        }
    };

    if (!user) return null;

    const formatDate = (date: any) => {
        if (!date) return 'N/A';
        return date.toDate ? date.toDate().toLocaleDateString('pt-BR') : new Date(date).toLocaleDateString('pt-BR');
    };



    // Calculate mock points based on contributions for now (Gamification Tab)
    // Calculate Active XP matching the App logic (gamification.ts)
    // Rules: Post = 10, Like = 1, Share = 5
    // Window: 90 days rolling
    const calculatePoints = () => {
        let points = 0;
        const history: { action: string, points: number, date: string }[] = [];

        const now = new Date();
        const cutoffDate = new Date();
        cutoffDate.setDate(now.getDate() - 90);

        contributions.forEach(c => {
            // Parse date
            const cDate = c.createdAt?.toDate ? c.createdAt.toDate() : new Date(c.createdAt);

            // Only count active contributions (last 90 days) for Level Progress
            if (cDate >= cutoffDate) {
                // Contribution Points
                const pointsPerContrib = 10;
                points += pointsPerContrib;
                history.push({
                    action: `Contribuição (Ativa): ${c.category}`,
                    points: pointsPerContrib,
                    date: formatDate(c.createdAt)
                });

                // Like Points
                if (c.likes && c.likes > 0) {
                    const pointsPerLike = 1;
                    const totalLikePoints = c.likes * pointsPerLike;
                    points += totalLikePoints;
                    history.push({
                        action: `Curtidas Recebidas (${c.likes})`,
                        points: totalLikePoints,
                        date: formatDate(c.createdAt)
                    });
                }
            }
        });

        // Sort history by date desc - DISABLED (Using pre-sorted order or index for now)
        // history.sort((a, b) => 0);

        return { total: points, history };
    };

    const { total: totalPoints, history: pointsHistory } = calculatePoints();

    return (
        <Dialog open={open} onOpenChange={onClose}>
            <DialogContent className="max-w-4xl max-h-[90vh] overflow-hidden flex flex-col p-0 gap-0">
                <DialogHeader className="p-6 pb-2">
                    <DialogTitle className="flex items-center gap-3 text-2xl">
                        <Avatar className="h-12 w-12 border-2 border-blue-100">
                            <AvatarFallback>#</AvatarFallback>
                        </Avatar>
                        <div>
                            Cidadão #{user.id.substring(0, 8)}
                            <div className="flex gap-2 mt-1">
                                <Badge variant="outline" className="text-xs font-normal">ID: {user.id}</Badge>
                                <Badge className={user.status === 'blocked' ? 'bg-red-500' : 'bg-green-500'}>
                                    {user.status === 'blocked' ? 'Bloqueado' : 'Ativo'}
                                </Badge>
                                <Badge variant="secondary" className="bg-yellow-100 text-yellow-700 border-yellow-200">
                                    <Trophy className="w-3 h-3 mr-1" /> {totalPoints} pts
                                </Badge>
                            </div>
                        </div>
                    </DialogTitle>
                </DialogHeader>

                <Tabs defaultValue="history" className="flex-1 flex flex-col overflow-hidden">
                    <div className="px-6 border-b">
                        <TabsList className="w-full justify-start h-12 bg-transparent p-0">
                            <TabsTrigger value="history" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent h-full px-4">
                                Prontuário ({contributions.length})
                            </TabsTrigger>
                            <TabsTrigger value="gamification" className="data-[state=active]:border-b-2 data-[state=active]:border-blue-600 rounded-none bg-transparent h-full px-4">
                                Gamificação
                            </TabsTrigger>
                        </TabsList>
                    </div>

                    <div className="flex-1 overflow-y-auto bg-gray-50/50 p-6">                        <TabsContent value="gamification" className="mt-0 space-y-6">
                        <Card>
                            <CardHeader>
                                <CardTitle className="flex items-center gap-2"><Trophy className="w-5 h-5 text-yellow-500" /> Conquistas e Nível</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <div className="flex flex-wrap gap-2 mb-6">
                                    {user.badges?.map(badgeId => {
                                        const rank = USER_RANKS.find(r => r.id === badgeId);
                                        return (
                                            <div key={badgeId} className="flex items-center gap-2 bg-white border px-3 py-2 rounded-lg shadow-sm">
                                                <span className="text-2xl">{rank?.emoji || '🏅'}</span>
                                                <div>
                                                    <p className="font-bold text-sm">{rank?.name || badgeId}</p>
                                                    <p className="text-xs text-gray-500">{rank?.description || 'Conquista desbloqueada'}</p>
                                                </div>
                                            </div>
                                        );
                                    })}
                                    {(!user.badges || user.badges.length === 0) && (
                                        <p className="text-gray-500 text-sm">Nenhuma conquista desbloqueada ainda.</p>
                                    )}
                                </div>

                                <div className="border-t pt-4">
                                    <h4 className="font-semibold text-gray-900 mb-3 flex items-center gap-2">
                                        <History className="w-4 h-4" /> Extrato de Pontos
                                    </h4>
                                    <div className="space-y-2">
                                        {pointsHistory.map((item, idx) => (
                                            <div key={idx} className="flex justify-between items-center text-sm p-2 bg-gray-50 rounded">
                                                <span>{item.action}</span>
                                                <div className="flex items-center gap-2">
                                                    <span className="text-xs text-gray-400">{item.date}</span>
                                                    <Badge variant="secondary" className="text-green-700 bg-green-100">+{item.points}</Badge>
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                        <TabsContent value="history" className="mt-0">
                            {loadingContribs ? (
                                <div className="text-center py-10">Carregando histórico...</div>
                            ) : contributions.length === 0 ? (
                                <div className="text-center py-10 text-gray-500 flex flex-col items-center gap-2">
                                    <History className="w-8 h-8 opacity-20" />
                                    <p>Nenhuma contribuição registrada.</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {contributions.map(contrib => (
                                        <div
                                            key={contrib.id}
                                            className="bg-white p-4 rounded-lg border shadow-sm flex flex-col sm:flex-row gap-4 hover:border-blue-200 transition-colors cursor-pointer group"
                                            onClick={() => {
                                                setSelectedContribution(contrib);
                                                setDetailModalOpen(true);
                                            }}
                                        >
                                            <div className="flex-1">
                                                <div className="flex justify-between items-start mb-2">
                                                    <h4 className="font-semibold text-gray-900 group-hover:text-blue-600 transition-colors">{contrib.title}</h4>
                                                    <Badge variant={
                                                        contrib.status === 'Resolvido' || contrib.status === 'Concluído' ? 'secondary' : // success-like
                                                            contrib.status === 'Rejeitado' ? 'destructive' : 'outline'
                                                    }>
                                                        {contrib.status}
                                                    </Badge>
                                                </div>
                                                <p className="text-sm text-gray-600 line-clamp-2 mb-3">{contrib.description}</p>
                                                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                                                    <span className="flex items-center gap-1"><MapPin className="w-3 h-3" /> {contrib.city}</span>
                                                    <span className="flex items-center gap-1"><Calendar className="w-3 h-3" /> {formatDate(contrib.createdAt)}</span>
                                                    <span className="flex items-center gap-1"><Star className="w-3 h-3" /> {contrib.category}</span>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>
                    </div>
                </Tabs>
            </DialogContent>

            {/* Detail Modal Integration */}
            <ContributionDetailModal
                open={detailModalOpen}
                onClose={() => setDetailModalOpen(false)}
                contribution={selectedContribution}
            />
        </Dialog>
    );
};

export default UserProfileModal;
