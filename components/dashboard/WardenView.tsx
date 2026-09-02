"use client";

import { IUser } from "@/types/user";
import { useEffect, useState } from "react";
import { dispatchGateway, GATEWAY_OPCODES } from "@/lib/gatewayClient";

interface Props {
  user: IUser;
}

const KP_BOYS_HOSTELS = [
  "KP-1", "KP-2", "KP-3", "KP-4", "KP-5", "KP-6", "KP-7A", "KP-7B", "KP-8", "KP-9", "KP-10", "KP-11", "KP-12", "KP-14", "KP-15"
];

const QC_GIRLS_HOSTELS = [
  "QC-1", "QC-2", "QC-3", "QC-4", "QC-5", "QC-6", "QC-7", "QC-8", "QC-9", "QC-10", "QC-11"
];

const HOSTEL_OPTIONS = [
  "ALL",
  "N/A",
  ...KP_BOYS_HOSTELS,
  ...QC_GIRLS_HOSTELS
];

export default function WardenView({ user }: Props) {
  const [passes, setPasses] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedHostel, setSelectedHostel] = useState<string>(user.hostel && user.hostel !== "ALL" ? user.hostel : "ALL");
  const [processingPassId, setProcessingPassId] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchPasses = async () => {
    setLoading(true);
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

  // Step 5: Warden confirms entry once student is back in hostel
  const handleConfirmEntry = async (passId: string, studentName: string) => {
    setProcessingPassId(passId);
    setActionAlert(null);
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.RECORD_GATE_MOVEMENT, {
        passId,
        movementType: "HOSTEL_ENTRY",
      });

      if (res.ok) {
        setActionAlert({
          type: "success",
          message: `Hostel entry confirmed for ${studentName}. Return status updated across university systems!`,
        });
        fetchPasses();
      } else {
        setActionAlert({
          type: "error",
          message: res.message || "Failed to confirm hostel entry.",
        });
      }
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Unexpected error." });
    } finally {
      setProcessingPassId(null);
    }
  };

  const formatTime = (date: any) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Filter passes by selected hostel
  const filteredPasses = passes.filter((p) => {
    if (selectedHostel !== "ALL" && (p.hostel || p.studentId?.hostel) !== selectedHostel) return false;
    return true;
  });

  // Realigned Flow: Wardens track KSAC-approved passes currently outside
  const activeOutsidePasses = filteredPasses.filter((p) => p.status === "APPROVED" || p.status === "IN_KSAC");
  const returnedHistoryPasses = filteredPasses.filter((p) => p.status === "RETURNED");
  const pendingAtKSAC = filteredPasses.filter((p) => p.status === "PENDING");

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="bg-slate-900 text-white text-[9px] sm:text-[10px] font-black px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl uppercase tracking-wider sm:tracking-widest shadow-sm">
              Hostel Admin
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-400">
              KIIT Resident Gate Control & Curfew Desk
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight sm:tracking-tighter">
            Hostel Control Center
          </h1>
          <p className="text-slate-500 font-medium text-xs sm:text-base md:text-lg leading-relaxed">
            Warden: <span className="text-slate-900 font-black">{user.name}</span> ({user.email})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={fetchPasses}
            disabled={loading}
            className="bg-white hover:bg-slate-50 px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-xs touch-btn"
          >
            <svg
              className={`w-3.5 h-3.5 text-slate-700 ${loading ? "animate-spin" : ""}`}
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="3"
                d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15"
              />
            </svg>
            <span className="text-[9px] sm:text-[10px] font-black text-slate-700 uppercase tracking-wider">
              Sync Passes
            </span>
          </button>
        </div>
      </header>

      {/* Action Alert Banner */}
      {actionAlert && (
        <div
          className={`p-3.5 sm:p-4 rounded-xl sm:rounded-2xl text-xs font-bold animate-in fade-in flex items-center justify-between gap-3 ${
            actionAlert.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <span>{actionAlert.message}</span>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-slate-700 font-black">✕</button>
        </div>
      )}

      {/* Quick Metrics */}
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Step 4: Outside at KSAC
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1 block">
            {activeOutsidePasses.length} Students
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Step 5: Returned to Hostel
          </span>
          <span className="text-xl sm:text-2xl font-black text-teal-600 mt-0.5 sm:mt-1 block">
            {returnedHistoryPasses.length} Students
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs col-span-2 md:col-span-1">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Pending KSAC Approval
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1 block">
            {pendingAtKSAC.length} Requests
          </span>
        </div>
      </div>

      {/* Hostel Filter Bar */}
      <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
        <div className="flex items-center gap-2">
          <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Hostel Filter:</span>
        </div>
        <select
          value={selectedHostel}
          onChange={(e) => setSelectedHostel(e.target.value)}
          className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none w-full sm:w-auto"
        >
          <option value="ALL">All Resident Hostels</option>
          <optgroup label="General / Day Scholars">
            <option value="N/A">N/A (Day Scholar / Day Boarder)</option>
          </optgroup>
          <optgroup label="Boys Hostels (King's Palace - KP)">
            {KP_BOYS_HOSTELS.map((h) => (
              <option key={h} value={h}>Hostel {h}</option>
            ))}
          </optgroup>
          <optgroup label="Girls Hostels (Queen's Castle - QC)">
            {QC_GIRLS_HOSTELS.map((h) => (
              <option key={h} value={h}>Hostel {h}</option>
            ))}
          </optgroup>
        </select>
      </div>

      {/* 1. Step 4 & 5: Active Students Outside at KSAC */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-emerald-50/40">
          <div className="flex items-center gap-3">
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-ping" />
            <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">
              Step 4 & 5: Students Outside at KSAC ({activeOutsidePasses.length})
            </h2>
          </div>
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-emerald-800 bg-emerald-100 px-3 py-1 rounded-lg">
            Awaiting Hostel Return
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Student & Hostel</th>
                <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Activity & Reason</th>
                <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Approved Extension</th>
                <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Warden Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {activeOutsidePasses.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-black text-slate-800">{p.studentId?.name || "Student"}</p>
                    <p className="text-[10px] font-bold text-slate-400">{p.studentId?.rollNo}</p>
                    <span className="bg-slate-900 text-white font-black px-2 py-0.5 rounded text-[9px] inline-block mt-0.5">
                      Hostel: {p.hostel || p.studentId?.hostel || "KP-7A"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="bg-emerald-50 text-emerald-800 font-black px-2 py-0.5 rounded text-[9px] border border-emerald-200">
                      {p.society}
                    </span>
                    <p className="text-[11px] text-slate-600 italic mt-1 max-w-xs">"{p.reason}"</p>
                  </td>
                  <td className="px-5 py-3.5">
                    <span className="bg-emerald-100 text-emerald-900 font-black px-2.5 py-1 rounded-lg text-[10px] block w-fit">
                      Until {p.requestedExtension || "09:30 PM"}
                    </span>
                    <span className="text-[9px] text-slate-400 font-semibold mt-0.5 block">
                      Verified at {formatTime(p.ksacApprovedAt || p.ksacInTime)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <button
                      onClick={() => handleConfirmEntry(p._id, p.studentId?.name || "Student")}
                      disabled={processingPassId === p._id}
                      className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2.5 rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-xs touch-btn"
                    >
                      {processingPassId === p._id ? "Confirming..." : "Confirm Hostel Entry"}
                    </button>
                  </td>
                </tr>
              ))}
              {activeOutsidePasses.length === 0 && (
                <tr>
                  <td colSpan={4} className="py-10 text-center text-slate-400 font-bold">
                    No students currently outside at KSAC for this hostel filter
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>

      {/* 2. Step 6: Completed / Returned Movement Log */}
      <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
        <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-teal-50/30">
          <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">
            Step 6: Confirmed Hostel Returns ({returnedHistoryPasses.length})
          </h2>
          <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-teal-800 bg-teal-100 px-3 py-1 rounded-lg">
            Corroborated with KSAC Desk
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse min-w-[700px]">
            <thead>
              <tr className="bg-slate-50/50">
                <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Student & Hostel</th>
                <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Society</th>
                <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">KSAC Verified Out</th>
                <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Hostel In Time</th>
                <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {returnedHistoryPasses.map((p) => (
                <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="px-5 py-3.5">
                    <p className="font-black text-slate-800">{p.studentId?.name || "Student"}</p>
                    <p className="text-[10px] font-bold text-slate-400">{p.studentId?.rollNo}</p>
                    <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[9px] inline-block mt-0.5">
                      Hostel: {p.hostel || p.studentId?.hostel || "KP-7A"}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 font-bold text-slate-700">{p.society}</td>
                  <td className="px-5 py-3.5 text-slate-500 font-semibold">{formatTime(p.ksacApprovedAt || p.ksacInTime)}</td>
                  <td className="px-5 py-3.5">
                    <span className="bg-teal-50 text-teal-800 font-black px-2.5 py-1 rounded-lg text-[10px] border border-teal-200">
                      {formatTime(p.hostelInTime)}
                    </span>
                  </td>
                  <td className="px-5 py-3.5 text-right">
                    <span className="bg-teal-100 text-teal-900 font-black text-[9px] px-2.5 py-1 rounded-md uppercase tracking-wider">
                      Returned
                    </span>
                  </td>
                </tr>
              ))}
              {returnedHistoryPasses.length === 0 && (
                <tr>
                  <td colSpan={5} className="py-8 text-center text-slate-400 font-bold">
                    No completed returns logged yet
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
