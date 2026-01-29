import { createContext, useState, useCallback, ReactNode } from "react";
import type { User, AuthContextType } from "@/types";

export const AuthContext = createContext<AuthContextType | undefined>(undefined);

interface AuthProviderProps {
  children: ReactNode;
}

export function AuthProvider({ children }: AuthProviderProps) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(false);

  // Mock sign in - sets a fake user in state
  const signIn = useCallback(async (email: string, _password: string) => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Mock successful login
    setUser({
      id: "mock-user-id",
      email,
      name: email.split("@")[0],
    });
    
    setLoading(false);
  }, []);

  // Mock sign up - sets a fake user in state
  const signUp = useCallback(async (email: string, _password: string) => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 500));
    
    // Mock successful signup
    setUser({
      id: "mock-user-id",
      email,
      name: email.split("@")[0],
    });
    
    setLoading(false);
  }, []);

  // Mock sign out - clears user state
  const signOut = useCallback(async () => {
    setLoading(true);
    
    // Simulate API delay
    await new Promise((resolve) => setTimeout(resolve, 300));
    
    setUser(null);
    setLoading(false);
  }, []);

  return (
    <AuthContext.Provider value={{ user, loading, signIn, signUp, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
