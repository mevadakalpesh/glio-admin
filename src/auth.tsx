import { useEffect, useState, useCallback, useRef } from "react";
import type { ReactNode } from "react";
import { AuthContext } from "./useAuth";
import type { Session } from "./authTypes";
import { api, ApiError } from "./api";
export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<Session | null>(null),
    [loading, setLoading] = useState(true),
    [unavailable, setUnavailable] = useState(""),
    [recovery, setRecovery] = useState<string[]>([]);
  // Only the latest authentication transition may update the workspace.
  const generation = useRef(0);
  const reload = useCallback(async () => {
    const request = ++generation.current;
    try {
      setUnavailable("");
      const value = await api<Session>("/auth/session");
      if (request !== generation.current) return;
      const { recovery_codes: _codes, ...safeSession } = value;
      setSession(safeSession);
      setRecovery([]);
    } catch (e) {
      if (request !== generation.current) return;
      setSession(null);
      setRecovery([]);
      if (!(e instanceof ApiError && e.status === 401))
        setUnavailable(
          e instanceof Error ? e.message : "Connection unavailable",
        );
    } finally {
      if (request === generation.current) setLoading(false);
    }
  }, []);
  useEffect(() => {
    const lifecycle = generation;
    void Promise.resolve().then(reload);
    const expired = () => {
      generation.current++;
      setLoading(false);
      setUnavailable("");
      setSession(null);
      setRecovery([]);
    };
    window.addEventListener("gilo-session-expired", expired);
    return () => {
      lifecycle.current++;
      window.removeEventListener("gilo-session-expired", expired);
    };
  }, [reload]);
  const accept = (value: Session) => {
    generation.current++;
    setLoading(false);
    const { recovery_codes, ...safeSession } = value;
    setSession(safeSession);
    setRecovery(recovery_codes || []);
    setUnavailable("");
  };
  const logout = async (all = false) => {
    const request = ++generation.current;
    if (session)
      await api(all ? "/auth/revoke-sessions" : "/auth/logout", {
        method: "POST",
        body: {},
        csrf: session.csrf_token,
      });
    if (request !== generation.current) return;
    setSession(null);
    setRecovery([]);
    setLoading(false);
    setUnavailable("");
  };
  return (
    <AuthContext.Provider
      value={{
        session,
        loading,
        unavailable,
        accept,
        reload,
        logout,
        recovery,
        acknowledgeRecovery: () => setRecovery([]),
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}
