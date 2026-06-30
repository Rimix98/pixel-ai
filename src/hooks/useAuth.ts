"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";

interface User {
  id: string;
  email: string;
  full_name?: string;
  preferences?: string;
  subscription_tier?: string;
  messages_used_hourly?: number;
  hourly_reset_at?: string;
  messages_used_weekly?: number;
  weekly_reset_at?: string;
}

export function useAuth() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  useEffect(() => {
    fetch("/api/auth/me")
      .then((res) => res.json())
      .then((data) => {
        setUser(data.user);
        setLoading(false);
        if (!data.user) {
          router.push("/login");
        }
      })
      .catch(() => {
        setLoading(false);
        router.push("/login");
      });
  }, []);

  return {
    user,
    loading,
    refreshUser: useCallback(async () => {
      const res = await fetch("/api/auth/me");
      const data = await res.json();
      setUser(data.user);
    }, []),
    signOut: useCallback(async () => {
      await fetch("/api/auth/logout", { method: "POST" });
      setUser(null);
      router.push("/login");
    }, []),
  };
}
