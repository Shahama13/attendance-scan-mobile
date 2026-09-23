import React, { createContext, useContext, useEffect, useState, useCallback } from "react";
import * as api from "../api/client";

const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [initializing, setInitializing] = useState(true);

  useEffect(() => {
    api.setUnauthorizedHandler(async () => {
      await api.logout();
      setUser(null);
    });

    (async () => {
      const stored = await api.getStoredUser();
      if (stored) {
        try {
          const fresh = await api.fetchMe(); // confirms the token is still valid
          setUser({ ...stored, ...fresh });
        } catch {
          await api.logout();
        }
      }
      setInitializing(false);
    })();
  }, []);

  const signIn = useCallback(async (username, password) => {
    const loggedInUser = await api.login(username, password);
    // /auth/login only returns campusId, not campusCode/campusName (those
    // need the join in /auth/me) — fetch that once right away so the
    // Home/Capture screens have the campus name to show immediately,
    // instead of only after the next cold start's fetchMe() call above.
    try {
      const fresh = await api.fetchMe();
      const merged = { ...loggedInUser, ...fresh };
      setUser(merged);
      return merged;
    } catch {
      // Non-fatal — login itself already succeeded, just show what we have.
      setUser(loggedInUser);
      return loggedInUser;
    }
  }, []);

  const signOut = useCallback(async () => {
    await api.logout();
    setUser(null);
  }, []);

  return (
    <AuthContext.Provider value={{ user, initializing, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within an AuthProvider");
  return ctx;
}