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
      <nav className="floating-nav shadow-2xl shadow-emerald-200/40">
        <div className="flex items-center gap-16">
          <div className="flex items-center gap-3 sm:gap-5 cursor-pointer group" onClick={() => router.push("/dashboard")}>
            <div className="w-10 h-10 sm:w-14 sm:h-14 bg-linear-to-br from-slate-900 to-emerald-950 rounded-xl sm:rounded-2xl flex items-center justify-center shadow-xl transform group-hover:rotate-12 transition-all duration-500">
              <svg className="w-6 h-6 sm:w-8 sm:h-8 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 11c0 3.517-1.009 6.799-2.753 9.571m-3.44-2.04l.054-.09A10.003 10.003 0 0012 21a10.003 10.003 0 008.381-4.562l.054.09c-1.744-2.772-2.753-6.054-2.753-9.571V7a1 1 0 00-1-1h-2.147a3 3 0 01-3.706-3.706V3a1 1 0 00-1-1H7a1 1 0 00-1 1v2.147a3 3 0 01-3.706 3.706H1a1 1 0 00-1 1v3.136" />
              </svg>
            </div>
            <div className="flex flex-col">
              <span className="text-xl sm:text-2xl font-black text-slate-800 leading-none tracking-tighter">GATE<span className="text-emerald-600">PASS</span></span>
            </div>
          </div>

          <div className="hidden xl:flex items-center gap-3 px-6 py-3 bg-slate-50/50 rounded-3xl border border-slate-100">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Status: Logged in</span>
          </div>
        </div>

        <button
          onClick={handleLogout}
          className="group flex items-center justify-center sm:gap-5 px-4 sm:px-10 py-3 sm:py-4 bg-slate-900 text-white rounded-2xl sm:rounded-[2rem] hover:bg-emerald-600 transition-all duration-500 active:scale-95 shadow-2xl shadow-slate-900/10"
        >
          <span className="hidden sm:block text-[10px] font-black uppercase tracking-[0.2em]">Close Session</span>
          <div className="w-8 h-8 bg-white/10 rounded-full flex items-center justify-center group-hover:translate-x-1 transition-transform">
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </div>
        </button>
      </nav>
    </div>
  );
}
