import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import type { UserData } from '../types/user';
import { loggingService } from '../services/loggingService';

/**
 * @interface AuthContextType
 * @property {User | null} currentUser - Instância nativa de autenticação do Firebase.
 * @property {UserData | null} userData - Informações enriquecidas obtidas do Firestore (perfis, permissões municipais).
 * @property {boolean} loading - Indicador de carregamento de estado ou de busca no banco de dados.
 * @property {() => Promise<void>} logout - Trata o encerramento seguro de sessão e gravação de logs de auditoria.
 */
interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
}

// Criação do Contexto React com dados nulos por padrão
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
  logout: async () => { },
});

/**
 * Provedor de Autenticação Reativa do Painel Administrativo.
 * Este componente encapsula toda a aplicação web e monitora o ciclo de vida do login.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    // onAuthStateChanged escuta em tempo real mudanças no token JWT de autenticação do Firebase
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Busca o perfil estendido do usuário na coleção Firestore "users"
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            
            // 🚨 BYPASS DE SEGURANÇA E PRIVILÉGIOS (SYSADMIN OVERRIDE) 🚨
            // Para garantir que a conta administrativa principal de Manuel nunca perca privilégios 
            // de acesso em caso de falha de banco de dados ou redefinição manual de documentos,
            // o e-mail oficial é forçado nativamente como 'super_admin' com nível máximo de acesso (3).
            if (user.email === 'manuelpnforce@gmail.com') {
              data.role = 'super_admin';
              data.accessLevel = 3;
            }
            setUserData(data);
          } else {
            // Caso o registro físico de usuário seja deletado do Firestore de forma errônea,
            // o bypass restaura na memória a conta de Manuel como Super Administrador.
            if (user.email === 'manuelpnforce@gmail.com') {
              setUserData({
                uid: user.uid,
                email: user.email,
                role: 'super_admin',
                displayName: 'Manuel Force (SysAdmin)',
                accessLevel: 3
              });
            } else {
              // Cidadãos comuns que tentarem logar no painel administrativo recebem perfil padrão restrito
              setUserData({ uid: user.uid, email: user.email, role: 'citizen' });
            }
          }
        } catch (error) {
          console.error("Falha ao recuperar metadados complementares do usuário no Firestore:", error);
          setUserData(null);
        }
      } else {
        setUserData(null); // Limpa o estado quando não há sessão ativa
      }

      setLoading(false);
    });

    // Função de limpeza do listener do Firebase ao desmontar o componente React
    return unsubscribe;
  }, []);

  /**
   * Finaliza de forma segura a sessão do usuário.
   * Realiza a gravação preventiva de um log de auditoria antes de deslogar o Firebase Auth.
   */
  const logout = async () => {
    if (currentUser) {
      await loggingService.logAudit(
        'LOGOUT',
        currentUser.uid,
        currentUser.uid,
        { agent: navigator.userAgent, method: 'auth/logout' }
      ).catch(e => console.warn('Não foi possível gravar o log de encerramento de sessão:', e));
    }
    await signOut(auth);
    setUserData(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

// Hook customizado conveniente para consumo imediato dos dados de sessão por qualquer tela
export const useAuth = () => {
  return useContext(AuthContext);
};

