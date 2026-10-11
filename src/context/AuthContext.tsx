import React, { createContext, useContext, useState, useEffect } from 'react';
import { User, onAuthStateChanged } from 'firebase/auth';
import { auth, loginWithGoogle, logoutUser, testConnection } from '../services/firebase';
import { UserProfile } from '../types';

interface AuthContextType {
  currentUser: User | null;
  userProfile: UserProfile | null;
  effectiveUid: string;
  isLoading: boolean;
  isDemoUser: boolean;
  firestoreConnected: boolean;
  login: () => Promise<void>;
  logout: () => Promise<void>;
  setDemoMode: () => void;
}

const DEMO_USER_PROFILE: UserProfile = {
  uid: 'prof-fisica-titular-2026',
  email: 'prof.fisica@escola.sp.gov.br',
  displayName: 'Prof. Sérgio Pedrosa (Física)',
  role: 'teacher'
};

const AuthContext = createContext<AuthContextType | null>(null);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDemoUser, setIsDemoUser] = useState<boolean>(true); // Defaults to active teacher workspace for immediate use
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [firestoreConnected, setFirestoreConnected] = useState<boolean>(true);

  useEffect(() => {
    // Test initial connection to Firestore
    testConnection().then(connected => {
      setFirestoreConnected(connected);
    });

    const unsubscribe = onAuthStateChanged(auth, (user) => {
      if (user) {
        setCurrentUser(user);
        setIsDemoUser(false);
      } else {
        setCurrentUser(null);
        // Retain demo teacher mode if no Google session yet
        setIsDemoUser(true);
      }
      setIsLoading(false);
    });

    return () => unsubscribe();
  }, []);

  const login = async () => {
    try {
      setIsLoading(true);
      await loginWithGoogle();
    } catch (err: unknown) {
      const error = err as { code?: string; message?: string };
      if (
        error?.code === 'auth/cancelled-popup-request' ||
        error?.code === 'auth/popup-closed-by-user' ||
        error?.code === 'auth/popup-blocked'
      ) {
        // Not a fatal failure, user simply dismissed or cancelled the popup
        return;
      }
      console.error('Falha ao autenticar com Google:', err);
      throw err;
    } finally {
      setIsLoading(false);
    }
  };

  const logout = async () => {
    try {
      if (currentUser) {
        await logoutUser();
      }
      setIsDemoUser(true);
    } catch (err) {
      console.error('Erro ao sair:', err);
    }
  };

  const setDemoMode = () => {
    setIsDemoUser(true);
  };

  const userProfile: UserProfile = currentUser ? {
    uid: currentUser.uid,
    email: currentUser.email || 'usuario@escola.sp.gov.br',
    displayName: currentUser.displayName || 'Professor(a) de Física',
    photoURL: currentUser.photoURL || undefined,
    role: 'teacher'
  } : DEMO_USER_PROFILE;

  const effectiveUid = userProfile.uid;

  return (
    <AuthContext.Provider
      value={{
        currentUser,
        userProfile,
        effectiveUid,
        isLoading,
        isDemoUser,
        firestoreConnected,
        login,
        logout,
        setDemoMode
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuth deve ser utilizado dentro de AuthProvider');
  }
  return context;
};
