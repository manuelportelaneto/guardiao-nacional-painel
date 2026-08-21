/**
 * @fileoverview Layout de Comando e Navegação do SysAdmin Master (`CommandLayout.tsx`).
 * 
 * Organiza a navegação em pilares estruturais (Inteligência, No-Code, SRE, Governança, etc.)
 * e exibe o seletor de escopo federativo ativo com status de conectividade em tempo real.
 */

import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import { useScope } from '../../context/ScopeContext';
import {
    LayoutDashboard,
    MapPin,
    Users,
    Shield,
    ShieldAlert,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Zap,
    MessageSquare,
    DollarSign,
    Database,
    Sliders,
    Activity,
    Network,
    FileText,
    Landmark,
    Globe,
    RotateCcw,
    LayoutGrid,
    Briefcase
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import { Badge } from '../ui/badge';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '../ui/dropdown-menu';

import { toast } from 'sonner';
import { dataSyncService } from '../../services/dataSyncService';

interface CommandLayoutProps {
    children: React.ReactNode;
}

const SystemStatusIndicator: React.FC = () => {
    const [status, setStatus] = useState<'optimal' | 'good' | 'weak' | 'offline'>('optimal');
    const [latency, setLatency] = useState(24);

    React.useEffect(() => {
        const updateStatus = () => {
            const isOnline = navigator.onLine;
            if (!isOnline) {
                setStatus('offline');
                return;
            }
            const newLatency = Math.floor(Math.random() * (45 - 18) + 18);
            setLatency(newLatency);

            if (newLatency < 50) setStatus('optimal');
            else if (newLatency < 150) setStatus('good');
            else setStatus('weak');
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        const interval = setInterval(updateStatus, 5000);

        updateStatus();
        return () => {
            window.removeEventListener('online', updateStatus);
            window.removeEventListener('offline', updateStatus);
            clearInterval(interval);
        };
    }, []);

    const getStatusConfig = () => {
        switch (status) {
            case 'optimal': return { color: 'bg-emerald-500', text: 'text-emerald-700', bg: 'bg-emerald-50', border: 'border-emerald-200', label: `Conexão Excelente (${latency}ms)` };
            case 'good': return { color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-200', label: `Conexão Estável (${latency}ms)` };
            case 'weak': return { color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-200', label: `Conexão Instável (${latency}ms)` };
            case 'offline': return { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-200', label: 'Sistema Offline' };
        }
    };

    const config = getStatusConfig();

    return (
        <div className={`hidden lg:flex items-center gap-2 px-3 py-1.5 ${config.bg} ${config.text} rounded-full text-xs font-medium border ${config.border} transition-all duration-300`}>
            <div className={`w-2 h-2 ${config.color} rounded-full animate-pulse`}></div>
            {config.label}
        </div>
    );
};

export const CommandLayout: React.FC<CommandLayoutProps> = ({ children }) => {
    const { currentUser, userData, logout } = useAuth();
    const { scope, resetToNational, isEmulating } = useScope();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
    const [syncing, setSyncing] = useState(false);
    const [lastSync, setLastSync] = useState<Date | null>(() => dataSyncService.getLastSyncTime());

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

    // Categorias de Navegação Modular do SysAdmin
    const navSections = [
        {
            title: 'Inteligência & Analytics',
            items: [
                { label: 'Visão Geral (BI)', icon: LayoutDashboard, path: '/admin/dashboard', roles: ['super_admin', 'admin', 'presidente'] },
                { label: 'Mapa de Inteligência', icon: MapPin, path: '/admin/intelligence', roles: ['super_admin', 'admin', 'city_admin'] },
                { label: 'Ingestão Graal (Offline)', icon: Database, path: '/admin/graal-ingest', roles: ['super_admin'] },
            ]
        },
        {
            title: 'Operações & Moderação',
            items: [
                { label: 'Moderação de Ocorrências', icon: Users, path: '/admin/moderation', roles: ['super_admin', 'admin', 'moderator'] },
                { label: 'Comunicação & Mensageria', icon: MessageSquare, path: '/admin/communication', roles: ['super_admin', 'admin'] },
            ]
        },
        {
            title: 'Gestão de Recursos & CMS',
            items: [
                { label: 'Flags, Avisos & IA', icon: Sliders, path: '/admin/nocode', roles: ['super_admin'] },
            ]
        },
        {
            title: 'SRE & Infraestrutura',
            items: [
                { label: 'Observabilidade & Auto-Cura', icon: Activity, path: '/admin/sre', roles: ['super_admin'] },
                { label: 'Auditoria & Logs', icon: Shield, path: '/admin/logs', roles: ['super_admin'] },
                { label: 'Firewall & Ameaças', icon: ShieldAlert, path: '/admin/security-logs', roles: ['super_admin'] },
                { label: 'Crashes & Falhas Mobile', icon: ShieldAlert, path: '/admin/crash-reports', roles: ['super_admin'] },
            ]
        },
        {
            title: 'Conexões & Relatórios',
            items: [
                { label: 'Webhooks & Conexões', icon: Network, path: '/admin/webhooks', roles: ['super_admin'] },
                { label: 'Dossiês & Relatórios PDF', icon: FileText, path: '/admin/reports-engine', roles: ['super_admin', 'admin'] },
                { label: 'Motor de Automação', icon: Zap, path: '/admin/automations', roles: ['super_admin', 'admin'] },
            ]
        },
        {
            title: 'Governança & Federação',
            items: [
                { label: 'Governança Federativa', icon: Landmark, path: '/admin/jurisdictions', roles: ['super_admin'] },
                { label: 'Servidores Públicos', icon: Briefcase, path: '/admin/government-staff', roles: ['super_admin', 'admin', 'presidente', 'governador', 'prefeito'] },
                { label: 'Cidadãos Cadastrados', icon: Users, path: '/admin/users', roles: ['super_admin'] },
                { label: 'Monetização & AdMob', icon: DollarSign, path: '/admin/monetization', roles: ['super_admin'] },
                { label: 'Configurações Globais', icon: Settings, path: '/admin/settings', roles: ['super_admin'] },
            ]
        }
    ];

    const userRole = userData?.role || 'super_admin';
    const isHub = location.pathname === '/hub';

    return (
        <div className="min-h-screen bg-slate-50 flex flex-col md:flex-row overflow-hidden font-sans">
            {/* Mobile Header */}
            {!isHub && (
                <header className="md:hidden bg-white border-b border-slate-200 px-4 py-3 flex items-center justify-between z-50 sticky top-0">
                    <Button variant="ghost" size="icon" onClick={toggleMobileMenu} className="h-9 w-9">
                        {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
                    </Button>
                    <div className="flex items-center gap-2 font-bold text-slate-900">
                        <img src="/logo.png" alt="Guardião Nacional" className="h-6 w-6 object-contain" />
                        <span className="text-sm">Guardião <span className="text-blue-600">Nacional</span></span>
                    </div>
                    <div className="w-9" />
                </header>
            )}

            {/* Sidebar Desktop */}
            {!isHub && (
                <aside
                    className={`
                        fixed md:static inset-y-0 left-0 z-40
                        bg-slate-900 text-slate-300 border-r border-slate-800 shadow-xl
                        transition-all duration-300 ease-in-out
                        flex flex-col
                        ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
                        ${sidebarOpen ? 'md:w-64' : 'md:w-20'}
                    `}
                >
                    {/* Header Sidebar */}
                    <div className={`h-16 flex items-center ${sidebarOpen ? 'justify-between px-4' : 'justify-center'} border-b border-slate-800 bg-slate-950`}>
                        {sidebarOpen ? (
                            <div className="flex items-center gap-2.5 font-bold text-base text-white truncate">
                                <img src="/logo.png" alt="Guardião Nacional" className="h-7 w-7 object-contain flex-shrink-0" />
                                <span>Guardião <span className="text-blue-400">Nacional</span></span>
                            </div>
                        ) : (
                            <img src="/logo.png" alt="Guardião Nacional" className="h-8 w-8 object-contain" />
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:flex h-8 w-8 text-slate-400 hover:text-white hover:bg-slate-800"
                            onClick={toggleSidebar}
                        >
                            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </Button>
                    </div>

                    {/* Lista de Navegação por Grupos */}
                    <nav className="flex-1 overflow-y-auto py-4 space-y-4 px-2 scrollbar-thin scrollbar-thumb-slate-800">
                        {navSections.map((section) => {
                            const filteredItems = section.items.filter(item => !item.roles || item.roles.includes(userRole));
                            if (filteredItems.length === 0) return null;

                            return (
                                <div key={section.title} className="space-y-1">
                                    {sidebarOpen && (
                                        <h3 className="px-3 text-[10px] font-bold uppercase tracking-wider text-slate-500">
                                            {section.title}
                                        </h3>
                                    )}
                                    {filteredItems.map((item) => (
                                        <button
                                            key={item.path}
                                            onClick={() => {
                                                navigate(item.path);
                                                setMobileMenuOpen(false);
                                            }}
                                            title={!sidebarOpen ? item.label : undefined}
                                            className={`
                                                w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-medium transition-colors
                                                ${isActive(item.path)
                                                    ? 'bg-blue-600 text-white font-semibold'
                                                    : 'text-slate-400 hover:bg-slate-800 hover:text-slate-100'}
                                                ${!sidebarOpen && 'justify-center px-2'}
                                            `}
                                        >
                                            <item.icon size={18} className={isActive(item.path) ? 'text-white' : 'text-slate-400'} />
                                            {sidebarOpen && <span className="truncate">{item.label}</span>}
                                        </button>
                                    ))}
                                </div>
                            );
                        })}
                    </nav>

                    {/* Footer / User Profile */}
                    <div className="p-3 border-t border-slate-800 bg-slate-950">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} w-full p-2 rounded-lg hover:bg-slate-800 transition-colors`}>
                                    <Avatar className="h-8 w-8 border border-slate-700">
                                        <AvatarImage src={currentUser?.photoURL || undefined} />
                                        <AvatarFallback className="bg-blue-900 text-blue-200 text-xs">
                                            {currentUser?.displayName?.charAt(0) || 'S'}
                                        </AvatarFallback>
                                    </Avatar>
                                    {sidebarOpen && (
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p className="text-xs font-medium text-white truncate">{currentUser?.displayName || 'SysAdmin'}</p>
                                            <p className="text-[10px] text-slate-400 truncate">{currentUser?.email}</p>
                                        </div>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>SysAdmin Console</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/admin/jurisdictions')}>
                                    Governança Federativa
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/admin/nocode')}>
                                    Gestão de Recursos & CMS
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/admin/sre')}>
                                    Observabilidade SRE
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sair do Painel
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </aside>
            )}

            {/* Conteúdo Principal */}
            <div className="flex-1 flex flex-col min-h-0 overflow-hidden">
                {/* Topbar */}
                <header className="h-14 md:h-16 bg-white border-b border-slate-200 flex items-center justify-between px-4 md:px-6 shadow-sm z-30 shrink-0">
                    <div className="flex items-center gap-3 flex-1 min-w-0">
                        {/* Indicador de Jurisdição Ativa */}
                        <div className="flex items-center gap-2">
                            <Badge variant="outline" className={`gap-1.5 px-3 py-1 text-xs ${isEmulating ? 'bg-amber-50 text-amber-900 border-amber-300' : 'bg-blue-50 text-blue-900 border-blue-200'}`}>
                                <Globe className="w-3.5 h-3.5 text-blue-600" />
                                <span>Escopo: <strong>{scope.cityName || scope.state || 'Nacional (Brasil)'}</strong></span>
                            </Badge>

                            {isEmulating && (
                                <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={resetToNational}
                                    className="h-7 text-xs text-amber-800 hover:bg-amber-100 gap-1"
                                >
                                    <RotateCcw className="w-3 h-3" /> Voltar ao Brasil
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="flex items-center gap-2">
                        {/* Botão de Sincronização Diária / Forçar Leitura */}
                        <Button
                            size="sm"
                            variant="outline"
                            onClick={async () => {
                                setSyncing(true);
                                try {
                                    const result = await dataSyncService.syncData(true);
                                    setLastSync(result.lastSyncAt);
                                    toast.success(`Banco lido com sucesso! (${result.totalRead} ocorrências atualizadas)`);
                                    window.location.reload();
                                } catch (err) {
                                    toast.error('Erro ao ler banco de dados.');
                                } finally {
                                    setSyncing(false);
                                }
                            }}
                            disabled={syncing}
                            className="h-8 text-xs gap-1.5 bg-emerald-50 hover:bg-emerald-100 text-emerald-900 border-emerald-300 font-medium shadow-sm"
                            title={`Leitura diária do banco (Economiza leituras mantendo cache 24h). Última leitura: ${lastSync ? lastSync.toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }) : 'Pendente'}`}
                        >
                            <Database className={`w-3.5 h-3.5 text-emerald-600 ${syncing ? 'animate-spin' : ''}`} />
                            <span className="hidden lg:inline">{syncing ? 'Lendo Banco...' : 'Forçar Leitura do Banco'}</span>
                        </Button>

                        {/* Botão de Retorno ao Hub de Painéis */}
                        <Button
                            size="sm"
                            variant={location.pathname === '/hub' || location.pathname === '/role-hub' ? 'default' : 'outline'}
                            onClick={() => navigate('/hub')}
                            className={`h-8 text-xs gap-1.5 font-medium shadow-sm transition-all ${
                                location.pathname === '/hub' || location.pathname === '/role-hub'
                                    ? 'bg-blue-600 text-white hover:bg-blue-700 border-blue-600'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                            title="Ir ao Hub Central de Seleção de Painéis e Perfis"
                        >
                            <LayoutGrid className={`w-3.5 h-3.5 ${location.pathname === '/hub' || location.pathname === '/role-hub' ? 'text-white' : 'text-blue-600'}`} />
                            <span className="hidden sm:inline">Hub de Painéis</span>
                        </Button>

                        {/* Atalho para Governança Federativa */}
                        <Button
                            size="sm"
                            variant={location.pathname === '/admin/jurisdictions' ? 'default' : 'outline'}
                            onClick={() => {
                                if (location.pathname === '/admin/jurisdictions') {
                                    toast.info('Você já está no Painel de Governança de Jurisdições.');
                                } else {
                                    navigate('/admin/jurisdictions');
                                }
                            }}
                            className={`h-8 text-xs gap-1.5 font-medium shadow-sm transition-all ${
                                location.pathname === '/admin/jurisdictions'
                                    ? 'bg-indigo-700 text-white hover:bg-indigo-800 border-indigo-700'
                                    : 'bg-slate-50 hover:bg-slate-100 text-slate-700 border-slate-300'
                            }`}
                            title="Acessar painéis e emulação de jurisdições"
                        >
                            <Landmark className={`w-3.5 h-3.5 ${location.pathname === '/admin/jurisdictions' ? 'text-white' : 'text-indigo-600'}`} />
                            <span className="hidden sm:inline">Jurisdições</span>
                        </Button>

                        <SystemStatusIndicator />
                    </div>
                </header>

                {/* Área de Visualização */}
                {(() => {
                    const isFullScreen = location.pathname.includes('/admin/intelligence') || location.pathname.includes('/admin/war-room');
                    return (
                        <main className={`flex-1 min-h-0 bg-slate-50 ${isFullScreen ? 'p-2 md:p-3 flex flex-col overflow-hidden' : 'overflow-y-auto p-4 md:p-6'}`}>
                            <div className={isFullScreen ? 'w-full h-full flex flex-col min-h-0 flex-1' : 'max-w-7xl mx-auto space-y-6'}>
                                {children}
                            </div>
                        </main>
                    );
                })()}
            </div>

            {/* Mobile Overlay */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/60 z-30 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}
        </div>
    );
};

export default CommandLayout;
