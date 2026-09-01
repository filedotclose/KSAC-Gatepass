"use client";

import { IUser } from "@/types/user";
import { useEffect, useState, useMemo } from "react";
import {
  KSAC_SOCIETIES,
  KSAC_CENTRAL_ROOMS,
  CLOCK_START_TIMES,
  CLOCK_END_TIMES,
  getAllocatedRoomForSociety,
  validateBookingTimeWindow,
  formatMinutesToTime,
  parseTimeToMinutes
} from "@/lib/ksacSocieties";
import { dispatchGateway, GATEWAY_OPCODES } from "@/lib/gatewayClient";

interface Props {
  user: IUser;
}

const COMMON_SOCIETIES = [
  "KIIT Intl. Student Society",
  "KIIT Film Society",
  "Kalakaar",
  "TEDx KIIT University",
  "KSHITIJ",
  "Kronicle",
  "Kraya & Kuber",
  "Kraftovity",
  "KORUS",
  "Khwahishein",
  "Keurig",
  "Kalliope",
  "KAEWS",
  "ENACTUS KISS-KIIT",
  "Kamakshi & HeForShe",
  "SPIC MACAY",
  "Qutopia",
  "Kreative Eye",
  "KIIT Wordsmith",
  "KIIT INT- MUN Society",
  "Khwaab",
  "Kimaya",
  "Kzarshion",
  "IOT",
  "K - 1000",
  "FED",
  "Cyber Vault",
  "KIIT Electrical Society",
  "KIIT Robotics Society",
  "Konnexions",
  "KIIT Society For Civil Engineers",
  "Other KSAC Wing / Workshop",
];

