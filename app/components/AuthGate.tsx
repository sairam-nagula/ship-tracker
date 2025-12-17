// app/components/AuthGate.tsx
"use client";

import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";

async function fetchBypass(): Promise<boolean> {
  try {
    const res = await fetch("/api/authenticate", {
      cache: "no-store",
    });

    if (!res.ok) return false;
    const data = await res.json();
    return !!data?.bypass;
  } catch {
    return false;
  }
}

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);
  const [bypass, setBypass] = useState<boolean | null>(null);

  const nextParam = useMemo(() => {
    const qs = search?.toString();
    return qs && qs.length ? `${pathname}?${qs}` : pathname;
  }, [pathname, search]);

  useEffect(() => {
    let alive = true;

    fetchBypass().then((b) => {
      if (!alive) return;
      setBypass(b);
    });

    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthed(!!user);
      setReady(true);
    });

    return () => {
      alive = false;
      unsub();
    };
  }, []);

  useEffect(() => {
    if (bypass === null) return;

    if (bypass) {
      if (pathname === "/login") router.replace("/");
      return;
    }

    if (!ready) return;
    if (!authed) {
      router.replace(`/login?next=${encodeURIComponent(nextParam)}`);
    }
  }, [bypass, ready, authed, router, nextParam, pathname]);

  if (bypass === null) return null;
  if (bypass) return <>{children}</>;

  if (!ready) return null;
  if (!authed) return null;

  return <>{children}</>;
}
