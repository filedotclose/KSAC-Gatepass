"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const cleanEmail = email.trim().toLowerCase();

    // Client-side domain check
    if (!cleanEmail.endsWith("@kiit.ac.in")) {
      setError("Only official @kiit.ac.in email addresses are permitted.");
      setLoading(false);
      return;
    }

    try {
      const res = await fetch("/api/auth/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: cleanEmail, password }),
      });

      const data = await res.json().catch(() => ({}));

      if (res.ok) {
        router.push("/dashboard");
        router.refresh();
      } else {
        setError(data.message || "Invalid email or password. Please check your credentials.");
        setLoading(false);
      }
    } catch {
      setError("An unexpected error occurred. Please try again.");
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center p-4 sm:p-6 md:p-10 relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-800">
      {/* Subtle Grid Overlay */}
      <div
        className="absolute inset-0 opacity-[0.02] pointer-events-none"
        style={{ backgroundImage: "radial-gradient(#000 1px, transparent 1px)", backgroundSize: "32px 32px" }}
      />

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 lg:gap-12 items-center relative z-10">
        {/* Left: Desktop Showcase (Hidden on small mobile) */}
        <div className="hidden lg:block space-y-8 animate-in slide-in-from-bottom duration-700">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-sm">
                KIIT KSAC & Hostels
              </span>
              <span className="text-xs font-bold text-slate-400">24/7 Gate & Room Booking</span>
            </div>
            <h1 className="text-5xl xl:text-6xl font-black text-slate-900 leading-[1.1] tracking-tighter">
              KSAC Digital <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700">GatePass & Rooms</span>.
            </h1>
            <p className="text-lg text-slate-500 font-medium leading-relaxed max-w-md">
              Digital gatepasses, society room reservation allocations, and real-time activity desk verification for KIIT University.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-1 bg-white/60 p-4 rounded-2xl border border-slate-100">
              <p className="text-3xl font-black text-slate-800">31+</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Active KSAC Societies</p>
            </div>
            <div className="space-y-1 bg-white/60 p-4 rounded-2xl border border-slate-100">
              <p className="text-3xl font-black text-slate-800">100%</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Digital Verification</p>
            </div>
          </div>
        </div>

        {/* Right / Main: Login Card (Mobile-First) */}
        <div className="bg-white p-5 sm:p-8 md:p-12 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] shadow-xl sm:shadow-2xl border border-slate-100 ring-1 ring-slate-200/50 relative animate-in zoom-in duration-300">
          {/* Mobile Header Banner */}
          <div className="space-y-2 mb-6 sm:mb-8 text-center lg:text-left">
            <div className="inline-flex lg:hidden items-center justify-center mb-1">
              <span className="text-xs font-black uppercase tracking-wider text-emerald-700 bg-emerald-50 px-3 py-1 rounded-lg border border-emerald-200/60">
                KSAC Portal
              </span>
            </div>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">Access Portal</h2>
            <p className="text-slate-500 font-medium text-xs sm:text-sm">Sign in with your official KIIT credentials.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-4 sm:space-y-5">
            <div className="space-y-1.5">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] sm:tracking-[0.2em]">
                  KIIT Campus Email
                </label>
                <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                  @kiit.ac.in
                </span>
              </div>
              <input
                type="email"
                placeholder="2XXXXXX@kiit.ac.in"
                className="w-full bg-slate-50 border border-slate-200/80 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-700 placeholder:text-slate-300 text-xs sm:text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-1.5">
              <label className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-[0.15em] sm:tracking-[0.2em] ml-1">
                Password
              </label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-200/80 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-700 placeholder:text-slate-300 text-xs sm:text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-3 sm:p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold animate-in fade-in flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0 text-red-500" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-md sm:shadow-xl shadow-slate-900/10 hover:bg-emerald-600 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-2 sm:gap-3 tracking-wider sm:tracking-[0.15em] uppercase text-[10px] sm:text-xs touch-btn"
            >
              {loading ? (
                <div className="w-4 h-4 sm:w-5 sm:h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  <span>Authenticate with KIIT ID</span>
                  <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="mt-6 sm:mt-8 text-center text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider sm:tracking-widest">
            KIIT Student Activity Center & Hostel Security
          </p>
        </div>
      </div>
    </div>
  );
}
