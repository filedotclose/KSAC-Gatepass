import { Suspense } from "react";
import { getUserFromToken } from "@/lib/auth";
import AttendancePortal from "@/components/attendance/AttendancePortal";
import Navbar from "@/components/dashboard/Navbar";

export const dynamic = "force-dynamic";

export default async function AttendancePage() {
  const user = await getUserFromToken();

  return (
    <div className="relative min-h-screen bg-[#f7fbf8] selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />
      <main className="pt-20 sm:pt-28 md:pt-36 pb-12 sm:pb-16 md:pb-20 px-3 sm:px-6 md:px-8 max-w-7xl mx-auto">
        <Suspense
          fallback={
            <div className="min-h-[60vh] flex flex-col justify-center items-center">
              <div className="w-12 h-12 border-4 border-emerald-600 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="font-black tracking-widest text-[10px] uppercase text-slate-400">
                Loading KSAC Attendance Portal...
              </p>
            </div>
          }
        >
          <AttendancePortal user={user} />
        </Suspense>
      </main>
    </div>
  );
}
