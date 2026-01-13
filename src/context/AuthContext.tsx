import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { type User, onAuthStateChanged, signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { auth, db } from '../firebaseConfig';
import type { UserData } from '../types/user';

/**
 * @interface AuthContextType
 * @property {User | null} currentUser - The currently authenticated user from Firebase Authentication.
 * @property {UserData | null} userData - Extended user data from Firestore (role, assignments, etc.).
 * @property {boolean} loading - True while auth state or user data is loading.
 * @property {() => Promise<void>} logout - Function to logout.
 */
interface AuthContextType {
  currentUser: User | null;
  userData: UserData | null;
  loading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  currentUser: null,
  userData: null,
  loading: true,
  logout: async () => { },
});

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [userData, setUserData] = useState<UserData | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      setCurrentUser(user);

      if (user) {
        try {
          // Fetch user role and additional data from Firestore
          const userDocRef = doc(db, 'users', user.uid);
          const userDoc = await getDoc(userDocRef);

          if (userDoc.exists()) {
            const data = userDoc.data() as UserData;
            // 🚨 SYSTEM OVERRIDE: MANUEL IS ALWAYS SUPER ADMIN 🚨
            if (user.email === 'manuelpnforce@gmail.com') {
              data.role = 'super_admin';
              data.accessLevel = 3;
            }
            setUserData(data);
          } else {
            // 🚨 SYSTEM OVERRIDE: MANUEL IS ALWAYS SUPER ADMIN 🚨
            if (user.email === 'manuelpnforce@gmail.com') {
              setUserData({
                uid: user.uid,
                email: user.email,
                role: 'super_admin',
                displayName: 'Manuel Force (SysAdmin)',
                accessLevel: 3
              });
            } else {
              // Basic fallback if no extra data exists
              setUserData({ uid: user.uid, email: user.email, role: 'citizen' });
            }
          }
        } catch (error) {
          console.error("Error fetching user data:", error);
          setUserData(null);
        }
      } else {
        setUserData(null);
      }

      setLoading(false);
    });

    return unsubscribe;
  }, []);

  const logout = async () => {
    await signOut(auth);
    setUserData(null);
  };

  return (
    <AuthContext.Provider value={{ currentUser, userData, loading, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  return useContext(AuthContext);
};
