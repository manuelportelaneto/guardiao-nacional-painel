import React, { useState, useEffect } from 'react';
import { collection, query, orderBy, limit, onSnapshot } from 'firebase/firestore';
import { db } from '../../firebaseConfig';
import { Card, CardContent, CardHeader, CardTitle } from '../ui/card';
import { Badge } from '../ui/badge';
import { Smartphone, Bell, Mail, MessageSquare, ExternalLink, RefreshCw, Eye, ClipboardList } from 'lucide-react';
import { Button } from '../ui/button';

interface MessageLog {
    id: string;
    content: {
        title: string;
        body: string;
        imageUrl?: string;
    };
    channels: string[];
    // Supporting legacy structure as well
    title?: string;
    body?: string;
    status: string;
    stats?: {
        sent: number;
        viewed: number;
        clicked: number;
        totalTarget?: number;
    };
    poll?: {
        totalVotes: number;
    };
    plainText?: string;
    createdAt: any;
}

const MessageHistory: React.FC = () => {
    const [messages, setMessages] = useState<MessageLog[]>([]);
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const q = query(collection(db, 'messages'), orderBy('createdAt', 'desc'), limit(50));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({
                id: doc.id,
                ...doc.data()
            } as MessageLog));
            setMessages(data);
            setLoading(false);
        });
        return () => unsubscribe();
    }, []);

    const getChannelIcon = (channel: string) => {
        switch (channel) {
            case 'push': return <Smartphone className="w-3 h-3" />;
            case 'internal': return <Bell className="w-3 h-3" />;
            case 'email': return <Mail className="w-3 h-3" />;
            case 'sms': return <MessageSquare className="w-3 h-3" />;
            default: return <Bell className="w-3 h-3" />; // fallback
        }
    };

    const formatDate = (timestamp: any) => {
        if (!timestamp) return '-';
        return timestamp.toDate ? timestamp.toDate().toLocaleString('pt-BR') : new Date(timestamp).toLocaleString('pt-BR');
    };

    const stripHtml = (html: string) => {
        if (!html) return '';
        const tmp = document.createElement("DIV");
        tmp.innerHTML = html;
        return tmp.textContent || tmp.innerText || "";
    };

    return (
        <Card>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Histórico de Envios</CardTitle>
                <Button variant="ghost" size="sm" onClick={() => setLoading(true)}>
                    <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
                </Button>
            </CardHeader>
            <CardContent>
                <div className="space-y-4 max-h-[600px] overflow-y-auto pr-2">
                    {messages.length === 0 && !loading && (
                        <div className="text-center py-10 text-muted-foreground">
                            Nenhuma mensagem enviada.
                        </div>
                    )}

                    {messages.map((msg) => {
                        const title = msg.content?.title || msg.title || 'Sem título';
                        const body = msg.plainText || stripHtml(msg.content?.body || msg.body || '');

                        return (
                            <div key={msg.id} className="flex flex-col space-y-3 p-4 border rounded-lg hover:bg-gray-50/50 transition-all">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <h4 className="font-semibold text-sm flex items-center gap-2">
                                            {title}
                                            <Badge variant={
                                                msg.status === 'completed' || msg.status === 'sent' ? 'secondary' : // green-ish usually but sticking to standard
                                                    msg.status === 'failed' ? 'destructive' : 'outline'
                                            } className="h-5 text-[10px] px-1.5 uppercase">
                                                {msg.status === 'completed' || msg.status === 'sent' ? 'Enviado' :
                                                    msg.status === 'failed' ? 'Falha' : 'Fila'}
                                            </Badge>
                                        </h4>
                                        <p className="text-xs text-muted-foreground line-clamp-2 max-w-lg">{body}</p>
                                    </div>
                                    <div className="text-right">
                                        <span className="text-[10px] text-gray-400 block mb-1">
                                            {formatDate(msg.createdAt)}
                                        </span>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2 border-t border-dashed">
                                    <div className="flex gap-2">
                                        {msg.channels?.map(channel => (
                                            <Badge key={channel} variant="outline" className="text-[10px] gap-1 px-1.5 py-0.5 font-normal text-gray-600">
                                                {getChannelIcon(channel)}
                                                {channel.toUpperCase()}
                                            </Badge>
                                        ))}
                                    </div>

                                    <div className="flex items-center gap-3 text-xs text-gray-500">
                                        {msg.stats && (
                                            <>
                                                <span className="flex items-center gap-1" title="Mensagens enviadas p/ FCM">
                                                    <Smartphone className="w-3 h-3" /> {msg.stats.sent}/{msg.stats.totalTarget || 0}
                                                </span>
                                                <span className="flex items-center gap-1 text-emerald-600 bg-emerald-50 px-1.5 rounded" title="Visualizações (Aberturas)">
                                                    <Eye className="w-3 h-3" /> {msg.stats.viewed || 0}
                                                </span>
                                                <span className="flex items-center gap-1 text-blue-600 bg-blue-50 px-1.5 rounded" title="Anotações / Cliques">
                                                    <ExternalLink className="w-3 h-3" /> {msg.stats.clicked || 0}
                                                </span>
                                                {msg.poll && (
                                                    <span className="flex items-center gap-1 text-indigo-600 bg-indigo-50 px-1.5 rounded" title="Votos na Pesquisa">
                                                        <ClipboardList className="w-3 h-3" /> {msg.poll.totalVotes || 0}
                                                    </span>
                                                )}
                                            </>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            </CardContent>
        </Card>
    );
};

export default MessageHistory;
