"use client";

import { IUser } from "@/types/user";
import { useEffect, useState } from "react";
import { KSAC_SOCIETIES, KSAC_CENTRAL_ROOMS } from "@/lib/ksacSocieties";
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

export default function KSACView({ user }: Props) {
  const [activeTab, setActiveTab] = useState<"gate" | "rooms">("gate");

  // GatePass and Registry data
  const [passes, setPasses] = useState<any[]>([]);
  const [registry, setRegistry] = useState<any[]>([]);
  const [loadingGate, setLoadingGate] = useState(true);
  const [selectedHostel, setSelectedHostel] = useState<string>("ALL");
  const [selectedSociety, setSelectedSociety] = useState<string>("ALL");

  // Room Bookings data
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomStatusFilter, setRoomStatusFilter] = useState<string>("ALL");
  const [roomFilter, setRoomFilter] = useState<string>("ALL");
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
  const [processingPassId, setProcessingPassId] = useState<string | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  const fetchGateData = async () => {
    setLoadingGate(true);
    try {
      const [passesRes, registryRes] = await Promise.all([
        dispatchGateway(GATEWAY_OPCODES.FETCH_KSAC_PASSES),
        dispatchGateway(GATEWAY_OPCODES.FETCH_KSAC_REGISTRY),
      ]);
      if (passesRes.ok && passesRes.data) {
        setPasses(Array.isArray(passesRes.data.passes) ? passesRes.data.passes : []);
        if (Array.isArray(passesRes.data.bookings)) {
          setRoomBookings(passesRes.data.bookings);
        }
      }
      if (registryRes.ok && Array.isArray(registryRes.data)) {
        setRegistry(registryRes.data);
      }
    } catch (err) {
      console.error("Failed to fetch KSAC gate data", err);
    } finally {
      setLoadingGate(false);
    }
  };

  const fetchRoomBookings = async () => {
    setLoadingRooms(true);
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.FETCH_KSAC_PASSES);
      if (res.ok && res.data && Array.isArray(res.data.bookings)) {
        setRoomBookings(res.data.bookings);
      }
    } catch (err) {
      console.error("Failed to fetch room bookings", err);
    } finally {
      setLoadingRooms(false);
    }
  };

  useEffect(() => {
    fetchGateData();
    fetchRoomBookings();
  }, []);

  // Step 3: KSAC Authority Verifies and Accepts Pass
  const handleVerifyPass = async (passId: string, action: "APPROVE" | "REJECT", note?: string) => {
    setProcessingPassId(passId);
    setActionAlert(null);
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.ACTION_PASS_APPROVE, {
        passId,
        action,
        note,
      });

      if (res.ok) {
        setActionAlert({
          type: "success",
          message: action === "APPROVE" ? "GatePass verified and approved for KSAC session!" : "GatePass request rejected.",
        });
        fetchGateData();
      } else {
        setActionAlert({
          type: "error",
          message: res.message || "Failed to process pass verification.",
        });
      }
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Unexpected verification error." });
    } finally {
      setProcessingPassId(null);
    }
  };

  const handleBookingAction = async (
    bookingId: string,
    action: "APPROVE" | "REJECT",
    note?: string
  ) => {
    setProcessingBookingId(bookingId);
    setActionAlert(null);
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.ACTION_ROOM_BOOKING, {
        bookingId,
        action,
        note,
      });

      if (res.ok) {
        setActionAlert({
          type: "success",
          message: res.data?.message || `Booking ${action === "APPROVE" ? "approved" : "rejected"} successfully.`,
        });
        fetchRoomBookings();
      } else {
        setActionAlert({
          type: "error",
          message: res.message || "Failed to process room booking action.",
        });
      }
    } catch (err: any) {
      setActionAlert({
        type: "error",
        message: err.message || "An unexpected error occurred.",
      });
    } finally {
      setProcessingBookingId(null);
    }
  };

  const formatTime = (date: any) => {
    if (!date) return "--:--";
    return new Date(date).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  };

  // Realigned Pass buckets
  const pendingVerificationPasses = passes.filter((p) => {
    if (p.status !== "PENDING") return false;
    if (selectedHostel !== "ALL" && (p.hostel || p.studentId?.hostel) !== selectedHostel) return false;
    return true;
  });

  const activeAtKSAC = passes.filter((p) => {
    if (p.status !== "APPROVED" && p.status !== "IN_KSAC") return false;
    if (selectedHostel !== "ALL" && (p.hostel || p.studentId?.hostel) !== selectedHostel) return false;
    return true;
  });

  const returnedToHostel = passes.filter((p) => {
    if (p.status !== "RETURNED") return false;
    if (selectedHostel !== "ALL" && (p.hostel || p.studentId?.hostel) !== selectedHostel) return false;
    return true;
  });

  const pendingRoomBookings = roomBookings.filter((b) => b.status === "PENDING");
  const approvedRoomBookings = roomBookings.filter((b) => b.status === "APPROVED");

  const filteredRoomBookings = roomBookings.filter((b) => {
    if (roomStatusFilter !== "ALL" && b.status !== roomStatusFilter) return false;
    if (roomFilter !== "ALL" && b.room !== roomFilter) return false;
    return true;
  });

  const allAvailableRooms = [
    ...KSAC_CENTRAL_ROOMS,
    ...KSAC_SOCIETIES.map((s) => s.room),
  ];

  return (
    <div className="max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="bg-emerald-600 text-white text-[9px] sm:text-[10px] font-black px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl uppercase tracking-wider sm:tracking-widest shadow-sm">
              KSAC Central Desk
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-400">
              KIIT Student Activity Center Verification Authority
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight sm:tracking-tighter">
            KSAC Authority Desk
          </h1>
          <p className="text-slate-500 font-medium text-xs sm:text-base md:text-lg leading-relaxed">
            Officer on Duty: <span className="text-emerald-700 font-black">{user.name}</span> ({user.email})
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          <button
            onClick={() => {
              fetchGateData();
              fetchRoomBookings();
            }}
            disabled={loadingGate || loadingRooms}
            className="bg-white hover:bg-slate-50 px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-xs touch-btn"
          >
            <svg
              className={`w-3.5 h-3.5 text-emerald-600 ${loadingGate || loadingRooms ? "animate-spin" : ""}`}
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
            <span className="text-[9px] sm:text-[10px] font-black text-slate-600 uppercase tracking-wider">
              Refresh Feed
            </span>
          </button>
        </div>
      </header>

      {/* Action Alert Message */}
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

      {/* Tabs */}
      <div className="flex gap-2 sm:gap-3 border-b border-slate-200/80 pb-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("gate")}
          className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 shrink-0 touch-btn ${
            activeTab === "gate"
              ? "bg-slate-900 text-white shadow-md shadow-slate-900/10"
              : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          <span>GatePass Verification & Return Tracking</span>
          {pendingVerificationPasses.length > 0 && (
            <span className="px-1.5 py-0.5 text-[8px] bg-amber-400 text-slate-900 rounded-full font-black">
              {pendingVerificationPasses.length} New
            </span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("rooms")}
          className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 relative shrink-0 touch-btn ${
            activeTab === "rooms"
              ? "bg-emerald-600 text-white shadow-md shadow-emerald-200"
              : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>Society Room Approvals</span>
          {pendingRoomBookings.length > 0 && (
            <span className="px-1.5 py-0.5 text-[8px] bg-amber-400 text-slate-900 rounded-full font-black">
              {pendingRoomBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* Global Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Pending KSAC Approval
          </span>
          <span className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1 block">
            {pendingVerificationPasses.length}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Currently at KSAC
          </span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1 block">
            {activeAtKSAC.length}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Confirmed Returned (Hostel)
          </span>
          <span className="text-xl sm:text-2xl font-black text-teal-600 mt-0.5 sm:mt-1 block">
            {returnedToHostel.length}
          </span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">
            Pending Room Slots
          </span>
          <span className="text-xl sm:text-2xl font-black text-purple-700 mt-0.5 sm:mt-1 block">
            {pendingRoomBookings.length}
          </span>
        </div>
      </div>

      {/* TAB 1: GATEPASS VERIFICATION & RETURN TRACKING */}
      {activeTab === "gate" && (
        <div className="space-y-6 sm:space-y-8">
          {/* Hostel Filter Bar */}
          <div className="bg-white p-3.5 sm:p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
            <div className="flex items-center gap-2">
              <span className="text-[10px] font-black uppercase text-slate-400 tracking-wider">Filter by Student Resident Hostel:</span>
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

          {/* 1. Step 2 & 3: Pending Pass Requests Queue */}
          <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="px-5 sm:px-8 py-4 sm:py-5 border-b border-slate-100 flex justify-between items-center bg-amber-50/40">
              <div className="flex items-center gap-3">
                <div className="w-2.5 h-2.5 rounded-full bg-amber-500 animate-ping" />
                <h2 className="text-base sm:text-xl font-black text-slate-800 tracking-tight">
                  Step 2 & 3: Pending In-Time Extension Requests ({pendingVerificationPasses.length})
                </h2>
              </div>
              <span className="text-[9px] sm:text-[10px] font-black uppercase tracking-wider text-amber-800 bg-amber-100 px-3 py-1 rounded-lg">
                KSAC Verification Required
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Student & Resident Hostel</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Society & Purpose</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Curfew</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">KSAC Decision</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {pendingVerificationPasses.map((p) => (
                    <tr key={p._id} className="hover:bg-amber-50/20 transition-colors">
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
                        <span className="bg-amber-100 text-amber-900 font-black px-2.5 py-1 rounded-lg text-[10px]">
                          Until {p.requestedExtension || "09:30 PM"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-2">
                        <button
                          onClick={() => handleVerifyPass(p._id, "APPROVE")}
                          disabled={processingPassId === p._id}
                          className="bg-emerald-600 hover:bg-emerald-700 text-white font-black px-4 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95 shadow-xs"
                        >
                          Verify & Accept
                        </button>
                        <button
                          onClick={() => handleVerifyPass(p._id, "REJECT")}
                          disabled={processingPassId === p._id}
                          className="bg-slate-100 hover:bg-red-50 hover:text-red-700 text-slate-600 font-black px-3 py-2 rounded-xl text-[10px] uppercase tracking-wider transition-all active:scale-95"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingVerificationPasses.length === 0 && (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-slate-400 font-bold">
                        No pending pass requests in queue
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* 2. Step 4 & 6: Active at KSAC & Live Return Tracking */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            {/* Active Outside at KSAC */}
            <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-emerald-50/40">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Currently at KSAC ({activeAtKSAC.length})
                </h3>
                <span className="text-[9px] font-black text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded">
                  Verified by KSAC
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {activeAtKSAC.map((p) => (
                  <div key={p._id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
                        <span className="font-black text-slate-800 text-xs">{p.studentId?.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold">({p.studentId?.rollNo})</span>
                      </div>
                      <div className="flex gap-2 items-center">
                        <span className="bg-slate-100 text-slate-700 font-bold text-[9px] px-2 py-0.5 rounded">
                          Hostel: {p.hostel || p.studentId?.hostel || "KP-7A"}
                        </span>
                        <span className="text-[9px] text-emerald-700 font-bold">
                          {p.society}
                        </span>
                      </div>
                    </div>
                    <div className="text-right">
                      <span className="bg-emerald-50 text-emerald-800 font-black text-[10px] px-2.5 py-1 rounded-lg border border-emerald-200 block">
                        Curfew: {p.requestedExtension || "09:30 PM"}
                      </span>
                      <span className="text-[9px] text-slate-400 font-medium mt-0.5 block">
                        Verified at {formatTime(p.ksacApprovedAt || p.ksacInTime)}
                      </span>
                    </div>
                  </div>
                ))}
                {activeAtKSAC.length === 0 && (
                  <p className="py-10 text-center text-slate-400 font-bold text-xs">No active students currently at KSAC</p>
                )}
              </div>
            </section>

            {/* Step 6: Confirmed Returned to Hostel */}
            <section className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
              <div className="px-5 py-4 border-b border-slate-100 flex justify-between items-center bg-teal-50/40">
                <h3 className="text-sm font-black text-slate-800 uppercase tracking-wider">
                  Step 6: Hostel Return Corroboration ({returnedToHostel.length})
                </h3>
                <span className="text-[9px] font-black text-teal-800 bg-teal-100 px-2 py-0.5 rounded">
                  Updated by Warden
                </span>
              </div>
              <div className="divide-y divide-slate-100 max-h-96 overflow-y-auto">
                {returnedToHostel.map((p) => (
                  <div key={p._id} className="p-4 flex items-center justify-between hover:bg-slate-50/60 transition-colors">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <svg className="w-3.5 h-3.5 text-teal-600 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
                        </svg>
                        <span className="font-black text-slate-800 text-xs">{p.studentId?.name}</span>
                        <span className="text-[10px] text-slate-400 font-bold">({p.studentId?.rollNo})</span>
                      </div>
                      <p className="text-[10px] font-bold text-slate-500">
                        Resident Hostel: <span className="text-slate-800">{p.hostel || p.studentId?.hostel || "KP-7A"}</span>
                      </p>
                    </div>
                    <div className="text-right">
                      <span className="bg-teal-50 text-teal-800 font-black text-[10px] px-2.5 py-1 rounded-lg border border-teal-200 inline-block">
                        Reached Hostel: {formatTime(p.hostelInTime)}
                      </span>
                      <p className="text-[9px] text-slate-400 font-semibold mt-0.5">Warden Verified</p>
                    </div>
                  </div>
                ))}
                {returnedToHostel.length === 0 && (
                  <p className="py-10 text-center text-slate-400 font-bold text-xs">No return records logged yet</p>
                )}
              </div>
            </section>
          </div>
        </div>
      )}

      {/* TAB 2: ROOM BOOKINGS */}
      {activeTab === "rooms" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row justify-between items-center gap-3">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">Society Room Reservation Requests</h2>
            <div className="flex gap-2">
              <select
                value={roomStatusFilter}
                onChange={(e) => setRoomStatusFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700"
              >
                <option value="ALL">All Statuses</option>
                <option value="PENDING">Pending</option>
                <option value="APPROVED">Approved</option>
                <option value="REJECTED">Rejected</option>
              </select>
            </div>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50">
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Room & Society</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Lead Applicant</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Date & Time Slot</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredRoomBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-black text-slate-800 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                          {b.room}
                        </span>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">{b.society}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-black text-slate-800">{b.studentName || b.studentId?.name}</p>
                        <p className="text-[10px] text-slate-400">{b.position} ({b.studentRollNo || b.studentId?.rollNo})</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{b.date}</p>
                        <p className="text-[10px] text-emerald-700 font-bold">{b.timeslot}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider ${
                          b.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" :
                          b.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {b.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        {b.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleBookingAction(b._id, "APPROVE")}
                              disabled={processingBookingId === b._id}
                              className="bg-emerald-600 text-white font-bold px-3 py-1.5 rounded-lg text-[10px] hover:bg-emerald-700 transition-all active:scale-95"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleBookingAction(b._id, "REJECT")}
                              disabled={processingBookingId === b._id}
                              className="bg-slate-100 text-red-700 font-bold px-3 py-1.5 rounded-lg text-[10px] hover:bg-red-50 transition-all active:scale-95"
                            >
                              Reject
                            </button>
                          </>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredRoomBookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">No room bookings in this category</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
