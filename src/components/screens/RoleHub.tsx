
import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Shield, MapPin, Building2, LayoutDashboard } from 'lucide-react';
import { toast } from 'sonner';
import CommandLayout from '../layout/CommandLayout';

const RoleHub: React.FC = () => {
    const { currentUser, logout } = useAuth();
    const navigate = useNavigate();
    const [loading, setLoading] = useState(true);
    const [role, setRole] = useState<string | null>(null);


    useEffect(() => {
        const fetchUserRole = async () => {
            if (!currentUser) return;

            // 🚨 EMERGENCY OVERRIDE FOR MANUEL 🚨
            if (currentUser.email === 'manuelpnforce@gmail.com') {
                console.log("👑 System Overlord Detected: Manuel Force");
                setRole('super_admin');
                setLoading(false);

                // Auto-repair Firestore in background if needed
                const userRef = doc(db, 'users', currentUser.uid);
                setDoc(userRef, {
                    uid: currentUser.uid,
                    email: currentUser.email,
                    role: 'super_admin',
                    displayName: 'Manuel Force (Presidente)',
                    professionalRole: 'servidor',
                    officialTitle: 'Presidente (Nacional)',
                    accessLevel: 3
                }, { merge: true }).catch(e => console.warn("Auto-repair setDoc notice:", e));
                return;
            }

            try {
                const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
                if (userDoc.exists()) {
                    const userData = userDoc.data();
                    setRole(userData.role || 'user');
                } else {
                    setRole('unauthorized');
                }
            } catch (error) {
                console.error("Error fetching role:", error);
                setRole('error');
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
            <div className="min-h-screen flex items-center justify-center bg-gray-50">
                <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
            </div>
        );
    }

    // Unauthorized State
    if (!role || role === 'user' || role === 'unauthorized') {
        return (
            <div className="min-h-screen flex items-center justify-center bg-gray-100 p-4">
                <div className="bg-white p-8 rounded-xl shadow-lg max-w-md w-full text-center space-y-6">
                    <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center mx-auto text-red-600">
                        <Shield size={32} />
                    </div>
                    <h1 className="text-2xl font-bold text-gray-900">Acesso Restrito</h1>
                    <p className="text-gray-600">
                        Seu usuário <strong>{currentUser?.email}</strong> não possui permissões administrativas.
                        Aguarde a aprovação do seu cadastro ou entre em contato com o suporte.
                    </p>
                    <button
                        onClick={handleLogout}
                        className="w-full py-3 bg-gray-900 text-white rounded-lg hover:bg-gray-800 transition-colors font-medium"
                    >
                        Sair
                    </button>
                </div>
            </div>
        );
    }

    // Role-Based Dashboard Access
    return (
        <CommandLayout>
            <div className="mb-8">
                <h1 className="text-3xl font-bold text-gray-900 font-outfit mb-2">
                    Visão Geral
                </h1>
                <p className="text-gray-500">
                    Selecione um módulo para iniciar ou visualizar o resumo operacional.
                </p>
            </div>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">

                {/* 1. NATIONAL PANEL (Super Admin / President) */}
                {role === 'super_admin' && (
                    <div
                        onClick={() => navigate('/admin/dashboard')}
                        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg hover:border-blue-300 transition-all group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <LayoutDashboard size={120} />
                        </div>
                        <div className="w-14 h-14 bg-blue-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-blue-600 transition-colors relative z-10">
                            <Shield size={28} className="text-blue-600 group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2 relative z-10">Painel Nacional</h2>
                        <p className="text-gray-500 mb-6 relative z-10">
                            Controle total sobre todos os estados e municípios. Gestão de usuários, métricas globais e configurações do sistema.
                        </p>
                        <span className="text-blue-600 font-medium group-hover:gap-2 flex items-center transition-all relative z-10">
                            Acessar Painel <span className="ml-1">&rarr;</span>
                        </span>
                    </div>
                )}

                {/* 2. STATE PANEL (Admin / Governor) */}
                {(role === 'super_admin' || role === 'admin') && (
                    <div
                        onClick={() => navigate('/admin/dashboard?scope=state')}
                        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg hover:border-green-300 transition-all group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <MapPin size={120} />
                        </div>
                        <div className="w-14 h-14 bg-green-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-green-600 transition-colors relative z-10">
                            <MapPin size={28} className="text-green-600 group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2 relative z-10">Painel Estadual</h2>
                        <p className="text-gray-500 mb-6 relative z-10">
                            Gestão focada em nível estadual. Monitore municípios e atividades regionais.
                        </p>
                        <span className="text-green-600 font-medium group-hover:gap-2 flex items-center transition-all relative z-10">
                            Acessar Painel <span className="ml-1">&rarr;</span>
                        </span>
                    </div>
                )}

                {/* 3. MUNICIPAL PANEL (City Admin / Mayor / Others) */}
                {(role === 'super_admin' || role === 'admin' || role === 'city_admin') && (
                    <div
                        onClick={() => navigate('/city/select')}
                        className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 cursor-pointer hover:shadow-lg hover:border-orange-300 transition-all group relative overflow-hidden"
                    >
                        <div className="absolute top-0 right-0 p-4 opacity-10 group-hover:opacity-20 transition-opacity">
                            <Building2 size={120} />
                        </div>
                        <div className="w-14 h-14 bg-orange-100 rounded-xl flex items-center justify-center mb-6 group-hover:bg-orange-600 transition-colors relative z-10">
                            <Building2 size={28} className="text-orange-600 group-hover:text-white transition-colors" />
                        </div>
                        <h2 className="text-xl font-bold text-gray-900 mb-2 relative z-10">Painel Municipal</h2>
                        <p className="text-gray-500 mb-6 relative z-10">
                            Gestão de ocorrências, serviços e zeladoria urbana para municípios específicos.
                        </p>
                        <span className="text-orange-600 font-medium group-hover:gap-2 flex items-center transition-all relative z-10">
                            Acessar Painel <span className="ml-1">&rarr;</span>
                        </span>
                    </div>
                )}
            </div>
        </CommandLayout>
    );
};

export default RoleHub;
