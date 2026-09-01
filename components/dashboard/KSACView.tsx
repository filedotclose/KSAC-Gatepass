"use client";

import { IUser } from "@/types/user";
import { useEffect, useState } from "react";
import { KSAC_SOCIETIES, KSAC_CENTRAL_ROOMS } from "@/lib/ksacSocieties";
import { dispatchGateway, GATEWAY_OPCODES } from "@/lib/gatewayClient";

interface Props {
  user: IUser;
}

export default function KSACView({ user }: Props) {
  const [activeTab, setActiveTab] = useState<"gate" | "rooms">("gate");

  // GatePass and Registry data
  const [passes, setPasses] = useState<any[]>([]);
  const [registry, setRegistry] = useState<any[]>([]);
  const [loadingGate, setLoadingGate] = useState(true);
  const [selectedSociety, setSelectedSociety] = useState<string>("ALL");

  // Room Bookings data
  const [roomBookings, setRoomBookings] = useState<any[]>([]);
  const [loadingRooms, setLoadingRooms] = useState(true);
  const [roomStatusFilter, setRoomStatusFilter] = useState<string>("ALL");
  const [roomFilter, setRoomFilter] = useState<string>("ALL");
  const [processingBookingId, setProcessingBookingId] = useState<string | null>(null);
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

  const handlePassAction = async (endpoint: string, passId: string) => {
    try {
      const movementType = endpoint === "ksac-entry" ? "KSAC_ENTRY" : "KSAC_EXIT";
      const res = await dispatchGateway(GATEWAY_OPCODES.RECORD_GATE_MOVEMENT, {
        passId,
        movementType,
      });

      if (res.ok) {
        fetchGateData();
      } else {
        alert(res.message || "Action failed");
      }
    } catch (err) {
      console.error("Pass action error", err);
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

  const activeInKSAC = passes.filter((p) => p.status === "IN_KSAC");
  const awaitingCheckIn = passes.filter((p) => p.status === "APPROVED");
  const pendingRoomBookings = roomBookings.filter((b) => b.status === "PENDING");
  const approvedRoomBookings = roomBookings.filter((b) => b.status === "APPROVED");

  const filteredRegistry =
    selectedSociety === "ALL"
      ? registry
      : registry.filter((r) => r.society?.toLowerCase().includes(selectedSociety.toLowerCase()));

  const societiesList = Array.from(new Set(registry.map((r) => r.society).filter(Boolean)));

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
    <div className="max-w-7xl mx-auto space-y-8 animate-in zoom-in duration-700">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-2">
          <div className="flex items-center gap-3">
            <span className="bg-emerald-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl uppercase tracking-widest shadow-md shadow-emerald-100">
              Activity Hub
            </span>
            <span className="text-xs font-bold text-slate-400">
              KIIT Student Activity Center Central Authority
            </span>
          </div>
          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
            KSAC Authority Desk
          </h2>
          <p className="text-slate-500 font-medium text-base md:text-lg leading-relaxed">
            Coordinating Officer: <span className="gradient-text font-black">{user.name}</span> ({user.email})
          </p>
        </div>

        <div className="flex flex-wrap gap-3">
          <button
            onClick={() => {
              fetchGateData();
              fetchRoomBookings();
            }}
            disabled={loadingGate || loadingRooms}
            className="bg-white hover:bg-slate-50 px-5 py-3 rounded-2xl border border-slate-200 flex items-center gap-3 transition-all active:scale-95 disabled:opacity-50 shadow-sm"
          >
            <svg
              className={`w-4 h-4 text-emerald-600 ${loadingGate || loadingRooms ? "animate-spin" : ""}`}
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
            <span className="text-[10px] font-black text-slate-600 uppercase tracking-widest">
              Refresh Feed
            </span>
          </button>
        </div>
      </header>

      {/* Tabs */}
      <div className="flex gap-3 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab("gate")}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === "gate"
              ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
              : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
          </svg>
          Live Gate Desk & Registry
        </button>

        <button
          onClick={() => setActiveTab("rooms")}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 relative ${
            activeTab === "rooms"
              ? "bg-emerald-600 text-white shadow-xl shadow-emerald-200"
              : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Society Room Booking Approvals
          {pendingRoomBookings.length > 0 && (
            <span className="px-2 py-0.5 text-[9px] bg-amber-400 text-slate-900 rounded-full font-black">
              {pendingRoomBookings.length}
            </span>
          )}
        </button>
      </div>

      {/* Global Quick Stats */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            In Activity Center
          </span>
          <span className="text-2xl font-black text-emerald-600 mt-1 block">
            {activeInKSAC.length}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Awaiting Check-in
          </span>
          <span className="text-2xl font-black text-amber-600 mt-1 block">
            {awaitingCheckIn.length}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Pending Room Requests
          </span>
          <span className="text-2xl font-black text-amber-500 mt-1 block">
            {pendingRoomBookings.length}
          </span>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-100 shadow-sm">
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest block">
            Approved Reservations
          </span>
          <span className="text-2xl font-black text-teal-600 mt-1 block">
            {approvedRoomBookings.length}
          </span>
        </div>
      </div>

      {/* Action Alert Message */}
      {actionAlert && (
        <div
          className={`p-4 rounded-2xl text-xs font-bold animate-in fade-in flex items-center justify-between gap-3 ${
            actionAlert.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <span>{actionAlert.message}</span>
          <button
            onClick={() => setActionAlert(null)}
            className="text-slate-400 hover:text-slate-700 font-black text-sm"
          >
            ✕
          </button>
        </div>
      )}

      {/* TAB 1: GATE DESK & REGISTRY */}
      {activeTab === "gate" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
          {/* Left column: Summary & Guidelines */}
          <div className="lg:col-span-4 space-y-8">
            <div className="bg-emerald-800 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
              <h3 className="text-lg font-black mb-4 uppercase tracking-widest text-emerald-200">
                Verification Protocols
              </h3>
              <ul className="space-y-3.5 text-xs text-emerald-50 leading-relaxed">
                <li className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Confirm student identity and check in upon physical arrival at KSAC desk.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Validate society room allocation before granting entry.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <div className="w-5 h-5 bg-white/20 rounded-full flex items-center justify-center shrink-0 mt-0.5">
                    <svg className="w-3 h-3 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="4" d="M5 13l4 4L19 7" />
                    </svg>
                  </div>
                  <span>Mark departure when student leaves to ensure anti-tamper log completion.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right column: Live Check-in Desk & Daily Registry */}
          <div className="lg:col-span-8 space-y-10">
            {/* Active Traffic Table */}
            <section className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
              <div className="p-8 border-b border-slate-50 flex items-center justify-between bg-slate-50/50">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
                      Live Desk GatePass Management
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Real-time entry verification & exit logging
                    </p>
                  </div>
                </div>
                <span className="hidden sm:block text-xs font-black text-emerald-700 bg-emerald-50 px-4 py-2 rounded-2xl border border-emerald-200">
                  {passes.length} In Flow
                </span>
              </div>
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-slate-50/10">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                        Student & Society
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                        Curfew Extension
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                        Status
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 text-right">
                        Desk Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50">
                    {passes.map((pass) => (
                      <tr key={pass._id} className="hover:bg-slate-50/50 transition-colors">
                        <td className="px-8 py-6">
                          <div className="flex items-center gap-4">
                            <div className="w-11 h-11 rounded-2xl bg-slate-100 flex items-center justify-center text-slate-500 font-black shrink-0">
                              {pass.studentId?.name?.charAt(0) || "S"}
                            </div>
                            <div>
                              <p className="font-black text-slate-800 tracking-tight text-base leading-snug">
                                {pass.studentId?.name}
                              </p>
                              <p className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                                {pass.studentId?.rollNo}
                              </p>
                              <span className="inline-block mt-1 text-[10px] font-black text-emerald-700 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                                {pass.society || "KSAC Society"}
                              </span>
                            </div>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div className="space-y-1">
                            <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1.5 rounded-xl inline-block border border-emerald-200">
                              Until {pass.requestedExtension || "09:30 PM"}
                            </span>
                            <p className="text-[10px] text-slate-400 font-medium truncate max-w-[160px] italic">
                              "{pass.reason}"
                            </p>
                          </div>
                        </td>
                        <td className="px-8 py-6">
                          <div
                            className={`inline-flex items-center gap-2 px-3.5 py-1.5 rounded-2xl text-[10px] font-black uppercase tracking-widest ${
                              pass.status === "APPROVED"
                                ? "bg-amber-50 text-amber-600 ring-1 ring-amber-100"
                                : "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
                            }`}
                          >
                            <span
                              className={`w-1.5 h-1.5 rounded-full ${
                                pass.status === "APPROVED" ? "bg-amber-500" : "bg-emerald-500 animate-pulse"
                              }`}
                            ></span>
                            {pass.status === "APPROVED" ? "Awaiting Check-in" : "In KSAC"}
                          </div>
                        </td>
                        <td className="px-8 py-6 text-right">
                          {pass.status === "APPROVED" ? (
                            <button
                              onClick={() => handlePassAction("ksac-entry", pass._id)}
                              className="bg-slate-900 text-white font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl hover:bg-emerald-600 hover:scale-105 transition-all active:scale-95 shadow-md"
                            >
                              Check In
                            </button>
                          ) : (
                            <button
                              onClick={() => handlePassAction("ksac-exit", pass._id)}
                              disabled={!!pass.ksacOutTime}
                              className={`font-black text-[10px] uppercase tracking-widest px-6 py-3 rounded-2xl transition-all shadow-sm ${
                                pass.ksacOutTime
                                  ? "bg-slate-100 text-slate-400 cursor-not-allowed"
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
                        <td colSpan={4} className="py-24 text-center font-black text-slate-300 uppercase tracking-[0.4em] text-xs">
                          No active GatePass records in transit right now
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              </div>
            </section>

            {/* Today's KSAC Registry */}
            <section className="bg-slate-900 rounded-[3rem] shadow-2xl overflow-hidden ring-1 ring-white/10 text-white">
              <div className="p-8 border-b border-white/5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-white/5">
                <div className="flex items-center gap-4">
                  <div className="p-3 bg-white/10 text-white rounded-2xl border border-white/5">
                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-2xl font-black text-white tracking-tight leading-none mb-1">
                      Today's KSAC Registry
                    </h3>
                    <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                      Logged society entries & exits
                    </p>
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
                        <option key={soc} value={soc} className="bg-slate-900 text-white">
                          {soc}
                        </option>
                      ))}
                    </select>
                  </div>
                )}
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="bg-black/20">
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/5">
                        Member & Society
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/5">
                        KSAC Entry
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/5">
                        KSAC Departure
                      </th>
                      <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-white/5 text-right">
                        Status
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {filteredRegistry.map((record) => (
                      <tr key={record._id} className="hover:bg-white/5 transition-colors">
                        <td className="px-8 py-6">
                          <div className="font-black text-white">{record.name}</div>
                          <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                            {record.rollNo}
                          </div>
                          <span className="inline-block mt-1 text-[9px] font-black text-emerald-300 bg-emerald-950/70 px-2 py-0.5 rounded border border-emerald-800">
                            {record.society}
                          </span>
                        </td>
                        <td className="px-8 py-6 text-slate-300 font-bold text-sm">
                          {formatTime(record.inTime)}
                        </td>
                        <td className="px-8 py-6 text-slate-300 font-bold text-sm">
                          {formatTime(record.outTime)}
                        </td>
                        <td className="px-8 py-6 text-right">
                          <span
                            className={`inline-flex px-3 py-1 rounded-lg text-[10px] font-black uppercase tracking-widest ${
                              record.outTime
                                ? "text-emerald-400 bg-emerald-400/10 border border-emerald-500/20"
                                : "text-teal-400 bg-teal-400/10 border border-teal-500/20"
                            }`}
                          >
                            {record.outTime ? "Completed" : "In Session"}
                          </span>
                        </td>
                      </tr>
                    ))}
                    {filteredRegistry.length === 0 && (
                      <tr>
                        <td colSpan={4} className="py-20 text-center font-black text-slate-600 uppercase tracking-[0.4em] text-xs">
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
      )}

      {/* TAB 2: ROOM BOOKING APPROVALS */}
      {activeTab === "rooms" && (
        <div className="space-y-8 animate-in fade-in duration-500">
          {/* Approval Queue Section */}
          <section className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
            <div className="p-8 border-b border-slate-50 flex flex-col sm:flex-row sm:items-center justify-between gap-4 bg-slate-50/50">
              <div className="flex items-center gap-4">
                <div className="p-3 bg-emerald-600 text-white rounded-2xl shadow-lg shadow-emerald-100">
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
                    Pending Room Booking Approvals
                  </h3>
                  <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                    Review and authorize society requests for KSAC rooms
                  </p>
                </div>
              </div>
              <span className="bg-amber-50 text-amber-800 border border-amber-200 px-4 py-2 rounded-2xl text-xs font-black uppercase tracking-widest">
                {pendingRoomBookings.length} Awaiting Decision
              </span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/10">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                      Applicant & Society
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                      Room & Date
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                      Timeslot & Attendees
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                      Purpose
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 text-right">
                      Decision
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {pendingRoomBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-800 text-base">{b.studentName}</div>
                        <div className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
                          {b.studentRollNo} ({b.position})
                        </div>
                        <span className="inline-block mt-1 text-[9px] font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                          {b.society}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-800 text-sm">{b.room}</div>
                        <span className="text-xs font-bold text-slate-500 block mt-0.5">
                          📅 {b.date}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-3 py-1 rounded-xl inline-block border border-emerald-200">
                          ⏰ {b.timeslot}
                        </span>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">
                          👥 ~{b.attendeesEstimate || 15} Members
                        </p>
                      </td>
                      <td className="px-8 py-6 max-w-xs">
                        <p className="text-xs font-medium text-slate-600 italic bg-white p-3 rounded-xl border border-slate-100">
                          "{b.purpose}"
                        </p>
                      </td>
                      <td className="px-8 py-6 text-right space-x-2 whitespace-nowrap">
                        <button
                          onClick={() => handleBookingAction(b._id, "APPROVE")}
                          disabled={processingBookingId === b._id}
                          className="bg-emerald-600 text-white font-black text-[10px] uppercase tracking-widest px-5 py-3 rounded-2xl hover:bg-emerald-700 hover:scale-105 transition-all active:scale-95 shadow-md shadow-emerald-100 disabled:opacity-50"
                        >
                          Approve
                        </button>
                        <button
                          onClick={() => handleBookingAction(b._id, "REJECT")}
                          disabled={processingBookingId === b._id}
                          className="bg-red-50 text-red-700 font-black text-[10px] uppercase tracking-widest px-4 py-3 rounded-2xl hover:bg-red-100 hover:scale-105 transition-all active:scale-95 border border-red-200 disabled:opacity-50"
                        >
                          Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                  {pendingRoomBookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center font-black text-slate-300 uppercase tracking-[0.4em] text-xs">
                        No pending room booking requests in queue
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>

          {/* All Bookings & Room Schedule Log */}
          <section className="bg-white rounded-[3rem] shadow-sm border border-slate-100 overflow-hidden ring-1 ring-slate-200/50">
            <div className="p-8 border-b border-slate-50 flex flex-col md:flex-row md:items-center justify-between gap-4 bg-slate-50/50">
              <div>
                <h3 className="text-2xl font-black text-slate-800 tracking-tight leading-none mb-1">
                  Master Room Booking Schedule
                </h3>
                <p className="text-[10px] font-black text-slate-400 uppercase tracking-[0.2em]">
                  All KSAC room allocations and historical requests
                </p>
              </div>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-3">
                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Status:</span>
                  <select
                    value={roomStatusFilter}
                    onChange={(e) => setRoomStatusFilter(e.target.value)}
                    className="bg-slate-100 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 border border-slate-200 focus:outline-none"
                  >
                    <option value="ALL">All Statuses</option>
                    <option value="PENDING">Pending</option>
                    <option value="APPROVED">Approved</option>
                    <option value="REJECTED">Rejected</option>
                  </select>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Room:</span>
                  <select
                    value={roomFilter}
                    onChange={(e) => setRoomFilter(e.target.value)}
                    className="bg-slate-100 text-slate-700 text-xs font-bold rounded-xl px-3 py-2 border border-slate-200 focus:outline-none max-w-[200px]"
                  >
                    <option value="ALL">All Rooms</option>
                    {allAvailableRooms.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>
              </div>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-slate-50/10">
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                      Room & Date
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                      Timeslot
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                      Society & Officer
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100">
                      Purpose
                    </th>
                    <th className="px-8 py-5 text-[10px] font-black text-slate-400 uppercase tracking-[0.3em] border-b border-slate-100 text-right">
                      Status
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-50">
                  {filteredRoomBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/50 transition-colors">
                      <td className="px-8 py-6">
                        <div className="font-black text-slate-800 text-sm">{b.room}</div>
                        <span className="text-xs font-bold text-slate-500 mt-0.5 block">
                          📅 {b.date}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <span className="text-xs font-bold text-slate-700 bg-slate-100 px-3 py-1 rounded-xl inline-block">
                          ⏰ {b.timeslot}
                        </span>
                      </td>
                      <td className="px-8 py-6">
                        <div className="font-bold text-slate-800 text-xs">{b.society}</div>
                        <div className="text-[10px] text-slate-400">{b.studentName} ({b.studentRollNo})</div>
                      </td>
                      <td className="px-8 py-6 max-w-xs">
                        <p className="text-xs text-slate-600 truncate">{b.purpose}</p>
                        {b.actionNote && (
                          <p className="text-[10px] text-slate-400 mt-0.5 italic">Note: {b.actionNote}</p>
                        )}
                      </td>
                      <td className="px-8 py-6 text-right">
                        <span
                          className={`inline-flex px-3 py-1 rounded-xl text-[10px] font-black uppercase tracking-widest border ${
                            b.status === "APPROVED"
                              ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                              : b.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border-amber-200"
                              : "bg-red-50 text-red-700 border-red-200"
                          }`}
                        >
                          {b.status}
                        </span>
                      </td>
                    </tr>
                  ))}
                  {filteredRoomBookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-20 text-center font-black text-slate-300 uppercase tracking-[0.4em] text-xs">
                        No room bookings match the current filter
                      </td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </section>
        </div>
      )}
    </div>
  );
}
