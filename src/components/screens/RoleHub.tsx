
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { LogOut, Shield, MapPin, Loader2 } from 'lucide-react';

const RoleHub: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);

    useEffect(() => {
        const fetchUserRole = async () => {
            if (!currentUser) return;
            try {
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setRole(userData.role || 'user');
                } else {
                    // If user has no doc in 'users', they are likely a fresh auth user not properly onboarded or just a regular user.
                    // For this Admin Portal, if they are not admin, we block them.
                    setRole('unauthorized');
                }
            } catch (error) {
                console.error("Error fetching role:", error);
            } finally {
                setLoading(false);
            }
        };

        fetchUserRole();
    }, [currentUser]);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    if (loading) {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-50 flex-col gap-4">
                <Loader2 className="animate-spin text-blue-600" size={48} />
                <p className="text-gray-500 font-medium">Verificando permissões...</p>
            </div>
        );
    }

    // Unauthorized State
    if (role !== 'admin' && role !== 'super_admin' && role !== 'city_admin') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                        <Shield size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Acesso Restrito</h1>
                    <p className="text-gray-600">
                        Este painel é exclusivo para administradores e gestores públicos.
                        Seu usuário <strong>({currentUser?.email})</strong> não possui as permissões necessárias.
                    </p>
                    <button
                        onClick={handleLogout}
                        className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                    >
                        Sair e Voltar
                    </button>
                </div>
            </div>
        )
    }

    // Hub Interface
    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <header className="flex justify-between items-center mb-10 max-w-5xl mx-auto">
                <div>
                    <h1 className="text-3xl font-bold text-gray-900">Bem-vindo, {currentUser?.displayName || 'Administrador'}</h1>
                    <p className="text-gray-500">Selecione um painel para gerenciar</p>
                </div>
                <button
                    onClick={handleLogout}
                    className="flex items-center gap-2 text-red-600 hover:bg-red-50 px-4 py-2 rounded-lg transition-colors font-medium border border-red-100"
                >
                    <LogOut size={18} />
                    Sair
                </button>
            </header>

            <main className="max-w-5xl mx-auto grid md:grid-cols-2 gap-6">
                {/* Super Admin Card */}
                {(role === 'super_admin' || role === 'admin') && (
                    <div
                        onClick={() => navigate('/admin/dashboard')}
                        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-blue-200 transition-all group"
                    >
                        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors">
                            <Shield size={28} className="text-blue-600 group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2">Painel Geral</h2>
                        <p className="text-gray-500 mb-6">
                            Gerencie usuários, configurações globais e monitore métricas de toda a plataforma.
                        </p>
                        <span className="text-blue-600 font-medium group-hover:underline">Acessar Painel Geral &rarr;</span>
                    </div>
                )}

                {/* City Panel Card */}
                <div
                    onClick={() => navigate('/city/select')}
                    className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-md hover:border-orange-200 transition-all group"
                >
                    <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-600 transition-colors">
                        <MapPin size={28} className="text-orange-600 group-hover:text-white transition-colors" />
                    </div>
                    <h2 className="text-xl font-bold text-gray-900 mb-2">Painel da Prefeitura</h2>
                    <p className="text-gray-500 mb-6">
                        Gestão de ocorrências e serviços para municípios específicos.
                    </p>
                    <span className="text-orange-600 font-medium group-hover:underline">Acessar Painel Municipal &rarr;</span>
                </div>
            </main>
        </div>
    );
};

export default RoleHub;
