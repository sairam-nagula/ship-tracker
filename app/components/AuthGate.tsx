"use client";

import { onAuthStateChanged } from "firebase/auth";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { auth } from "@/lib/firebase";

export function AuthGate({ children }: { children: React.ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const search = useSearchParams();

  const [ready, setReady] = useState(false);
  const [authed, setAuthed] = useState(false);

  const nextParam = useMemo(() => {
    const qs = search?.toString();
    return qs && qs.length ? `${pathname}?${qs}` : pathname;
  }, [pathname, search]);

  useEffect(() => {
    const unsub = onAuthStateChanged(auth, (user) => {
      setAuthed(!!user);
      setReady(true);
    });
    return () => unsub();
  }, []);

  useEffect(() => {
    if (!ready) return;
    if (!authed) {
      router.replace(`/login?next=${encodeURIComponent(nextParam)}`);
    }
  }, [ready, authed, router, nextParam]);

  if (!ready) return null;
  if (!authed) return null;

  return <>{children}</>;
}
