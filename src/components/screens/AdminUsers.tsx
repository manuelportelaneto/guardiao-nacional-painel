import React, { useState, useEffect } from 'react';
import { db } from '../../firebaseConfig';
import { collection, query, getDocs, orderBy, limit, where } from 'firebase/firestore';
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
import { USER_RANKS } from '../../../../guardiao-nacional/src/types/userRanks';

const AdminUsers: React.FC = () => {
    const [users, setUsers] = useState<UserManagement[]>([]);
    const [loading, setLoading] = useState(true);
    const [searchType, setSearchType] = useState<'email' | 'name' | 'cpf'>('email');
    const [searchTerm, setSearchTerm] = useState('');

    useEffect(() => {
        fetchUsers();
    }, []);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const q = query(collection(db, 'users'), orderBy('email'), limit(50));
            const querySnapshot = await getDocs(q);
            const usersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as UserManagement[];
            setUsers(usersData);
        } catch (error) {
            console.error("Error fetching users:", error);
            toast.error("Erro ao carregar usuários");
        } finally {
            setLoading(false);
        }
    };

    const handleSearch = async () => {
        if (!searchTerm.trim()) {
            fetchUsers();
            return;
        }
        setLoading(true);
        try {
            const field = searchType === 'cpf' ? 'cpf' : searchType === 'name' ? 'displayName' : 'email';
            const q = query(
                collection(db, 'users'),
                where(field, '>=', searchTerm),
                where(field, '<=', searchTerm + '\uf8ff'),
                limit(50)
            );
            const querySnapshot = await getDocs(q);
            const usersData = querySnapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            })) as UserManagement[];
            setUsers(usersData);
        } catch (error) {
            console.error("Search error:", error);
            toast.error("Erro na busca");
        } finally {
            setLoading(false);
        }
    };

    const handleToggleBlock = async (user: UserManagement) => {
        try {
            const newStatus = await toggleUserBlock(user.id, user.status);
            setUsers(users.map(u => u.id === user.id ? { ...u, status: newStatus } : u));
            toast.success(newStatus === 'blocked' ? 'Usuário bloqueado' : 'Usuário reativado');
        } catch {
            toast.error('Erro ao alterar status');
        }
    };

    const handleRemove = async (userId: string) => {
        if (!confirm('Tem certeza que deseja remover este usuário?')) return;
        try {
            await removeUser(userId);
            setUsers(users.filter(u => u.id !== userId));
            toast.success('Usuário removido');
        } catch {
            toast.error('Erro ao remover usuário');
        }
    };

    const handlePromote = async (user: UserManagement, role: UserManagement['role']) => {
        try {
            await promoteUser(user.id, { role });
            setUsers(users.map(u => u.id === user.id ? { ...u, role } : u));
            toast.success(`Role alterada para ${role}`);
        } catch {
            toast.error('Erro ao promover usuário');
        }
    };

    return (
        <div className="space-y-6 max-w-7xl mx-auto">
            <div className="flex flex-col md:flex-row gap-4 justify-between items-start md:items-center">
                <div>
                    <h2 className="text-3xl font-bold text-gray-900 font-outfit">Gestão de Usuários</h2>
                    <p className="text-gray-500">Administre perfis, cargos e permissões avançadas.</p>
                </div>
                <Button className="gap-2 bg-blue-600 hover:bg-blue-700">
                    <Plus className="w-4 h-4" />
                    Adicionar Usuário
                </Button>
            </div>

            {/* Advanced Search Bar */}
            <div className="bg-white p-4 rounded-xl border border-gray-100 shadow-sm space-y-4">
                <div className="flex flex-wrap gap-2">
                    {(['email', 'name', 'cpf'] as const).map((type) => (
                        <Button
                            key={type}
                            variant={searchType === type ? 'default' : 'outline'}
                            size="sm"
                            onClick={() => setSearchType(type)}
                            className="capitalize"
                        >
                            {type}
                        </Button>
                    ))}
                </div>
                <div className="flex w-full gap-2">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 w-4 h-4" />
                        <Input
                            placeholder={`Buscar por ${searchType === 'cpf' ? 'CPF' : searchType === 'name' ? 'nome' : 'e-mail'}...`}
                            className="pl-10 h-11"
                            value={searchTerm}
                            onChange={(e) => setSearchTerm(e.target.value)}
                            onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                        />
                    </div>
                    <Button onClick={handleSearch} className="h-11 px-8">
                        Buscar
                    </Button>
                </div>
            </div>

            {/* Users Grid */}
            {loading ? (
                <div className="text-center py-20 text-gray-500">Carregando usuários...</div>
            ) : users.length === 0 ? (
                <div className="text-center py-20 text-gray-500">Nenhum usuário encontrado.</div>
            ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {users.map((user) => (
                        <Card key={user.id} className={`overflow-hidden border-0 shadow-md hover:shadow-lg transition-shadow bg-white ${user.status === 'blocked' ? 'opacity-75 grayscale' : ''}`}>
                            <div className={`h-2 w-full ${user.role === 'super_admin' ? 'bg-red-500' :
                                user.role === 'admin' ? 'bg-orange-500' :
                                    user.role === 'city_admin' ? 'bg-blue-500' : 'bg-green-500'
                                }`} />
                            <CardHeader className="pb-2">
                                <div className="flex justify-between items-start">
                                    <div className="flex flex-col">
                                        <CardTitle className="text-lg font-bold text-gray-900 group-hover:text-blue-600 transition-colors">
                                            {user.displayName || 'Sem nome'}
                                        </CardTitle>
                                        <span className="text-xs font-mono text-gray-500 mt-0.5">{user.email}</span>
                                        {user.cpf && <span className="text-xs text-gray-400 font-mono">CPF: {user.cpf}</span>}
                                    </div>
                                    <Badge variant={user.role === 'super_admin' ? 'destructive' : user.role === 'city_admin' ? 'secondary' : 'outline'}>
                                        {user.role}
                                    </Badge>
                                </div>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="flex flex-wrap gap-1.5">
                                    {/* Professional Roles */}
                                    {user.professionalRole && (
                                        <Badge variant="default" className="bg-slate-700 gap-1">
                                            {user.professionalRole === 'servidor' && <ShieldCheck className="w-3 h-3" />}
                                            {user.professionalRole === 'empresa' && <Building2 className="w-3 h-3" />}
                                            {user.professionalRole === 'cidadao' && <Briefcase className="w-3 h-3" />}
                                            {user.professionalRole} {user.accessLevel && `Lvl ${user.accessLevel}`}
                                        </Badge>
                                    )}

                                    {/* Donor Tag */}
                                    {user.isDonor && (
                                        <Badge variant="outline" className="text-pink-600 border-pink-200 bg-pink-50 gap-1">
                                            <Heart className="w-3 h-3 fill-pink-600" /> Doador
                                        </Badge>
                                    )}

                                    {/* Gamification Badges */}
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
                                    className="flex-1 gap-1"
                                    onClick={() => handlePromote(user, user.role === 'user' ? 'city_admin' : 'user')}
                                >
                                    <UserCog className="w-4 h-4" />
                                    {user.role === 'user' ? 'Promover' : 'Demover'}
                                </Button>
                                <Button
                                    variant={user.status === 'blocked' ? 'default' : 'secondary'}
                                    size="sm"
                                    className="flex-1 gap-1"
                                    onClick={() => handleToggleBlock(user)}
                                >
                                    {user.status === 'blocked' ? <Check className="w-4 h-4" /> : <X className="w-4 h-4" />}
                                    {user.status === 'blocked' ? 'Reativar' : 'Bloquear'}
                                </Button>
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="px-2 text-gray-400 hover:text-red-600"
                                    onClick={() => handleRemove(user.id)}
                                >
                                    <UserMinus className="w-4 h-4" />
                                </Button>
                            </CardFooter>
                        </Card>
                    ))}
                </div>
            )}
        </div>
    );
};

export default AdminUsers;
