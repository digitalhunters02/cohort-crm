import { createContext, useCallback, useContext, useEffect, useState } from 'react';
import { authApi } from './authApi.js';
import { readSession, writeSession, clearSession, isRemembered, markTrialEnded, AUTH_EXPIRED_EVENT } from './session.js';
import { getAttribution } from './attribution.js';

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [session, setSession] = useState(() => readSession());
  const [checking, setChecking] = useState(() => !!readSession()?.token);

  // Confirm the stored token is still good (and refresh the account details).
  useEffect(() => {
    const stored = readSession();
    if (!stored?.token) return;
    authApi.me()
      .then(({ account }) => {
        const next = { token: stored.token, account };
        writeSession(isRemembered(), next);
        setSession(next);
      })
      .catch((err) => {
        // Only a rejected token signs the user out; a network blip keeps them in.
        if (err.status === 401) {
          if (err.code === 'demo_expired') markTrialEnded();
          clearSession();
          setSession(null);
        }
      })
      .finally(() => setChecking(false));
  }, []);

  // api.js fires this when any request is answered with 401.
  useEffect(() => {
    const onExpired = () => setSession(null);
    window.addEventListener(AUTH_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(AUTH_EXPIRED_EVENT, onExpired);
  }, []);

  const login = useCallback(async (email, password, remember = true) => {
    const { token, account } = await authApi.login(email, password, remember);
    const next = { token, account };
    writeSession(remember, next);
    setSession(next);
  }, []);

  // "Teste grátis de 3 dias": nome + e-mail, sem senha. A conta de teste entra direto (e guarda de que anúncio veio).
  const startTrial = useCallback(async (name, email) => {
    const { token, account } = await authApi.demoRequest(name, email, getAttribution());
    const next = { token, account };
    writeSession(true, next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearSession();
    setSession(null);
  }, []);

  // After a password change the server issues a fresh token for this device.
  const replaceSession = useCallback(({ token, account }) => {
    const next = { token, account };
    writeSession(isRemembered(), next);
    setSession(next);
  }, []);

  return (
    <AuthContext.Provider
      value={{ token: session?.token || null, account: session?.account || null, checking, login, startTrial, logout, replaceSession }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error('useAuth must be used within AuthProvider');
  return ctx;
}
