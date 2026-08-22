/**
 * @fileoverview Tela de Ativação de Acesso para Servidores Públicos (`ActivateOfficialScreen.tsx`).
 * 
 * Permite ao servidor ou gestor municipal ativar seu convite oficial através do link criptografado,
 * definir sua senha de acesso, preencher dados funcionais e acessar imediatamente o painel da sua jurisdição.
 */

import React, { useState, useEffect } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import {
    createUserWithEmailAndPassword,
    signInWithEmailAndPassword,
    updateProfile
} from 'firebase/auth';
import { auth } from '../../firebaseConfig';
import { governmentService } from '../../services/governmentService';
import type { GovernmentInvite } from '../../types/government';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '../ui/card';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Badge } from '../ui/badge';
import { Checkbox } from '../ui/checkbox';
import { toast } from 'sonner';
import {
    Shield,
    Building2,
    CheckCircle2,
    AlertCircle,
    UserCheck,
    MapPin,
    Loader2
} from 'lucide-react';

export const ActivateOfficialScreen: React.FC = () => {
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();

    const tokenFromUrl = searchParams.get('token') || '';

    const [token, setToken] = useState(tokenFromUrl);
    const [invite, setInvite] = useState<GovernmentInvite | null>(null);
    const [verifying, setVerifying] = useState(false);
    const [errorMsg, setErrorMsg] = useState<string | null>(null);

    // Form de ativação
    const [fullName, setFullName] = useState('');
    const [registrationNumber, setRegistrationNumber] = useState('');
    const [phone, setPhone] = useState('');
    const [password, setPassword] = useState('');
    const [confirmPassword, setConfirmPassword] = useState('');
    const [termsAccepted, setTermsAccepted] = useState(false);
    const [activating, setActivating] = useState(false);
    const [success, setSuccess] = useState(false);

    // Validação automática ao carregar
    useEffect(() => {
        if (tokenFromUrl) {
            handleVerifyToken(tokenFromUrl);
        }
    }, [tokenFromUrl]);

    const handleVerifyToken = async (tokenToVerify: string) => {
        if (!tokenToVerify.trim()) return;
        setVerifying(true);
        setErrorMsg(null);
        try {
            const data = await governmentService.getInviteByToken(tokenToVerify.trim());
            if (!data) {
                setErrorMsg('Convite não encontrado ou token inválido.');
                setInvite(null);
            } else if (data.used) {
                setErrorMsg('Este convite já foi utilizado para ativar uma conta.');
                setInvite(null);
            } else if (new Date(data.expiresAt).getTime() < Date.now()) {
                setErrorMsg('Este convite expirou. Solicite um novo envio ao seu gestor municipal.');
                setInvite(null);
            } else {
                setInvite(data);
                setFullName(data.name || '');
                setRegistrationNumber(data.registrationNumber || '');
            }
        } catch (e: any) {
            setErrorMsg('Erro ao verificar convite: ' + (e.message || 'Tente novamente.'));
            setInvite(null);
        } finally {
            setVerifying(false);
        }
    };

    const handleActivate = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!invite) return;

        if (password.length < 6) {
            toast.error('A senha deve ter no mínimo 6 caracteres.');
            return;
        }

        if (password !== confirmPassword) {
            toast.error('As senhas não coincidem.');
            return;
        }

        if (!termsAccepted) {
            toast.error('Você deve declarar ciência sobre os termos de sigilo e LGPD.');
            return;
        }

        setActivating(true);
        try {
            let authUid = '';

            // Tenta criar usuário no Firebase Auth
            try {
                const userCred = await createUserWithEmailAndPassword(auth, invite.email, password);
                authUid = userCred.user.uid;
                await updateProfile(userCred.user, { displayName: fullName });
            } catch (authErr: any) {
                // Caso o usuário já exista no Auth, tenta fazer login com a senha informada
                if (authErr.code === 'auth/email-already-in-use') {
                    try {
                        const userCred = await signInWithEmailAndPassword(auth, invite.email, password);
                        authUid = userCred.user.uid;
                    } catch (loginErr) {
                        toast.error('E-mail já cadastrado no Firebase Auth. Se você já tem conta, informe sua senha atual para vincular o acesso funcional.');
                        setActivating(false);
                        return;
                    }
                } else {
                    throw authErr;
                }
            }

            // Ativa o registro do servidor em government_officials e marca o convite como usado
            await governmentService.activateOfficialAccount(invite.id, authUid, {
                name: fullName,
                phone,
                registrationNumber
            });

            setSuccess(true);
            toast.success(`Conta ativada com sucesso! Bem-vindo à gestão de ${invite.cityName}.`);

            // Redireciona após 2 segundos
            setTimeout(() => {
                navigate(`/city/${invite.cityId}/dashboard`);
            }, 2000);
        } catch (e: any) {
            toast.error('Erro na ativação da conta: ' + (e.message || 'Tente novamente.'));
        } finally {
            setActivating(false);
        }
    };

    return (
        <div className="min-h-screen bg-slate-900 text-slate-100 flex flex-col items-center justify-center p-4">
            <div className="w-full max-w-xl space-y-6">

                {/* Header */}
                <div className="text-center space-y-2">
                    <div className="inline-flex items-center justify-center p-3 bg-blue-600/20 text-blue-400 rounded-2xl border border-blue-500/30 mb-2 shadow-lg shadow-blue-500/10">
                        <Building2 className="w-8 h-8 text-blue-400" />
                    </div>
                    <h1 className="text-2xl md:text-3xl font-black tracking-tight text-white font-outfit">
                        Guardião Nacional <span className="text-blue-400">· Acesso Governamental</span>
                    </h1>
                    <p className="text-xs text-slate-400">
                        Portal Institucional de Ativação de Servidores Públicos e Gestores Municipais
                    </p>
                </div>

                {/* Card de Ativação */}
                <Card className="bg-slate-800/90 border-slate-700 shadow-2xl backdrop-blur-md rounded-2xl overflow-hidden">
                    <CardHeader className="border-b border-slate-700/60 pb-4">
                        <div className="flex items-center justify-between">
                            <CardTitle className="text-base font-bold text-white flex items-center gap-2">
                                <Shield className="w-5 h-5 text-blue-400" />
                                Ativação de Credencial Institucional
                            </CardTitle>
                            <Badge className="bg-blue-500/20 text-blue-300 border border-blue-500/30 text-[10px]">
                                LGPD Compliance
                            </Badge>
                        </div>
                        <CardDescription className="text-xs text-slate-400">
                            Preencha seus dados funcionais e defina sua senha para habilitar o acesso ao painel.
                        </CardDescription>
                    </CardHeader>

                    <CardContent className="p-6 space-y-5">
                        {/* Se não houver convite carregado ou erro */}
                        {!invite && (
                            <div className="space-y-4">
                                {errorMsg ? (
                                    <div className="p-4 bg-red-500/10 border border-red-500/30 rounded-xl text-red-300 text-xs space-y-2">
                                        <div className="flex items-center gap-2 font-bold">
                                            <AlertCircle className="w-4 h-4 text-red-400" />
                                            Convite Inválido ou Expirado
                                        </div>
                                        <p>{errorMsg}</p>
                                    </div>
                                ) : (
                                    <div className="p-4 bg-slate-700/40 border border-slate-700 rounded-xl text-xs text-slate-300 space-y-1">
                                        <p className="font-semibold text-white">Insira o código do seu convite:</p>
                                        <p className="text-slate-400">Cole o token de convite enviado para o seu e-mail institucional.</p>
                                    </div>
                                )}

                                <div className="space-y-2">
                                    <Label className="text-xs text-slate-300">Token do Convite</Label>
                                    <div className="flex gap-2">
                                        <Input
                                            placeholder="Ex: inv_abc123xyz"
                                            value={token}
                                            onChange={e => setToken(e.target.value)}
                                            className="bg-slate-900/60 border-slate-700 text-white text-xs"
                                        />
                                        <Button
                                            onClick={() => handleVerifyToken(token)}
                                            disabled={verifying || !token.trim()}
                                            className="bg-blue-600 hover:bg-blue-700 text-xs gap-1 font-bold"
                                        >
                                            {verifying ? <Loader2 className="w-4 h-4 animate-spin" /> : 'Verificar'}
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        )}

                        {/* Convite Válido e Form de Ativação */}
                        {invite && !success && (
                            <form onSubmit={handleActivate} className="space-y-4">
                                {/* Detalhes da Nomeação */}
                                <div className="p-4 bg-gradient-to-r from-blue-950/40 to-slate-900/60 border border-blue-800/40 rounded-xl space-y-2">
                                    <div className="flex items-center justify-between">
                                        <div className="flex items-center gap-2">
                                            <MapPin className="w-4 h-4 text-blue-400" />
                                            <span className="font-bold text-sm text-white">{invite.cityName} - {invite.state}</span>
                                        </div>
                                        <Badge className="bg-blue-600 text-white text-[10px] font-bold">
                                            {invite.role.toUpperCase()}
                                        </Badge>
                                    </div>
                                    <div className="grid grid-cols-2 gap-2 text-xs pt-1 text-slate-300">
                                        <div>
                                            <span className="text-slate-500 block text-[10px]">Cargo Nomeado:</span>
                                            <span className="font-semibold text-white">{invite.officialTitle}</span>
                                        </div>
                                        <div>
                                            <span className="text-slate-500 block text-[10px]">Secretaria Vinculada:</span>
                                            <span className="font-semibold text-white">{invite.departmentName || 'Gabinete do Executivo'}</span>
                                        </div>
                                        <div className="col-span-2">
                                            <span className="text-slate-500 block text-[10px]">E-mail Institucional:</span>
                                            <span className="font-mono text-blue-300">{invite.email}</span>
                                        </div>
                                    </div>
                                </div>

                                {/* Campos de Cadastro */}
                                <div className="space-y-3">
                                    <div>
                                        <Label className="text-xs text-slate-300">Nome Completo</Label>
                                        <Input
                                            required
                                            value={fullName}
                                            onChange={e => setFullName(e.target.value)}
                                            placeholder="Nome do servidor"
                                            className="bg-slate-900/60 border-slate-700 text-white text-xs mt-1"
                                        />
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs text-slate-300">Matrícula Funcional</Label>
                                            <Input
                                                value={registrationNumber}
                                                onChange={e => setRegistrationNumber(e.target.value)}
                                                placeholder="Ex: 884920-1"
                                                className="bg-slate-900/60 border-slate-700 text-white text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-slate-300">Telefone / WhatsApp</Label>
                                            <Input
                                                value={phone}
                                                onChange={e => setPhone(e.target.value)}
                                                placeholder="(11) 99999-9999"
                                                className="bg-slate-900/60 border-slate-700 text-white text-xs mt-1"
                                            />
                                        </div>
                                    </div>

                                    <div className="grid grid-cols-2 gap-3">
                                        <div>
                                            <Label className="text-xs text-slate-300">Criar Nova Senha</Label>
                                            <Input
                                                type="password"
                                                required
                                                placeholder="Mínimo 6 dígitos"
                                                value={password}
                                                onChange={e => setPassword(e.target.value)}
                                                className="bg-slate-900/60 border-slate-700 text-white text-xs mt-1"
                                            />
                                        </div>
                                        <div>
                                            <Label className="text-xs text-slate-300">Confirmar Senha</Label>
                                            <Input
                                                type="password"
                                                required
                                                placeholder="Repita a senha"
                                                value={confirmPassword}
                                                onChange={e => setConfirmPassword(e.target.value)}
                                                className="bg-slate-900/60 border-slate-700 text-white text-xs mt-1"
                                            />
                                        </div>
                                    </div>
                                </div>

                                {/* Declaração de Sigilo Funcional & LGPD */}
                                <div className="flex items-start space-x-2 pt-2">
                                    <Checkbox
                                        id="terms"
                                        checked={termsAccepted}
                                        onCheckedChange={c => setTermsAccepted(!!c)}
                                        className="mt-0.5 border-slate-500 data-[state=checked]:bg-blue-600"
                                    />
                                    <label htmlFor="terms" className="text-[11px] text-slate-400 leading-tight cursor-pointer">
                                        Declaro ciência de que este acesso é de uso institucional restrito, sob responsabilidade funcional, em conformidade com a <strong className="text-slate-200">LGPD (Lei 13.709/2018)</strong> e o sigilo de dados municipais.
                                    </label>
                                </div>

                                <Button
                                    type="submit"
                                    disabled={activating || !termsAccepted}
                                    className="w-full bg-blue-600 hover:bg-blue-700 text-white font-bold text-xs py-5 rounded-xl gap-2 shadow-lg shadow-blue-600/20"
                                >
                                    {activating ? (
                                        <>
                                            <Loader2 className="w-4 h-4 animate-spin" />
                                            Ativando Credencial Governamental...
                                        </>
                                    ) : (
                                        <>
                                            <UserCheck className="w-4 h-4" />
                                            Ativar Conta e Acessar Painel
                                        </>
                                    )}
                                </Button>
                            </form>
                        )}

                        {/* Sucesso */}
                        {success && invite && (
                            <div className="p-6 text-center space-y-3 bg-emerald-950/30 border border-emerald-500/30 rounded-xl">
                                <CheckCircle2 className="w-12 h-12 text-emerald-400 mx-auto animate-bounce" />
                                <h3 className="text-base font-bold text-white">Credencial Governamental Ativada!</h3>
                                <p className="text-xs text-slate-300">
                                    Sua conta de <strong>{invite.officialTitle}</strong> foi validada com sucesso. Redirecionando para o painel de <strong>{invite.cityName}</strong>...
                                </p>
                            </div>
                        )}
                    </CardContent>

                    <CardFooter className="bg-slate-900/40 border-t border-slate-700/60 p-4 flex items-center justify-between text-xs text-slate-400">
                        <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => navigate('/')}
                            className="text-xs text-slate-400 hover:text-white"
                        >
                            Voltar para o Login
                        </Button>
                        <span className="text-[10px] text-slate-500">
                            Guardião Nacional © 2026
                        </span>
                    </CardFooter>
                </Card>
            </div>
        </div>
    );
};

export default ActivateOfficialScreen;
