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
      setError("Invalid email domain: Only official @kiit.ac.in email addresses are permitted.");
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
    <div className="min-h-screen flex items-center justify-center p-6 relative overflow-hidden selection:bg-emerald-100 selection:text-emerald-800">
      {/* Subtle Grid Overlay */}
      <div className="absolute inset-0 opacity-[0.015] pointer-events-none"
        style={{ backgroundImage: 'radial-gradient(#000 1px, transparent 1px)', backgroundSize: '40px 40px' }}>
      </div>

      <div className="max-w-5xl w-full grid grid-cols-1 lg:grid-cols-2 gap-12 items-center relative">
        {/* Left: Branding & Info */}
        <div className="hidden lg:block space-y-10 animate-in slide-in-from-bottom duration-700">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="bg-emerald-600 text-white text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest shadow-sm">
                KIIT KSAC & Hostels
              </span>
              <span className="text-xs font-bold text-slate-400">24/7 Gate & Room Booking</span>
            </div>
            <h1 className="text-6xl font-black text-slate-900 leading-[1.1] tracking-tighter">
              KSAC Digital <br />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-600 via-teal-600 to-emerald-700">GatePass & Rooms</span>.
            </h1>
            <p className="text-xl text-slate-500 font-medium leading-relaxed max-w-md">
              Digital gatepasses, society room reservation allocations, and real-time activity desk verification for KIIT University.
            </p>
          </div>

          <div className="grid grid-cols-2 gap-8">
            <div className="space-y-2">
              <p className="text-3xl font-black text-slate-800">31+</p>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Active KSAC Societies</p>
            </div>
            <div className="space-y-2">
              <p className="text-3xl font-black text-slate-800">100%</p>
              <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Digital Verification</p>
            </div>
          </div>
        </div>

        {/* Right: Login Card */}
        <div className="bg-white p-12 rounded-[3rem] shadow-2xl border border-slate-100 ring-1 ring-slate-200/50 relative animate-in zoom-in duration-700">
          <div className="space-y-2 mb-10 text-center lg:text-left">
            <h2 className="text-3xl font-black text-slate-900 tracking-tight">Access Portal</h2>
            <p className="text-slate-500 font-medium text-sm">Sign in with your official KIIT credentials.</p>
          </div>

          <form onSubmit={handleLogin} className="space-y-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center ml-1">
                <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">KIIT Campus Email</label>
                <span className="text-[9px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">@kiit.ac.in only</span>
              </div>
              <input
                type="email"
                placeholder="23051959@kiit.ac.in or ksac@kiit.ac.in"
                className="w-full bg-slate-50 border border-slate-100 p-4.5 rounded-3xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-700 placeholder:text-slate-300 text-sm"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <label className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] ml-1">Password</label>
              <input
                type="password"
                placeholder="••••••••"
                className="w-full bg-slate-50 border border-slate-100 p-4.5 rounded-3xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 transition-all font-medium text-slate-700 placeholder:text-slate-300 text-sm"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
              />
            </div>

            {error && (
              <div className="p-4 bg-red-50 border border-red-100 text-red-600 rounded-2xl text-xs font-bold animate-in fade-in flex items-center gap-2">
                <svg className="w-4 h-4 shrink-0" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
                <span>{error}</span>
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="w-full bg-slate-900 text-white font-black py-4.5 rounded-3xl shadow-xl shadow-emerald-100 hover:bg-emerald-600 hover:-translate-y-0.5 transition-all active:scale-95 disabled:opacity-50 disabled:translate-y-0 flex items-center justify-center gap-3 tracking-[0.15em] uppercase text-[10px]"
            >
              {loading ? (
                <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin"></div>
              ) : (
                <>
                  Authenticate with KIIT ID
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <p className="mt-8 text-center text-[10px] font-black text-slate-400 uppercase tracking-widest">
            KIIT Student Activity Center & Hostel Security
          </p>
        </div>
      </div>
    </div>
  );
}
