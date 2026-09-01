"use client";

import { useRouter } from "next/navigation";

export default function Navbar() {
  const router = useRouter();

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    router.push("/login");
    router.refresh();
  };

  return (
    <div className="floating-nav-container">
      <nav className="floating-nav shadow-lg sm:shadow-2xl shadow-emerald-950/5 sm:shadow-emerald-200/40">
        <div className="flex items-center gap-2 sm:gap-6 md:gap-16">
          <div
            className="flex items-center gap-2.5 sm:gap-4 cursor-pointer group"
            onClick={() => router.push("/dashboard")}
            role="button"
            tabIndex={0}
            aria-label="Go to Dashboard"
          >
            <div className="w-8 h-8 sm:w-11 sm:h-11 md:w-13 md:h-13 bg-gradient-to-br from-slate-900 to-emerald-950 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-md sm:shadow-xl transform group-hover:rotate-12 transition-all duration-300 active:scale-95 shrink-0">
              <svg className="w-4 h-4 sm:w-6 sm:h-6 md:w-7 md:h-7 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 21a10.003 10.003 0 008.381-4.562l.054.09c-1.744-2.772-2.753-6.054-2.753-9.571V7a1 1 0 00-1-1h-2.147a3 3 0 01-3.706-3.706V3a1 1 0 00-1-1H7a1 1 0 00-1 1v2.147a3 3 0 01-3.706 3.706H1a1 1 0 00-1 1v3.136" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-base sm:text-xl md:text-2xl font-black text-slate-800 leading-none tracking-tight sm:tracking-tighter">
                GATE<span className="text-emerald-600">PASS</span>
              </span>
              <span className="hidden xs:inline-block text-[8px] sm:text-[9px] font-bold text-slate-400 tracking-wider uppercase mt-0.5">
                KIIT Campus
              </span>
            </div>
          </div>

          <div className="hidden lg:flex items-center gap-2.5 px-4 py-2 bg-slate-50/80 rounded-2xl border border-slate-100">
            <div className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Live Sync Active</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          aria-label="Logout"
          className="group flex items-center justify-center gap-2 sm:gap-3 px-3 sm:px-6 md:px-8 py-2 sm:py-3 bg-slate-900 text-white rounded-xl sm:rounded-2xl md:rounded-[1.8rem] hover:bg-emerald-600 transition-all duration-300 active:scale-95 shadow-md sm:shadow-xl shadow-slate-900/10 touch-btn shrink-0"
        >
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider sm:tracking-[0.2em]">
            <span className="inline sm:hidden">Logout</span>
            <span className="hidden sm:inline">Close Session</span>
          </span>
          <div className="w-6 h-6 sm:w-7 sm:h-7 bg-white/10 rounded-full flex items-center justify-center group-hover:translate-x-0.5 transition-transform">
            <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        </button>
      </nav>
    </div>
  );
}
