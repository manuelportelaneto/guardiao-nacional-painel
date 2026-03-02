import React, { lazy, Suspense } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './components/screens/AuthScreen';
import RoleHub from './components/screens/RoleHub';
import SystemControls from './components/screens/SystemControls';
import { Toaster } from 'sonner';
import AdminDashboard from './components/screens/AdminDashboard';
import AdminOverview from './components/screens/AdminOverview';
import AdminUsers from './components/screens/AdminUsers';
import AdminCities from './components/screens/AdminCities';
import CitySelector from './components/screens/CitySelector';
import CityDashboard from './components/screens/CityDashboard';
import CityDetailsPage from './components/screens/CityDetailsPage';
import TasksKanban from './components/screens/TasksKanban';
import DepartmentsCRM from './components/screens/DepartmentsCRM';
import AdminCommunication from './components/screens/AdminCommunication';
import CitySettings from './components/screens/CitySettings';
import ApiKeysScreen from './components/screens/ApiKeysScreen';
import { GlobalErrorBoundary } from './components/GlobalErrorBoundary';
import type { UserRole } from './types/user';

// Lazy-loaded heavy modules (code splitting for faster initial load)
const AdminModeration = lazy(() => import('./components/screens/AdminModeration'));
const IntelligenceMap = lazy(() => import('./components/screens/IntelligenceMap'));
const AdminLogs = lazy(() => import('./components/screens/AdminLogs'));
const ReportsScreen = lazy(() => import('./components/screens/ReportsScreen'));
const AdminAutomations = lazy(() => import('./components/screens/AdminAutomations'));
const AdminMonetization = lazy(() => import('./components/screens/AdminMonetization'));
const WarRoom = lazy(() => import('./components/screens/WarRoom'));
const ActionEngine = lazy(() => import('./components/screens/ActionEngine'));
const AiFeedbackScreen = lazy(() => import('./components/screens/AiFeedbackScreen'));
const AdminSecurityLogs = lazy(() => import('./components/screens/AdminSecurityLogs'));
const AdminCrashReports = lazy(() => import('./components/screens/AdminCrashReports'));
const GraalIngest = lazy(() => import('./components/screens/GraalIngest').then(m => ({ default: m.GraalIngest })));

// Full-page loading fallback for lazy-loaded routes
const PageLoader = () => (
    <div className="h-full flex items-center justify-center py-20">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600" />
    </div>
);


// Wrapper for protected routes
interface PrivateRouteProps {
    children: React.ReactNode;
    allowedRoles?: UserRole[];
}

const PrivateRoute: React.FC<PrivateRouteProps> = ({ children, allowedRoles }) => {
    const { currentUser, userData, loading, logout } = useAuth();

    if (loading) return <div className="h-screen w-screen flex items-center justify-center">Carregando...</div>;

    if (!currentUser) return <Navigate to="/" />;

    // Block citizens (users without authorized role)
    if (userData && !['super_admin', 'admin', 'city_admin', 'presidente', 'governador', 'prefeito', 'servidor'].includes(userData.role)) {
        return (
            <div className="h-screen flex flex-col items-center justify-center gap-4">
                <h1 className="text-xl font-bold text-red-600">Acesso Restrito</h1>
                <p>Seu usuário não possui permissão para acessar o Painel Administrativo.</p>
                <button onClick={logout} className="px-4 py-2 bg-gray-200 rounded hover:bg-gray-300">Sair</button>
            </div>
        );
    }

    // Check specific role requirements for the route
    if (allowedRoles && userData) {
        if (!allowedRoles.includes(userData.role)) {
            // Redirect unauthorized access to Hub (safe zone)
            return <Navigate to="/hub" replace />;
        }
    }

    return <>{children}</>;
};

// Login Route (redirects if already logged in)
const PublicRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, loading } = useAuth();
    if (loading) return <div>Carregando...</div>;
    return !currentUser ? <>{children}</> : <Navigate to="/hub" />;
}

