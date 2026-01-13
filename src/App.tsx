import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './components/screens/AuthScreen';
import RoleHub from './components/screens/RoleHub';
import SystemControls from './components/screens/SystemControls';
import { Toaster } from 'sonner';
import AdminDashboard from './components/screens/AdminDashboard';
import AdminUsers from './components/screens/AdminUsers';
import AdminCities from './components/screens/AdminCities';
import AdminModeration from './components/screens/AdminModeration';

import CitySelector from './components/screens/CitySelector';
import CityDashboard from './components/screens/CityDashboard';
import TasksKanban from './components/screens/TasksKanban';
import DepartmentsCRM from './components/screens/DepartmentsCRM';
import AdminCommunication from './components/screens/AdminCommunication';
import AdminLogs from './components/screens/AdminLogs';
import type { UserRole } from './types/user';

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
    if (userData && !['admin', 'presidente', 'governador', 'prefeito', 'servidor'].includes(userData.role)) {
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
                        <PrivateRoute allowedRoles={['admin', 'presidente']}>
                            <AdminDashboard />
                        </PrivateRoute>
                    }>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<Navigate to="/admin" replace />} />
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="cities" element={<AdminCities />} />
                        <Route path="moderation" element={<AdminModeration />} />

                        <Route path="communication" element={<AdminCommunication />} />
                        <Route path="settings" element={<SystemControls />} />
                        <Route path="logs" element={<AdminLogs />} />
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
                </Routes>
                <Toaster />
            </AuthProvider>
        </Router>
    );
}

export default App;
