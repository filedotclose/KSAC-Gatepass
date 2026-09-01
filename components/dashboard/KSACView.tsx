"use client";

import { IUser } from "@/types/user";
import { useEffect, useState } from "react";

interface Props {
  user: IUser;
}

export default function KSACView({ user }: Props) {
  const [passes, setPasses] = useState<any[]>([]);
  const [registry, setRegistry] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedSociety, setSelectedSociety] = useState<string>("ALL");

  const fetchData = async () => {
    setLoading(true);
    try {
      const [passesRes, registryRes] = await Promise.all([
        fetch("/api/pass"),
        fetch("/api/pass/registry")
      ]);
      const [passesData, registryData] = await Promise.all([
        passesRes.json(),
        registryRes.json()
      ]);
      setPasses(Array.isArray(passesData) ? passesData : []);
      setRegistry(Array.isArray(registryData) ? registryData : []);
    } catch (err) {
      console.error("Failed to fetch KSAC data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleAction = async (endpoint: string, passId: string) => {
    try {
      const res = await fetch(`/api/pass/${endpoint}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ passId }),
      });

      if (res.ok) {
        fetchData();
      } else {
        const data = await res.json();
        alert(data.message || "Action failed");
      }
    } catch (err) {
      console.error("Action error", err);
    }
  };

  const formatTime = (date: any) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  const activeInKSAC = passes.filter(p => p.status === "IN_KSAC");
  const awaitingCheckIn = passes.filter(p => p.status === "APPROVED");

  const filteredRegistry = selectedSociety === "ALL" 
    ? registry 
    : registry.filter(r => r.society?.toLowerCase().includes(selectedSociety.toLowerCase()));

  const societiesList = Array.from(new Set(registry.map(r => r.society).filter(Boolean)));

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in zoom-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl uppercase tracking-widest shadow-md shadow-emerald-100">
              Activity Hub
            </span>
            <span className="text-xs font-bold text-slate-400">KIIT Student Activity Center</span>
          </div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">KSAC Authority Desk</h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Coordinating Officer: <span className="gradient-text font-black">{user.name}</span>
          </p>
        </div>
        <div className="flex gap-4">
          <button
            onClick={fetchData}
            disabled={loading}
            className="bg-white/80 hover:bg-white px-6 py-4 rounded-3xl border border-slate-200 flex items-center gap-4 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <svg className={`w-4 h-4 text-emerald-600 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">Refresh Feed</span>
          </button>
          <div className="bg-emerald-50 px-6 py-4 rounded-3xl border border-emerald-200 flex items-center gap-4 shadow-sm">
            <div className="w-3 h-3 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-emerald-700 uppercase tracking-widest">Attendance Online</span>
          </div>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left column: Summary & Guidelines */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-emerald-800 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
            <div className="absolute -top-10 -left-10 opacity-10 group-hover:scale-110 transition-transform duration-700">
              <svg className="w-48 h-48" fill="currentColor" viewBox="0 0 24 24">
                <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
              </svg>
            </div>
            <h3 className="text-lg font-black mb-6 uppercase tracking-widest text-emerald-200">Verification Protocols</h3>
            <ul className="space-y-4 relative">
              {[
                "Confirm student presence upon physical arrival at KSAC building.",
                "Validate society session / room allocation before granting entry.",
                "Mark departure right as session ends to avoid curfew tamper flags."
              ].map((text, idx) => (
                <li key={idx} className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <p className="text-xs font-bold text-emerald-50 leading-relaxed">{text}</p>
                </li>
              ))}
            </ul>
          </div>

          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 ring-1 ring-slate-200/50">
            <h3 className="text-lg font-black text-slate-800 mb-4 uppercase tracking-widest">Live Activity Stats</h3>
            <div className="space-y-4">
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">In Activity Center</span>
                  <span className="text-[10px] text-slate-500 font-bold">Currently in societies</span>
                </div>
                <span className="text-2xl font-black text-emerald-600">{activeInKSAC.length}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">En Route / Awaiting</span>
                  <span className="text-[10px] text-slate-500 font-bold">Approved by warden</span>
                </div>
                <span className="text-2xl font-black text-amber-600">{awaitingCheckIn.length}</span>
              </div>
              <div className="flex justify-between items-center p-4 bg-slate-50 rounded-2xl">
                <div>
                  <span className="text-xs font-black text-slate-400 uppercase tracking-widest block">Total Attendees</span>
                  <span className="text-[10px] text-slate-500 font-bold">Logged today</span>
                </div>
                <span className="text-2xl font-black text-emerald-600">{registry.length}</span>
              </div>
            </div>
          </div>
        </div>

        {/* Right column: Live Check-in Desk & Daily Registry */}
        <div className="lg:col-span-8 space-y-12">
          {/* Active Traffic Table */}
          <section className="bg-white rounded-[3.5rem] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
            <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">Live Desk Management</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Real-time entry verification & exit logging</p>
                </div>
              </div>
              <span className="hidden sm:block text-xs font-black text-emerald-700 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200">
                {passes.length} Total Queue
              </span>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/10">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 underline decoration-emerald-300 decoration-2 underline-offset-4">Student & Society</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Curfew Extension</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Status</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 text-right">Desk Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {passes.map(pass => (
                    <tr key={pass._id} className="group hover:bg-slate-50/50 transition-all duration-300">
                      <td className="px-8 py-7">
                        <div className="flex items-center gap-4">
                          <div className="w-12 h-12 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-black shrink-0 group-hover:bg-emerald-50 group-hover:text-emerald-600 transition-colors">
                            {pass.studentId?.name?.charAt(0) || "S"}
                          </div>
                          <div>
                            <p className="font-black text-slate-800 tracking-tight text-base leading-snug">{pass.studentId?.name}</p>
                            <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pass.studentId?.rollNo}</p>
                            <span className="inline-block mt-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                              {pass.society || "KSAC Society"}
                            </span>
                          </div>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className="space-y-1">
                          <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl inline-block border border-emerald-200">
                            Until {pass.requestedExtension || "09:30 PM"}
                          </span>
                          <p className="text-[10px] text-slate-400 font-medium truncate max-w-[160px] italic">"{pass.reason}"</p>
                        </div>
                      </td>
                      <td className="px-8 py-7">
                        <div className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${pass.status === "APPROVED" ? "bg-amber-50 text-amber-600 ring-1 ring-amber-100" :
                          "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                          }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pass.status === "APPROVED" ? "bg-amber-500" : "bg-emerald-500 animate-pulse"}`}></span>
                          {pass.status === "APPROVED" ? "Awaiting Check-in" : "In KSAC"}
                        </div>
                      </td>
                      <td className="px-8 py-7 text-right">
                        {pass.status === "APPROVED" ? (
                          <button
                            onClick={() => handleAction("ksac-entry", pass._id)}
                            className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-2xl hover:bg-emerald-600 hover:scale-105 transition-all active:scale-95 shadow-lg shadow-slate-100"
                          >
                            Check In
                          </button>
                        ) : (
                          <button
                            onClick={() => handleAction("ksac-exit", pass._id)}
                            disabled={!!pass.ksacOutTime}
                            className={`font-black text-[10px] uppercase tracking-widest px-6 py-3.5 rounded-2xl transition-all shadow-lg ${pass.ksacOutTime
                                ? "bg-slate-100 text-slate-400 cursor-not-allowed shadow-none"
                                : "bg-emerald-50 text-emerald-700 hover:bg-emerald-100 hover:scale-105 active:scale-95 border border-emerald-300"
                              }`}
                          >
                            {pass.ksacOutTime ? "Marked Departed" : "Mark Departure"}
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {passes.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-32 text-center font-black text-slate-300 uppercase tracking-[0.4em] text-xs">
                        No active KSAC passes right now
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* Today's KSAC Registry */}
          <section className="bg-slate-900 rounded-[3.5rem] shadow-2xl overflow-hidden ring-1 ring-white/10">
            <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-white/10 text-white rounded-2xl shadow-inner border border-white/5">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">Today's KSAC Registry</h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">Verified society records for {new Date().toLocaleDateString()}</p>
                </div>
              </div>

              {societiesList.length > 0 && (
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Filter:</span>
                  <select
                    value={selectedSociety}
                    onChange={(e) => setSelectedSociety(e.target.value)}
                    className="bg-white/10 text-white text-xs font-bold rounded-xl px-3 py-2 border border-white/10 focus:outline-none"
                  >
                    <option value="ALL" className="bg-slate-900 text-white">All Societies</option>
                    {societiesList.map((soc: any) => (
                      <option key={soc} value={soc} className="bg-slate-900 text-white">{soc}</option>
                    ))}
                  </select>
                </div>
              )}
            </div>
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-black/20">
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/5">Member & Society</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/5">KSAC Entry</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/5">KSAC Departure</th>
                    <th className="px-8 py-6 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/5 text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  {filteredRegistry.map(record => (
                    <tr key={record._id} className="group hover:bg-white/5 transition-all duration-300">
                      <td className="px-8 py-7">
                        <div className="font-black text-white tracking-tight">{record.name}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{record.rollNo}</div>
                        <span className="inline-block mt-1 text-[9px] font-black text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800">
                          {record.society}
                        </span>
                      </td>
                      <td className="px-8 py-7 text-slate-300 font-bold text-sm tracking-tight">{formatTime(record.inTime)}</td>
                      <td className="px-8 py-7 text-slate-300 font-bold text-sm tracking-tight">{formatTime(record.outTime)}</td>
                      <td className="px-8 py-7 text-right">
                        <span className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${record.outTime ? 'text-emerald-400 bg-emerald-400/10 border border-emerald-500/20' : 'text-teal-400 bg-teal-400/10 border border-teal-500/20'}`}>
                          {record.outTime ? 'Completed' : 'In Session'}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredRegistry.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-24 text-center font-black text-slate-600 uppercase tracking-[0.4em] text-xs">
                        Registry is empty today
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}
