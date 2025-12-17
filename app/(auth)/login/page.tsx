"use client";

import { Suspense, useEffect, useState } from "react";
import { signInWithEmailAndPassword } from "firebase/auth";
import { useRouter, useSearchParams } from "next/navigation";
import { auth } from "@/lib/firebase";

function LoginInner() {
  const router = useRouter();
  const search = useSearchParams();
  const nextPath = search.get("next") || "/";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [err, setErr] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    setErr(null);
  }, [email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    setErr(null);

    try {
      await signInWithEmailAndPassword(auth, email, password);
      router.replace(nextPath);
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main style={{ minHeight: "100vh", display: "grid", placeItems: "center" }}>
      <form
        onSubmit={onSubmit}
        style={{
          width: 380,
          padding: 24,
          borderRadius: 12,
          background: "rgba(0,0,0,0.25)",
        }}
      >
        <h1 style={{ marginBottom: 16, fontSize: 24, fontWeight: 700 }}>
          Sign in
        </h1>

        <label style={{ display: "block", marginBottom: 8 }}>Email</label>
        <input
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          type="email"
          style={{ width: "100%", padding: 10, marginBottom: 12, borderRadius: 8 }}
          autoComplete="email"
        />

        <label style={{ display: "block", marginBottom: 8 }}>Password</label>
        <input
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          type="password"
          style={{ width: "100%", padding: 10, marginBottom: 12, borderRadius: 8 }}
          autoComplete="current-password"
        />

        {err && <div style={{ marginBottom: 12 }}>{err}</div>}

        <button
          type="submit"
          disabled={loading}
          style={{ width: "100%", padding: 12, borderRadius: 10, fontWeight: 700 }}
        >
          {loading ? "Signing in..." : "Login"}
        </button>
      </form>
    </main>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginInner />
    </Suspense>
  );
}
