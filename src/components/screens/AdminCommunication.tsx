import React, { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../ui/tabs';
import { MessageSquare, TrendingUp, History, Send } from 'lucide-react';
import MarketingScreen from './MarketingScreen';
import MessageComposer from './MessageComposer';
import MessageHistory from './MessageHistory';

const AdminCommunication: React.FC = () => {
    const [activeTab, setActiveTab] = useState('compose');

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-3xl font-bold tracking-tight">Comunicação e Engajamento</h1>
                <p className="text-muted-foreground">Central de mensagens, notificações push e campanhas de marketing.</p>
            </div>

            <Tabs value={activeTab} className="w-full" onValueChange={setActiveTab}>
                <TabsList>
                    <TabsTrigger value="compose" className="gap-2">
                        <Send className="w-4 h-4" />
                        Nova Mensagem
                    </TabsTrigger>
                    <TabsTrigger value="history" className="gap-2">
                        <History className="w-4 h-4" />
                        Histórico
                    </TabsTrigger>
                    <TabsTrigger value="marketing" className="gap-2">
                        <TrendingUp className="w-4 h-4" />
                        Marketing (Banners)
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="compose" className="pt-4 grid gap-6 grid-cols-1 lg:grid-cols-3">
                    <div className="lg:col-span-2">
                        <MessageComposer />
                    </div>
                    <div className="lg:col-span-1">
                        <div className="bg-blue-50 border border-blue-100 rounded-lg p-6 space-y-4">
                            <h3 className="font-semibold text-blue-900 flex items-center gap-2">
                                <MessageSquare className="w-5 h-5" /> Dicas de Engajamento
                            </h3>
                            <ul className="text-sm text-blue-800 space-y-2 list-disc list-inside">
                                <li>Use títulos curtos e diretos.</li>
                                <li>Adicione imagens para aumentar a taxa de cliques em 40%.</li>
                                <li>Segmente por localização para evitar spam.</li>
                                <li>Horários de pico: 11h e 18h.</li>
                            </ul>
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="history" className="pt-4">
                    <MessageHistory />
                </TabsContent>

                <TabsContent value="marketing" className="pt-4">
                    <MarketingScreen />
                </TabsContent>
            </Tabs>
        </div>
    );
};

export default AdminCommunication;
