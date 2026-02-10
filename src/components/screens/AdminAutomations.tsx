
import React, { useState, useEffect } from 'react';
import {
    Plus,
    Trash2,
    Save,
    Zap
} from 'lucide-react';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../ui/card';
import { Badge } from '../ui/badge';
import { Switch } from '../ui/switch';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from "../ui/select";
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogFooter,
    DialogHeader,
    DialogTitle,
    DialogTrigger,
} from "../ui/dialog";
import { toast } from 'sonner';

import { automationService } from '../../services/automationService';
import type {
    AutomationRule,
    Condition,
    AutomationAction,
    TriggerType
} from '../../types/automation';

const AdminAutomations: React.FC = () => {
    const [rules, setRules] = useState<AutomationRule[]>([]);
    const [loading, setLoading] = useState(true);
    const [isCreateOpen, setIsCreateOpen] = useState(false);

    // Form Stats
    const [newName, setNewName] = useState('');
    const [newTrigger, setNewTrigger] = useState<TriggerType>('contribution_created');
    const [conditions, setConditions] = useState<Condition[]>([]);
    const [actions, setActions] = useState<AutomationAction[]>([]);

    useEffect(() => {
        loadRules();
    }, []);

    const loadRules = async () => {
        try {
            setLoading(true);
            const data = await automationService.getRules();
            setRules(data);
        } catch (error) {
            console.error(error);
            toast.error("Erro ao carregar regras.");
        } finally {
            setLoading(false);
        }
    };

    const handleCreateRule = async () => {
        if (!newName) return toast.error("Nome é obrigatório");
        if (actions.length === 0) return toast.error("Adicione pelo menos uma ação");

        try {
            await automationService.createRule({
                name: newName,
                active: true,
                trigger: newTrigger,
                conditions,
                actions
            });
            toast.success("Regra criada com sucesso!");
            setIsCreateOpen(false);
            resetForm();
            loadRules(); // Refresh
        } catch (error) {
            console.error(error);
            toast.error("Erro ao criar regra.");
        }
    };

    const resetForm = () => {
        setNewName('');
        setNewTrigger('contribution_created');
        setConditions([]);
        setActions([]);
    };

    const toggleRule = async (id: string, currentStatus: boolean) => {
        try {
            await automationService.toggleRule(id, !currentStatus);
            // Optimistic update
            setRules(rules.map(r => r.id === id ? { ...r, active: !currentStatus } : r));
            toast.success(currentStatus ? "Regra pausada." : "Regra ativada.");
        } catch (error) {
            toast.error("Erro ao atualizar status.");
        }
    };

    const handleDelete = async (id: string) => {
        if (!confirm("Tem certeza?")) return;
        try {
            await automationService.deleteRule(id);
            setRules(rules.filter(r => r.id !== id));
            toast.success("Regra removida.");
        } catch (error) {
            toast.error("Erro ao remover.");
        }
    };

    // --- Condition Helper ---
    const addCondition = () => {
        setConditions([...conditions, { field: 'riskLevel', operator: 'greater_than', value: '3' }]);
    };
    const updateCondition = (index: number, field: keyof Condition, val: any) => {
        const newConds = [...conditions];
        newConds[index] = { ...newConds[index], [field]: val };
        setConditions(newConds);
    };
    const removeCondition = (index: number) => {
        setConditions(conditions.filter((_, i) => i !== index));
    };

    // --- Action Helper ---
    const addAction = () => {
        setActions([...actions, { type: 'log_event', config: { message: 'Automation Triggered' } }]);
    };
    const updateAction = (index: number, field: any, val: any) => {
        const newActions = [...actions];
        if (field === 'type') {
            newActions[index].type = val;
            // Reset config on type change
            newActions[index].config = val === 'call_webhook' ? { targetUrl: '' } : { message: 'Log' };
        } else {
            newActions[index].config = { ...newActions[index].config, [field]: val };
        }
        setActions(newActions);
    };
    const removeAction = (index: number) => {
        setActions(actions.filter((_, i) => i !== index));
    };


    return (
        <div className="p-6 space-y-6 bg-gray-50 min-h-screen pt-16 md:pt-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold flex items-center gap-2">
                        <Zap className="h-6 w-6 text-yellow-500" /> Automação
                    </h1>
                    <p className="text-sm text-gray-500">Motor de Regras e Integrações</p>
                </div>
                <Dialog open={isCreateOpen} onOpenChange={setIsCreateOpen}>
                    <DialogTrigger asChild>
                        <Button><Plus className="w-4 h-4 mr-2" /> Nova Regra</Button>
                    </DialogTrigger>
                    <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
                        <DialogHeader>
                            <DialogTitle>Criar Nova Automação</DialogTitle>
                            <DialogDescription>Configure gatilhos, condições e ações.</DialogDescription>
                        </DialogHeader>

                        <div className="space-y-6 py-4">
                            {/* 1. Basic Info */}
                            <div className="space-y-2">
                                <Label>Nome da Regra</Label>
                                <Input
                                    placeholder="Ex: Alerta de Alto Risco"
                                    value={newName}
                                    onChange={e => setNewName(e.target.value)}
                                />
                            </div>

                            {/* 2. Trigger */}
                            <div className="space-y-2">
                                <Label>Gatilho (Trigger)</Label>
                                <Select value={newTrigger} onValueChange={(v: any) => setNewTrigger(v)}>
                                    <SelectTrigger><SelectValue /></SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="contribution_created">Nova Contribuição Criada</SelectItem>
                                        <SelectItem value="status_updated">Status Atualizado</SelectItem>
                                        <SelectItem value="risk_level_change">Mudança de Risco</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            {/* 3. Conditions */}
                            <div className="space-y-2 border p-4 rounded bg-slate-50">
                                <div className="flex justify-between items-center mb-2">
                                    <Label>Condições (SE)</Label>
                                    <Button variant="outline" size="sm" onClick={addCondition}>Adicionar +</Button>
                                </div>
                                {conditions.length === 0 && <p className="text-xs text-gray-500 italic">Nenhuma condição (Executar sempre)</p>}
                                {conditions.map((cond, idx) => (
                                    <div key={idx} className="flex gap-2 items-center mb-2">
                                        <div className="w-1/3">
                                            <Select value={cond.field} onValueChange={v => updateCondition(idx, 'field', v)}>
                                                <SelectTrigger><SelectValue placeholder="Campo" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="riskLevel">Risco (Nível)</SelectItem>
                                                    <SelectItem value="category">Categoria</SelectItem>
                                                    <SelectItem value="status">Status</SelectItem>
                                                    <SelectItem value="city">Cidade</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <div className="w-1/3">
                                            <Select value={cond.operator} onValueChange={v => updateCondition(idx, 'operator', v)}>
                                                <SelectTrigger><SelectValue placeholder="Op" /></SelectTrigger>
                                                <SelectContent>
                                                    <SelectItem value="equals">Igual a</SelectItem>
                                                    <SelectItem value="not_equals">Diferente de</SelectItem>
                                                    <SelectItem value="greater_than">Maior que</SelectItem>
                                                    <SelectItem value="less_than">Menor que</SelectItem>
                                                    <SelectItem value="contains">Contém</SelectItem>
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Input
                                            className="flex-1"
                                            placeholder="Valor"
                                            value={cond.value}
                                            onChange={e => updateCondition(idx, 'value', e.target.value)}
                                        />
                                        <Button variant="ghost" size="icon" onClick={() => removeCondition(idx)}><Trash2 className="w-4 h-4 text-red-500" /></Button>
                                    </div>
                                ))}
                            </div>

                            {/* 4. Actions */}
                            <div className="space-y-2 border p-4 rounded bg-slate-50">
                                <div className="flex justify-between items-center mb-2">
                                    <Label>Ações (ENTÃO)</Label>
                                    <Button variant="outline" size="sm" onClick={addAction}>Adicionar +</Button>
                                </div>
                                {actions.map((action, idx) => (
                                    <div key={idx} className="space-y-2 mb-4 p-3 border bg-white rounded">
                                        <div className="flex justify-between">
                                            <Label className="text-xs text-gray-500">Ação #{idx + 1}</Label>
                                            <Button variant="ghost" size="icon" className="h-6 w-6" onClick={() => removeAction(idx)}><Trash2 className="w-3 h-3 text-red-500" /></Button>
                                        </div>
                                        <Select value={action.type} onValueChange={v => updateAction(idx, 'type', v)}>
                                            <SelectTrigger><SelectValue placeholder="Tipo de Ação" /></SelectTrigger>
                                            <SelectContent>
                                                <SelectItem value="log_event">Logar Evento (Console/DB)</SelectItem>
                                                <SelectItem value="call_webhook">Chamar Webhook</SelectItem>
                                                <SelectItem value="send_email">Enviar Email (Mock)</SelectItem>
                                            </SelectContent>
                                        </Select>

                                        {/* Dynamic Config */}
                                        {action.type === 'call_webhook' && (
                                            <Input
                                                placeholder="URL do Webhook (https://...)"
                                                value={action.config.targetUrl || ''}
                                                onChange={e => updateAction(idx, 'targetUrl', e.target.value)}
                                            />
                                        )}
                                        {(action.type === 'log_event' || action.type === 'create_notification') && (
                                            <Input
                                                placeholder="Mensagem"
                                                value={action.config.message || ''}
                                                onChange={e => updateAction(idx, 'message', e.target.value)}
                                            />
                                        )}
                                        {action.type === 'send_email' && (
                                            <Input
                                                placeholder="Email Destinatário"
                                                value={action.config.recipient || ''}
                                                onChange={e => updateAction(idx, 'recipient', e.target.value)}
                                            />
                                        )}
                                    </div>
                                ))}
                            </div>

                        </div>

                        <DialogFooter>
                            <Button variant="secondary" onClick={() => setIsCreateOpen(false)}>Cancelar</Button>
                            <Button onClick={handleCreateRule}><Save className="w-4 h-4 mr-2" /> Salvar Regra</Button>
                        </DialogFooter>
                    </DialogContent>
                </Dialog>
            </div>

            {/* Rules Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {rules.map(rule => (
                    <Card key={rule.id} className={rule.active ? 'border-l-4 border-l-green-500' : 'border-l-4 border-l-gray-300 opacity-75'}>
                        <CardHeader className="pb-2">
                            <div className="flex justify-between items-start">
                                <div>
                                    <div className="flex items-center gap-2">
                                        <CardTitle className="text-lg">{rule.name}</CardTitle>
                                        {rule.active ? <Badge className="bg-green-100 text-green-800 hover:bg-green-100">Ativo</Badge> : <Badge variant="secondary">Pausado</Badge>}
                                    </div>
                                    <CardDescription className="text-xs mt-1">Trigger: {rule.trigger}</CardDescription>
                                </div>
                                <Switch checked={rule.active} onCheckedChange={() => toggleRule(rule.id, rule.active)} />
                            </div>
                        </CardHeader>
                        <CardContent>
                            <div className="space-y-2 text-sm">
                                <div className="p-2 bg-slate-50 rounded">
                                    <p className="font-semibold text-xs text-gray-500 uppercase">Condições:</p>
                                    {rule.conditions.length === 0 ? <p className="text-gray-400 italic">Sempre</p> : (
                                        <ul className="list-disc list-inside">
                                            {rule.conditions.map((c, i) => (
                                                <li key={i}>{c.field} {c.operator === 'greater_than' ? '>' : c.operator === 'equals' ? '=' : c.operator} {c.value}</li>
                                            ))}
                                        </ul>
                                    )}
                                </div>
                                <div className="p-2 bg-slate-50 rounded">
                                    <p className="font-semibold text-xs text-gray-500 uppercase">Ações:</p>
                                    <ul className="list-disc list-inside">
                                        {rule.actions.map((a, i) => (
                                            <li key={i}>{a.type === 'call_webhook' ? `Webhook: ${a.config.targetUrl?.slice(0, 20)}...` : a.type}</li>
                                        ))}
                                    </ul>
                                </div>
                                <div className="flex justify-between text-xs text-gray-400 pt-2 border-t">
                                    <span>Execuções: {rule.executionCount || 0}</span>
                                    {rule.lastExecutedAt && <span>Última: {new Date(rule.lastExecutedAt.toDate()).toLocaleDateString()}</span>}
                                </div>
                                <Button variant="ghost" size="sm" className="w-full text-red-500 hover:text-red-600 hover:bg-red-50" onClick={() => handleDelete(rule.id)}>
                                    <Trash2 className="w-4 h-4 mr-2" /> Excluir Regra
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                ))}
            </div>

            {!loading && rules.length === 0 && (
                <div className="text-center py-20 bg-white rounded-lg border border-dashed">
                    <Zap className="h-10 w-10 mx-auto text-gray-300 mb-2" />
                    <h3 className="text-lg font-medium text-gray-900">Nenhuma automação configurada</h3>
                    <p className="text-gray-500">Crie sua primeira regra para automatizar o painel.</p>
                </div>
            )}
        </div>
    );
};

export default AdminAutomations;
