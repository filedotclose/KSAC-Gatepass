"use client";

import { IUser } from "@/types/user";
import { useEffect, useState } from "react";
import { dispatchGateway, GATEWAY_OPCODES } from "@/lib/gatewayClient";

interface Props {
  user: IUser;
}

export default function WardenView({ user }: Props) {
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchPasses = async () => {
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.FETCH_WARDEN_PASSES);
      if (res.ok && Array.isArray(res.data)) {
        setPasses(res.data);
      }
    } catch (err) {
      console.error("Failed to fetch passes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const handleAction = async (endpoint: string, passId: string) => {
    try {
      let res;
      if (endpoint === "approve") {
        res = await dispatchGateway(GATEWAY_OPCODES.ACTION_PASS_APPROVE, { passId });
      } else {
        const movementType = endpoint === "hostel-exit" ? "HOSTEL_EXIT" : "HOSTEL_ENTRY";
        res = await dispatchGateway(GATEWAY_OPCODES.RECORD_GATE_MOVEMENT, { passId, movementType });
      }

      if (res.ok) {
        fetchPasses();
      } else {
        alert(res.message || "Action failed");
      }
    } catch (err) {
      console.error("Action failed", err);
    }
  };

  const pendingPasses = passes.filter(p => p.status === "PENDING");
  const activePasses = passes.filter(p => p.status === "APPROVED" || p.status === "IN_KSAC");
  const historyPasses = passes.filter(p => p.status === "RETURNED");

  const formatTime = (date: any) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in slide-in-from-bottom duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="bg-slate-900 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl uppercase tracking-widest shadow-md">
              Hostel Admin
            </span>
            <span className="text-xs font-bold text-slate-400">KIIT Campus Resident Gate Control</span>
          </div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Hostel Control Center</h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Chief Administrator: <span className="gradient-text font-black">{user.name}</span>
          </p>
        </div>
        <div className="flex gap-4 overflow-x-auto pb-2 md:pb-0">
          <div className="bg-white px-7 py-4.5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 ring-1 ring-slate-200/50 shrink-0">
            <div className="p-3 bg-amber-50 text-amber-600 rounded-2xl shadow-inner">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 leading-none">{pendingPasses.length}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">To Review</p>
            </div>
          </div>
          <div className="bg-white px-7 py-4.5 rounded-[2rem] shadow-sm border border-slate-100 flex items-center gap-4 ring-1 ring-slate-200/50 shrink-0">
            <div className="p-3 bg-emerald-50 text-emerald-700 rounded-2xl shadow-inner">
              <svg className="w-7 h-7" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
              </svg>
            </div>
            <div>
              <p className="text-3xl font-black text-slate-800 leading-none">{activePasses.length}</p>
              <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">At KSAC / Active</p>
            </div>
          </div>
        </div>
      </header>

      {/* Security & Overview Card */}
      <div className="bg-slate-900 p-9 rounded-[3rem] shadow-2xl relative overflow-hidden group text-white">
        <div className="absolute top-0 right-0 p-10 opacity-10 scale-150 rotate-12 group-hover:rotate-0 transition-transform duration-1000">
          <svg className="w-40 h-40 text-emerald-500" fill="currentColor" viewBox="0 0 24 24">
            <path d="M12 1L3 5v6c0 5.55 3.84 10.74 9 12 5.16-1.26 9-6.45 9-12V5l-9-4zm0 2.18l7 3.11v4.71c0 4.49-3 8.71-7 9.82-4-1.11-7-5.33-7-9.82V6.29l7-3.11zm1 10.82h-2V16h2v-2zm0-2h-2V7h2v5z" />
          </svg>
        </div>
        <div className="relative z-10 space-y-4">
          <div className="flex justify-between items-start">
            <h3 className="text-emerald-400 text-xs font-black uppercase tracking-[0.3em]">Anti-Tamper Live Monitoring</h3>
            <button
              onClick={fetchPasses}
              className="text-white/60 hover:text-white transition-colors flex items-center gap-2 text-[10px] font-black uppercase tracking-widest bg-white/10 px-3.5 py-1.5 rounded-xl border border-white/10"
            >
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
              </svg>
              Sync Gate Records
            </button>
          </div>
          <p className="text-white text-2xl font-bold max-w-2xl leading-snug tracking-tight">
            Digital pass validation active 24/7. <span className="text-slate-400">All KSAC movement and in-time extensions are digitally corroborated by KSAC desk check-ins.</span>
          </p>
          <div className="pt-2 flex flex-wrap gap-6 text-xs font-bold text-slate-400">
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-500 rounded-full animate-pulse"></span>
              Hostel Gate Dispatch: Live
            </div>
            <div className="flex items-center gap-2">
              <span className="w-2 h-2 bg-emerald-400 rounded-full"></span>
              KSAC Activity Desk Sync: Enabled
            </div>
          </div>
        </div>
      </div>

      {/* Tables Grid */}
      <div className="grid grid-cols-1 gap-12">
        {/* 1. Approval Queue */}
        <section className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
          <div className="px-10 py-7 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Pending Approval Queue</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Review student requests for KSAC activities and in-time permissions</p>
            </div>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 px-4 py-2 rounded-2xl text-[10px] font-black uppercase tracking-widest">
              {pendingPasses.length} Requests
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/10">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Student & Society</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Purpose & Extension</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 text-right">Decision</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {pendingPasses.map(pass => (
                  <tr key={pass._id} className="hover:bg-slate-50/50 transition-colors group">
                    <td className="px-8 py-7">
                      <div className="flex items-center gap-4">
                        <div className="w-13 h-13 rounded-2xl bg-emerald-50 flex items-center justify-center text-emerald-700 text-lg font-black shrink-0 shadow-inner">
                          {pass.studentId?.name?.charAt(0) || "S"}
                        </div>
                        <div>
                          <p className="font-black text-slate-800 tracking-tight text-base leading-snug">{pass.studentId?.name}</p>
                          <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pass.studentId?.rollNo}</p>
                          <span className="inline-block mt-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            {pass.society || "KSAC Activity"}
                          </span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-7">
                      <div className="max-w-md space-y-1">
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl inline-block border border-emerald-200">
                          Target In-Time: {pass.requestedExtension || "Standard"}
                        </span>
                        <p className="text-xs font-semibold text-slate-600 leading-relaxed italic">"{pass.reason}"</p>
                      </div>
                    </td>
                    <td className="px-8 py-7 text-right">
                      <button
                        onClick={() => handleAction("approve", pass._id)}
                        className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-7 py-3.5 rounded-2xl hover:bg-emerald-700 hover:scale-105 transition-all shadow-lg shadow-emerald-100 active:scale-95"
                      >
                        Grant Pass
                      </button>
                    </td>
                  </tr>
                ))}
                {pendingPasses.length === 0 && (
                  <tr>
                    <td colSpan={3} className="py-20 text-center font-black text-slate-300 uppercase tracking-[0.4em] text-xs">
                      No pending requests in queue
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 2. Active Movements */}
        <section className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
          <div className="px-10 py-7 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Live Active Movements</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Track departure, KSAC presence, and mark student return</p>
            </div>
            <span className="flex items-center gap-2 text-[10px] font-black text-emerald-700 uppercase tracking-widest bg-emerald-50 px-4 py-2 rounded-xl border border-emerald-200">
              <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full animate-pulse"></span>
              Gate Live
            </span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/10">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Student & Society</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Current Status</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Movement Timeline</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 text-right">Hostel Gate Ops</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {activePasses.map(pass => (
                  <tr key={pass._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-7">
                      <div className="font-black text-slate-800 tracking-tight text-base">{pass.studentId?.name}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pass.studentId?.rollNo}</div>
                      <span className="inline-block mt-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                        {pass.society}
                      </span>
                    </td>
                    <td className="px-8 py-7">
                      <div className="space-y-1.5">
                        <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest ${
                          pass.status === "IN_KSAC" ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200" : "bg-teal-50 text-teal-700 ring-1 ring-teal-200"
                        }`}>
                          <span className={`w-1.5 h-1.5 rounded-full ${pass.status === "IN_KSAC" ? "bg-emerald-500 animate-pulse" : "bg-teal-500"}`}></span>
                          {pass.status.replace("_", " ")}
                        </div>
                        <p className="text-[10px] font-black text-emerald-700">Curfew: {pass.requestedExtension || "Standard"}</p>
                      </div>
                    </td>
                    <td className="px-8 py-7">
                      <div className="flex items-center gap-3">
                        <div className="flex flex-col items-center">
                          <span className={`text-[8px] font-black uppercase ${pass.hostelOutTime ? 'text-emerald-600' : 'text-slate-300'}`}>Hostel Exit</span>
                          <span className="text-xs font-bold text-slate-700">{formatTime(pass.hostelOutTime)}</span>
                        </div>
                        <div className="w-3 h-[1px] bg-slate-200 mt-2"></div>
                        <div className="flex flex-col items-center">
                          <span className={`text-[8px] font-black uppercase ${pass.ksacInTime ? 'text-emerald-600' : 'text-slate-300'}`}>KSAC In</span>
                          <span className="text-xs font-bold text-slate-700">{formatTime(pass.ksacInTime)}</span>
                        </div>
                        <div className="w-3 h-[1px] bg-slate-200 mt-2"></div>
                        <div className="flex flex-col items-center">
                          <span className={`text-[8px] font-black uppercase ${pass.ksacOutTime ? 'text-emerald-600' : 'text-slate-300'}`}>KSAC Out</span>
                          <span className="text-xs font-bold text-slate-700">{formatTime(pass.ksacOutTime)}</span>
                        </div>
                      </div>
                    </td>
                    <td className="px-8 py-7 text-right space-x-2">
                      {!pass.hostelOutTime && (
                        <button
                          onClick={() => handleAction("hostel-exit", pass._id)}
                          className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl hover:bg-slate-800 transition-all active:scale-95 shadow-md"
                        >
                          Mark Gate Exit
                        </button>
                      )}
                      {(pass.status === "IN_KSAC" || (pass.status === "APPROVED" && pass.hostelOutTime)) && (
                        <button
                          onClick={() => handleAction("hostel-entry", pass._id)}
                          className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl hover:bg-emerald-700 transition-all active:scale-95 shadow-lg shadow-emerald-100"
                        >
                          Confirm Re-Entry
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
                {activePasses.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-20 text-center font-black text-slate-300 uppercase tracking-[0.4em] text-xs">
                      No active movements currently outside
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>

        {/* 3. Completed Sessions History */}
        <section className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
          <div className="px-10 py-7 border-b border-slate-50 bg-slate-50/30 flex justify-between items-center">
            <div>
              <h3 className="text-2xl font-black text-slate-800 tracking-tight">Completed Movement History</h3>
              <p className="text-xs text-slate-400 font-semibold mt-0.5">Audit log with verified timestamps</p>
            </div>
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Completed Sessions</span>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-slate-50/10">
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Student & Society</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Hostel Exit</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">KSAC In/Out</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">Hostel Return</th>
                  <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 text-right">Status</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-50">
                {historyPasses.map(pass => (
                  <tr key={pass._id} className="hover:bg-slate-50/50 transition-colors">
                    <td className="px-8 py-7">
                      <div className="font-black text-slate-800 tracking-tight">{pass.studentId?.name}</div>
                      <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">{pass.studentId?.rollNo}</div>
                      <span className="inline-block mt-1 text-[9px] font-black text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded">
                        {pass.society}
                      </span>
                    </td>
                    <td className="px-8 py-7">
                      <div className="text-sm font-bold text-slate-700">{formatTime(pass.hostelOutTime)}</div>
                    </td>
                    <td className="px-8 py-7">
                      <div className="text-[10px] font-bold text-slate-600">IN: {formatTime(pass.ksacInTime)}</div>
                      <div className="text-[10px] font-bold text-slate-600">OUT: {formatTime(pass.ksacOutTime)}</div>
                    </td>
                    <td className="px-8 py-7">
                      <div className="text-sm font-black text-emerald-600">{formatTime(pass.hostelInTime)}</div>
                    </td>
                    <td className="px-8 py-7 text-right">
                      <span className="inline-flex px-3 py-1 bg-emerald-50 text-emerald-700 rounded-xl text-[10px] font-black uppercase tracking-widest border border-emerald-100">
                        Returned Safe
                      </span>
                    </td>
                  </tr>
                ))}
                {historyPasses.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-20 text-center font-black text-slate-300 uppercase tracking-[0.4em] text-xs">
                      No completed history records yet
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      </div>
    </div>
  );
}
