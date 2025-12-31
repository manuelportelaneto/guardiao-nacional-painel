import React, { useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import {
    Menu,
    LayoutDashboard,
    ClipboardList,
    Building2,
    BarChart3,
    Settings,
    LogOut,
    ArrowLeft,
    Plus,
    Users
} from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';

const CITY_NAMES: { [key: string]: string } = {
    'maua': 'Mauá',
    'santo-andre': 'Santo André',
    'sao-caetano': 'São Caetano do Sul',
    'sao-paulo': 'São Paulo'
};

// Mock data for departments
const mockDepartments = [
    { id: 1, name: 'Secretaria de Obras', employees: 12 },
    { id: 2, name: 'Secretaria de Saúde', employees: 25 },
    { id: 3, name: 'Secretaria de Educação', employees: 18 },
    { id: 4, name: 'Secretaria de Transporte', employees: 8 },
];

const DepartmentsCRM: React.FC = () => {
    const { cityId } = useParams<{ cityId: string }>();
    const [sidebarOpen, setSidebarOpen] = useState(false);
    const { logout } = useAuth();
    const navigate = useNavigate();

    const cityName = CITY_NAMES[cityId || ''] || cityId;

    const handleLogout = async () => {
        await logout();
        navigate('/');
    };

    const handleBack = () => {
        navigate(`/city/${cityId}/dashboard`);
    };

    const navigateToDashboard = () => {
        navigate(`/city/${cityId}/dashboard`);
        setSidebarOpen(false);
    };

    const navigateToTasks = () => {
        navigate(`/city/${cityId}/tasks`);
        setSidebarOpen(false);
    };

    return (
        <div className="p-8 space-y-8 bg-gray-50 min-h-screen">
            <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                    {/* Sidebar Menu */}
                    <Sheet open={sidebarOpen} onOpenChange={setSidebarOpen}>
                        <SheetTrigger asChild>
                            <Button variant="ghost" size="icon" className="hover:bg-gray-100">
                                <Menu className="h-6 w-6" />
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="w-80">
                            <SheetHeader>
                                <SheetTitle>Menu - {cityName}</SheetTitle>
                            </SheetHeader>

                            <nav className="flex flex-col gap-2 mt-6">
                                <Button
                                    variant="ghost"
                                    className="justify-start hover:bg-orange-50 hover:text-orange-600"
                                    onClick={navigateToDashboard}
                                >
                                    <LayoutDashboard className="mr-2 h-4 w-4" />
                                    Dashboard
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="justify-start hover:bg-orange-50 hover:text-orange-600"
                                    onClick={navigateToTasks}
                                >
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Tarefas
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="justify-start hover:bg-orange-50 hover:text-orange-600"
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <Building2 className="mr-2 h-4 w-4" />
                                    Secretarias
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="justify-start opacity-50 cursor-not-allowed"
                                    disabled
                                >
                                    <BarChart3 className="mr-2 h-4 w-4" />
                                    Relatórios
                                    <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded">Em breve</span>
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="justify-start opacity-50 cursor-not-allowed"
                                    disabled
                                >
                                    <Settings className="mr-2 h-4 w-4" />
                                    Configurações
                                    <span className="ml-auto text-xs bg-gray-100 px-2 py-0.5 rounded">Em breve</span>
                                </Button>
                            </nav>

                            <div className="absolute bottom-6 left-6 right-6 space-y-2">
                                <Button variant="outline" className="w-full" onClick={handleBack}>
                                    <ArrowLeft className="mr-2 h-4 w-4" />
                                    Voltar
                                </Button>
                                <Button variant="destructive" className="w-full" onClick={handleLogout}>
                                    <LogOut className="mr-2 h-4 w-4" />
                                    Sair
                                </Button>
                            </div>
                        </SheetContent>
                    </Sheet>

                    <div>
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Secretarias - {cityName}</h1>
                        <p className="text-gray-500">Gerencie secretarias e servidores</p>
                    </div>
                </div>
                <Button className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Secretaria
                </Button>
            </div>

            {/* Departments Grid */}
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {mockDepartments.map((dept) => (
                    <Card key={dept.id} className="cursor-pointer hover:shadow-md transition-shadow">
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="text-lg">{dept.name}</CardTitle>
                                <div className="w-10 h-10 bg-orange-100 rounded-lg flex items-center justify-center">
                                    <Building2 className="h-5 w-5 text-orange-600" />
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center text-sm text-gray-500">
                                <Users className="h-4 w-4 mr-2" />
                                {dept.employees} servidores
                            </div>
                            <Button variant="link" className="mt-4 p-0 h-auto text-orange-600">
                                Ver detalhes →
                            </Button>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {/* Quick Stats */}
            <div className="grid gap-6 md:grid-cols-3">
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Total de Secretarias</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">{mockDepartments.length}</div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Total de Servidores</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {mockDepartments.reduce((sum, dept) => sum + dept.employees, 0)}
                        </div>
                    </CardContent>
                </Card>
                <Card>
                    <CardHeader>
                        <CardTitle className="text-sm font-medium">Média por Secretaria</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <div className="text-3xl font-bold">
                            {Math.round(mockDepartments.reduce((sum, dept) => sum + dept.employees, 0) / mockDepartments.length)}
                        </div>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
};

export default DepartmentsCRM;
