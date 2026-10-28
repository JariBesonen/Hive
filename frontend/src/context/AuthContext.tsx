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
  isGuest: boolean;
  loading: boolean;
  hiveRefreshKey: number;
  incrementHiveRefreshKey: () => void;
  login: (identity: string, password: string) => Promise<void>;
  loginAsGuest: () => Promise<void>;
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
  const [isGuest, setIsGuest] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(true);
  const [hiveRefreshKey, setHiveRefreshKey] = useState<number>(0);

  const incrementHiveRefreshKey = useCallback((): void => {
    setHiveRefreshKey((current) => current + 1);
  }, []);

  const refreshMe = useCallback(async (): Promise<void> => {
    try {
      const response = await api.getMe();
      setCurrentUser(response.user);
      setIsGuest(response.user ? response.isGuest === true : false);
    } catch {
      setCurrentUser(null);
      setIsGuest(false);
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
      setIsGuest(false);
    },
    [],
  );

  const loginAsGuest = useCallback(async (): Promise<void> => {
    const response = await api.guest();
    setCurrentUser(response.user);
    setIsGuest(true);
  }, []);

  const register = useCallback(
    async (
      username: string,
      email: string,
      password: string,
    ): Promise<void> => {
      const response = await api.register({ username, email, password });
      setCurrentUser(response.user);
      setIsGuest(false);
    },
    [],
  );

  const logout = useCallback(async (): Promise<void> => {
    await api.logout();
    setCurrentUser(null);
    setIsGuest(false);
  }, []);

  const deleteAccount = useCallback(
    async (confirmation: string): Promise<void> => {
      await api.deleteAccount({ confirmation });
      setCurrentUser(null);
      setIsGuest(false);
    },
    [],
  );

  const value = useMemo<AuthContextValue>(
    () => ({
      currentUser,
      isGuest,
      loading,
      hiveRefreshKey,
      incrementHiveRefreshKey,
      login,
      loginAsGuest,
      register,
      logout,
      deleteAccount,
      refreshMe,
    }),
    [
      currentUser,
      isGuest,
      loading,
      hiveRefreshKey,
      incrementHiveRefreshKey,
      login,
      loginAsGuest,
      register,
      logout,
      deleteAccount,
      refreshMe,
    ],
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
