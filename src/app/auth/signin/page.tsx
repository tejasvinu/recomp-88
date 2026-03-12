'use client';

import { useState, useEffect } from "react";
import { signIn, useSession } from "next-auth/react";
import { useRouter } from "next/navigation";
import { Eye, EyeOff, Dumbbell, ArrowRight, Loader2 } from "lucide-react";

type Mode = "signin" | "signup";

export default function AuthPage() {
  const { data: session, status } = useSession();
  const router = useRouter();
  const [mode, setMode] = useState<Mode>("signin");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPw, setShowPw] = useState(false);
  const [loading, setLoading] = useState(false);
  const [googleLoading, setGoogleLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");

  useEffect(() => {
    if (status === "authenticated") router.replace("/");
  }, [session, status, router]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setSuccess("");
    setLoading(true);

    try {
      if (mode === "signup") {
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ name, email, password }),
        });
        const data = await res.json();
        if (!res.ok) { setError(data.error || "Registration failed"); setLoading(false); return; }
        // Auto sign-in after register
        const result = await signIn("credentials", { email, password, redirect: false });
        if (result?.error) { setError("Registered! Please sign in."); setMode("signin"); }
        else router.replace("/");
      } else {
        const result = await signIn("credentials", { email, password, redirect: false });
        if (result?.error) setError("Invalid email or password");
        else router.replace("/");
      }
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogle = async () => {
    setGoogleLoading(true);
    await signIn("google", { callbackUrl: "/" });
  };

  const handleGuestContinue = () => router.replace("/");

  if (status === "loading") {
    return (
      <div className="min-h-screen bg-[#080808] flex items-center justify-center">
        <div className="w-8 h-8 border-2 border-lime-400/30 border-t-lime-400 rounded-full animate-spin" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#080808] flex flex-col items-center justify-center p-4 relative overflow-hidden">
      {/* Background gradients */}
      <div className="fixed inset-0 bg-[radial-gradient(ellipse_at_top,rgba(163,230,53,0.08),transparent_60%),radial-gradient(ellipse_at_bottom_right,rgba(163,230,53,0.04),transparent_60%)] pointer-events-none" />
      <div className="fixed inset-0 pointer-events-none">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 w-96 h-96 rounded-full bg-lime-400/5 blur-3xl" />
      </div>

      <div className="relative z-10 w-full max-w-sm">
        {/* Logo */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-lime-400/10 border border-lime-400/20 mb-4 shadow-[0_0_30px_rgba(163,230,53,0.15)]">
            <Dumbbell size={32} className="text-lime-400" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-black uppercase tracking-[0.12em]">
            <span className="text-lime-400">Recomp</span>
            <span className="text-white"> 88</span>
          </h1>
          <p className="text-neutral-500 text-sm mt-1">Body recomposition tracker</p>
        </div>

        {/* Card */}
        <div className="bg-neutral-900/80 backdrop-blur-xl border border-white/8 rounded-3xl p-6 shadow-2xl">
          {/* Mode toggle */}
          <div className="flex bg-white/5 rounded-xl p-1 mb-6 gap-1">
            {(["signin", "signup"] as Mode[]).map((m) => (
              <button
                key={m}
                onClick={() => { setMode(m); setError(""); setSuccess(""); }}
                className={`flex-1 py-2 rounded-lg text-xs font-bold uppercase tracking-widest transition-all duration-200 ${
                  mode === m
                    ? "bg-lime-400 text-neutral-950 shadow-[0_0_12px_rgba(163,230,53,0.25)]"
                    : "text-neutral-500 hover:text-neutral-300"
                }`}
              >
                {m === "signin" ? "Sign In" : "Sign Up"}
              </button>
            ))}
          </div>

          {/* Google */}
          <button
            onClick={handleGoogle}
            disabled={googleLoading}
            className="w-full flex items-center justify-center gap-3 py-3 px-4 rounded-xl bg-white/5 border border-white/10 text-sm font-semibold text-neutral-200 hover:bg-white/8 hover:border-white/15 transition-all mb-4 disabled:opacity-50"
          >
            {googleLoading ? (
              <Loader2 size={16} className="animate-spin text-lime-400" />
            ) : (
              <svg width="18" height="18" viewBox="0 0 18 18"><path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/><path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/><path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/><path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 6.293C4.672 4.166 6.656 3.58 9 3.58z" fill="#EA4335"/></svg>
            )}
            Continue with Google
          </button>

          <div className="flex items-center gap-3 mb-4">
            <div className="flex-1 h-px bg-white/8" />
            <span className="text-[11px] text-neutral-600 uppercase tracking-widest">or</span>
            <div className="flex-1 h-px bg-white/8" />
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-3">
            {mode === "signup" && (
              <div>
                <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-widest">Name</label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                  placeholder="Your name"
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-lime-400/40 focus:bg-lime-400/5 transition-all"
                />
              </div>
            )}
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-widest">Email</label>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                placeholder="you@example.com"
                className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-lime-400/40 focus:bg-lime-400/5 transition-all"
              />
            </div>
            <div>
              <label className="block text-xs font-semibold text-neutral-400 mb-1.5 uppercase tracking-widest">Password</label>
              <div className="relative">
                <input
                  type={showPw ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  placeholder={mode === "signup" ? "Min. 6 characters" : "Your password"}
                  className="w-full bg-white/5 border border-white/10 rounded-xl px-4 py-3 pr-10 text-sm text-neutral-100 placeholder-neutral-600 focus:outline-none focus:border-lime-400/40 focus:bg-lime-400/5 transition-all"
                />
                <button
                  type="button"
                  onClick={() => setShowPw(!showPw)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-neutral-500 hover:text-neutral-300 transition-colors"
                >
                  {showPw ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {error && (
              <div className="bg-red-500/10 border border-red-500/20 rounded-xl px-4 py-2.5 text-xs text-red-400 font-medium">
                {error}
              </div>
            )}
            {success && (
              <div className="bg-lime-400/10 border border-lime-400/20 rounded-xl px-4 py-2.5 text-xs text-lime-400 font-medium">
                {success}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 py-3.5 rounded-xl bg-lime-400 text-neutral-950 text-sm font-black uppercase tracking-widest hover:bg-lime-300 active:scale-[0.98] transition-all shadow-[0_0_20px_rgba(163,230,53,0.3)] disabled:opacity-60 mt-2"
            >
              {loading ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <>
                  {mode === "signin" ? "Sign In" : "Create Account"}
                  <ArrowRight size={16} />
                </>
              )}
            </button>
          </form>
        </div>

        {/* Guest continue */}
        <button
          onClick={handleGuestContinue}
          className="w-full mt-4 text-neutral-600 text-xs hover:text-neutral-400 transition-colors py-2 uppercase tracking-widest font-semibold"
        >
          Continue as guest (local only)
        </button>
      </div>
    </div>
  );
}
