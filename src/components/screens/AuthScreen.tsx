import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  signInWithEmailAndPassword,
  sendPasswordResetEmail,
  GoogleAuthProvider,
  signInWithPopup,
  signOut,
} from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Shield, Mail, Loader2 } from 'lucide-react';
import { Separator } from '../ui/separator';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '../ui/dialog';
import { useAuth } from '../../context/AuthContext';
import { loggingService } from '../../services/loggingService';

// Roles that have access to the admin panel
const AUTHORIZED_ROLES = [
  'super_admin', 'admin', 'city_admin',
  'presidente', 'governador', 'prefeito', 'servidor',
];

const AuthScreen: React.FC = () => {
  const navigate = useNavigate();
  const { currentUser } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showResetEmailSentModal, setShowResetEmailSentModal] = useState(false);
  const [showLoginErrorModal, setShowLoginErrorModal] = useState(false);
  const [showAccessDeniedModal, setShowAccessDeniedModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  // Redirect if already authenticated
  useEffect(() => {
    if (currentUser) {
      navigate('/hub');
    }
  }, [currentUser, navigate]);

  /**
   * Verifies if the logged-in user has an authorized role.
   * Signs them out immediately if they are just a citizen.
   */
  const checkAccessAndNavigate = async (uid: string) => {
    try {
      const userDocRef = doc(db, 'users', uid);
      const userDoc = await getDoc(userDocRef);

      const userEmail = (auth.currentUser?.email || '').toLowerCase().trim();
      console.log('🔍 [Auth] Verificando acesso para:', userEmail, 'UID:', uid);

      // Bypass e Auto-provisionamento de Super Admin para Manuel
      if (userEmail === 'manuelpnforce@gmail.com') {
        console.log('👑 [Auth] SysAdmin identificado:', userEmail);
        const { setDoc } = await import('firebase/firestore');
        await setDoc(userDocRef, {
          uid,
          email: auth.currentUser?.email,
          role: 'super_admin',
          displayName: auth.currentUser?.displayName || 'Manuel Force (Presidente)',
          accessLevel: 3,
          updatedAt: new Date().toISOString()
        }, { merge: true }).catch(e => console.warn('Bypass setDoc error:', e));

        toast.success('Login de Presidente efetuado!');
        navigate('/hub');
        return;
      }

      if (!userDoc.exists()) {
        await signOut(auth);
        setShowAccessDeniedModal(true);
        return;
      }

      const data = userDoc.data();
      const role = data?.role || 'citizen';

      if (!AUTHORIZED_ROLES.includes(role)) {
        await signOut(auth);
        setShowAccessDeniedModal(true);
        return;
      }

      await loggingService.logAudit(
        'LOGIN_SUCCESS',
        uid,
        uid,
        { role, agent: navigator.userAgent, method: 'auth/login' }
      ).catch(e => console.warn('Failed to log login action', e));

      toast.success('Login realizado com sucesso!');
      navigate('/hub');
    } catch (err) {
      console.error('Error checking access:', err);
      await signOut(auth);
      toast.error('Erro ao verificar permissões. Tente novamente.');
    }
  };

  const handleGoogleSignIn = async () => {
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      // signInWithPopup: displays a Google OAuth popup window.
      // Note: browser may show a COOP "window.closed" warning — this is cosmetic
      // and does not prevent auth from working. We deliberately avoid signInWithRedirect
      // because our authDomain (procuradoria-cidada-72130.firebaseapp.com) is the same
      // domain where the nacional app is hosted, causing it to appear during the redirect flow.
      const result = await signInWithPopup(auth, provider);
      await checkAccessAndNavigate(result.user.uid);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      // These codes mean the user closed the popup — not an error
      if (
        firebaseError.code === 'auth/popup-closed-by-user' ||
        firebaseError.code === 'auth/cancelled-popup-request'
      ) {
        return;
      }
      toast.error('Erro ao fazer login com Google: ' + (firebaseError.message || 'Tente novamente.'));
    } finally {
      setIsLoading(false);
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email, password);
      await checkAccessAndNavigate(credential.user.uid);
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      switch (firebaseError.code) {
        case 'auth/user-not-found':
        case 'auth/wrong-password':
        case 'auth/invalid-credential':
          setShowLoginErrorModal(true);
          break;
        case 'auth/invalid-email':
          toast.error('E-mail inválido.');
          break;
        case 'auth/user-disabled':
          toast.error('Esta conta foi desativada. Entre em contato com o suporte.');
          break;
        case 'auth/too-many-requests':
          toast.error('Muitas tentativas. Aguarde e tente novamente.');
          break;
        default:
          toast.error('Erro ao fazer login: ' + (firebaseError.message || 'Erro desconhecido'));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) { toast.error('Digite seu email.'); return; }
    try {
      await sendPasswordResetEmail(auth, resetEmail);
      setShowForgotPasswordModal(false);
      setShowResetEmailSentModal(true);
      setResetEmail('');
    } catch (err: unknown) {
      const e = err as { code?: string; message?: string };
      if (e.code === 'auth/user-not-found') toast.error('Usuário não encontrado.');
      else if (e.code === 'auth/invalid-email') toast.error('Email inválido.');
      else toast.error('Erro: ' + (e.message || 'Desconhecido'));
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex items-center justify-center p-4">
      <div className="w-full max-w-sm">

        {/* Logo Header */}
        <div className="flex flex-col items-center mb-8">
          <img src="/logo.png" alt="Guardião Nacional" className="w-20 h-20 object-contain mb-3 drop-shadow-md" />
          <h1 className="text-2xl font-bold text-slate-900">Guardião Nacional</h1>
          <p className="text-sm text-slate-500 mt-1">Painel Administrativo & Operacional</p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-2xl shadow-sm border border-slate-200 p-8">

          {/* Access notice */}
          <div className="flex items-start gap-3 bg-blue-50 border border-blue-100 rounded-lg p-3 mb-6">
            <Shield className="w-4 h-4 text-blue-600 shrink-0 mt-0.5" />
            <p className="text-xs text-blue-700 leading-relaxed">
              Acesso restrito a servidores e gestores cadastrados no Guardião Nacional.
            </p>
          </div>

          {/* Google Sign-In */}
          <Button
            id="btn-google-signin"
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full mb-5 h-11 border border-slate-300 hover:bg-slate-50 font-medium"
            type="button"
            disabled={isLoading}
          >
            <svg className="w-4 h-4 mr-2 shrink-0" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            {isLoading ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Aguarde...</> : 'Entrar com Google'}
          </Button>

          {/* Divider */}
          <div className="relative mb-5">
            <Separator />
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-white px-3 text-xs text-slate-400">
              ou acesse com e-mail
            </span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={handleLogin} className="space-y-4">
            <div className="space-y-1.5">
              <Label htmlFor="email" className="text-sm font-medium text-slate-700">E-mail</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="seu@email.com"
                required
                autoComplete="email"
                className="h-10"
              />
            </div>

            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <Label htmlFor="password" className="text-sm font-medium text-slate-700">Senha</Label>
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-xs text-primary hover:underline"
                >
                  Esqueceu sua senha?
                </button>
              </div>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                autoComplete="current-password"
                className="h-10"
              />
            </div>

            <Button
              id="btn-entrar"
              type="submit"
              className="w-full h-10 font-medium"
              disabled={isLoading}
            >
              {isLoading
                ? <><Loader2 className="w-4 h-4 mr-2 animate-spin" />Entrando...</>
                : 'Entrar'
              }
            </Button>
          </form>
        </div>

        {/* Footer link to citizen app */}
        <p className="text-center text-xs text-slate-400 mt-6">
          Cidadão?{' '}
          <a
            href="https://procuradoria-cidada-72130.web.app"
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:underline"
          >
            Acesse o Guardião Nacional
          </a>
        </p>
      </div>

      {/* ===== MODALS ===== */}

      {/* Forgot Password */}
      <Dialog open={showForgotPasswordModal} onOpenChange={setShowForgotPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Enviaremos um link de redefinição para seu e-mail.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-3 py-2">
            <Label htmlFor="resetEmail">E-mail</Label>
            <Input
              id="resetEmail"
              type="email"
              placeholder="seu@email.com"
              value={resetEmail}
              onChange={(e) => setResetEmail(e.target.value)}
            />
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => { setShowForgotPasswordModal(false); setResetEmail(''); }}>
              Cancelar
            </Button>
            <Button onClick={handleForgotPassword}>Enviar Link</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Email Sent */}
      <Dialog open={showResetEmailSentModal} onOpenChange={setShowResetEmailSentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-7 h-7 text-blue-600" />
              </div>
              <DialogTitle>Verifique seu E-mail</DialogTitle>
              <DialogDescription>
                Link de redefinição enviado! Verifique sua caixa de entrada e a pasta de spam.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter>
            <Button onClick={() => setShowResetEmailSentModal(false)} className="w-full">Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Wrong Credentials */}
      <Dialog open={showLoginErrorModal} onOpenChange={setShowLoginErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="w-7 h-7 text-red-600" />
              </div>
              <DialogTitle>Credenciais Incorretas</DialogTitle>
              <DialogDescription>
                O e-mail ou a senha informados estão incorretos. Verifique e tente novamente.
              </DialogDescription>
            </div>
          </DialogHeader>
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <Button onClick={() => setShowLoginErrorModal(false)} variant="outline" className="w-full">
              Tentar Novamente
            </Button>
            <Button
              className="w-full"
              onClick={() => {
                setShowLoginErrorModal(false);
                setResetEmail(email);
                setShowForgotPasswordModal(true);
              }}
            >
              Redefinir Senha
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Access Denied (citizen / no role) */}
      <Dialog open={showAccessDeniedModal} onOpenChange={setShowAccessDeniedModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center space-y-3">
              <div className="w-14 h-14 bg-amber-100 rounded-full flex items-center justify-center">
                <Shield className="w-7 h-7 text-amber-600" />
              </div>
              <DialogTitle>Acesso Não Autorizado</DialogTitle>
              <DialogDescription>
                Sua conta não possui um cargo administrativo no sistema.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="pb-4 text-center text-sm text-slate-600 px-2">
            <p>
              Este painel é exclusivo para servidores e gestores municipais nomeados.
              Se você foi nomeado recentemente, aguarde a configuração pelo administrador do sistema.
            </p>
            <p className="mt-3">
              Cidadãos devem acessar o{' '}
              <a
                href="https://procuradoria-cidada-72130.web.app"
                target="_blank"
                rel="noopener noreferrer"
                className="text-primary hover:underline font-medium"
              >
                Guardião Nacional
              </a>
              .
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowAccessDeniedModal(false)} className="w-full">Entendi</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthScreen;
