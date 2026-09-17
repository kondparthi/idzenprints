import { createContext, useCallback, useContext, useEffect, useState, type ReactNode } from "react";
import { fetchCurrentMember, loginMember, logoutMember } from "@/api/memberAuth";
import { getMemberToken, setMemberToken, clearMemberToken } from "@/api/memberClient";
import type { CurrentMember } from "@/types/memberAuth";

interface MemberAuthContextValue {
  member: CurrentMember | null;
  isLoading: boolean;
  login: (loginId: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  setMember: (member: CurrentMember) => void;
}

const MemberAuthContext = createContext<MemberAuthContextValue | undefined>(undefined);

export function MemberAuthProvider({ children }: { children: ReactNode }) {
  const [member, setMember] = useState<CurrentMember | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  const loadCurrentMember = useCallback(async () => {
    if (!getMemberToken()) {
      setIsLoading(false);
      return;
    }
    try {
      setMember(await fetchCurrentMember());
    } catch {
      clearMemberToken();
      setMember(null);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadCurrentMember();
  }, [loadCurrentMember]);

  const login = useCallback(async (loginId: string, password: string) => {
    const token = await loginMember(loginId, password);
    setMemberToken(token);
    setMember(await fetchCurrentMember());
  }, []);

  const logout = useCallback(async () => {
    try {
      await logoutMember();
    } finally {
      // Clear local state even if the network call fails (e.g. the token
      // already expired) — a member should always be able to log out
      // locally regardless of backend reachability.
      clearMemberToken();
      setMember(null);
    }
  }, []);

  return (
    <MemberAuthContext.Provider value={{ member, isLoading, login, logout, setMember }}>
      {children}
    </MemberAuthContext.Provider>
  );
}

export function useMemberAuth(): MemberAuthContextValue {
  const context = useContext(MemberAuthContext);
  if (!context) {
    throw new Error("useMemberAuth must be used within a MemberAuthProvider");
  }
  return context;
}
