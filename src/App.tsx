
import React from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import AuthScreen from './components/screens/AuthScreen';
import RoleHub from './components/screens/RoleHub';
import SystemControls from './components/screens/SystemControls';

// ... (in Routes)

{/* Admin Section */ }
<Route path="/admin" element={
    <PrivateRoute>
        <AdminDashboard />
    </PrivateRoute>
}>
    <Route index element={<Navigate to="dashboard" replace />} />
    <Route path="dashboard" element={<Navigate to="/admin" replace />} /> {/* Redirecting since Dashboard is the main view for now, or we can move the main view to a wrapper */}
    <Route path="users" element={<AdminUsers />} />
    <Route path="cities" element={<AdminCities />} />
    <Route path="moderation" element={<AdminModeration />} />
    <Route path="alerts" element={<AdminAlerts />} />
    <Route path="marketing" element={<MarketingScreen />} />
    <Route path="settings" element={<SystemControls />} />
</Route>
import { Toaster } from 'sonner';

// Wrapper for protected routes
const PrivateRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
    const { currentUser, loading } = useAuth();

    if (loading) return <div className="h-screen w-screen flex items-center justify-center">Carregando...</div>;

    return currentUser ? <>{children}</> : <Navigate to="/" />;
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
                    <Route path="/hub" element={
                        <PrivateRoute>
                            <RoleHub />
                        </PrivateRoute>
                    } />

                    {/* Admin Section */}
                    <Route path="/admin" element={
                        <PrivateRoute>
                            <AdminDashboard />
                        </PrivateRoute>
                    }>
                        <Route index element={<Navigate to="dashboard" replace />} />
                        <Route path="dashboard" element={<Navigate to="/admin" replace />} /> {/* Redirecting since Dashboard is the main view for now, or we can move the main view to a wrapper */}
                        <Route path="users" element={<AdminUsers />} />
                        <Route path="cities" element={<AdminCities />} />
                        <Route path="moderation" element={<AdminModeration />} />
                        <Route path="alerts" element={<AdminAlerts />} />
                        <Route path="marketing" element={<MarketingScreen />} />
                        <Route path="settings" element={<SystemControls />} />
                    </Route>

                    {/* City Selection */}
                    <Route path="/city/select" element={
                        <PrivateRoute>
                            <CitySelector />
                        </PrivateRoute>
                    } />

                    {/* City Dashboard and Sub-routes */}
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
