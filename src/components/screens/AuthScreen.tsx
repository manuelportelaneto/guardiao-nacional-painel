
import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword, signInWithEmailAndPassword, sendEmailVerification, sendPasswordResetEmail, GoogleAuthProvider, signInWithPopup, RecaptchaVerifier, signOut } from 'firebase/auth';
import type { ConfirmationResult } from 'firebase/auth';
import { doc, setDoc, Timestamp, getDoc } from 'firebase/firestore';
import { auth, db } from '../../firebaseConfig';
import { toast } from 'sonner';
import { Button } from '../ui/button';
import { Input } from '../ui/input';
import { Label } from '../ui/label';
import { Shield, ExternalLink, Mail, CheckCircle2 } from 'lucide-react';
import { Separator } from '../ui/separator';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '../ui/dialog';
// InputMask removed due to React 19 incompatibility - using simple input instead
import { useAuth } from '../../context/AuthContext';
// DeveloperFooter removed

const AuthScreen: React.FC = () => {
  const navigate = useNavigate();
  const [isLogin, setIsLogin] = useState(true);
  const [loginMethod, setLoginMethod] = useState<'email' | 'phone'>('email');
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [phoneNumber, setPhoneNumber] = useState('');
  const [verificationCode, setVerificationCode] = useState('');
  const [showCodeModal, setShowCodeModal] = useState(false);
  const [acceptedTerms, setAcceptedTerms] = useState(false);

  const [passwordStrength, setPasswordStrength] = useState(0);
  const [termsError, setTermsError] = useState(false);
  const [passwordError, setPasswordError] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showForgotPasswordModal, setShowForgotPasswordModal] = useState(false);
  const [showResetEmailSentModal, setShowResetEmailSentModal] = useState(false);
  const [showLoginErrorModal, setShowLoginErrorModal] = useState(false);
  const [showEmailNotVerifiedModal, setShowEmailNotVerifiedModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');

  const recaptchaVerifierRef = useRef<RecaptchaVerifier | null>(null);
  const confirmationResultRef = useRef<ConfirmationResult | null>(null);


  const { currentUser } = useAuth(); // Import useAuth if not already imported or available

  useEffect(() => {
    if (currentUser) {
      navigate('/hub');
    }
  }, [currentUser, navigate]);



  const calculateStrength = (pass: string) => {
    let score = 0;
    if (!pass) return 0;
    if (pass.length >= 8) score++;
    if (/[A-Z]/.test(pass)) score++;
    if (/[a-z]/.test(pass)) score++;
    if (/[0-9]/.test(pass)) score++;
    if (/[^A-Za-z0-9]/.test(pass)) score++;
    return score;
  };

  useEffect(() => {
    setPasswordStrength(calculateStrength(password));
    // Clear password error when user modifies password
    if (passwordError && password) {
      setPasswordError(false);
    }
  }, [password, passwordError]);

  const getStrengthColor = (score: number) => {
    if (score <= 2) return 'bg-red-500';
    if (score === 3) return 'bg-yellow-500';
    return 'bg-green-500';
  };

  const getStrengthLabel = (score: number) => {
    if (score <= 2) return 'Fraca';
    if (score === 3) return 'Média';
    return 'Forte';
  };

  // Auto-close success modal removed as per requirement
  // User must manually click "Ir para Login"

  const handleGoogleSignIn = async () => {
    // Check terms acceptance first
    if (!acceptedTerms && !isLogin) {
      toast.error("Você precisa aceitar os Termos de Uso e Política de Privacidade.");
      return;
    }

    try {
      const provider = new GoogleAuthProvider();
      const result = await signInWithPopup(auth, provider);
      const user = result.user;

      // Check if user document exists
      const userDocRef = doc(db, "users", user.uid);
      const userDoc = await getDoc(userDocRef);

      // If new user, create documents
      if (!userDoc.exists()) {
        // Split displayName into firstName and lastName
        const displayNameParts = user.displayName?.split(' ') || ['', ''];
        const firstName = displayNameParts[0];
        const lastName = displayNameParts.slice(1).join(' ') || '';

        // Create user document with terms acceptance
        await setDoc(userDocRef, {
          uid: user.uid,
          email: user.email,
          provider: 'google',
          firstName,
          lastName,
          photoURL: user.photoURL,
          emailVerified: user.emailVerified,
          termsAcceptedAt: Timestamp.now(),
          privacyAcceptedAt: Timestamp.now(),
          consentAcceptedAt: Timestamp.now(),
          termsVersion: '2.0',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        // Create empty demographics document
        await setDoc(doc(db, "demographics", user.uid), {
          userId: user.uid,
          updatedAt: Timestamp.now(),
        });
      }

      toast.success("Login com Google realizado com sucesso!");
      navigate('/hub');
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error("Erro ao fazer login com Google: " + err.message);
      } else {
        toast.error("Erro ao fazer login com Google.");
      }
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!acceptedTerms) {
      setTermsError(true);
      toast.error("Você precisa aceitar os Termos de Uso e Política de Privacidade.");
      return;
    }
    setTermsError(false);

    if (passwordStrength < 3) {
      setPasswordError(true);
      toast.error("A senha é muito fraca. Use letras maiúsculas, números e caracteres especiais.");
      return;
    }
    setPasswordError(false);

    if (password !== confirmPassword) {
      toast.error("As senhas não coincidem.");
      return;
    }

    try {
      const userCredential = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // Send email verification
      try {
        const actionCodeSettings = {
          url: `${window.location.origin}/auth/action?mode=verifyEmail`,
          handleCodeInApp: true,
        };
        await sendEmailVerification(user, actionCodeSettings);
      } catch (emailError: unknown) {
        console.error("Error sending verification email:", emailError);
        toast.warning("Não foi possível enviar o email de verificação.");
      }

      // Create user document in Firestore with terms acceptance
      const userDocData: {
        uid: string;
        email: string;
        provider: string;
        firstName: string;
        lastName: string;
        emailVerified: boolean;
        termsAcceptedAt: Timestamp;
        privacyAcceptedAt: Timestamp;
        dataConsentAcceptedAt: Timestamp;
        termsVersion: string;
        createdAt: Timestamp;
        updatedAt: Timestamp;
        phone?: string;
      } = {
        uid: user.uid,
        email,
        provider: 'email',
        firstName,
        lastName,
        emailVerified: user.emailVerified,
        termsAcceptedAt: Timestamp.now(),
        privacyAcceptedAt: Timestamp.now(),
        dataConsentAcceptedAt: Timestamp.now(),
        termsVersion: '2.0',
        createdAt: Timestamp.now(),
        updatedAt: Timestamp.now(),
      };

      // Add phone if provided
      if (phoneNumber && phoneNumber.replace(/\D/g, '').length >= 13) {
        userDocData.phone = `+${phoneNumber.replace(/\D/g, '')}`;
      }

      await setDoc(doc(db, "users", user.uid), userDocData);

      // Create empty demographics document
      await setDoc(doc(db, "demographics", user.uid), {
        userId: user.uid,
        updatedAt: Timestamp.now(),
      });

      // Show success modal
      setShowSuccessModal(true);
    } catch (err: unknown) {
      if (err instanceof Error) {
        toast.error(err.message);
      } else {
        toast.error("Ocorreu um erro desconhecido.");
      }
    }
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      toast.error("Por favor, digite seu email.");
      return;
    }

    try {
      const actionCodeSettings = {
        url: `${window.location.origin}/auth/action?mode=resetPassword`,
        handleCodeInApp: true,
      };
      await sendPasswordResetEmail(auth, resetEmail, actionCodeSettings);
      setShowForgotPasswordModal(false);
      setShowResetEmailSentModal(true);
      setResetEmail('');
    } catch (err: unknown) {
      const firebaseError = err as { code?: string; message?: string };
      if (firebaseError.code === 'auth/user-not-found') {
        toast.error("Usuário não encontrado.");
      } else if (firebaseError.code === 'auth/invalid-email') {
        toast.error("Email inválido.");
      } else {
        toast.error("Erro ao enviar email de recuperação: " + (firebaseError.message || "Erro desconhecido"));
      }
    }
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      // 3. Check email verification
      if (!user.emailVerified) {
        await signOut(auth);
        setShowEmailNotVerifiedModal(true);
        return;
      }

      toast.success("Login realizado com sucesso!");
      navigate('/hub');
    } catch (err: unknown) {
      console.error("Login error:", err);
      const firebaseError = err as { code?: string; message?: string };

      // Handle specific Firebase auth errors
      if (firebaseError.code) {
        switch (firebaseError.code) {
          case 'auth/user-not-found':
          case 'auth/wrong-password':
          case 'auth/invalid-credential':
            setShowLoginErrorModal(true);
            break;
          case 'auth/invalid-email':
            toast.error("E-mail inválido. Verifique o formato do e-mail.");
            break;
          case 'auth/user-disabled':
            toast.error("Esta conta foi desativada. Entre em contato com o suporte.");
            break;
          case 'auth/too-many-requests':
            toast.error("Muitas tentativas de login. Tente novamente mais tarde.");
            break;
          default:
            toast.error("Erro ao fazer login: " + (firebaseError.message || "Erro desconhecido"));
        }
      } else {
        toast.error("Erro ao fazer login.");
      }
    }
  };

  const handleResendVerificationEmail = async () => {
    if (!email) return;
    try {
      // We need to sign in again to get the user object, but we can't because they are not verified.
      // Actually, we can get the user from the error credential if available, but here we just have email/password.
      // We can try to signIn (which we just did and failed check), but we signed out.
      // To send verification email, we need a User object.
      // Strategy: Sign in, get user, send email, sign out.
      const userCredential = await signInWithEmailAndPassword(auth, email, password);
      const user = userCredential.user;

      const actionCodeSettings = {
        url: `${window.location.origin}/auth/action?mode=verifyEmail`,
        handleCodeInApp: true,
      };
      await sendEmailVerification(user, actionCodeSettings);
      await signOut(auth);

      setShowEmailNotVerifiedModal(false);
      setShowSuccessModal(true);
    } catch (error: unknown) {
      console.error("Error resending verification email:", error);
      const firebaseError = error as { message?: string };
      toast.error("Erro ao reenviar email: " + (firebaseError.message || "Erro desconhecido"));
    }
  };

  const toggleMode = () => {
    setIsLogin(!isLogin);
    // Reset form fields when toggling
    setFirstName('');
    setLastName('');
    setEmail('');
    setPassword('');
    setConfirmPassword('');
    setPhoneNumber('');
    setVerificationCode('');
    setVerificationCode('');
    setAcceptedTerms(false);
    setTermsError(false);
    setPasswordError(false);
    setLoginMethod('email');
  };

  // Initialize reCAPTCHA for phone auth
  useEffect(() => {
    if (isLogin && loginMethod === 'phone' && !recaptchaVerifierRef.current) {
      const container = document.getElementById('recaptcha-container-login');
      if (container) {
        try {
          recaptchaVerifierRef.current = new RecaptchaVerifier(auth, 'recaptcha-container-login', {
            'size': 'normal',
            'callback': () => {
              console.log('reCAPTCHA solved');
            }
          });
          recaptchaVerifierRef.current.render();
        } catch (e) {
          console.error('reCAPTCHA init error', e);
        }
      }
    }

    return () => {
      if (recaptchaVerifierRef.current) {
        try {
          recaptchaVerifierRef.current.clear();
        } catch (e) {
          console.error('Error clearing reCAPTCHA', e);
        }
        recaptchaVerifierRef.current = null;
      }
    };
  }, [isLogin, loginMethod]);



  const handleVerifyCode = async () => {
    if (!verificationCode || verificationCode.length !== 6) {
      toast.error('Por favor, insira o código de 6 dígitos.');
      return;
    }

    if (!confirmationResultRef.current) {
      toast.error('Erro: confirmação não encontrada.');
      return;
    }

    try {
      const result = await confirmationResultRef.current.confirm(verificationCode);
      const user = result.user;

      // Check if user document exists
      const userDocRef = doc(db, 'users', user.uid);
      const userDoc = await getDoc(userDocRef);

      // If new user, create document
      if (!userDoc.exists()) {
        await setDoc(userDocRef, {
          uid: user.uid,
          phone: user.phoneNumber,
          provider: 'phone',
          phoneVerified: true,
          termsAcceptedAt: Timestamp.now(),
          privacyAcceptedAt: Timestamp.now(),
          consentAcceptedAt: Timestamp.now(),
          termsVersion: '2.0',
          createdAt: Timestamp.now(),
          updatedAt: Timestamp.now(),
        });

        await setDoc(doc(db, 'demographics', user.uid), {
          userId: user.uid,
          updatedAt: Timestamp.now(),
        });
      }

      toast.success('Login realizado com sucesso!');
      setShowCodeModal(false);
      navigate('/hub');
    } catch (error: unknown) {
      console.error('Error verifying code:', error);
      if (error instanceof Error) {
        toast.error('Código inválido. Tente novamente.');
      } else {
        toast.error('Erro ao verificar código.');
      }
    }
  };

  return (
    <div className="h-screen bg-background flex flex-col">
      {/* Logo Header */}
      <div className="flex items-center justify-center pt-16 pb-8">
        <div className="flex items-center space-x-3">
          <div className="w-16 h-16 rounded-full flex items-center justify-center overflow-hidden">
            <img src="/logo-new.jpg" alt="Logo" className="w-full h-full object-cover" />
          </div>
          <div>
            <h1 className="text-xl font-bold text-primary">Guardião Nacional</h1>
            <p className="text-sm text-gray-600">Sua voz, sua comunidade</p>
          </div>
        </div>
      </div>

      {/* Form Container */}
      <div className="flex-1 px-6">
        <div className="max-w-sm mx-auto">
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold mb-2 text-primary">
              {isLogin ? 'Entrar' : 'Criar Conta'}
            </h2>
            <p className="text-gray-600">
              {isLogin
                ? 'Acesse sua conta para continuar'
                : 'Junte-se à nossa comunidade'
              }
            </p>
          </div>

          {/* Google Sign-In Button */}
          <Button
            onClick={handleGoogleSignIn}
            variant="outline"
            className="w-full mb-6 h-12 border-2"
            type="button"
          >
            <svg className="w-5 h-5 mr-2" viewBox="0 0 24 24">
              <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
              <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
              <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
              <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
            </svg>
            Continuar com Google
          </Button>

          {/* Separator */}
          <div className="relative mb-6">
            <Separator />
            <span className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 bg-background px-3 text-sm text-gray-500">
              ou
            </span>
          </div>

          {/* Email/Password Form */}
          <form onSubmit={isLogin ? handleLogin : handleRegister} className="space-y-4">
            {!isLogin && (
              <>
                <div className="space-y-2">
                  <Label htmlFor="firstName">Nome</Label>
                  <Input
                    id="firstName"
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    required
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="lastName">Sobrenome</Label>
                  <Input
                    id="lastName"
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    required
                  />
                </div>
              </>
            )}
            <div className="space-y-2">
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="phoneRegister">Telefone (Opcional)</Label>
                <Input
                  id="phoneRegister"
                  type="tel"
                  value={phoneNumber}
                  onChange={(e: React.ChangeEvent<HTMLInputElement>) => setPhoneNumber(e.target.value)}
                  placeholder="+55 11 99999-9999"
                />
                <p className="text-xs text-gray-500">
                  Adicione seu telefone agora ou depois no perfil
                </p>
              </div>
            )}
            <div className="space-y-2">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className={passwordError && !isLogin ? 'border-red-500 ring-1 ring-red-500' : ''}
                required
              />
            </div>
            {isLogin && (
              <div className="flex justify-end">
                <button
                  type="button"
                  onClick={() => setShowForgotPasswordModal(true)}
                  className="text-sm text-primary hover:underline"
                >
                  Esqueceu sua senha?
                </button>
              </div>
            )}
            {!isLogin && (
              <div className="space-y-1">
                <div className="flex justify-between text-xs text-gray-500 mb-1">
                  <span>Força da senha:</span>
                  <span className={`font-medium ${passwordStrength <= 2 ? 'text-red-500' :
                    passwordStrength === 3 ? 'text-yellow-600' : 'text-green-600'
                    }`}>
                    {getStrengthLabel(passwordStrength)}
                  </span>
                </div>
                <div className="flex gap-1 h-1.5">
                  {[1, 2, 3, 4, 5].map((level) => (
                    <div
                      key={level}
                      className={`flex-1 rounded-full transition-colors duration-300 ${level <= passwordStrength ? getStrengthColor(passwordStrength) : 'bg-gray-200'
                        }`}
                    />
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-1">
                  Use 8+ caracteres, letras maiúsculas, números e símbolos.
                </p>
                {passwordError && (
                  <p className="text-xs text-red-500 mt-1">
                    A senha não atende aos requisitos mínimos de segurança.
                  </p>
                )}
              </div>
            )}
            {!isLogin && (
              <div className="space-y-2">
                <Label htmlFor="confirmPassword">Confirmar Senha</Label>
                <Input
                  id="confirmPassword"
                  type="password"
                  value={confirmPassword}
                  onChange={(e) => setConfirmPassword(e.target.value)}
                  required
                />
              </div>
            )}
            {!isLogin && (
              <>
                <div className="flex items-start space-x-2 py-2">
                  <input
                    type="checkbox"
                    id="acceptTerms"
                    checked={acceptedTerms}
                    onChange={(e) => {
                      setAcceptedTerms(e.target.checked);
                      if (e.target.checked) setTermsError(false);
                    }}
                    className={`mt-1 h-4 w-4 rounded border-gray-300 ${termsError ? 'border-red-500 ring-1 ring-red-500' : ''}`}
                  />
                  <label htmlFor="acceptTerms" className="text-sm text-gray-600 leading-tight">
                    Aceito os{' '}
                    <a
                      href="https://guardiao-nacional.web.app/legal.html#termos"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center"
                    >
                      Termos de Uso
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                    ,{' '}
                    <a
                      href="https://guardiao-nacional.web.app/legal.html#privacidade"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center"
                    >
                      Política
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                    {' '}e o{' '}
                    <a
                      href="https://guardiao-nacional.web.app/legal.html#consentimento"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-primary hover:underline inline-flex items-center"
                    >
                      Consentimento de Dados
                      <ExternalLink className="w-3 h-3 ml-0.5" />
                    </a>
                  </label>
                </div>
                {termsError && (
                  <p className="text-xs text-red-500 mt-1 ml-6">
                    É obrigatório aceitar os termos para continuar.
                  </p>
                )}
              </>
            )}
            <Button type="submit" className="w-full h-12 bg-primary hover:bg-primary/90">
              {isLogin ? 'Entrar' : 'Cadastrar'}
            </Button>
          </form>


          <div className="mt-6 text-center">
            <p className="text-gray-600">
              {isLogin ? 'Não tem uma conta?' : 'Já tem uma conta?'}{' '}
              <button
                onClick={toggleMode}
                className="text-primary hover:underline bg-transparent border-none cursor-pointer font-medium"
              >
                {isLogin ? 'Criar conta' : 'Fazer login'}
              </button>
            </p>
          </div>
        </div>
      </div>



      {/* SMS Code Verification Modal */}
      <Dialog open={showCodeModal} onOpenChange={setShowCodeModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Verificação de Telefone</DialogTitle>
            <DialogDescription>
              Digite o código de 6 dígitos enviado para o seu telefone.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Digite o código de 6 dígitos enviado para o seu telefone
            </p>
            <div className="space-y-2">
              <Label htmlFor="verificationCode">Código SMS</Label>
              <Input
                id="verificationCode"
                type="text"
                maxLength={6}
                placeholder="000000"
                value={verificationCode}
                onChange={(e) => setVerificationCode(e.target.value.replace(/\D/g, ''))}
                className="text-center text-2xl tracking-widest"
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowCodeModal(false);
                setVerificationCode('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleVerifyCode} disabled={verificationCode.length !== 6}>
              Verificar
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Forgot Password Modal */}
      <Dialog open={showForgotPasswordModal} onOpenChange={setShowForgotPasswordModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>Recuperar Senha</DialogTitle>
            <DialogDescription>
              Digite seu email para receber um link de redefinição de senha.
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <p className="text-sm text-gray-600">
              Digite seu email para receber um link de redefinição de senha.
            </p>
            <div className="space-y-2">
              <Label htmlFor="resetEmail">Email</Label>
              <Input
                id="resetEmail"
                type="email"
                placeholder="seu@email.com"
                value={resetEmail}
                onChange={(e) => setResetEmail(e.target.value)}
              />
            </div>
          </div>
          <DialogFooter>
            <Button
              variant="outline"
              onClick={() => {
                setShowForgotPasswordModal(false);
                setResetEmail('');
              }}
            >
              Cancelar
            </Button>
            <Button onClick={handleForgotPassword}>
              Enviar Link
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Reset Password Sent Modal */}
      <Dialog open={showResetEmailSentModal} onOpenChange={setShowResetEmailSentModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-blue-600" />
              </div>
              <DialogTitle className="text-2xl">Verifique seu Email</DialogTitle>
            </div>
          </DialogHeader>
          <div className="py-4 text-center space-y-4">
            <p className="text-gray-600">
              Um link para redefinição de senha foi enviado para o seu email.
            </p>
            <p className="text-sm text-gray-500">
              Verifique sua caixa de entrada e a pasta de spam.
            </p>
          </div>
          <DialogFooter>
            <Button onClick={() => setShowResetEmailSentModal(false)} className="w-full">
              Entendi
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Success Modal (Registration) */}
      <Dialog open={showSuccessModal} onOpenChange={() => { }}>
        <DialogContent className="sm:max-w-md" onPointerDownOutside={(e) => e.preventDefault()} onEscapeKeyDown={(e) => e.preventDefault()}>
          <DialogHeader>
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <DialogTitle className="text-2xl">
                {isLogin ? 'Email Enviado!' : 'Cadastro Concluído!'}
              </DialogTitle>
              <DialogDescription>
                {isLogin
                  ? 'Um novo email de verificação foi enviado.'
                  : 'Sua conta foi criada com sucesso! Verifique seu email.'}
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="py-4 text-center space-y-4">
            <p className="text-gray-600">
              {isLogin
                ? 'O email de verificação foi reenviado com sucesso!'
                : 'Sua conta foi criada com sucesso!'}
            </p>
            <p className="text-sm text-gray-500">
              Um email de verificação foi enviado para <strong>{email}</strong>.
              Por favor, verifique sua caixa de entrada.
            </p>
          </div>
          <DialogFooter>
            <Button
              onClick={() => {
                setShowSuccessModal(false);
                setIsLogin(true);
                // Reset form
                setFirstName('');
                setLastName('');
                setEmail('');
                setPassword('');
                setConfirmPassword('');
                setPhoneNumber('');
                setAcceptedTerms(false);
                setTermsError(false);
                setPasswordError(false);
              }}
              className="w-full"
            >
              Ir para Login
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Generic Login Error Modal */}
      <Dialog open={showLoginErrorModal} onOpenChange={setShowLoginErrorModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 bg-red-100 rounded-full flex items-center justify-center">
                <Shield className="w-10 h-10 text-red-600" />
              </div>
              <DialogTitle className="text-2xl">Dados Incorretos</DialogTitle>
              <DialogDescription>
                O email ou a senha informados estão incorretos.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="py-4 text-center space-y-4">
            <p className="text-gray-600">
              O email ou a senha informados não correspondem aos nossos registros.
            </p>
          </div>
          <DialogFooter className="flex-col space-y-2">
            <Button
              onClick={() => setShowLoginErrorModal(false)}
              variant="outline"
              className="w-full"
            >
              Tentar Novamente
            </Button>
            <Button
              onClick={() => {
                setShowLoginErrorModal(false);
                setResetEmail(email);
                setShowForgotPasswordModal(true);
              }}
              className="w-full"
            >
              Redefinir Senha
            </Button>
            <Button
              onClick={() => {
                setShowLoginErrorModal(false);
                setIsLogin(false); // Switch to register
              }}
              variant="ghost"
              className="w-full text-primary"
            >
              Criar Conta
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Email Not Verified Modal */}
      <Dialog open={showEmailNotVerifiedModal} onOpenChange={setShowEmailNotVerifiedModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <div className="flex flex-col items-center text-center space-y-2">
              <div className="w-16 h-16 bg-yellow-100 rounded-full flex items-center justify-center">
                <Mail className="w-10 h-10 text-yellow-600" />
              </div>
              <DialogTitle className="text-2xl">Verifique seu Email</DialogTitle>
              <DialogDescription>
                Sua conta foi criada, mas você ainda não verificou seu email.
              </DialogDescription>
            </div>
          </DialogHeader>
          <div className="py-4 text-center space-y-4">
            <p className="text-gray-600">
              Sua conta foi criada, mas você ainda não verificou seu email.
            </p>
            <p className="text-sm text-gray-500">
              Verifique sua caixa de entrada (<strong>{email}</strong>) e clique no link de confirmação.
            </p>
          </div>
          <DialogFooter className="flex-col space-y-2">
            <Button
              onClick={() => setShowEmailNotVerifiedModal(false)}
              variant="outline"
              className="w-full"
            >
              Fechar
            </Button>
            <Button
              onClick={handleResendVerificationEmail}
              className="w-full"
            >
              Reenviar Email
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default AuthScreen;
