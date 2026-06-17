import { useState, useEffect } from "react";
import type { ApiUser } from "@/types/api";
import { api, TOKEN_KEY } from "@/lib/api";

export function useAuth() {
  const [user, setUser] = useState<ApiUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [username, setUsername] = useState<string>("");
  const [authEnabled, setAuthEnabled] = useState(true);

  useEffect(() => {
    api.auth.setupStatus().then((status) => {
      setAuthEnabled(status.authEnabled);

      if (!status.authEnabled) {
        setUser({ id: "default", username: "admin", email: "admin@local" });
        setUsername("admin");
        setLoading(false);
        return;
      }

      if (status.needsSetup) {
        setLoading(false);
        return;
      }

      const token = localStorage.getItem(TOKEN_KEY);
      if (!token) {
        setLoading(false);
        return;
      }

      api.auth.me()
        .then((u) => {
          setUser(u);
          setUsername(u.username);
        })
        .catch(() => api.clearToken())
        .finally(() => setLoading(false));
    }).catch(() => setLoading(false));
  }, []);

  const signIn = async (email: string, password: string) => {
    try {
      const { token, user: u } = await api.auth.login(email, password);
      api.setToken(token);
      setUser(u);
      setUsername(u.username);
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  };

  const signUp = async (email: string, password: string, name: string) => {
    try {
      const { token, user: u } = await api.auth.register(name, email, password);
      api.setToken(token);
      setUser(u);
      setUsername(u.username);
      return { error: null };
    } catch (e: any) {
      return { error: e };
    }
  };

  const signOut = async () => {
    api.clearToken();
    setUser(null);
    setUsername("");
  };

  const deleteAccount = async () => {
    await api.auth.deleteAccount();
    api.clearToken();
    setUser(null);
    setUsername("");
  };

  return { user, loading, username, authEnabled, signIn, signUp, signOut, deleteAccount };
}
