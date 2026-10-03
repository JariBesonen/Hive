/* eslint-disable react-refresh/only-export-components */
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import { api, type ApiUser } from "../lib/api";

interface AuthContextValue {
  currentUser: ApiUser | null;
  loading: boolean;
  hiveRefreshKey: number;
  incrementHiveRefreshKey: () => void;
  login: (identity: string, password: string) => Promise<void>;
  register: (
    username: string,
    email: string,
    password: string,
  ) => Promise<void>;
  logout: () => Promise<void>;
  deleteAccount: (confirmation: string) => Promise<void>;
  refreshMe: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [currentUser, setCurrentUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState<boolean>(true);
  const [hiveRefreshKey, setHiveRefreshKey] = useState<number>(0);

  const incrementHiveRefreshKey = useCallback((): void => {
    setHiveRefreshKey((current) => current + 1);
  }, []);

  const refreshMe = useCallback(async (): Promise<void> => {
    try {
      const response = await api.getMe();
      setCurrentUser(response.user);
    } catch {
      setCurrentUser(null);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    void refreshMe();
  }, [refreshMe]);

  useEffect(() => {
    const theme = currentUser?.themePreference === "light" ? "light" : "dark";
    document.documentElement.setAttribute("data-theme", theme);
  }, [currentUser?.themePreference]);

  const login = useCallback(
    async (identity: string, password: string): Promise<void> => {
      const response = await api.login({ identity, password });
      setCurrentUser(response.user);
    },
    [],
  );

  const register = useCallback(
    async (
      username: string,
      email: string,
      password: string,
    ): Promise<void> => {
      const response = await api.register({ username, email, password });
      setCurrentUser(response.user);
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await api.logout();
    setCurrentUser(null);
  }, []);

  const deleteAccount = useCallback(
    async (confirmation: string): Promise<void> => {
      await api.deleteAccount({ confirmation });
      setCurrentUser(null);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      loading,
      hiveRefreshKey,
      incrementHiveRefreshKey,
      login,
      register,
      logout,
      deleteAccount,
      refreshMe,
    }),
    [currentUser, loading, hiveRefreshKey, incrementHiveRefreshKey, login, register, logout, deleteAccount, refreshMe],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return context;
}
