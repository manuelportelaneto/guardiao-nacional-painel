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
    Plus
} from 'lucide-react';
import { Button } from '../ui/button';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from '../ui/sheet';
import { Card, CardContent } from '../ui/card';

const CITY_NAMES: { [key: string]: string } = {
    'maua': 'Mauá',
    'santo-andre': 'Santo André',
    'sao-caetano': 'São Caetano do Sul',
    'sao-paulo': 'São Paulo'
};

// Mock data for kanban
const mockTasks = {
    received: [
        { id: 1, title: 'Buraco na Rua Principal', priority: 'high' },
        { id: 2, title: 'Iluminação quebrada', priority: 'medium' },
    ],
    inProgress: [
        { id: 3, title: 'Limpeza de praça', priority: 'low' },
    ],
    resolved: [
        { id: 4, title: 'Coleta de lixo', priority: 'medium' },
    ],
    archived: []
};

// Helper function for priority colors
const getPriorityColor = (priority: string) => {
    switch (priority) {
        case 'high': return 'bg-red-100 text-red-700';
        case 'medium': return 'bg-yellow-100 text-yellow-700';
        case 'low': return 'bg-green-100 text-green-700';
        default: return 'bg-gray-100 text-gray-700';
    }
};

// Props interface for KanbanColumn
interface KanbanColumnProps {
    title: string;
    tasks: { id: number; title: string; priority: string }[];
    color: string;
}

// KanbanColumn component defined outside TasksKanban to avoid re-creation on each render
const KanbanColumn: React.FC<KanbanColumnProps> = ({ title, tasks, color }) => (
    <div className="flex-1 min-w-[280px]">
        <div className={`${color} p-3 rounded-t-lg`}>
            <h3 className="font-semibold text-white flex items-center justify-between">
                {title}
                <span className="text-xs bg-white/30 px-2 py-1 rounded">{tasks.length}</span>
            </h3>
        </div>
        <div className="bg-gray-100 p-3 rounded-b-lg min-h-[400px] space-y-2">
            {tasks.map((task) => (
                <Card key={task.id} className="cursor-pointer hover:shadow-md transition-shadow">
                    <CardContent className="p-4">
                        <p className="font-medium text-sm mb-2">{task.title}</p>
                        <span className={`text-xs px-2 py-1 rounded ${getPriorityColor(task.priority)}`}>
                            {task.priority === 'high' ? 'Alta' : task.priority === 'medium' ? 'Média' : 'Baixa'}
                        </span>
                    </CardContent>
                </Card>
            ))}
        </div>
    </div>
);

const TasksKanban: React.FC = () => {
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

    const navigateToDepartments = () => {
        navigate(`/city/${cityId}/departments`);
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
                                    onClick={() => setSidebarOpen(false)}
                                >
                                    <ClipboardList className="mr-2 h-4 w-4" />
                                    Tarefas
                                </Button>
                                <Button
                                    variant="ghost"
                                    className="justify-start hover:bg-orange-50 hover:text-orange-600"
                                    onClick={navigateToDepartments}
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
                        <h1 className="text-3xl font-bold tracking-tight text-gray-900">Tarefas - {cityName}</h1>
                        <p className="text-gray-500">Gerencie ocorrências e solicitações</p>
                    </div>
                </div>
                <Button className="bg-orange-600 hover:bg-orange-700">
                    <Plus className="mr-2 h-4 w-4" />
                    Nova Tarefa
                </Button>
            </div>

            {/* Kanban Board */}
            <div className="flex gap-4 overflow-x-auto pb-4">
                <KanbanColumn
                    title="Recebidas"
                    tasks={mockTasks.received}
                    color="bg-blue-600"
                />
                <KanbanColumn
                    title="Em Andamento"
                    tasks={mockTasks.inProgress}
                    color="bg-yellow-600"
                />
                <KanbanColumn
                    title="Resolvidas"
                    tasks={mockTasks.resolved}
                    color="bg-green-600"
                />
                <KanbanColumn
                    title="Arquivadas"
                    tasks={mockTasks.archived}
                    color="bg-gray-600"
                />
            </div>
        </div>
    );
};

export default TasksKanban;
