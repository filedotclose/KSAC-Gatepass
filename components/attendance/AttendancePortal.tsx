"use client";

import { useState, useEffect } from "react";
import { useSearchParams } from "next/navigation";
import { IUser } from "@/types/user";
import { dispatchGateway, GATEWAY_OPCODES } from "@/lib/gatewayClient";
import Link from "next/link";

interface Props {
  user: IUser | null;
}

export default function AttendancePortal({ user }: Props) {
  const searchParams = useSearchParams();

  const sid = searchParams.get("sid");
  const seq = searchParams.get("seq");
  const tok = searchParams.get("tok");
  const ts = searchParams.get("ts");

  const [verifying, setVerifying] = useState(false);
  const [verifiedRecord, setVerifiedRecord] = useState<any>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [phoneNo, setPhoneNo] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  useEffect(() => {
    if (!user || user.role !== "student") return;
    if (!sid || !tok) return;

    let isMounted = true;

    async function verifyScan() {
      setVerifying(true);
      setErrorMessage(null);

      try {
        const res = await dispatchGateway(GATEWAY_OPCODES.SCAN_QR_ATTENDANCE, {
          sessionId: sid,
          sequence: parseInt(seq || "0", 10),
          token: tok,
          tsBucket: parseInt(ts || "0", 10),
        });

        if (!isMounted) return;

        if (res.ok) {
          setVerifiedRecord(res.data?.record);
          if (res.data?.record?.phoneNo) {
            setPhoneNo(res.data.record.phoneNo);
          }
          if (res.data?.record?.confirmedAt) {
            setConfirmed(true);
          }
        } else {
          setErrorMessage(
            res.message || "Invalid or expired QR code. Please scan the latest QR projected on the screen."
          );
        }
      } catch {
        if (isMounted) {
          setErrorMessage("Failed to connect to the attendance gateway. Please try again.");
        }
      } finally {
        if (isMounted) {
          setVerifying(false);
        }
      }
    }

    verifyScan();

    return () => {
      isMounted = false;
    };
  }, [user, sid, seq, tok, ts]);

  const handleConfirm = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!verifiedRecord && !sid) return;

    setSubmitting(true);
    setErrorMessage(null);

    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.CONFIRM_ATTENDANCE, {
        recordId: verifiedRecord?._id,
        sessionId: sid,
        phoneNo,
        phone: phoneNo,
      });

      if (res.ok) {
        setConfirmed(true);
        setVerifiedRecord(res.data?.record || verifiedRecord);
      } else {
        setErrorMessage(res.message || "Failed to confirm attendance. Please try again.");
      }
    } catch {
      setErrorMessage("Network error while confirming attendance.");
    } finally {
      setSubmitting(false);
    }
  };

  // State 1: User Not Logged In
  if (!user) {
    return (
      <div className="min-h-[65vh] flex flex-col justify-center items-center py-8 animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 md:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-emerald-950/5 border border-slate-100 ring-1 ring-slate-200/50 text-center">
          <div className="w-16 h-16 bg-amber-50 border border-amber-200 text-amber-600 rounded-2xl flex items-center justify-center mx-auto mb-6 shadow-xs">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <span className="bg-amber-100 text-amber-800 text-[9px] sm:text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">
            Authentication Required
          </span>
          <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-3">
            Student Login Required
          </h2>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2 leading-relaxed">
            Please sign in to your <span className="gradient-text font-black">KIIT KSAC Portal</span> student account to mark event attendance.
          </p>
          <div className="mt-5 p-3.5 bg-amber-50/70 border border-amber-200/80 rounded-2xl text-amber-800 text-xs font-medium text-left">
            <span className="font-black uppercase text-[10px] block mb-0.5 text-amber-900">Security Notice:</span>
            Logins are locked during active attendance to prevent proxy check-ins. If you are already logged in on another tab, simply refresh.
          </div>
          <div className="mt-6">
            <Link
              href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/attendance")}`}
              className="w-full inline-flex items-center justify-center gap-2 py-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all duration-300 shadow-xl shadow-slate-900/10 active:scale-95 touch-btn"
            >
              <span>Authenticate with KIIT ID</span>
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M14 5l7 7m0 0l-7 7m7-7H3" />
              </svg>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Not a Student
  if (user.role !== "student") {
    return (
      <div className="min-h-[65vh] flex flex-col justify-center items-center py-8 animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 md:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-emerald-950/5 border border-slate-100 ring-1 ring-slate-200/50 text-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <span className="bg-emerald-600 text-white text-[9px] sm:text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">
            Authority Session
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-3">Staff / Authority Account</h2>
          <p className="text-slate-500 text-sm font-medium mt-2">
            Logged in as <span className="gradient-text font-black">{user.name}</span> (<span className="text-slate-700 font-bold uppercase">{user.role}</span>).
          </p>
          <p className="text-slate-400 text-xs mt-2">
            Event attendance scanning is exclusively for student accounts.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center w-full py-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all duration-300 shadow-lg shadow-slate-900/10 touch-btn"
          >
            Return to Authority Desk
          </Link>
        </div>
      </div>
    );
  }

  // State 3: Missing parameters
  if (!sid || !tok) {
    return (
      <div className="min-h-[65vh] flex flex-col justify-center items-center py-8 animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 md:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-emerald-950/5 border border-slate-100 ring-1 ring-slate-200/50 text-center">
          <div className="w-16 h-16 bg-emerald-50 border border-emerald-200 text-emerald-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 19h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <span className="bg-emerald-600 text-white text-[9px] sm:text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">
            KSAC Event Check-In
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-3">Scan Required</h2>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2 leading-relaxed">
            No active QR token was detected in this link. Please scan the live QR code projected on the auditorium screen or use the built-in scanner on your Student Hub.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center w-full py-4 bg-emerald-600 hover:bg-emerald-700 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all shadow-lg shadow-emerald-200 touch-btn"
          >
            Open Student Hub
          </Link>
        </div>
      </div>
    );
  }

  // State 4: Verifying
  if (verifying) {
    return (
      <div className="min-h-[65vh] flex flex-col justify-center items-center py-8 animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-white p-8 sm:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-emerald-950/5 border border-slate-100 ring-1 ring-slate-200/50 text-center">
          <div className="w-14 h-14 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">
            Security Handshake
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-3">Verifying QR Token</h2>
          <p className="text-slate-500 text-xs sm:text-sm font-medium mt-2">
            Validating cryptographic sequence & anti-proxy timestamp...
          </p>
        </div>
      </div>
    );
  }

  // State 5: Confirmed Success State (Matches Student Digital Boarding Pass Theme)
  if (confirmed) {
    return (
      <div className="min-h-[65vh] flex flex-col justify-center items-center py-8 animate-in zoom-in-95 duration-300">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-emerald-950/5 border border-slate-100 ring-1 ring-slate-200/50">
          <div className="text-center mb-6">
            <div className="w-16 h-16 bg-emerald-600 text-white rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-emerald-200">
              <svg className="w-9 h-9" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M5 13l4 4L19 7" />
              </svg>
            </div>
            <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-[9px] sm:text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">
              Official Event Register
            </span>
            <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight mt-2.5">
              Attendance Verified!
            </h2>
            <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
              Your presence has been cryptographically logged.
            </p>
          </div>

          {/* Digital Receipt Card matching StudentView Boarding Pass */}
          <div className="p-5 sm:p-6 bg-gradient-to-br from-slate-900 via-slate-950 to-emerald-950 rounded-2xl sm:rounded-3xl space-y-4 shadow-xl text-white border border-emerald-500/20">
            <div className="flex items-center justify-between pb-3 border-b border-white/10">
              <span className="font-black text-[10px] uppercase tracking-widest text-emerald-300">
                KSAC Attendance Pass
              </span>
              <span className="text-[9px] font-black uppercase px-2.5 py-1 bg-emerald-500/20 text-emerald-300 rounded-lg border border-emerald-400/30">
                CONFIRMED
              </span>
            </div>

            <div className="space-y-2.5 text-xs">
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Student Name</span>
                <span className="text-white font-black">{user.name}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Roll Number</span>
                <span className="text-emerald-400 font-mono font-black">{user.rollNo}</span>
              </div>
              <div className="flex justify-between items-center">
                <span className="text-slate-400 font-bold uppercase text-[10px]">Hostel</span>
                <span className="text-slate-200 font-bold">{user.hostel || "N/A"}</span>
              </div>
              {verifiedRecord?.confirmedAt && (
                <div className="flex justify-between items-center pt-2 border-t border-white/10">
                  <span className="text-slate-400 font-bold uppercase text-[10px]">Time Logged</span>
                  <span className="text-emerald-300 font-mono font-bold text-[11px]">
                    {new Date(verifiedRecord.confirmedAt).toLocaleTimeString("en-IN", {
                      hour: "2-digit",
                      minute: "2-digit",
                      second: "2-digit",
                    })}
                  </span>
                </div>
              )}
            </div>
          </div>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center w-full py-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all duration-300 shadow-lg shadow-slate-900/10 touch-btn"
          >
            Return to Student Hub
          </Link>
        </div>
      </div>
    );
  }

  // State 6: Error State (Expired or Invalid QR)
  if (errorMessage && !verifiedRecord) {
    return (
      <div className="min-h-[65vh] flex flex-col justify-center items-center py-8 animate-in fade-in duration-300">
        <div className="max-w-md w-full bg-white p-6 sm:p-8 md:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-emerald-950/5 border border-slate-100 ring-1 ring-slate-200/50 text-center">
          <div className="w-16 h-16 bg-red-50 border border-red-200 text-red-600 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <span className="bg-red-100 text-red-700 text-[9px] sm:text-[10px] font-black px-3 py-1 rounded-lg uppercase tracking-widest">
            Token Expired
          </span>
          <h2 className="text-2xl font-black text-slate-900 tracking-tight mt-3">QR Code Expired</h2>
          <p className="text-red-600 text-xs sm:text-sm font-bold mt-2">{errorMessage}</p>

          <div className="mt-5 p-4 bg-slate-50 rounded-2xl border border-slate-200/80 text-left text-xs text-slate-600 space-y-1.5">
            <p className="font-black text-slate-800 uppercase text-[10px] tracking-wider">Why did this happen?</p>
            <p>• KSAC attendance QR codes rotate every <span className="font-bold text-emerald-700">5 seconds</span> to prevent shared links or proxy attendance.</p>
            <p>• Point your camera directly at the live screen and open the link immediately.</p>
          </div>

          <Link
            href="/dashboard"
            className="mt-6 inline-flex items-center justify-center w-full py-4 bg-slate-900 hover:bg-emerald-600 text-white rounded-2xl font-black uppercase tracking-widest text-[10px] sm:text-xs transition-all duration-300 shadow-lg shadow-slate-900/10 touch-btn"
          >
            Open Scanner in Student Hub
          </Link>
        </div>
      </div>
    );
  }

  // State 7: Verified Scan -> Confirmation Form
  return (
    <div className="min-h-[65vh] flex flex-col justify-center items-center py-8 animate-in fade-in duration-300">
      <div className="max-w-md w-full bg-white p-6 sm:p-8 md:p-10 rounded-3xl sm:rounded-[2.5rem] shadow-xl shadow-emerald-950/5 border border-slate-100 ring-1 ring-slate-200/50">
        <div className="flex items-center justify-between mb-5">
          <span className="bg-emerald-600 text-white text-[9px] sm:text-[10px] font-black px-3 py-1.5 rounded-xl uppercase tracking-widest flex items-center gap-1.5 shadow-sm shadow-emerald-100">
            <span className="w-2 h-2 rounded-full bg-white animate-pulse"></span>
            Live QR Verified
          </span>
          <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">
            Step 2 of 2
          </span>
        </div>

        <h2 className="text-2xl sm:text-3xl font-black text-slate-900 tracking-tight">
          Confirm Attendance
        </h2>
        <p className="text-slate-500 text-xs sm:text-sm font-medium mt-1">
          Verify your pre-loaded student profile and enter your contact number to complete check-in.
        </p>

        {errorMessage && (
          <div className="mt-4 p-3.5 bg-red-50 border border-red-200 rounded-2xl text-red-700 text-xs font-bold">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleConfirm} className="mt-6 space-y-4">
          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
              Student Name
            </label>
            <input
              type="text"
              readOnly
              value={user.name}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm cursor-not-allowed outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Roll Number
              </label>
              <input
                type="text"
                readOnly
                value={user.rollNo}
                className="w-full px-4 py-3.5 bg-emerald-50/60 border border-emerald-200 rounded-2xl text-emerald-800 font-mono font-black text-sm cursor-not-allowed outline-none"
              />
            </div>
            <div>
              <label className="block text-[10px] font-black uppercase tracking-widest text-slate-400 mb-1.5 ml-1">
                Hostel
              </label>
              <input
                type="text"
                readOnly
                value={user.hostel || "N/A"}
                className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 rounded-2xl text-slate-700 font-bold text-sm cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-black uppercase tracking-widest text-slate-500 mb-1.5 ml-1">
              Mobile Number <span className="text-emerald-600">*</span>
            </label>
            <input
              type="tel"
              required
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              placeholder="Enter 10-digit phone number"
              maxLength={15}
              className="w-full px-4 py-3.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 rounded-2xl text-slate-900 font-bold text-sm outline-none transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-slate-900 hover:bg-emerald-600 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-widest text-[11px] sm:text-xs transition-all duration-300 shadow-xl shadow-slate-900/10 active:scale-[0.99] mt-4 touch-btn flex items-center justify-center gap-2"
          >
            {submitting ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin"></div>
                <span>Recording Attendance...</span>
              </>
            ) : (
              <>
                <span>Confirm & Mark Attendance</span>
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
                </svg>
              </>
            )}
          </button>
        </form>
      </div>
    </div>
  );
}