function App() {
    return (
        <GlobalErrorBoundary>
            <Router>
                <AuthProvider>
                    <Routes>
                        <Route path="/" element={
                            <PublicRoute>
                                <AuthScreen />
                            </PublicRoute>
                        } />

                        {/* HUB - Acessível para todos os autorizados */}
                        <Route path="/hub" element={
                            <PrivateRoute>
                                <RoleHub />
                            </PrivateRoute>
                        } />

                        {/* Admin Section - Only Admins & Presidente */}
                        <Route path="/admin" element={
                            <PrivateRoute allowedRoles={['super_admin', 'admin', 'presidente']}>
                                <AdminDashboard />
                            </PrivateRoute>
                        }>
                            <Route index element={<Navigate to="dashboard" replace />} />
                            <Route path="dashboard" element={<AdminOverview />} />
                            <Route path="users" element={<AdminUsers />} />
                            <Route path="cities" element={<AdminCities />} />
                            <Route path="cities/:cityId" element={
                                <Suspense fallback={<PageLoader />}>
                                    <CityDetailsPage />
                                </Suspense>
                            } />
                            <Route path="moderation" element={
                                <Suspense fallback={<PageLoader />}><AdminModeration /></Suspense>
                            } />
                            <Route path="communication" element={<AdminCommunication />} />
                            <Route path="settings" element={<SystemControls />} />
                            <Route path="logs" element={
                                <Suspense fallback={<PageLoader />}><AdminLogs /></Suspense>
                            } />
                            <Route path="intelligence" element={
                                <Suspense fallback={<PageLoader />}><IntelligenceMap /></Suspense>
                            } />
                            <Route path="integrations" element={
                                <Suspense fallback={<PageLoader />}><ActionEngine /></Suspense>
                            } />
                            <Route path="automations" element={
                                <Suspense fallback={<PageLoader />}><AdminAutomations /></Suspense>
                            } />
                            <Route path="monetization" element={
                                <Suspense fallback={<PageLoader />}><AdminMonetization /></Suspense>
                            } />
                            <Route path="war-room" element={
                                <Suspense fallback={<PageLoader />}><WarRoom /></Suspense>
                            } />
                            <Route path="graal-ingest" element={
                                <Suspense fallback={<PageLoader />}><GraalIngest /></Suspense>
                            } />
                            <Route path="reports" element={
                                <Suspense fallback={<PageLoader />}><ReportsScreen /></Suspense>
                            } />
                            <Route path="security-logs" element={
                                <Suspense fallback={<PageLoader />}><AdminSecurityLogs /></Suspense>
                            } />
                            <Route path="crash-reports" element={
                                <Suspense fallback={<PageLoader />}><AdminCrashReports /></Suspense>
                            } />
                            <Route path="api-keys" element={<ApiKeysScreen />} />
                            <Route path="ai-feedback" element={
                                <Suspense fallback={<PageLoader />}><AiFeedbackScreen /></Suspense>
                            } />
                        </Route>

                        {/* City Selection */}
                        <Route path="/city/select" element={
                            <PrivateRoute>
                                <CitySelector />
                            </PrivateRoute>
                        } />

                        {/* City Dashboard - Admins, Gestores, Servidores */}
                        <Route path="/city/:cityId/dashboard" element={
                            <PrivateRoute>
                                <CityDashboard />
                            </PrivateRoute>
                        } />
                        <Route path="/city/:cityId/tasks" element={
                            <PrivateRoute>
                                <TasksKanban />
                            </PrivateRoute>
                        } />
                        <Route path="/city/:cityId/departments" element={
                            <PrivateRoute>
                                <DepartmentsCRM />
                            </PrivateRoute>
                        } />
                        <Route path="/city/:cityId/settings" element={
                            <PrivateRoute>
                                <CitySettings />
                            </PrivateRoute>
                        } />
                    </Routes>
                    <Toaster />
                </AuthProvider>
            </Router>
        </GlobalErrorBoundary>
    );
}

export default App;