export default function StudentView({ user }: Props) {
  const [activeTab, setActiveTab] = useState<"pass" | "room">("pass");

  // GatePass states
  const [passes, setPasses] = useState<any[]>([]);
  const [society, setSociety] = useState(user.society || COMMON_SOCIETIES[0]);
  const [customSociety, setCustomSociety] = useState("");
  const [reason, setReason] = useState("");
  const [requestedExtension, setRequestedExtension] = useState("09:30 PM");
  const [loadingPasses, setLoadingPasses] = useState(true);
  const [submittingPass, setSubmittingPass] = useState(false);

  // Derive authorized leadership societies from authentic profile
  const authorizedSocieties = useMemo(() => {
    if (user.societyPositions && user.societyPositions.length > 0) {
      return user.societyPositions;
    }
    if (user.society) {
      return [{ society: user.society, position: user.position || "Office Bearer" }];
    }
    return [];
  }, [user]);

  const initialSociety = authorizedSocieties[0]?.society || user.society || "Kalliope";

  // Room Booking states
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingSociety, setBookingSociety] = useState(initialSociety);
  const [bookingRoom, setBookingRoom] = useState(
    user.allocatedRoom || getAllocatedRoomForSociety(initialSociety)
  );
  const [bookingDate, setBookingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });

  // Variable start & end clock times (default: 02:00 PM - 04:00 PM)
  const [bookingStartTime, setBookingStartTime] = useState("02:00 PM");
  const [bookingEndTime, setBookingEndTime] = useState("04:00 PM");
  const [bookingPurpose, setBookingPurpose] = useState("");
  const [attendeesEstimate, setAttendeesEstimate] = useState("15");
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");
  const [isSyncing, setIsSyncing] = useState(false);

  const timeValidation = validateBookingTimeWindow(bookingStartTime, bookingEndTime);

  const fetchStudentData = async (isManualSync = false) => {
    if (isManualSync) setIsSyncing(true);
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.FETCH_STUDENT_DASHBOARD);
      if (res.ok && res.data) {
        setPasses(Array.isArray(res.data.passes) ? res.data.passes : []);
        if (user.isSocietyLead) {
          setBookings(Array.isArray(res.data.bookings) ? res.data.bookings : []);
        }
      }
    } catch (err) {
      console.error("Failed to fetch student data via gateway", err);
    } finally {
      setLoadingPasses(false);
      setLoadingBookings(false);
      if (isManualSync) {
        setTimeout(() => setIsSyncing(false), 500);
      }
    }
  };

  useEffect(() => {
    fetchStudentData(false);
  }, [user.isSocietyLead]);

  const handleSocietyChange = (soc: string) => {
    setBookingSociety(soc);
    setBookingRoom(getAllocatedRoomForSociety(soc));
  };

  const applyDurationPreset = (hours: number) => {
    const startMin = parseTimeToMinutes(bookingStartTime);
    if (startMin === null) return;
    const newEndMin = Math.min(startMin + hours * 60, 19 * 60); // Cap at 7:00 PM
    setBookingEndTime(formatMinutesToTime(newEndMin));
  };

  const handlePassRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingPass(true);
    const finalSociety =
      society === "Other KSAC Wing / Workshop" && customSociety.trim()
        ? customSociety.trim()
        : society;

    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.REQUEST_GATEPASS, {
        society: finalSociety,
        reason,
        requestedExtension: requestedExtension.trim(),
      });

      if (res.ok) {
        setReason("");
        setCustomSociety("");
        fetchStudentData(false);
      } else {
        alert(res.message || "Failed to request pass");
      }
    } catch (err) {
      console.error("Pass request error", err);
    } finally {
      setSubmittingPass(false);
    }
  };

  const handleRoomBookingRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!timeValidation.valid) {
      setBookingError(timeValidation.error || "Please select a valid time window.");
      return;
    }

    setSubmittingBooking(true);
    setBookingError("");
    setBookingSuccess("");

    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.REQUEST_ROOM_BOOKING, {
        society: bookingSociety,
        room: bookingRoom,
        date: bookingDate,
        startTime: bookingStartTime,
        endTime: bookingEndTime,
        timeslot: `${bookingStartTime} - ${bookingEndTime}`,
        purpose: bookingPurpose,
        attendeesEstimate: parseInt(attendeesEstimate, 10) || 15,
      });

      if (res.ok) {
        setBookingSuccess(`Room booking request for ${bookingRoom} on ${bookingDate} (${bookingStartTime} - ${bookingEndTime}) submitted! Waiting for KSAC Authority approval.`);
        setBookingPurpose("");
        fetchStudentData(false);
      } else {
        setBookingError(res.message || "Failed to submit room booking request.");
      }
    } catch (err: any) {
      setBookingError(err.message || "An unexpected error occurred.");
    } finally {
      setSubmittingBooking(false);
    }
  };

  const activePass = passes.find(
    (p) => p.status !== "RETURNED" && p.status !== "REJECTED"
  );

  return (
    <div className="w-full space-y-4 sm:space-y-6 md:space-y-8 animate-in fade-in duration-300">
      {/* Header & Identity Section */}
      <header className="flex flex-col sm:flex-row sm:items-end justify-between gap-3 sm:gap-6 bg-white/60 sm:bg-transparent p-4 sm:p-0 rounded-2xl sm:rounded-none border sm:border-0 border-slate-200/60 shadow-xs sm:shadow-none">
        <div className="space-y-1.5 sm:space-y-2.5">
          <div className="flex flex-wrap items-center gap-1.5 sm:gap-2.5">
            <span className="bg-emerald-600 text-white text-[9px] sm:text-[10px] font-black px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl uppercase tracking-wider sm:tracking-widest shadow-xs sm:shadow-md shadow-emerald-100">
              Student Portal
            </span>
            {user.isSocietyLead ? (
              <span className="bg-slate-900 text-amber-300 text-[9px] sm:text-[10px] font-black px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl uppercase tracking-wider sm:tracking-widest border border-amber-400/30 flex items-center gap-1 shadow-xs">
                <svg className="w-3 h-3 sm:w-3.5 sm:h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 01.756.344l2.4 2.8 3.65.53a1 1 0 01.554 1.705l-2.64 2.573.623 3.635a1 1 0 01-1.45 1.054L10 12.93l-3.263 1.716a1 1 0 01-1.45-1.054l.623-3.635-2.64-2.573a1 1 0 01.554-1.705l3.65-.53 2.4-2.8A1 1 0 0110 2z" clipRule="evenodd" />
                </svg>
                <span className="truncate max-w-[180px] sm:max-w-none">
                  {user.position || "Lead"} • {user.society || "KSAC"}
                </span>
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[9px] sm:text-[10px] font-black px-2.5 sm:px-3.5 py-1 sm:py-1.5 rounded-lg sm:rounded-xl uppercase tracking-wider sm:tracking-widest border border-slate-200">
                Resident Student
              </span>
            )}
          </div>

          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight sm:tracking-tighter">
            Student Hub
          </h1>

          <p className="text-slate-500 font-medium text-xs sm:text-base md:text-lg leading-snug sm:leading-relaxed">
            Logged in as <span className="gradient-text font-black">{user.name}</span> <span className="text-slate-400 font-semibold">({user.rollNo})</span>
            <span className="inline-block ml-2 text-[10px] sm:text-xs font-black text-slate-700 bg-slate-100 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg border border-slate-200">
              Hostel: {user.hostel || "KP-7A"}
            </span>
            {user.isSocietyLead && user.allocatedRoom && (
              <span className="block sm:inline sm:ml-2 text-[10px] sm:text-xs font-bold text-emerald-700 bg-emerald-50 px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg border border-emerald-200 mt-1 sm:mt-0 w-fit">
                Allocated Room: {user.allocatedRoom}
              </span>
            )}
          </p>
        </div>

        {/* Sync Button */}
        <div className="flex items-center gap-2 self-start sm:self-auto">
          <button
            onClick={() => fetchStudentData(true)}
            disabled={isSyncing}
            aria-label="Synchronize student data"
            className="flex items-center gap-1.5 sm:gap-2 px-3.5 sm:px-5 py-2 sm:py-3 bg-white text-slate-700 rounded-xl sm:rounded-2xl font-black text-[9px] sm:text-[10px] uppercase tracking-wider sm:tracking-widest transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 border border-slate-200 shadow-xs touch-btn"
          >
            <svg
              className={`w-3.5 h-3.5 text-emerald-600 transition-transform ${isSyncing ? "animate-spin" : ""}`}
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
            <span>
              <span className="inline sm:hidden">{isSyncing ? "Syncing..." : "Sync"}</span>
              <span className="hidden sm:inline">{isSyncing ? "Syncing Data..." : "Sync Data"}</span>
            </span>
          </button>
        </div>
      </header>

      {/* Tab Navigation: Mobile Pill / Desktop Bar */}
      <div className="flex gap-2 sm:gap-3 border-b border-slate-200/80 pb-2 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("pass")}
          className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 shrink-0 touch-btn ${
            activeTab === "pass"
              ? "bg-slate-900 text-white shadow-md sm:shadow-xl shadow-slate-900/10"
              : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-emerald-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <span>
            <span className="inline sm:hidden">GatePass</span>
            <span className="hidden sm:inline">Hostel & KSAC GatePass</span>
          </span>
          {activePass && (
            <span className="w-2 h-2 bg-emerald-400 rounded-full animate-ping ml-0.5"></span>
          )}
        </button>

        <button
          onClick={() => setActiveTab("room")}
          className={`flex items-center justify-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 shrink-0 touch-btn ${
            activeTab === "room"
              ? "bg-emerald-600 text-white shadow-md sm:shadow-xl shadow-emerald-200"
              : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>
            <span className="inline sm:hidden">Room Booking</span>
            <span className="hidden sm:inline">Society Room Booking</span>
          </span>
          {user.isSocietyLead ? (
            <span className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] bg-amber-400 text-slate-900 rounded-md sm:rounded-lg font-black tracking-wider uppercase">
              Lead
            </span>
          ) : (
            <span className="px-1.5 sm:px-2 py-0.5 text-[8px] sm:text-[9px] bg-slate-100 text-slate-400 rounded-md sm:rounded-lg font-black tracking-wider uppercase">
              Locked
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: GATEPASS MANAGEMENT */}
      {activeTab === "pass" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8 animate-in fade-in duration-300">
          {/* Left Column: Active Pass / Request Form */}
          <div className="lg:col-span-4 space-y-4 sm:space-y-6 md:space-y-8">
            <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] shadow-xs sm:shadow-sm border border-slate-100 ring-1 ring-slate-200/50 relative overflow-hidden">
              <h2 className="text-lg sm:text-xl font-bold text-slate-800 mb-4 sm:mb-6 flex items-center gap-2.5 sm:gap-3">
                <span className="p-2 sm:p-2.5 bg-emerald-600 text-white rounded-lg sm:rounded-xl shadow-md shadow-emerald-100">
                  <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
                  </svg>
                </span>
                <span>
                  <span className="inline sm:hidden">GatePass Request</span>
                  <span className="hidden sm:inline">KSAC GatePass Request</span>
                </span>
              </h2>

              {activePass ? (
                /* Mobile Digital Boarding Pass */
                <div className="p-4 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 rounded-2xl sm:rounded-3xl space-y-4 sm:space-y-5 shadow-xl text-white border border-emerald-500/20">
                  <div className="flex items-center justify-between pb-3 border-b border-white/10">
                    <div className="flex items-center gap-2 sm:gap-3">
                      <div className="relative">
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-400 rounded-full animate-ping absolute"></div>
                        <div className="w-2.5 h-2.5 sm:w-3 sm:h-3 bg-emerald-500 rounded-full relative border-2 border-slate-900"></div>
                      </div>
                      <span className="font-black text-[10px] sm:text-xs uppercase tracking-wider sm:tracking-widest text-emerald-300">
                        Active Pass In Transit
                      </span>
                    </div>
                    <span className="text-[9px] sm:text-[10px] font-black uppercase px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-400/30">
                      {activePass.status}
                    </span>
                  </div>

                  <div className="bg-white/5 p-3.5 sm:p-4 rounded-xl sm:rounded-2xl border border-white/10 space-y-2.5">
                    <div>
                      <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Society / Wing
                      </p>
                      <p className="text-xs sm:text-sm font-black text-white">{activePass.society}</p>
                    </div>

                    <div className="pt-2 border-t border-white/5 grid grid-cols-2 gap-2">
                      <div>
                        <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Target In-Time
                        </p>
                        <p className="text-xs sm:text-sm font-black text-emerald-400">
                          {activePass.requestedExtension || "Standard"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Purpose
                        </p>
                        <p className="text-[11px] sm:text-xs font-semibold text-slate-300 truncate">
                          {activePass.reason}
                        </p>
                      </div>
                    </div>
                  </div>

                  {/* Status Helper Banner */}
                  <div className="p-3 bg-emerald-950/90 rounded-xl border border-emerald-700/40 text-[10px] sm:text-[11px] text-emerald-200 leading-relaxed flex items-start gap-2">
                    <svg className="w-4 h-4 text-emerald-400 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                      <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
                    </svg>
                    <span>
                      {activePass.status === "PENDING" && "In Queue: Waiting for KSAC Authority verification & acceptance. Your warden will be notified once verified."}
                      {activePass.status === "APPROVED" && "Verified by KSAC Authority! In-time extension active. Please confirm entry with your warden when back at hostel."}
                      {activePass.status === "IN_KSAC" && "Session active at KSAC! Please ensure you reach your hostel before the verified curfew."}
                    </span>
                  </div>
                </div>
              ) : (
                /* Gatepass Request Form */
                <form onSubmit={handlePassRequest} className="space-y-4 sm:space-y-5">
                  <div className="space-y-1.5">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 ml-1">
                      Select Society / Wing
                    </label>
                    <select
                      value={society}
                      onChange={(e) => setSociety(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-bold"
                    >
                      {COMMON_SOCIETIES.map((soc) => (
                        <option key={soc} value={soc}>
                          {soc}
                        </option>
                      ))}
                    </select>
                  </div>

                  {society === "Other KSAC Wing / Workshop" && (
                    <div className="space-y-1.5 animate-in fade-in">
                      <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 ml-1">
                        Activity Name
                      </label>
                      <input
                        type="text"
                        placeholder="e.g. TEDxKIIT / Hackathon"
                        className="w-full bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-medium"
                        value={customSociety}
                        onChange={(e) => setCustomSociety(e.target.value)}
                        required
                      />
                    </div>
                  )}

                  <div className="space-y-1.5">
                    <div className="flex justify-between items-center ml-1">
                      <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400">
                        Expected Return Time
                      </label>
                      <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                        Target In-Time
                      </span>
                    </div>
                    <input
                      type="text"
                      placeholder="e.g. 09:30 PM, 10:00 PM"
                      className="w-full bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-semibold"
                      value={requestedExtension}
                      onChange={(e) => setRequestedExtension(e.target.value)}
                      required
                    />
                    {/* Quick Select Chips */}
                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {["06:00 PM", "08:30 PM", "09:30 PM", "10:00 PM"].map((t) => (
                        <button
                          type="button"
                          key={t}
                          onClick={() => setRequestedExtension(t)}
                          className={`text-[8px] sm:text-[9px] font-black px-2 sm:px-2.5 py-1 rounded-lg border transition-all active:scale-95 ${
                            requestedExtension === t
                              ? "bg-emerald-600 text-white border-emerald-600 shadow-xs"
                              : "bg-slate-50 text-slate-500 border-slate-200 hover:bg-slate-100"
                          }`}
                        >
                          {t}
                        </button>
                      ))}
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 ml-1">
                      Purpose / Reason
                    </label>
                    <textarea
                      placeholder="e.g. Rehearsal for fest, workshop, project work..."
                      className="w-full bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 min-h-[85px] sm:min-h-[100px] text-slate-700 text-xs font-medium leading-relaxed"
                      value={reason}
                      onChange={(e) => setReason(e.target.value)}
                      required
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={submittingPass}
                    className="w-full bg-emerald-600 text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-md sm:shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3 tracking-wider sm:tracking-widest uppercase text-[11px] sm:text-xs disabled:opacity-50 touch-btn"
                  >
                    {submittingPass ? (
                      <span className="flex items-center gap-2">
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                        Submitting...
                      </span>
                    ) : (
                      <>
                        <span>Request GatePass</span>
                        <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                        </svg>
                      </>
                    )}
                  </button>
                </form>
              )}
            </div>

            {/* Protocol Guidelines Card */}
            <div className="bg-gradient-to-br from-slate-900 to-emerald-950 p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] shadow-lg text-white relative overflow-hidden">
              <h3 className="text-xs sm:text-sm font-black mb-3 sm:mb-4 uppercase tracking-wider sm:tracking-widest text-emerald-400 flex items-center gap-2">
                <svg className="w-4 h-4 text-emerald-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M2.166 4.999A11.954 11.954 0 0010 1.944 11.954 11.954 0 0017.834 5c.11.65.166 1.32.166 2.001 0 5.225-3.34 9.67-8 11.317C5.34 16.67 2 12.225 2 7c0-.682.057-1.35.166-2.001zm11.541 3.708a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
                Movement Protocols
              </h3>
              <ul className="space-y-2.5 sm:space-y-3.5 text-[11px] sm:text-xs text-slate-300">
                <li className="flex gap-2.5 items-start">
                  <span className="text-emerald-400 font-black">1.</span>
                  <span>Verified digitally at both Hostel Gate and KSAC desk.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-emerald-400 font-black">2.</span>
                  <span>Ensure KSAC Desk Officer logs your physical arrival.</span>
                </li>
                <li className="flex gap-2.5 items-start">
                  <span className="text-emerald-400 font-black">3.</span>
                  <span>Mark departure at KSAC before heading back to close loop.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right Column: GatePass History */}
          <div className="lg:col-span-8 space-y-4 sm:space-y-6">
            <div className="bg-white p-4 sm:p-6 md:p-10 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] shadow-xs sm:shadow-sm border border-slate-100 ring-1 ring-slate-200/50 min-h-[350px] sm:min-h-[500px]">
              <div className="flex items-center justify-between mb-4 sm:mb-8">
                <div>
                  <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                    GatePass History
                  </h2>
                  <p className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-0.5 sm:mt-1">
                    Records for <span className="font-bold text-slate-600">{user.rollNo}</span>
                  </p>
                </div>
                <span className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-emerald-50 text-emerald-700 text-[8px] sm:text-[10px] font-black rounded-lg sm:rounded-xl border border-emerald-200">
                  <span className="inline sm:hidden">LIVE</span>
                  <span className="hidden sm:inline">REAL-TIME SYNC</span>
                </span>
              </div>

              {loadingPasses ? (
                <div className="flex flex-col items-center justify-center h-60 sm:h-80 space-y-3 sm:space-y-4">
                  <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                    Loading History...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-6">
                  {passes.map((pass) => (
                    <div
                      key={pass._id}
                      className="group p-4 sm:p-6 bg-slate-50/80 border border-slate-200/70 rounded-2xl sm:rounded-3xl hover:bg-white hover:border-emerald-200 hover:shadow-lg transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-3 sm:mb-4">
                        <div
                          className={`p-2 sm:p-3 rounded-xl sm:rounded-2xl ${
                            pass.status === "RETURNED"
                              ? "bg-emerald-100 text-emerald-800"
                              : pass.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-teal-100 text-teal-800"
                          }`}
                        >
                          <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span
                          className={`text-[8px] sm:text-[9px] font-black uppercase px-2 sm:px-2.5 py-0.5 sm:py-1 rounded-md sm:rounded-lg ${
                            pass.status === "RETURNED"
                              ? "bg-emerald-50 text-emerald-700 border border-emerald-200"
                              : pass.status === "PENDING"
                              ? "bg-amber-50 text-amber-700 border border-amber-200"
                              : "bg-teal-50 text-teal-700 border border-teal-200"
                          }`}
                        >
                          {pass.status}
                        </span>
                      </div>

                      <div className="space-y-1.5 sm:space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-[11px] sm:text-xs font-black text-emerald-800 bg-emerald-50 px-2 sm:px-2.5 py-0.5 rounded-md sm:rounded-lg border border-emerald-200 truncate max-w-[160px] sm:max-w-none">
                            {pass.society}
                          </span>
                          <span className="text-[9px] sm:text-[10px] font-black text-slate-400">
                            {new Date(pass.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-[11px] sm:text-xs font-medium text-slate-600 bg-white/80 p-2.5 sm:p-3 rounded-xl border border-slate-100 italic line-clamp-2">
                          "{pass.reason}"
                        </p>
                        <div className="flex justify-between items-center text-[9px] sm:text-[10px] font-bold text-slate-500 pt-0.5">
                          <span>Target: {pass.requestedExtension}</span>
                          {pass.transitToKSAC != null && (
                            <span className="text-emerald-600">Transit: {pass.transitToKSAC}m</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {passes.length === 0 && (
                    <div className="col-span-full py-16 sm:py-28 text-center text-slate-400 space-y-2">
                      <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
                      </svg>
                      <p className="font-bold text-sm sm:text-base">No GatePass records found</p>
                      <p className="text-[11px] sm:text-xs">Submit a request on the form to get started.</p>
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: SOCIETY ROOM BOOKING */}
      {activeTab === "room" && (
        <div className="animate-in fade-in duration-300 space-y-4 sm:space-y-8">
          {!user.isSocietyLead ? (
            /* Restricted State for Non-Leads */
            <div className="bg-white p-6 sm:p-10 md:p-12 rounded-2xl sm:rounded-3xl md:rounded-[3rem] shadow-xs sm:shadow-sm border border-slate-100 text-center max-w-2xl mx-auto space-y-4 sm:space-y-6">
              <div className="w-14 h-14 sm:w-20 sm:h-20 bg-amber-50 text-amber-600 rounded-2xl sm:rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <svg className="w-7 h-7 sm:w-10 sm:h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <div className="space-y-1.5 sm:space-y-2">
                <h2 className="text-lg sm:text-2xl font-black text-slate-800">
                  Society Room Booking Restricted
                </h2>
                <p className="text-xs sm:text-sm text-slate-500 font-medium leading-relaxed max-w-md mx-auto">
                  Only verified KSAC Society Presidents & Vice-Presidents listed in the official registry have privileges to reserve society rooms.
                </p>
              </div>

              <div className="bg-slate-50 p-4 sm:p-5 rounded-xl sm:rounded-2xl border border-slate-100 text-[11px] sm:text-xs text-slate-600 text-left space-y-1.5">
                <p className="font-bold text-slate-700">Need a GatePass to attend a society session?</p>
                <p>You can request your individual GatePass under the <strong>GatePass</strong> tab to attend rehearsals, workshops, and team sessions.</p>
              </div>

              <button
                onClick={() => setActiveTab("pass")}
                className="px-6 sm:px-8 py-3 sm:py-3.5 bg-slate-900 text-white text-[11px] sm:text-xs font-black uppercase tracking-wider sm:tracking-widest rounded-xl sm:rounded-2xl hover:bg-emerald-600 transition-all shadow-md active:scale-95 touch-btn"
              >
                Back to GatePass Request
              </button>
            </div>
          ) : (
            /* Unlocked State for Society Leaders */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 sm:gap-6 md:gap-8">
              {/* Left Column: Room Booking Form */}
              <div className="lg:col-span-5 space-y-4 sm:space-y-6 md:space-y-8">
                <div className="bg-white p-4 sm:p-6 md:p-8 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] shadow-xs sm:shadow-sm border border-slate-100 ring-1 ring-slate-200/50 space-y-4 sm:space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2.5 sm:gap-3">
                      <div className="p-2 sm:p-2.5 bg-emerald-600 text-white rounded-lg sm:rounded-xl shadow-md shadow-emerald-100">
                        <svg className="w-4 h-4 sm:w-5 sm:h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h2 className="text-base sm:text-xl font-bold text-slate-800">Reserve Room</h2>
                        <p className="text-[9px] sm:text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          KSAC Approval Required
                        </p>
                      </div>
                    </div>
                    <span className="text-[8px] sm:text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 px-2.5 py-1 rounded-lg sm:rounded-xl border border-emerald-200">
                      {user.position || "Leader"}
                    </span>
                  </div>

                  {bookingSuccess && (
                    <div className="p-3 sm:p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold animate-in fade-in flex items-start gap-2">
                      <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{bookingSuccess}</span>
                    </div>
                  )}

                  {bookingError && (
                    <div className="p-3 sm:p-4 bg-red-50 border border-red-200 text-red-700 rounded-xl sm:rounded-2xl text-[11px] sm:text-xs font-bold animate-in fade-in flex items-start gap-2">
                      <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRoomBookingRequest} className="space-y-3.5 sm:space-y-5">
                    {/* Society Designation */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400">
                          Designated Society
                        </label>
                        <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700 bg-emerald-50 px-1.5 py-0.5 rounded">
                          Official
                        </span>
                      </div>

                      {authorizedSocieties.length > 1 ? (
                        <select
                          value={bookingSociety}
                          onChange={(e) => handleSocietyChange(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 p-3 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-800 text-xs font-bold"
                        >
                          {authorizedSocieties.map((sp) => (
                            <option key={sp.society} value={sp.society}>
                              {sp.society} ({sp.position})
                            </option>
                          ))}
                        </select>
                      ) : (
                        <div className="w-full bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl flex items-center justify-between shadow-inner">
                          <div className="flex items-center gap-2.5 sm:gap-3">
                            <div className="w-7 h-7 sm:w-8 sm:h-8 rounded-lg sm:rounded-xl bg-emerald-600 text-white flex items-center justify-center font-black text-xs shadow-sm">
                              <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 2a1 1 0 01.756.344l2.4 2.8 3.65.53a1 1 0 01.554 1.705l-2.64 2.573.623 3.635a1 1 0 01-1.45 1.054L10 12.93l-3.263 1.716a1 1 0 01-1.45-1.054l.623-3.635-2.64-2.573a1 1 0 01.554-1.705l3.65-.53 2.4-2.8A1 1 0 0110 2z" clipRule="evenodd" />
                              </svg>
                            </div>
                            <div>
                              <p className="text-xs font-black text-slate-800">{authorizedSocieties[0]?.society || user.society}</p>
                              <p className="text-[9px] sm:text-[10px] font-bold text-emerald-700 uppercase tracking-wider">
                                {authorizedSocieties[0]?.position || user.position || "Office Bearer"} • Verified
                              </p>
                            </div>
                          </div>
                          <span className="text-[8px] sm:text-[9px] font-black uppercase bg-slate-200 text-slate-600 px-2 py-0.5 rounded">
                            Locked
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Room Selector */}
                    <div className="space-y-1.5">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400">
                          Target Room
                        </label>
                        <span className="text-[8px] sm:text-[9px] font-bold text-emerald-700">Allocated & Central</span>
                      </div>
                      <select
                        value={bookingRoom}
                        onChange={(e) => setBookingRoom(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-bold"
                      >
                        <option value={getAllocatedRoomForSociety(bookingSociety)}>
                          {getAllocatedRoomForSociety(bookingSociety)} (Allocated for {bookingSociety})
                        </option>
                        {KSAC_CENTRAL_ROOMS.map((cr) => (
                          <option key={cr} value={cr}>
                            {cr}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 ml-1">
                        Date of Booking
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-bold"
                        required
                      />
                    </div>

                    {/* Variable Time Selector */}
                    <div className="space-y-2.5 p-3 sm:p-4 bg-slate-50 rounded-xl sm:rounded-2xl border border-slate-200/70">
                      <div className="flex items-center justify-between">
                        <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-500">
                          Time Window
                        </label>
                        <span className="text-[8px] sm:text-[9px] font-bold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Min 1h • Max 7 PM
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-2 sm:gap-3">
                        <div className="space-y-1">
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">Start Time</span>
                          <select
                            value={bookingStartTime}
                            onChange={(e) => setBookingStartTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            {CLOCK_START_TIMES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        <div className="space-y-1">
                          <span className="text-[9px] sm:text-[10px] font-bold text-slate-400">End Time (Max 7 PM)</span>
                          <select
                            value={bookingEndTime}
                            onChange={(e) => setBookingEndTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 p-2.5 sm:p-3 rounded-lg sm:rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            {CLOCK_END_TIMES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>

                      {/* Quick Duration Buttons */}
                      <div className="flex flex-wrap items-center gap-1 sm:gap-1.5 pt-0.5">
                        <span className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-wider mr-0.5">
                          Presets:
                        </span>
                        {[1, 1.5, 2, 3].map((hrs) => (
                          <button
                            type="button"
                            key={hrs}
                            onClick={() => applyDurationPreset(hrs)}
                            className="text-[8px] sm:text-[9px] font-bold px-2 py-0.5 sm:py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-md sm:rounded-lg border border-slate-200 transition-all active:scale-95"
                          >
                            +{hrs}h
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setBookingEndTime("07:00 PM")}
                          className="text-[8px] sm:text-[9px] font-bold px-2 py-0.5 sm:py-1 bg-emerald-50 text-emerald-800 rounded-md sm:rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all active:scale-95"
                        >
                          Until 7 PM
                        </button>
                      </div>

                      {/* Dynamic Duration / Validation Indicator */}
                      <div
                        className={`p-2 sm:p-2.5 rounded-lg sm:rounded-xl text-[10px] sm:text-[11px] font-bold flex items-center justify-between ${
                          timeValidation.valid
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "bg-red-50 border border-red-200 text-red-700"
                        }`}
                      >
                        <div className="flex items-center gap-1 sm:gap-1.5 truncate">
                          <span>⏰ {bookingStartTime} ➔ {bookingEndTime}</span>
                        </div>
                        <div>
                          {timeValidation.valid ? (
                            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[8px] sm:text-[9px] font-black uppercase shrink-0">
                              {Math.floor((timeValidation.durationMinutes || 0) / 60)}h {(timeValidation.durationMinutes || 0) % 60}m
                            </span>
                          ) : (
                            <span className="text-[9px] text-red-600 font-bold shrink-0">
                              {timeValidation.error}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Purpose */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 ml-1">
                        Purpose / Agenda
                      </label>
                      <textarea
                        placeholder="e.g. Band rehearsal, hackathon assembly..."
                        className="w-full bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 min-h-[75px] sm:min-h-[90px] text-slate-700 text-xs font-medium leading-relaxed"
                        value={bookingPurpose}
                        onChange={(e) => setBookingPurpose(e.target.value)}
                        required
                      />
                    </div>

                    {/* Estimated Count */}
                    <div className="space-y-1.5">
                      <label className="text-[9px] sm:text-[10px] font-black uppercase tracking-[0.15em] sm:tracking-[0.2em] text-slate-400 ml-1">
                        Expected Member Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={attendeesEstimate}
                        onChange={(e) => setAttendeesEstimate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-200/80 p-3 sm:p-4 rounded-xl sm:rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-semibold"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingBooking || !timeValidation.valid}
                      className="w-full bg-emerald-600 text-white font-black py-3.5 sm:py-4 rounded-xl sm:rounded-2xl shadow-md sm:shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-2 sm:gap-3 tracking-wider sm:tracking-widest uppercase text-[11px] sm:text-xs disabled:opacity-50 touch-btn"
                    >
                      {submittingBooking ? (
                        <span className="flex items-center gap-2">
                          <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                          Submitting...
                        </span>
                      ) : (
                        <>
                          <span>Submit Room Request</span>
                          <svg className="w-3.5 h-3.5 sm:w-4 sm:h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                          </svg>
                        </>
                      )}
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Room Bookings Status */}
              <div className="lg:col-span-7 space-y-4 sm:space-y-6">
                <div className="bg-white p-4 sm:p-6 md:p-10 rounded-2xl sm:rounded-3xl md:rounded-[2.5rem] shadow-xs sm:shadow-sm border border-slate-100 ring-1 ring-slate-200/50 min-h-[350px] sm:min-h-[550px]">
                  <div className="flex items-center justify-between mb-4 sm:mb-8">
                    <div>
                      <h2 className="text-xl sm:text-2xl font-black text-slate-800 tracking-tight">
                        Society Bookings
                      </h2>
                      <p className="text-[10px] sm:text-xs font-semibold text-slate-400 mt-0.5 sm:mt-1">
                        Track KSAC Authority status (Max 7:00 PM closing)
                      </p>
                    </div>
                    <span className="px-2.5 sm:px-3.5 py-1 sm:py-1.5 bg-emerald-50 text-emerald-700 text-[8px] sm:text-[10px] font-black rounded-lg sm:rounded-xl border border-emerald-200">
                      {bookings.length} {bookings.length === 1 ? "Booking" : "Bookings"}
                    </span>
                  </div>

                  {loadingBookings ? (
                    <div className="flex flex-col items-center justify-center h-60 sm:h-80 space-y-3 sm:space-y-4">
                      <div className="w-10 h-10 sm:w-12 sm:h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                      <p className="text-[10px] sm:text-xs font-black text-slate-400 uppercase tracking-widest">
                        Loading Bookings...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-3 sm:space-y-4">
                      {bookings.map((b) => (
                        <div
                          key={b._id}
                          className="p-4 sm:p-6 bg-slate-50/80 border border-slate-200/70 rounded-2xl sm:rounded-3xl hover:bg-white hover:border-emerald-200 hover:shadow-lg transition-all duration-300 space-y-2.5 sm:space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 pb-2 border-b border-slate-200/50">
                            <div>
                              <span className="text-xs font-black text-emerald-800 bg-emerald-100/70 px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border border-emerald-200">
                                {b.room}
                              </span>
                              <span className="ml-2 text-[10px] font-bold text-slate-500">
                                {b.society}
                              </span>
                            </div>
                            <span
                              className={`self-start sm:self-auto text-[9px] sm:text-[10px] font-black uppercase px-2.5 sm:px-3 py-0.5 sm:py-1 rounded-lg sm:rounded-xl border ${
                                b.status === "APPROVED"
                                  ? "bg-emerald-500 text-white border-emerald-600 shadow-xs"
                                  : b.status === "PENDING"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {b.status === "APPROVED" && "✓ Approved"}
                              {b.status === "PENDING" && "⏳ Pending KSAC"}
                              {b.status === "REJECTED" && "✕ Rejected"}
                            </span>
                          </div>

                          <div className="grid grid-cols-3 gap-2 text-xs">
                            <div className="bg-white p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100">
                              <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Date
                              </p>
                              <p className="font-black text-slate-800 mt-0.5 text-[11px] sm:text-xs truncate">{b.date}</p>
                            </div>
                            <div className="bg-white p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100">
                              <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Window
                              </p>
                              <p className="font-bold text-emerald-700 mt-0.5 text-[11px] sm:text-xs truncate">
                                {b.startTime && b.endTime ? `${b.startTime}-${b.endTime}` : b.timeslot}
                              </p>
                            </div>
                            <div className="bg-white p-2 sm:p-3 rounded-xl sm:rounded-2xl border border-slate-100">
                              <p className="text-[8px] sm:text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Count
                              </p>
                              <p className="font-bold text-slate-800 mt-0.5 text-[11px] sm:text-xs">
                                {b.attendeesEstimate || 15} M
                              </p>
                            </div>
                          </div>

                          <p className="text-[11px] sm:text-xs text-slate-600 italic bg-white/70 p-2.5 sm:p-3 rounded-xl border border-slate-100 line-clamp-2">
                            "{b.purpose}"
                          </p>

                          {b.actionNote && (
                            <div className="text-[10px] sm:text-[11px] font-semibold text-slate-600 bg-slate-100/90 p-2 sm:p-2.5 rounded-lg sm:rounded-xl border border-slate-200">
                              <strong>KSAC Note:</strong> {b.actionNote}
                            </div>
                          )}
                        </div>
                      ))}

                      {bookings.length === 0 && (
                        <div className="py-20 sm:py-32 text-center text-slate-400 space-y-2">
                          <svg className="w-12 h-12 sm:w-16 sm:h-16 mx-auto text-slate-300 mb-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="font-bold text-sm sm:text-base">No Room Bookings Found</p>
                          <p className="text-[11px] sm:text-xs">Submit a reservation request on the form to book an activity room.</p>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
