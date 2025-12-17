// app/login/page.tsx
"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
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

  const isDisabled = useMemo(() => {
    return loading || !email.trim() || !password.trim();
  }, [loading, email, password]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (isDisabled) return;

    setLoading(true);
    setErr(null);

    try {
      await signInWithEmailAndPassword(auth, email.trim(), password);
      router.replace(nextPath);
    } catch (e: any) {
      setErr(e?.message || "Login failed");
    } finally {
      setLoading(false);
    }
  }

  return (
    <main className="auth-root">
      <div className="auth-wrap">
        <header className="auth-header">
          <header className="auth-header">
            <img
                src="/MVASlogo.png"
                alt="Margaritaville At Sea"
                className="auth-logo"
            />
            </header>

          <p className="auth-sub">Ship Tracker</p>
        </header>

        <form onSubmit={onSubmit} className="auth-card">
          <div className="auth-card-body">
            <div className="auth-card-top">
              <div>
                <div className="auth-title">Sign in</div>
              </div>
              <div className="auth-pill">Secure</div>
            </div>

            <label className="auth-label">Email</label>
            <input
              className="auth-input"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              type="email"
              autoComplete="email"
              placeholder="name@company.com"
            />

            <label className="auth-label">Password</label>
            <input
              className="auth-input"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              type="password"
              autoComplete="current-password"
              placeholder="••••••••"
            />

            {err && <div className="auth-error">{err}</div>}

            <button
              type="submit"
              disabled={isDisabled}
              className={`auth-btn ${isDisabled ? "is-disabled" : ""}`}
            >
              {loading ? "Signing in..." : "Login"}
            </button>

            
          </div>

          <div className="auth-footer">
            <div className="auth-footer-text">
            © {new Date().getFullYear()} Margaritaville at Sea, LLC. All rights reserved.
            </div>

          </div>
        </form>
      </div>
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
