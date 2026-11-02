import { createContext, useContext } from "react";
import type { Auth } from "./authTypes";
export const AuthContext = createContext<Auth | null>(null);
export function useAuth() {
  const context = useContext(AuthContext);
  if (!context) throw Error("AuthProvider required");
  return context;
}
