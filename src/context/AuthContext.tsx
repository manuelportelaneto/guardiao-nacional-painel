import { createContext, useContext, useEffect, useState, ReactNode } from 'react';
import { type User, onAuthStateChanged, signOut } from 'firebase/auth';
import { auth } from '../firebaseConfig';

/**
 * @interface AuthContextType
 * @property {User | null} currentUser - The currently authenticated user from Firebase, or null if no user is logged in.
 * @property {boolean} loading - A boolean flag that is true while the authentication state is being determined, and false otherwise.
 * @property {() => Promise<void>} logout - Function to logout the current user.
 */
interface AuthContextType {
  currentUser: User | null;
  loading: boolean;
  logout: () => Promise<void>;
}

/**
 * React Context for Firebase Authentication.
 * Provides `currentUser` and `loading` state to its children.
 */
const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  loading: true,
  logout: async () => { },
});

/**
 * A component that provides the authentication context to its children.
 * It listens for changes in the Firebase authentication state and updates the context accordingly.
 * @param {object} props - The component props.
 * @param {ReactNode} props.children - The child components to be rendered within the provider.
 */
export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (user) => {
      setCurrentUser(user);
      setLoading(false);
    });

    // Cleanup the subscription when the component unmounts
    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
  };

  return (
    <AuthContext.Provider value={{ currentUser, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

/**
 * A custom hook to easily access the authentication context.
 * @returns {AuthContextType} The authentication context, containing the `currentUser` and `loading` state.
 */
export const useAuth = () => {
  return useContext(AuthContext);
};
