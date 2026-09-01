import { getUserFromToken } from "@/lib/auth";
import { redirect } from "next/navigation";
import StudentView from "@/components/dashboard/StudentView";
import WardenView from "@/components/dashboard/WardenView";
import KSACView from "@/components/dashboard/KSACView";
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
    default:
      roleView = <div className="p-10 text-center font-black text-red-500">ERR: INVALID_ROLE_ACCESS</div>;
  }

  return (
    <div className="relative min-h-screen">
      <Navbar />
      <main className="pt-44 pb-20 px-8">
        <div className="animate-entrance">
          {roleView}
        </div>
      </main>
    </div>
  );
}
