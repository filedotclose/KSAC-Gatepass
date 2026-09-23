"use client";

import { useState, useEffect } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import { IUser } from "@/types/user";
import { dispatchGateway, GATEWAY_OPCODES } from "@/lib/gatewayClient";
import Link from "next/link";

interface Props {
  user: IUser | null;
}

export default function AttendancePortal({ user }: Props) {
  const searchParams = useSearchParams();
  const router = useRouter();

  const sid = searchParams.get("sid");
  const seq = searchParams.get("seq");
  const tok = searchParams.get("tok");
  const ts = searchParams.get("ts");

  const [verifying, setVerifying] = useState(false);
  const [verifiedRecord, setVerifiedRecord] = useState<any>(null);
  const [eventName, setEventName] = useState<string>("");
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
          // If already confirmed
          if (res.data?.record?.confirmedAt) {
            setConfirmed(true);
          }
        } else {
          setErrorMessage(res.message || "Invalid or expired QR code. Please scan the latest QR on the screen.");
        }
      } catch (err: any) {
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
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>
        <div className="absolute bottom-1/4 -right-20 w-80 h-80 bg-indigo-500/10 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10 text-center">
          <div className="w-16 h-16 bg-amber-500/10 border border-amber-500/20 text-amber-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white tracking-wide">Login Required</h2>
          <p className="text-slate-400 text-sm mt-3 leading-relaxed">
            You must be logged into the <span className="text-emerald-400 font-bold">KSAC Portal</span> with your student account to record attendance.
          </p>
          <div className="mt-4 p-3 bg-amber-950/30 border border-amber-800/40 rounded-xl text-amber-300 text-xs font-medium">
            Note: Student login is locked during active attendance to prevent proxy check-ins. If you are already logged in on your browser, refresh this page.
          </div>
          <div className="mt-6 flex flex-col gap-3">
            <Link
              href={`/login?redirect=${encodeURIComponent(typeof window !== "undefined" ? window.location.pathname + window.location.search : "/attendance")}`}
              className="w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-wider text-xs transition-all shadow-lg shadow-emerald-950/50"
            >
              Log in to Student Account
            </Link>
          </div>
        </div>
      </div>
    );
  }

  // State 2: Not a Student
  if (user.role !== "student") {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white">Staff / Authority Account</h2>
          <p className="text-slate-400 text-sm mt-3">
            You are logged in as <span className="text-white font-bold">{user.name}</span> (<span className="text-indigo-400 font-bold uppercase">{user.role}</span>).
          </p>
          <p className="text-slate-500 text-xs mt-2">
            Event attendance scanning is designed exclusively for students.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold uppercase tracking-wider text-xs transition-colors"
          >
            Go to Management Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // State 3: Missing parameters
  if (!sid || !tok) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-slate-800 text-slate-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h.01M5 8h2a1 1 0 001-1V5a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1zm14 0h2a1 1 0 001-1V5a1 1 0 00-1-1h-2a1 1 0 00-1 1v2a1 1 0 001 1zM5 19h2a1 1 0 001-1v-2a1 1 0 00-1-1H5a1 1 0 00-1 1v2a1 1 0 001 1z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white">Scan Required</h2>
          <p className="text-slate-400 text-sm mt-3">
            No active QR token detected in this link. Please point your camera at the live attendance QR code projected on the hall screen.
          </p>
          <Link
            href="/dashboard"
            className="mt-6 inline-block w-full py-3.5 bg-emerald-600 hover:bg-emerald-500 text-white rounded-2xl font-black uppercase tracking-wider text-xs transition-colors"
          >
            Open Student Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // State 4: Verifying
  if (verifying) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mx-auto mb-6"></div>
          <h2 className="text-2xl font-black text-white">Verifying QR Token</h2>
          <p className="text-slate-400 text-sm mt-2">Checking sequence and anti-proxy validity...</p>
        </div>
      </div>
    );
  }

  // State 5: Confirmed Success State
  if (confirmed) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
        <div className="absolute top-1/3 -left-20 w-80 h-80 bg-emerald-500/20 rounded-full blur-3xl pointer-events-none"></div>

        <div className="max-w-md w-full bg-slate-900 border border-emerald-500/30 rounded-3xl p-8 shadow-2xl relative z-10 text-center animate-in zoom-in-95 duration-300">
          <div className="w-20 h-20 bg-emerald-500/20 border border-emerald-500 text-emerald-400 rounded-3xl flex items-center justify-center mx-auto mb-6 shadow-xl shadow-emerald-500/20">
            <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M5 13l4 4L19 7" />
            </svg>
          </div>
          <span className="px-3 py-1 bg-emerald-950 border border-emerald-800 text-emerald-300 rounded-full text-[10px] font-black uppercase tracking-widest">
            Recorded in Event Register
          </span>
          <h2 className="text-2xl font-black text-white mt-4 tracking-wide">Attendance Confirmed!</h2>
          <p className="text-slate-400 text-sm mt-2">
            Your attendance has been verified cryptographically and logged successfully.
          </p>

          <div className="mt-6 bg-slate-950/80 border border-slate-800/80 rounded-2xl p-4 text-left space-y-2">
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase">Student</span>
              <span className="text-white font-bold">{user.name}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase">Roll No</span>
              <span className="text-emerald-400 font-mono font-bold">{user.rollNo}</span>
            </div>
            <div className="flex justify-between items-center text-xs">
              <span className="text-slate-500 font-bold uppercase">Hostel</span>
              <span className="text-white font-medium">{user.hostel || "N/A"}</span>
            </div>
            {verifiedRecord?.confirmedAt && (
              <div className="flex justify-between items-center text-xs border-t border-slate-800/80 pt-2">
                <span className="text-slate-500 font-bold uppercase">Timestamp</span>
                <span className="text-slate-300 font-mono text-[11px]">
                  {new Date(verifiedRecord.confirmedAt).toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" })}
                </span>
              </div>
            )}
          </div>

          <Link
            href="/dashboard"
            className="mt-6 inline-block w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold uppercase tracking-wider text-xs transition-colors"
          >
            Return to Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // State 6: Error State
  if (errorMessage && !verifiedRecord) {
    return (
      <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12">
        <div className="max-w-md w-full bg-slate-900 border border-red-500/30 rounded-3xl p-8 shadow-2xl text-center">
          <div className="w-16 h-16 bg-red-500/10 border border-red-500/20 text-red-400 rounded-2xl flex items-center justify-center mx-auto mb-6">
            <svg className="w-8 h-8" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h2 className="text-2xl font-black text-white">QR Code Expired</h2>
          <p className="text-red-300 text-sm mt-3">{errorMessage}</p>
          <div className="mt-4 p-3 bg-slate-950 rounded-xl border border-slate-800 text-left text-xs text-slate-400 space-y-1">
            <p className="font-bold text-slate-300">Why did this happen?</p>
            <p>• KSAC attendance QR codes update every 5 seconds to prevent shared screenshots or proxy attendance.</p>
            <p>• Please point your phone camera directly at the live screen and open the prompt immediately.</p>
          </div>
          <Link
            href="/dashboard"
            className="mt-6 inline-block w-full py-3.5 bg-slate-800 hover:bg-slate-700 text-white rounded-2xl font-bold uppercase tracking-wider text-xs transition-colors"
          >
            Go to Student Dashboard
          </Link>
        </div>
      </div>
    );
  }

  // State 7: Verified Scan -> Confirmation Form
  return (
    <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center px-4 py-12 relative overflow-hidden">
      <div className="absolute top-1/4 -left-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

      <div className="max-w-md w-full bg-slate-900 border border-slate-800 rounded-3xl p-8 shadow-2xl relative z-10">
        <div className="flex items-center gap-2 mb-6">
          <div className="w-3 h-3 rounded-full bg-emerald-400 animate-pulse"></div>
          <span className="text-xs font-black uppercase tracking-widest text-emerald-400">Live Event QR Verified</span>
        </div>

        <h2 className="text-2xl font-black text-white tracking-wide">Confirm Attendance</h2>
        <p className="text-slate-400 text-xs mt-1">Review your student details and submit your phone number to complete check-in.</p>

        {errorMessage && (
          <div className="mt-4 p-3 bg-red-950/40 border border-red-800/50 rounded-xl text-red-300 text-xs font-medium">
            {errorMessage}
          </div>
        )}

        <form onSubmit={handleConfirm} className="mt-6 space-y-4">
          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Full Name
            </label>
            <input
              type="text"
              readOnly
              value={user.name}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-300 font-semibold text-sm cursor-not-allowed outline-none"
            />
          </div>

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Roll Number
              </label>
              <input
                type="text"
                readOnly
                value={user.rollNo}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-emerald-400 font-mono font-bold text-sm cursor-not-allowed outline-none"
              />
            </div>
            <div>
              <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
                Hostel
              </label>
              <input
                type="text"
                readOnly
                value={user.hostel || "N/A"}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-2xl text-slate-300 font-semibold text-sm cursor-not-allowed outline-none"
              />
            </div>
          </div>

          <div>
            <label className="block text-[11px] font-bold uppercase tracking-wider text-slate-400 mb-1.5">
              Phone Number <span className="text-emerald-400">*</span>
            </label>
            <input
              type="tel"
              required
              value={phoneNo}
              onChange={(e) => setPhoneNo(e.target.value)}
              placeholder="e.g. 9876543210"
              maxLength={15}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-700 focus:border-emerald-500 rounded-2xl text-white font-medium text-sm outline-none transition-colors"
            />
          </div>

          <button
            type="submit"
            disabled={submitting}
            className="w-full py-4 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white rounded-2xl font-black uppercase tracking-wider text-xs transition-all shadow-xl shadow-emerald-950/60 mt-6"
          >
            {submitting ? "Submitting..." : "Confirm & Submit Attendance"}
          </button>
        </form>
      </div>
    </div>
  );
}
