import { getUserFromToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import StudentView from "@/components/dashboard/StudentView";
import WardenView from "@/components/dashboard/WardenView";
import KSACView from "@/components/dashboard/KSACView";
import AdminView from "@/components/dashboard/AdminView";
import Navbar from "@/components/dashboard/Navbar";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  const user = await getUserFromToken();

  if (!user) {
    redirect("/login");
  }

  const currentUser = user;

  let roleView;

  switch (currentUser.role) {
    case "student":
      roleView = <StudentView user={currentUser} />;
      break;
    case "warden":
      roleView = <WardenView user={currentUser} />;
      break;
    case "ksac":
      roleView = <KSACView user={currentUser} />;
      break;
    case "admin":
      roleView = <AdminView user={currentUser} />;
      break;
    default:
      roleView = <div className="p-6 text-center font-black text-red-500">ERR: INVALID_ROLE_ACCESS</div>;
  }

  return (
    <div className="relative min-h-screen bg-[#f7fbf8] selection:bg-emerald-100 selection:text-emerald-900">
      <Navbar />
      <main className="pt-20 sm:pt-28 md:pt-36 lg:pt-40 pb-12 sm:pb-16 md:pb-20 px-3 sm:px-6 md:px-8 max-w-7xl mx-auto">
        <div className="animate-entrance">
          {roleView}
        </div>
      </main>
    </div>
  );
}
