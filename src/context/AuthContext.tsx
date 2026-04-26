import React, { createContext, useContext, useState, useEffect } from 'react';

interface AuthContextType {
  isAuthenticated: boolean;
  user: any | null;
  login: (token: string, userData: any, rememberMe?: boolean) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [user, setUser] = useState<any | null>(null);

  useEffect(() => {
    const localToken = localStorage.getItem('mdicare_auth_token');
    const localUser = localStorage.getItem('mdicare_user');
    
    const sessionToken = sessionStorage.getItem('mdicare_auth_token');
    const sessionUser = sessionStorage.getItem('mdicare_user');

    if (localToken && localUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(localUser));
    } else if (sessionToken && sessionUser) {
      setIsAuthenticated(true);
      setUser(JSON.parse(sessionUser));
    }
  }, []);

  const login = (token: string, userData: any, rememberMe: boolean = true) => {
    const storage = rememberMe ? localStorage : sessionStorage;
    storage.setItem('mdicare_auth_token', token);
    storage.setItem('mdicare_user', JSON.stringify(userData));
    
    // Clear the other storage just in case
    (rememberMe ? sessionStorage : localStorage).removeItem('mdicare_auth_token');
    (rememberMe ? sessionStorage : localStorage).removeItem('mdicare_user');
    
    setIsAuthenticated(true);
    setUser(userData);
  };

  const logout = () => {
    localStorage.removeItem('mdicare_auth_token');
    localStorage.removeItem('mdicare_user');
    sessionStorage.removeItem('mdicare_auth_token');
    sessionStorage.removeItem('mdicare_user');
    setIsAuthenticated(false);
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ isAuthenticated, user, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
};
