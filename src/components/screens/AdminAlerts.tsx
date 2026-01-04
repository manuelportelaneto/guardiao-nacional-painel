import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { db } from '../../firebaseConfig';
import { collection, addDoc, query, orderBy, limit, onSnapshot, Timestamp } from 'firebase/firestore';
import {
    ArrowLeft,
    Send,
    Users,
    Clock,
    CheckCircle,
    Target
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Label } from '../ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select"
import { Badge } from '../ui/badge';
import { toast } from 'sonner';
import { StandardLocationFilter } from '../common/StandardLocationFilter';
import type { LocationFilterState } from '../common/StandardLocationFilter';

interface AlertMessage {
    id?: string;
    title: string;
    body: string;
    imageUrl?: string;
    targetFilter: TargetFilter;
    createdAt: Timestamp;
    stats: {
        sent: number;
        viewed: number;
        clicked: number;
    };
    status: 'sent' | 'draft';
}

interface TargetFilter {
    isAll: boolean;
    useLastLocation: boolean;
    location: LocationFilterState;
    ageRange: string;
}

const AdminAlerts: React.FC = () => {
    const navigate = useNavigate();
    const [alerts, setAlerts] = useState<AlertMessage[]>([]);
    const [loading, setLoading] = useState(false);

    // Form State
    const [title, setTitle] = useState('');
    const [body, setBody] = useState('');
    const [imageUrl, setImageUrl] = useState('');

    // Target State
    const [isTargetAll, setIsTargetAll] = useState(true);
    const [useLastLocation, setUseLastLocation] = useState(false);
    const [locationFilter, setLocationFilter] = useState<LocationFilterState>({});
    const [ageRange, setAgeRange] = useState('');

    useEffect(() => {
        // Load Alerts History
        const q = query(collection(db, 'alerts'), orderBy('createdAt', 'desc'), limit(20));
        const unsubscribe = onSnapshot(q, (snapshot) => {
            const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as AlertMessage));
            setAlerts(data);
        });
        return () => unsubscribe();
    }, []);

    const handleSendAlert = async () => {
        if (!title || !body) {
            toast.error("Preencha título e mensagem.");
            return;
        }

        setLoading(true);
        try {
            const filter: TargetFilter = {
                isAll: isTargetAll,
                useLastLocation,
                location: locationFilter,
                ageRange
            };

            // Calculate potential reach (Mock)
            // In a real scenario, we would query filtering by these fields
            const mockReach = isTargetAll ? 15420 : Math.floor(Math.random() * 500) + 20;

            const newAlert: Omit<AlertMessage, 'id'> = {
                title,
                body,
                imageUrl,
                targetFilter: filter,
                createdAt: Timestamp.now(),
                status: 'sent',
                stats: {
                    sent: mockReach,
                    viewed: 0,
                    clicked: 0
                }
            };

            await addDoc(collection(db, 'alerts'), newAlert);

            toast.success(`Alerta enviado para ${mockReach} usuários!`);

            // Reset Form
            setTitle('');
            setBody('');
            setImageUrl('');
            setIsTargetAll(true);
            setLocationFilter({});
            setAgeRange('');
            setUseLastLocation(false);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao enviar alerta.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen pb-20">
            <div className="flex items-center gap-4 mb-6">
                <Button variant="ghost" size="icon" onClick={() => navigate('/admin')}>
                    <ArrowLeft className="h-5 w-5" />
                </Button>
                <div>
                    <h1 className="text-2xl font-bold">Alertas e Engajamento</h1>
                    <p className="text-gray-500">Envie mensagens direcionadas para os cidadãos.</p>
                </div>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
                {/* Creator Card */}
                <Card className="h-fit">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2">
                            <Send className="h-5 w-5 text-blue-600" /> Novo Alerta
                        </CardTitle>
                        <CardDescription>Crie uma mensagem para notificar os usuários.</CardDescription>
                    </CardHeader>
                    <CardContent className="space-y-4">
                        <div className="space-y-2">
                            <Label>Título</Label>
                            <Input
                                placeholder="Ex: Mutirão de Limpeza"
                                value={title}
                                onChange={e => setTitle(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>Mensagem</Label>
                            <Textarea
                                placeholder="Digite o conteúdo do alerta..."
                                className="h-32"
                                value={body}
                                onChange={e => setBody(e.target.value)}
                            />
                        </div>
                        <div className="space-y-2">
                            <Label>URL da Imagem (Opcional)</Label>
                            <Input
                                placeholder="https://..."
                                value={imageUrl}
                                onChange={e => setImageUrl(e.target.value)}
                            />
                        </div>

                        <div className="space-y-4 border p-4 rounded-lg bg-slate-50">
                            <div className="flex items-center justify-between pointer-events-none opacity-50">
                                <Label className="flex items-center gap-2 font-semibold">
                                    <Target className="h-4 w-4" /> Segmentação de Público
                                </Label>
                            </div>

                            <div className="space-y-4">
                                <div className="flex items-center space-x-2">
                                    <Badge
                                        variant={isTargetAll ? "default" : "outline"}
                                        className="cursor-pointer"
                                        onClick={() => setIsTargetAll(true)}
                                    >
                                        Para Todos (Padrão)
                                    </Badge>
                                    {!isTargetAll && (
                                        <Badge variant="secondary" className="cursor-pointer text-xs" onClick={() => setIsTargetAll(true)}>
                                            Limpar Filtros
                                        </Badge>
                                    )}
                                </div>

                                <div className={`space-y-4 ${isTargetAll ? 'opacity-50' : ''}`}>
                                    <p className="text-xs text-gray-500 font-medium uppercase">Localização (Residência ou Última Postagem)</p>

                                    <div className="flex items-center space-x-2 pb-2">
                                        <input
                                            type="checkbox"
                                            id="useLastLocation"
                                            className="rounded border-gray-300"
                                            checked={useLastLocation}
                                            onChange={(e) => {
                                                setUseLastLocation(e.target.checked);
                                                setIsTargetAll(false);
                                            }}
                                        />
                                        <Label htmlFor="useLastLocation" className="text-sm font-normal cursor-pointer">
                                            Usar localização da última postagem
                                        </Label>
                                    </div>

                                    <StandardLocationFilter
                                        value={locationFilter}
                                        onChange={(val) => {
                                            setLocationFilter(val);
                                            setIsTargetAll(false);
                                        }}
                                    />

                                    <div className="pt-4 border-t">
                                        <p className="text-xs text-gray-500 font-medium uppercase mb-2">Demografia</p>
                                        <div className="grid grid-cols-2 gap-4">
                                            <div className="space-y-2">
                                                <Label className="text-xs">Faixa Etária</Label>
                                                <Select
                                                    value={ageRange}
                                                    onValueChange={(v) => {
                                                        setAgeRange(v);
                                                        setIsTargetAll(false);
                                                    }}
                                                >
                                                    <SelectTrigger><SelectValue placeholder="Qualquer idade" /></SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="all">Qualquer idade</SelectItem>
                                                        <SelectItem value="18-24">18-24 anos</SelectItem>
                                                        <SelectItem value="25-34">25-34 anos</SelectItem>
                                                        <SelectItem value="35-44">35-44 anos</SelectItem>
                                                        <SelectItem value="45-54">45-54 anos</SelectItem>
                                                        <SelectItem value="55-64">55-64 anos</SelectItem>
                                                        <SelectItem value="65+">65+ anos</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>

                        <Button className="w-full bg-blue-600 hover:bg-blue-700" onClick={handleSendAlert} disabled={loading}>
                            {loading ? 'Enviando...' : 'Enviar Alerta'}
                        </Button>
                    </CardContent>
                </Card>

                {/* History List */}
                <div className="space-y-4">
                    <h3 className="font-semibold text-lg flex items-center gap-2">
                        <Clock className="h-5 w-5 text-gray-500" /> Histórico de Envios
                    </h3>

                    <div className="space-y-4">
                        {alerts.length === 0 && <p className="text-gray-500 text-sm">Nenhum alerta enviado ainda.</p>}

                        {alerts.map(alert => (
                            <Card key={alert.id} className="relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-3 bg-gray-50 rounded-bl-lg border-b border-l">
                                    <div className="text-xs text-gray-500 font-medium">
                                        {alert.createdAt?.toDate ? alert.createdAt.toDate().toLocaleDateString() : 'Hoje'}
                                    </div>
                                </div>
                                <CardContent className="pt-6">
                                    <div className="flex gap-4">
                                        {alert.imageUrl && (
                                            <img src={alert.imageUrl} className="w-16 h-16 object-cover rounded bg-gray-100" />
                                        )}
                                        <div className="flex-1">
                                            <h4 className="font-bold text-gray-900">{alert.title}</h4>
                                            <p className="text-sm text-gray-600 mt-1 line-clamp-2">{alert.body}</p>

                                            <div className="flex flex-wrap gap-2 mt-3">
                                                <Badge variant="secondary" className="text-[10px]">
                                                    <Target className="w-3 h-3 mr-1" />
                                                    {alert.targetFilter.isAll ? 'Todos' : (
                                                        <>
                                                            Filtro:
                                                            {alert.targetFilter.location.state && ` ${alert.targetFilter.location.state}`}
                                                            {alert.targetFilter.location.city && `, ${alert.targetFilter.location.city}`}
                                                            {alert.targetFilter.ageRange && `, ${alert.targetFilter.ageRange} anos`}
                                                        </>
                                                    )}
                                                </Badge>

                                                <Badge variant="outline" className="text-[10px] bg-green-50 text-green-700 border-green-200">
                                                    <Users className="w-3 h-3 mr-1" />
                                                    {alert.stats.sent} Enviados
                                                </Badge>

                                                <Badge variant="outline" className="text-[10px] bg-blue-50 text-blue-700 border-blue-200">
                                                    <CheckCircle className="w-3 h-3 mr-1" />
                                                    {alert.stats.viewed} Lidos
                                                </Badge>
                                            </div>
                                        </div>
                                    </div>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AdminAlerts;
