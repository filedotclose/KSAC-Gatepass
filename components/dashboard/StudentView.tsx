"use client";

import { IUser } from "@/types/user";
import { useEffect, useState } from "react";
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

  // Room Booking states
  const [bookings, setBookings] = useState<any[]>([]);
  const [bookingSociety, setBookingSociety] = useState(user.society || "KORUS");
  const [bookingRoom, setBookingRoom] = useState(user.allocatedRoom || getAllocatedRoomForSociety(user.society || "KORUS"));
  const [bookingDate, setBookingDate] = useState(() => {
    const today = new Date();
    return today.toISOString().split("T")[0];
  });
  
  // Variable start & end clock times (default: 02:00 PM - 04:00 PM, 2hr minimum is 1hr, max 7pm)
  const [bookingStartTime, setBookingStartTime] = useState("02:00 PM");
  const [bookingEndTime, setBookingEndTime] = useState("04:00 PM");
  const [bookingPurpose, setBookingPurpose] = useState("");
  const [attendeesEstimate, setAttendeesEstimate] = useState("15");
  const [loadingBookings, setLoadingBookings] = useState(true);
  const [submittingBooking, setSubmittingBooking] = useState(false);
  const [bookingError, setBookingError] = useState("");
  const [bookingSuccess, setBookingSuccess] = useState("");

  const timeValidation = validateBookingTimeWindow(bookingStartTime, bookingEndTime);

  const fetchPasses = async () => {
    try {
      const res = await fetch("/api/pass");
      const data = await res.json();
      setPasses(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch passes", err);
    } finally {
      setLoadingPasses(false);
    }
  };

  const fetchBookings = async () => {
    try {
      const res = await fetch("/api/room-booking");
      const data = await res.json();
      setBookings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error("Failed to fetch bookings", err);
    } finally {
      setLoadingBookings(false);
    }
  };

  useEffect(() => {
    fetchPasses();
    if (user.isSocietyLead) {
      fetchBookings();
    } else {
      setLoadingBookings(false);
    }
  }, [user.isSocietyLead]);

  // When society selection changes in room booking, update the allocated room suggestion
  const handleSocietyChange = (soc: string) => {
    setBookingSociety(soc);
    setBookingRoom(getAllocatedRoomForSociety(soc));
  };

  // Helper for quick duration presets
  const applyDurationPreset = (hours: number) => {
    const startMin = parseTimeToMinutes(bookingStartTime);
    if (startMin === null) return;
    const newEndMin = Math.min(startMin + hours * 60, 19 * 60); // Cap at 7:00 PM (1140 min)
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
      const res = await fetch("/api/pass/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          society: finalSociety,
          reason,
          requestedExtension: requestedExtension.trim(),
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
      const res = await fetch("/api/room-booking/request", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          society: bookingSociety,
          room: bookingRoom,
          date: bookingDate,
          startTime: bookingStartTime,
          endTime: bookingEndTime,
          timeslot: `${bookingStartTime} - ${bookingEndTime}`,
          purpose: bookingPurpose,
          attendeesEstimate: parseInt(attendeesEstimate, 10) || 15,
        }),
      });

      const data = await res.json();

      if (res.ok) {
        setBookingSuccess(`Room booking request for ${bookingRoom} on ${bookingDate} (${bookingStartTime} - ${bookingEndTime}) submitted! Waiting for KSAC Authority approval.`);
        setBookingPurpose("");
        fetchBookings();
      } else {
        setBookingError(data.message || "Failed to submit room booking request.");
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
    <div className="max-w-7xl mx-auto space-y-8 animate-in fade-in duration-700">
      {/* Header & Identity Card */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-6">
        <div className="space-y-3">
          <div className="flex flex-wrap items-center gap-2.5">
            <span className="bg-emerald-600 text-white text-[10px] font-black px-3.5 py-1.5 rounded-xl uppercase tracking-widest shadow-md shadow-emerald-100">
              Student Portal
            </span>
            {user.isSocietyLead ? (
              <span className="bg-slate-900 text-amber-300 text-[10px] font-black px-3.5 py-1.5 rounded-xl uppercase tracking-widest border border-amber-400/30 flex items-center gap-1.5 shadow-sm">
                <svg className="w-3.5 h-3.5 text-amber-400" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 2a1 1 0 01.756.344l2.4 2.8 3.65.53a1 1 0 01.554 1.705l-2.64 2.573.623 3.635a1 1 0 01-1.45 1.054L10 12.93l-3.263 1.716a1 1 0 01-1.45-1.054l.623-3.635-2.64-2.573a1 1 0 01.554-1.705l3.65-.53 2.4-2.8A1 1 0 0110 2z" clipRule="evenodd" />
                </svg>
                {user.position || "Office Bearer"} • {user.society || "KSAC Society"}
              </span>
            ) : (
              <span className="bg-slate-100 text-slate-600 text-[10px] font-black px-3.5 py-1.5 rounded-xl uppercase tracking-widest border border-slate-200">
                General Student
              </span>
            )}
          </div>

          <h2 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tighter">
            Student Hub
          </h2>

          <p className="text-slate-500 font-medium text-base md:text-lg leading-relaxed">
            Logged in as <span className="gradient-text font-black">{user.name}</span> ({user.rollNo})
            {user.isSocietyLead && user.allocatedRoom && (
              <span className="block sm:inline sm:ml-2 text-xs font-bold text-emerald-700 bg-emerald-50 px-2.5 py-1 rounded-lg border border-emerald-200 mt-1 sm:mt-0">
                Allocated: {user.allocatedRoom}
              </span>
            )}
          </p>
        </div>

        {/* Sync button */}
        <div className="flex items-center gap-3">
          <button
            onClick={() => {
              fetchPasses();
              if (user.isSocietyLead) fetchBookings();
            }}
            disabled={loadingPasses || loadingBookings}
            className="flex items-center gap-2 px-5 py-3 bg-white text-slate-700 rounded-2xl font-black text-[10px] uppercase tracking-widest transition-all hover:bg-slate-50 active:scale-95 disabled:opacity-50 border border-slate-200 shadow-sm"
          >
            <svg
              className={`w-3.5 h-3.5 text-emerald-600 ${loadingPasses || loadingBookings ? "animate-spin" : ""}`}
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
            Sync Data
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="flex gap-3 border-b border-slate-200 pb-1">
        <button
          onClick={() => setActiveTab("pass")}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 ${
            activeTab === "pass"
              ? "bg-slate-900 text-white shadow-xl shadow-slate-900/10"
              : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          Hostel & KSAC GatePass
        </button>

        <button
          onClick={() => setActiveTab("room")}
          className={`flex items-center gap-2.5 px-6 py-3.5 rounded-2xl font-black text-xs uppercase tracking-wider transition-all duration-300 relative ${
            activeTab === "room"
              ? "bg-emerald-600 text-white shadow-xl shadow-emerald-200"
              : "bg-white text-slate-500 hover:text-slate-800 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          Society Room Booking
          {user.isSocietyLead ? (
            <span className="px-2 py-0.5 text-[9px] bg-amber-400 text-slate-900 rounded-lg font-black tracking-widest uppercase">
              Lead Access
            </span>
          ) : (
            <span className="px-2 py-0.5 text-[9px] bg-slate-100 text-slate-400 rounded-lg font-black tracking-widest uppercase">
              Restricted
            </span>
          )}
        </button>
      </div>

      {/* TAB 1: GATEPASS MANAGEMENT */}
      {activeTab === "pass" && (
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 animate-in fade-in duration-500">
          {/* Left: Pass Request / Active Pass status */}
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
                      <span className="font-black text-xs uppercase tracking-widest text-emerald-300">
                        Active Pass In Flight
                      </span>
                    </div>
                    <span className="text-[10px] font-black uppercase px-2.5 py-1 bg-white/10 rounded-lg text-slate-300 border border-white/10">
                      {activePass.status}
                    </span>
                  </div>

                  <div className="bg-white/5 p-4 rounded-2xl border border-white/10 space-y-2">
                    <div>
                      <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                        Society / Wing
                      </p>
                      <p className="text-sm font-black text-white">{activePass.society}</p>
                    </div>
                    <div className="pt-2 border-t border-white/5 flex justify-between">
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Target In-Time Extension
                        </p>
                        <p className="text-sm font-black text-emerald-400">
                          {activePass.requestedExtension || "Standard"}
                        </p>
                      </div>
                      <div>
                        <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                          Purpose
                        </p>
                        <p className="text-xs font-semibold text-slate-300 truncate max-w-[120px]">
                          {activePass.reason}
                        </p>
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
                <form onSubmit={handlePassRequest} className="space-y-5">
                  <div className="space-y-2">
                    <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                      Select KSAC Society / Activity
                    </label>
                    <select
                      value={society}
                      onChange={(e) => setSociety(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-bold"
                    >
                      {COMMON_SOCIETIES.map((soc) => (
                        <option key={soc} value={soc}>
                          {soc}
                        </option>
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
                        placeholder="e.g. TEDxKIIT / Robotics Hackathon"
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
                    disabled={submittingPass}
                    className="w-full bg-emerald-600 text-white font-black py-4 rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3 tracking-widest uppercase text-xs disabled:opacity-50"
                  >
                    {submittingPass ? "Submitting Pass..." : "Request KSAC GatePass"}
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                    </svg>
                  </button>
                </form>
              )}
            </div>

            <div className="bg-gradient-to-br from-slate-900 to-emerald-950 p-8 rounded-[2.5rem] shadow-2xl text-white relative overflow-hidden group">
              <h3 className="text-lg font-black mb-4 uppercase tracking-widest text-emerald-400">
                KSAC Movement Protocols
              </h3>
              <ul className="space-y-3.5 text-xs text-slate-300">
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-400 font-black">1.</span>
                  <span>Passes are verified digitally at both the Hostel Gate and KSAC desk.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-400 font-black">2.</span>
                  <span>Ensure KSAC Desk Officer checks you in upon physical arrival.</span>
                </li>
                <li className="flex gap-3 items-start">
                  <span className="text-emerald-400 font-black">3.</span>
                  <span>Mark departure at KSAC before heading back to hostel to close tracking loop.</span>
                </li>
              </ul>
            </div>
          </div>

          {/* Right: Pass History */}
          <div className="lg:col-span-8 space-y-6">
            <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 ring-1 ring-slate-200/50 min-h-[500px]">
              <div className="flex items-center justify-between mb-8">
                <div>
                  <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                    GatePass History
                  </h3>
                  <p className="text-xs font-semibold text-slate-400 mt-1">
                    Verified movement records for {user.rollNo}
                  </p>
                </div>
                <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-xl border border-emerald-200">
                  REAL-TIME SYNC
                </span>
              </div>

              {loadingPasses ? (
                <div className="flex flex-col items-center justify-center h-80 space-y-4">
                  <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                  <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                    Loading GatePass History...
                  </p>
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {passes.map((pass) => (
                    <div
                      key={pass._id}
                      className="group p-6 bg-slate-50 border border-slate-200/60 rounded-3xl hover:bg-white hover:border-emerald-200 hover:shadow-xl transition-all duration-300"
                    >
                      <div className="flex justify-between items-start mb-4">
                        <div
                          className={`p-3 rounded-2xl ${
                            pass.status === "RETURNED"
                              ? "bg-emerald-100 text-emerald-800"
                              : pass.status === "PENDING"
                              ? "bg-amber-100 text-amber-800"
                              : "bg-teal-100 text-teal-800"
                          }`}
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                        </div>
                        <span
                          className={`text-[9px] font-black uppercase px-2.5 py-1 rounded-lg ${
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

                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-black text-emerald-800 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-200">
                            {pass.society}
                          </span>
                          <span className="text-[10px] font-black text-slate-400">
                            {new Date(pass.createdAt).toLocaleDateString(undefined, {
                              month: "short",
                              day: "numeric",
                            })}
                          </span>
                        </div>
                        <p className="text-xs font-medium text-slate-600 bg-white/70 p-3 rounded-xl border border-slate-100 italic">
                          "{pass.reason}"
                        </p>
                        <div className="flex justify-between items-center text-[10px] font-bold text-slate-500 pt-1">
                          <span>Target: {pass.requestedExtension}</span>
                          {pass.transitToKSAC != null && (
                            <span className="text-emerald-600">Transit: {pass.transitToKSAC}m</span>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}

                  {passes.length === 0 && (
                    <div className="col-span-full py-28 text-center text-slate-400 space-y-2">
                      <p className="font-bold text-base">No GatePass records found.</p>
                      <p className="text-xs">Submit a request on the left to get started.</p>
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
        <div className="animate-in fade-in duration-500 space-y-8">
          {!user.isSocietyLead ? (
            /* Locked State for General Students */
            <div className="bg-white p-12 rounded-[3rem] shadow-sm border border-slate-100 text-center max-w-2xl mx-auto space-y-6">
              <div className="w-20 h-20 bg-amber-50 text-amber-600 rounded-3xl flex items-center justify-center mx-auto shadow-inner">
                <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                </svg>
              </div>

              <div className="space-y-2">
                <h3 className="text-2xl font-black text-slate-800">
                  Society Room Booking Restricted
                </h3>
                <p className="text-sm text-slate-500 font-medium leading-relaxed">
                  Only verified KSAC Society Presidents and Vice-Presidents listed in the official KSAC 2026 Registry have privileges to book society activity rooms.
                </p>
              </div>

              <div className="bg-slate-50 p-5 rounded-2xl border border-slate-100 text-xs text-slate-600 text-left space-y-2">
                <p className="font-bold text-slate-700">Need a GatePass to attend a society session?</p>
                <p>You can request your personal GatePass under the <strong>"Hostel & KSAC GatePass"</strong> tab to attend scheduled rehearsals, workshops, and team meetings.</p>
              </div>

              <button
                onClick={() => setActiveTab("pass")}
                className="px-8 py-3.5 bg-slate-900 text-white text-xs font-black uppercase tracking-widest rounded-2xl hover:bg-emerald-600 transition-all shadow-lg active:scale-95"
              >
                Back to GatePass Request
              </button>
            </div>
          ) : (
            /* Unlocked State for Society Leaders */
            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              {/* Left Column: Room Booking Request Form */}
              <div className="lg:col-span-5 space-y-8">
                <div className="bg-white p-8 rounded-[2.5rem] shadow-sm border border-slate-100 ring-1 ring-slate-200/50 space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                      <div className="p-2.5 bg-emerald-600 text-white rounded-xl shadow-lg shadow-emerald-100">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                        </svg>
                      </div>
                      <div>
                        <h3 className="text-xl font-bold text-slate-800">Reserve Society Room</h3>
                        <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                          KSAC Authority Approval Required
                        </p>
                      </div>
                    </div>
                    <span className="text-[9px] font-black uppercase bg-emerald-50 text-emerald-700 px-3 py-1 rounded-xl border border-emerald-200">
                      {user.position || "Leader"}
                    </span>
                  </div>

                  {bookingSuccess && (
                    <div className="p-4 bg-emerald-50 border border-emerald-200 text-emerald-800 rounded-2xl text-xs font-bold animate-in fade-in flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                      </svg>
                      <span>{bookingSuccess}</span>
                    </div>
                  )}

                  {bookingError && (
                    <div className="p-4 bg-red-50 border border-red-200 text-red-700 rounded-2xl text-xs font-bold animate-in fade-in flex items-start gap-2.5">
                      <svg className="w-4 h-4 text-red-600 shrink-0 mt-0.5" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                      <span>{bookingError}</span>
                    </div>
                  )}

                  <form onSubmit={handleRoomBookingRequest} className="space-y-5">
                    {/* Society selection */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                        Society
                      </label>
                      <select
                        value={bookingSociety}
                        onChange={(e) => handleSocietyChange(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-bold"
                      >
                        {user.societyPositions && user.societyPositions.length > 0 ? (
                          user.societyPositions.map((sp) => (
                            <option key={sp.society} value={sp.society}>
                              {sp.society} ({sp.position})
                            </option>
                          ))
                        ) : (
                          <option value={user.society || "KORUS"}>{user.society || "KORUS"}</option>
                        )}
                        {KSAC_SOCIETIES.map((s) => (
                          <option key={s.name} value={s.name}>
                            {s.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Room selection */}
                    <div className="space-y-2">
                      <div className="flex justify-between items-center ml-1">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400">
                          Target KSAC Room
                        </label>
                        <span className="text-[9px] font-bold text-emerald-700">Allocated for Society</span>
                      </div>
                      <select
                        value={bookingRoom}
                        onChange={(e) => setBookingRoom(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-bold"
                      >
                        <option value={getAllocatedRoomForSociety(bookingSociety)}>
                          {getAllocatedRoomForSociety(bookingSociety)} (Allocated)
                        </option>
                        {KSAC_CENTRAL_ROOMS.map((cr) => (
                          <option key={cr} value={cr}>
                            {cr}
                          </option>
                        ))}
                        {KSAC_SOCIETIES.map((s) => (
                          <option key={s.room} value={s.room}>
                            {s.room}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Date Picker */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                        Date of Booking
                      </label>
                      <input
                        type="date"
                        min={new Date().toISOString().split("T")[0]}
                        value={bookingDate}
                        onChange={(e) => setBookingDate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-bold"
                        required
                      />
                    </div>

                    {/* Variable Clock Start & End Time Selectors */}
                    <div className="space-y-3 p-4 bg-slate-50 rounded-2xl border border-slate-100">
                      <div className="flex items-center justify-between">
                        <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-500">
                          Variable Time Range
                        </label>
                        <span className="text-[9px] font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                          Min 1h • Max 07:00 PM
                        </span>
                      </div>

                      <div className="grid grid-cols-2 gap-3">
                        {/* Start Time */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400">Start Time</span>
                          <select
                            value={bookingStartTime}
                            onChange={(e) => setBookingStartTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
                          >
                            {CLOCK_START_TIMES.map((t) => (
                              <option key={t} value={t}>
                                {t}
                              </option>
                            ))}
                          </select>
                        </div>

                        {/* End Time */}
                        <div className="space-y-1">
                          <span className="text-[10px] font-bold text-slate-400">End Time (Max 7 PM)</span>
                          <select
                            value={bookingEndTime}
                            onChange={(e) => setBookingEndTime(e.target.value)}
                            className="w-full bg-white border border-slate-200 p-3 rounded-xl text-xs font-bold text-slate-800 focus:ring-2 focus:ring-emerald-500 focus:outline-none"
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
                      <div className="flex flex-wrap items-center gap-1.5 pt-1">
                        <span className="text-[9px] font-black text-slate-400 uppercase tracking-wider mr-1">
                          Quick Presets:
                        </span>
                        {[1, 1.5, 2, 3].map((hrs) => (
                          <button
                            type="button"
                            key={hrs}
                            onClick={() => applyDurationPreset(hrs)}
                            className="text-[9px] font-bold px-2 py-1 bg-white hover:bg-emerald-50 hover:text-emerald-700 text-slate-600 rounded-lg border border-slate-200 transition-all"
                          >
                            +{hrs}h
                          </button>
                        ))}
                        <button
                          type="button"
                          onClick={() => setBookingEndTime("07:00 PM")}
                          className="text-[9px] font-bold px-2 py-1 bg-emerald-50 text-emerald-800 rounded-lg border border-emerald-200 hover:bg-emerald-100 transition-all"
                        >
                          Until 7:00 PM
                        </button>
                      </div>

                      {/* Live Duration & Validation Feedback Chip */}
                      <div
                        className={`p-2.5 rounded-xl text-[11px] font-bold flex items-center justify-between ${
                          timeValidation.valid
                            ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
                            : "bg-red-50 border border-red-200 text-red-700"
                        }`}
                      >
                        <div className="flex items-center gap-1.5">
                          <span>⏰ {bookingStartTime} ➔ {bookingEndTime}</span>
                        </div>
                        <div>
                          {timeValidation.valid ? (
                            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded text-[9px] font-black uppercase">
                              {Math.floor((timeValidation.durationMinutes || 0) / 60)}h {(timeValidation.durationMinutes || 0) % 60}m
                            </span>
                          ) : (
                            <span className="text-[10px] text-red-600 font-bold">
                              {timeValidation.error}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Purpose */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                        Session Agenda / Purpose
                      </label>
                      <textarea
                        placeholder="e.g. Band vocal rehearsals, robotics hardware assembly, team hackathon session..."
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 min-h-[90px] text-slate-700 text-xs font-medium leading-relaxed"
                        value={bookingPurpose}
                        onChange={(e) => setBookingPurpose(e.target.value)}
                        required
                      />
                    </div>

                    {/* Estimated Attendees */}
                    <div className="space-y-2">
                      <label className="text-[10px] font-black uppercase tracking-[0.2em] text-slate-400 ml-1">
                        Expected Member Count
                      </label>
                      <input
                        type="number"
                        min="1"
                        max="200"
                        value={attendeesEstimate}
                        onChange={(e) => setAttendeesEstimate(e.target.value)}
                        className="w-full bg-slate-50 border border-slate-100 p-4 rounded-2xl focus:outline-none focus:ring-4 focus:ring-emerald-500/10 focus:border-emerald-500 text-slate-700 text-xs font-semibold"
                        required
                      />
                    </div>

                    <button
                      type="submit"
                      disabled={submittingBooking || !timeValidation.valid}
                      className="w-full bg-emerald-600 text-white font-black py-4.5 rounded-2xl shadow-xl shadow-emerald-200 hover:bg-emerald-700 hover:-translate-y-0.5 transition-all active:scale-95 flex items-center justify-center gap-3 tracking-widest uppercase text-xs disabled:opacity-50"
                    >
                      {submittingBooking ? "Submitting Booking..." : "Submit Room Booking Request"}
                      <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                      </svg>
                    </button>
                  </form>
                </div>
              </div>

              {/* Right Column: Room Booking Status & Past Records */}
              <div className="lg:col-span-7 space-y-6">
                <div className="bg-white p-10 rounded-[2.5rem] shadow-sm border border-slate-100 ring-1 ring-slate-200/50 min-h-[600px]">
                  <div className="flex items-center justify-between mb-8">
                    <div>
                      <h3 className="text-2xl font-black text-slate-800 tracking-tight">
                        Your Society Room Bookings
                      </h3>
                      <p className="text-xs font-semibold text-slate-400 mt-1">
                        Track approval status from KSAC Authority (Max 7:00 PM closing)
                      </p>
                    </div>
                    <span className="px-3.5 py-1.5 bg-emerald-50 text-emerald-700 text-[10px] font-black rounded-xl border border-emerald-200">
                      {bookings.length} Bookings
                    </span>
                  </div>

                  {loadingBookings ? (
                    <div className="flex flex-col items-center justify-center h-80 space-y-4">
                      <div className="w-12 h-12 border-4 border-emerald-100 border-t-emerald-600 rounded-full animate-spin"></div>
                      <p className="text-xs font-black text-slate-400 uppercase tracking-widest">
                        Loading Room Bookings...
                      </p>
                    </div>
                  ) : (
                    <div className="space-y-4">
                      {bookings.map((b) => (
                        <div
                          key={b._id}
                          className="p-6 bg-slate-50 border border-slate-200/70 rounded-3xl hover:bg-white hover:border-emerald-200 hover:shadow-xl transition-all duration-300 space-y-3"
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-2 border-b border-slate-200/50">
                            <div>
                              <span className="text-xs font-black text-emerald-800 bg-emerald-100/70 px-3 py-1 rounded-xl border border-emerald-200">
                                {b.room}
                              </span>
                              <span className="ml-2 text-[10px] font-bold text-slate-500">
                                {b.society}
                              </span>
                            </div>
                            <span
                              className={`self-start sm:self-auto text-[10px] font-black uppercase px-3 py-1 rounded-xl border ${
                                b.status === "APPROVED"
                                  ? "bg-emerald-500 text-white border-emerald-600 shadow-md shadow-emerald-100"
                                  : b.status === "PENDING"
                                  ? "bg-amber-50 text-amber-700 border-amber-200"
                                  : "bg-red-50 text-red-700 border-red-200"
                              }`}
                            >
                              {b.status === "APPROVED" && "✓ Approved by KSAC"}
                              {b.status === "PENDING" && "⏳ Pending KSAC Approval"}
                              {b.status === "REJECTED" && "✕ Rejected"}
                            </span>
                          </div>

                          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                            <div className="bg-white p-3 rounded-2xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Date
                              </p>
                              <p className="font-black text-slate-800 mt-0.5">{b.date}</p>
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Time Window
                              </p>
                              <p className="font-bold text-emerald-700 mt-0.5">
                                {b.startTime && b.endTime ? `${b.startTime} - ${b.endTime}` : b.timeslot}
                              </p>
                            </div>
                            <div className="bg-white p-3 rounded-2xl border border-slate-100">
                              <p className="text-[9px] font-black text-slate-400 uppercase tracking-widest">
                                Estimated Count
                              </p>
                              <p className="font-bold text-slate-800 mt-0.5">
                                {b.attendeesEstimate || 15} Members
                              </p>
                            </div>
                          </div>

                          <p className="text-xs text-slate-600 italic bg-white/60 p-3 rounded-xl border border-slate-100">
                            "{b.purpose}"
                          </p>

                          {b.actionNote && (
                            <div className="text-[11px] font-semibold text-slate-500 bg-slate-100/80 p-2.5 rounded-xl border border-slate-200">
                              <strong>Note from KSAC Authority:</strong> {b.actionNote}
                            </div>
                          )}
                        </div>
                      ))}

                      {bookings.length === 0 && (
                        <div className="py-32 text-center text-slate-400 space-y-2">
                          <svg className="w-16 h-16 mx-auto text-slate-300 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.5" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <p className="font-bold text-base">No Room Bookings Found</p>
                          <p className="text-xs">Submit a room reservation request on the left for your society sessions.</p>
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
