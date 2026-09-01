"use client";

import { IUser } from "@/types/user";
import { useEffect, useState } from "react";

interface Props {
  user: IUser;
}

const COMMON_SOCIETIES = [
  "Korus (Music Society)",
  "Kronicle (Literary & MUN Society)",
  "KIIT Robotics Society (KRS)",
  "K-Nalytics (Data Science & AI)",
  "K-Double-C (Competitive Coding)",
  "Kalakaar (Dramatics Society)",
  "Kamadhenu (Social & Environmental)",
  "Kzar (Fashion & Lifestyle)",
  "K-Gallery (Photography & Film)",
  "KSAC Central Organizing Team",
  "Other KSAC Wing / Workshop"
];

export default function StudentView({ user }: Props) {
  const [passes, setPasses] = useState<any[]>([]);
  const [society, setSociety] = useState(COMMON_SOCIETIES[0]);
  const [customSociety, setCustomSociety] = useState("");
  const [reason, setReason] = useState("");
  const [requestedExtension, setRequestedExtension] = useState("09:30 PM");
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);

  const fetchPasses = async () => {
    try {
      const res = await fetch("/api/pass");
      const data = await res.json();
      setPasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch passes", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchPasses();
  }, []);

  const handleRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    const finalSociety = society === "Other KSAC Wing / Workshop" && customSociety.trim() 
      ? customSociety.trim() 
      : society;

    try {
      const res = await fetch("/api/pass/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ 
          society: finalSociety,
          reason,
          requestedExtension: requestedExtension.trim()
        }),
      });

      if (res.ok) {
        setReason("");
        setCustomSociety("");
        fetchPasses();
      } else {
        const data = await res.json();
        alert(data.message || "Failed to request pass");
      }
    } catch (err) {
      console.error("Pass request error", err);
    } finally {
      setSubmitting(false);
    }
  };

  const activePass = passes.find(p => p.status !== "RETURNED" && p.status !== "REJECTED");

  return (
    <div className="max-w-7xl mx-auto space-y-10 animate-in fade-in duration-700">
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl uppercase tracking-widest shadow-md shadow-emerald-100">
              Student Portal
            </span>
            <span className="text-xs font-bold text-slate-400">KIIT Student Activity Center & Hostel GatePass</span>
          </div>
          <h2 className="text-5xl font-black text-slate-900 tracking-tighter">Student Hub</h2>
          <p className="text-slate-500 font-medium text-lg leading-relaxed">
            Welcome back, <span className="gradient-text font-black">{user.name}</span> ({user.rollNo}).
          </p>
        </div>
        <div className="hidden lg:flex items-center gap-5 bg-white/80 backdrop-blur-sm px-6 py-3.5 rounded-2xl border border-slate-200/70 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 bg-emerald-500 rounded-full animate-pulse"></div>
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">24/7 Gate & KSAC Sync: Active</span>
          </div>
          <div className="w-[1px] h-4 bg-slate-200"></div>
          <button
            onClick={fetchPasses}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white rounded-xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-emerald-700 active:scale-95 disabled:opacity-50 shadow-md shadow-emerald-100"
          >
            <svg className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            Sync Data
          </button>
        </div>
      </header>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Left: Pass Request / Active Pass status & Guidelines */}
        <div className="lg:col-span-4 space-y-8">
          <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 ring-1 ring-slate-200/50 relative overflow-hidden">
            <h3 className="text-xl font-bold text-slate-800 mb-6 flex items-center gap-3">
              <span className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
                </svg>
              </span>
              KSAC GatePass Request
            </h3>

            {activePass ? (
              <div className="p-6 bg-slate-900 rounded-3xl space-y-5 shadow-xl text-white">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="relative">
                      <div className="w-3 h-3 bg-emerald-400 rounded-full animate-ping absolute"></div>
                      <div className="w-3 h-3 bg-emerald-500 rounded-full relative border-2 border-slate-900"></div>
                    </div>
                    <span className="font-black text-xs uppercase tracking-widest text-emerald-300">Active Pass In Flight</span>
                  </div>
                  <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-white/10 rounded-lg text-slate-300 border border-white/10">
                    {activePass.status}
                  </span>
                </div>

                <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
                  <div>
                    <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Society / Wing</p>
                    <p className="text-sm font-black text-white">{activePass.society}</p>
                  </div>
                  <div className="pt-2 border-t border-white/5 flex justify-between">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Target Return / In-Time</p>
                      <p className="text-sm font-black text-emerald-400">{activePass.requestedExtension || "Standard"}</p>
                    </div>
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">Purpose</p>
                      <p className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">{activePass.reason}</p>
                    </div>
                  </div>
                </div>

                <div className="p-3 bg-emerald-950/80 rounded-xl border border-emerald-800/50 text-[11px] text-emerald-200 leading-relaxed">
                  {activePass.status === "PENDING" && "Waiting for Warden approval at hostel desk."}
                  {activePass.status === "APPROVED" && !activePass.hostelOutTime && "Pass approved! Present at hostel gate to exit."}
                  {activePass.status === "APPROVED" && activePass.hostelOutTime && "En route to KSAC. Please check in with the KSAC desk officer."}
                  {activePass.status === "IN_KSAC" && "Checked into KSAC! Remember to mark departure with KSAC desk before heading back."}
                </div>
              </div>
            ) : (
              <form onSubmit={handleRequest} className="space-y-5">
                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Select KSAC Society / Wing
                  </label>
                  <select
                    value={society}
                    onChange={(e) => setSociety(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-bold"
                  >
                    {COMMON_SOCIETIES.map((soc) => (
                      <option key={soc} value={soc}>{soc}</option>
                    ))}
                  </select>
                </div>

                {society === "Other KSAC Wing / Workshop" && (
                  <div className="space-y-2 animate-in fade-in">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                      Specify Activity Name
                    </label>
                    <input
                      type="text"
                      placeholder="e.g. TEDxKIIT / Hackathon Lab"
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-medium"
                      value={customSociety}
                      onChange={(e) => setCustomSociety(e.target.value)}
                      required
                    />
                  </div>
                )}

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Expected Return / In-Time Extension
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. 09:30 PM, 10:00 PM, or 06:00 PM"
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-semibold"
                    value={requestedExtension}
                    onChange={(e) => setRequestedExtension(e.target.value)}
                    required
                  />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {["06:00 PM", "08:30 PM", "09:30 PM", "10:00 PM"].map((t) => (
                      <button
                        type="button"
                        key={t}
                        onClick={() => setRequestedExtension(t)}
                        className={`text-[9px] font-black px-2.5 py-1 rounded-lg border transition-all ${
                          requestedExtension === t
                            ? "bg-emerald-600 text-white border-emerald-600 shadow-sm"
                            : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                        }`}
                      >
                        {t}
                      </button>
                    ))}
                  </div>
                </div>

                <div className="space-y-2">
                  <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                    Purpose / Event Description
                  </label>
                  <textarea
                    placeholder="e.g. Rehearsal for upcoming Spring Fest, Robotics workshop..."
                    className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 min-h-[100px] text-slate-700 text-xs font-medium leading-relaxed"
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    required
                  />
                </div>

                <button 
                  disabled={submitting}
                  className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3 tracking-widest uppercase text-xs disabled:opacity-50"
                >
                  {submitting ? "Submitting Request..." : "Request KSAC Pass"}
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </button>
              </form>
            )}
          </div>

          <div className="bg-linear-to-br from-slate-900 to-emerald-950 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
            <h3 className="text-lg font-black mb-6 uppercase tracking-widest text-emerald-400">KSAC & Gate Protocols</h3>
            <ul className="space-y-4 relative">
              {[
                "Pass works for any hour (daytime practices, weekend workshops, evening extended curfews).",
                "Ensure KSAC Desk Officer checks you in upon arrival.",
                "Always check out at KSAC before returning to hostel to eliminate tamper alerts."
              ].map((tip, idx) => (
                <li key={idx} className="flex gap-3.5 items-start">
                  <span className="text-emerald-400 font-black text-xs shrink-0">{idx + 1}.</span>
                  <p className="text-xs font-bold text-slate-300 leading-relaxed">{tip}</p>
                </li>
              ))}
            </ul>
          </div>
        </div>

        {/* Right: Movement History */}
        <div className="lg:col-span-8 space-y-6">
          <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 ring-1 ring-slate-200/50 min-h-[600px]">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight">Movement & Pass History</h3>
                <p className="text-xs font-semibold text-slate-400 mt-1">Verified records of your KSAC activity sessions</p>
              </div>
              <div className="flex gap-2">
                <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-xl border border-emerald-200">
                  REAL-TIME LOGS
                </span>
              </div>
            </div>

            {loading ? (
              <div className="flex flex-col items-center justify-center h-96 space-y-6">
                <div className="relative w-16 h-16">
                  <div className="absolute inset-0 border-4 border-emerald-100 rounded-full"></div>
                  <div className="absolute inset-0 border-4 border-emerald-600 rounded-full border-t-transparent animate-spin"></div>
                </div>
                <p className="text-xs font-black text-slate-400 uppercase tracking-widest">Loading Pass History...</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {passes.map((pass) => (
                  <div key={pass._id} className="group p-6 bg-slate-50 border border-slate-200/60 rounded-3xl hover:bg-white hover:border-emerald-200 hover:shadow-2xl hover:shadow-emerald-100 hover:-translate-y-1 transition-all duration-300 relative overflow-hidden">
                    <div className="flex justify-between items-start mb-5">
                      <div className={`p-3.5 rounded-2xl ${
                        pass.status === "RETURNED" ? "bg-emerald-100 text-emerald-800" :
                        pass.status === "PENDING" ? "bg-amber-100 text-amber-800" : "bg-teal-100 text-teal-800"
                      } shadow-inner`}>
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                      </div>
                      <div className="text-right">
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest mb-1">Transit Time</p>
                        <div className="flex flex-col gap-0.5 text-right">
                          <span className="text-[11px] font-black text-slate-600">To KSAC: <span className="text-emerald-600">{pass.transitToKSAC ?? "—"}m</span></span>
                          <span className="text-[11px] font-black text-slate-600">Return: <span className="text-emerald-600">{pass.transitToHostel ?? "—"}m</span></span>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <div>
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            {pass.society || "KSAC Society"}
                          </span>
                          <span className="text-[10px] font-black text-slate-400 uppercase">
                            {new Date(pass.createdAt).toLocaleDateString(undefined, { month: 'short', day: 'numeric' })}
                          </span>
                        </div>
                        <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em] mt-1.5">
                          Status: <span className="text-slate-700">{pass.status}</span> • Target: <span className="text-emerald-700 font-bold">{pass.requestedExtension || "Standard"}</span>
                        </p>
                      </div>
                      <p className="text-xs font-semibold text-slate-600 leading-relaxed italic bg-white/60 p-3 rounded-xl border border-slate-100">
                        "{pass.reason}"
                      </p>
                    </div>
                  </div>
                ))}
                {passes.length === 0 && (
                  <div className="col-span-full flex flex-col items-center justify-center py-32 text-center">
                    <svg className="w-20 h-20 text-slate-300 mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    <p className="text-lg font-black text-slate-400 tracking-tight">No GatePass records found</p>
                    <p className="text-xs font-medium text-slate-400 mt-1">Submit your first KSAC activity pass request using the form.</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
