
import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    LayoutDashboard,
    MapPin,
    Users,
    Shield,
    Building2,
    Settings,
    LogOut,
    Menu,
    X,
    ChevronLeft,
    ChevronRight,
    Zap,
    MessageSquare
} from 'lucide-react';
import { Button } from '../ui/button';
import { Avatar, AvatarFallback, AvatarImage } from '../ui/avatar';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger
} from '../ui/dropdown-menu';

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
            // Simulate latency fluctuation
            const newLatency = Math.floor(Math.random() * (50 - 15) + 15);
            setLatency(newLatency);

            if (newLatency < 50) setStatus('optimal');
            else if (newLatency < 150) setStatus('good');
            else setStatus('weak');
        };

        window.addEventListener('online', updateStatus);
        window.addEventListener('offline', updateStatus);
        const interval = setInterval(updateStatus, 3000);

        updateStatus();
        return () => {
            window.removeEventListener('online', updateStatus);
            window.removeEventListener('offline', updateStatus);
            clearInterval(interval);
        };
    }, []);

    const getStatusConfig = () => {
        switch (status) {
            case 'optimal': return { color: 'bg-green-500', text: 'text-green-700', bg: 'bg-green-50', border: 'border-green-100', label: `Conexão Excelente (${latency}ms)` };
            case 'good': return { color: 'bg-yellow-500', text: 'text-yellow-700', bg: 'bg-yellow-50', border: 'border-yellow-100', label: `Conexão Estável (${latency}ms)` };
            case 'weak': return { color: 'bg-orange-500', text: 'text-orange-700', bg: 'bg-orange-50', border: 'border-orange-100', label: `Conexão Instável (${latency}ms)` };
            case 'offline': return { color: 'bg-red-500', text: 'text-red-700', bg: 'bg-red-50', border: 'border-red-100', label: 'Sistema Offline' };
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

const CommandLayout: React.FC<CommandLayoutProps> = ({ children }) => {
    const { currentUser, userData, logout } = useAuth();
    const navigate = useNavigate();
    const location = useLocation();
    const [sidebarOpen, setSidebarOpen] = useState(true);
    const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

    const toggleSidebar = () => setSidebarOpen(!sidebarOpen);
    const toggleMobileMenu = () => setMobileMenuOpen(!mobileMenuOpen);

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const isActive = (path: string) => location.pathname === path || location.pathname.startsWith(`${path}/`);

    // Dynamic Navigation based on Role
    // This could also be passed via props or context to make it fully reusable
    const navItems = [
        { label: 'Visão Geral', icon: LayoutDashboard, path: '/admin/dashboard', roles: ['super_admin', 'admin', 'presidente'] },
        // { label: 'Sala de Guerra', icon: Shield, path: '/admin/war-room', roles: ['super_admin', 'admin', 'presidente'] },
        { label: 'Mapa de Inteligência', icon: MapPin, path: '/admin/intelligence', roles: ['super_admin', 'admin', 'city_admin'] },
        { label: 'Moderação', icon: Users, path: '/admin/moderation', roles: ['super_admin', 'admin', 'moderator'] },
        { label: 'Usuários', icon: Users, path: '/admin/users', roles: ['super_admin'] },
        { label: 'Cidades', icon: Building2, path: '/admin/cities', roles: ['super_admin', 'admin'] },
        { label: 'Comunicação', icon: MessageSquare, path: '/admin/communication', roles: ['super_admin', 'admin'] },
        { label: 'Logs do Sistema', icon: Shield, path: '/admin/logs', roles: ['super_admin'] },
        { label: 'Automação', icon: Zap, path: '/admin/automations', roles: ['super_admin', 'admin'] },
        { label: 'Integrações', icon: Zap, path: '/admin/integrations', roles: ['super_admin'] },
        { label: 'Configurações', icon: Settings, path: '/admin/settings', roles: ['super_admin'] },
    ];

    // Filter nav items based on user role (simplified check)
    // Assuming userData.role is available. If not, showing basic set or all for dev.
    // Filter nav items based on user role (simplified check)
    // Assuming userData.role is available. If not, showing basic set or all for dev.
    const userRole = userData?.role || 'super_admin'; // Fallback for dev/safe default check
    const filteredNavItems = navItems.filter(item => !item.roles || item.roles.includes(userRole));

    // Customize which paths should have the sidebar hidden
    const isHub = location.pathname === '/hub';

    return (
        <div className="min-h-screen bg-gray-50 flex flex-col md:flex-row overflow-hidden font-sans">

            {/* Mobile Header - Hidden on Hub */}
            {!isHub && (
                <header className="md:hidden bg-white border-b border-gray-200 p-4 flex items-center justify-between z-50">
                    <div className="flex items-center gap-2 font-bold text-gray-900">
                        <Shield className="h-6 w-6 text-blue-600" />
                        <span>Guardião</span>
                    </div>
                    <Button variant="ghost" size="icon" onClick={toggleMobileMenu}>
                        {mobileMenuOpen ? <X /> : <Menu />}
                    </Button>
                </header>
            )}

            {/* Sidebar (Desktop + Mobile) - Hidden on Hub */}
            {!isHub && (
                <aside
                    className={`
                        fixed md:static inset-y-0 left-0 z-40
                        bg-white border-r border-gray-200 shadow-sm
                        transition-all duration-300 ease-in-out
                        flex flex-col
                        ${mobileMenuOpen ? 'translate-x-0 w-64' : '-translate-x-full md:translate-x-0'}
                        ${sidebarOpen ? 'md:w-64' : 'md:w-20'}
                    `}
                >
                    {/* Sidebar Header */}
                    <div className={`h-16 flex items-center ${sidebarOpen ? 'justify-between px-4' : 'justify-center'} border-b border-gray-100`}>
                        {sidebarOpen ? (
                            <div className="flex items-center gap-2 font-bold text-xl text-gray-900 truncate">
                                <Shield className="h-6 w-6 text-blue-600 flex-shrink-0" />
                                <span>Guardião <span className="text-blue-600">Painel</span></span>
                            </div>
                        ) : (
                            <Shield className="h-8 w-8 text-blue-600" />
                        )}

                        <Button
                            variant="ghost"
                            size="icon"
                            className="hidden md:flex h-8 w-8 text-gray-400 hover:text-gray-600"
                            onClick={toggleSidebar}
                        >
                            {sidebarOpen ? <ChevronLeft size={16} /> : <ChevronRight size={16} />}
                        </Button>
                    </div>

                    {/* Navigation */}
                    <nav className="flex-1 overflow-y-auto py-4 space-y-1">
                        {filteredNavItems.map((item) => (
                            <button
                                key={item.path}
                                onClick={() => {
                                    navigate(item.path);
                                    setMobileMenuOpen(false);
                                }}
                                title={!sidebarOpen ? item.label : undefined}
                                className={`
                                    w-full flex items-center gap-3 px-4 py-3 text-sm font-medium transition-colors
                                    ${isActive(item.path)
                                        ? 'bg-blue-50 text-blue-700 border-r-4 border-blue-600'
                                        : 'text-gray-600 hover:bg-gray-50 hover:text-gray-900'}
                                    ${!sidebarOpen && 'justify-center px-2'}
                                `}
                            >
                                <item.icon size={20} className={isActive(item.path) ? 'text-blue-600' : 'text-gray-400'} />
                                {sidebarOpen && <span>{item.label}</span>}
                            </button>
                        ))}
                    </nav>

                    {/* User Profile / Footer */}
                    <div className="p-4 border-t border-gray-100">
                        <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                                <button className={`flex items-center ${sidebarOpen ? 'gap-3' : 'justify-center'} w-full p-2 rounded-lg hover:bg-gray-100 transition-colors`}>
                                    <Avatar className="h-9 w-9 border border-gray-200">
                                        <AvatarImage src={currentUser?.photoURL || undefined} />
                                        <AvatarFallback className="bg-blue-100 text-blue-700">
                                            {currentUser?.displayName?.charAt(0) || 'U'}
                                        </AvatarFallback>
                                    </Avatar>
                                    {sidebarOpen && (
                                        <div className="flex-1 text-left overflow-hidden">
                                            <p className="text-sm font-medium text-gray-900 truncate">{currentUser?.displayName || 'Usuário'}</p>
                                            <p className="text-xs text-gray-500 truncate">{currentUser?.email}</p>
                                        </div>
                                    )}
                                </button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-56">
                                <DropdownMenuLabel>Minha Conta</DropdownMenuLabel>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => navigate('/admin/profile')}>
                                    Perfil
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigate('/admin/settings')}>
                                    Configurações
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={handleLogout} className="text-red-600">
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sair
                                </DropdownMenuItem>
                            </DropdownMenuContent>
                        </DropdownMenu>
                    </div>
                </aside>
            )}

            {/* Main Content Area */}
            <div className="flex-1 flex flex-col h-screen overflow-hidden">

                {/* Top Bar */}
                <header className="h-16 bg-white border-b border-gray-200 flex items-center justify-between px-6 shadow-sm z-30">
                    {/* Search / Breadcrumbs or Logo on Hub */}
                    <div className="flex items-center gap-4 flex-1">
                        {/* Only show Logo/Title on Hub (since Sidebar is hidden there) */}
                        {isHub && (
                            <div className="flex items-center gap-3">
                                <Shield className="h-8 w-8 text-blue-600" />
                                <span className="text-xl font-bold text-gray-900 tracking-tight">Guardião <span className="text-blue-600">Painel</span></span>
                            </div>
                        )}
                    </div>

                    {/* Right Actions */}
                    <div className="flex items-center gap-4">
                        {/* System Status Indicator - Functional */}
                        <SystemStatusIndicator />

                        {/* Bell Removed Globally */}
                        {/* 
                        <Button variant="ghost" size="icon" className="relative text-gray-500 hover:text-gray-700">
                            <Bell className="h-5 w-5" />
                            <span className="absolute top-2 right-2 w-2 h-2 bg-red-500 rounded-full border-2 border-white"></span>
                        </Button>
                        */}
                    </div>
                </header>

                {/* Scrollable Content */}
                <main className="flex-1 overflow-y-auto p-6 bg-gray-50/50">
                    <div className="max-w-7xl mx-auto space-y-6">
                        {children}
                    </div>
                </main>
            </div>

            {/* Overlay for mobile menu */}
            {mobileMenuOpen && (
                <div
                    className="fixed inset-0 bg-black/50 z-30 md:hidden"
                    onClick={() => setMobileMenuOpen(false)}
                />
            )}
        </div>
    );
};

export default CommandLayout;
