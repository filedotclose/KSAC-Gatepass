import { Suspense } from "react";
import { getUserFromToken } from "@/lib/auth";
import AttendancePortal from "@/components/attendance/AttendancePortal";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const user = await getUserFromToken();

  return (
    <Suspense
      fallback={
        <div className="min-h-screen bg-slate-950 flex flex-col justify-center items-center text-white">
          <div className="w-12 h-12 border-4 border-emerald-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-bold tracking-wider text-xs uppercase text-slate-400">Loading Attendance Portal...</p>
        </div>
      }
    >
      <AttendancePortal user={user} />
    </Suspense>
  );
}
