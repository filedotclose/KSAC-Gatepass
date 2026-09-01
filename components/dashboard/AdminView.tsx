"use client";

import { IUser } from "@/types/user";
import { useEffect, useState } from "react";
import { dispatchGateway, GATEWAY_OPCODES } from "@/lib/gatewayClient";
import { KSAC_SOCIETIES, KSAC_CENTRAL_ROOMS, getAllocatedRoomForSociety } from "@/lib/ksacSocieties";

interface Props {
  user: IUser;
}

const COMMON_HOSTELS = [
  "KP-7A", "KP-7B", "KP-6", "KP-10", "KP-14", "KP-15", "KP-1", "KP-2", "KP-3", "KP-4", "KP-5",
  "QC-1", "QC-2", "QC-3", "QC-4", "QC-5", "QC-6", "QC-7", "QC-8", "QC-11", "International Hostel"
];

export default function AdminView({ user }: Props) {
  const [activeTab, setActiveTab] = useState<"users" | "passes" | "rooms" | "logs">("users");

  // Data states
  const [users, setUsers] = useState<any[]>([]);
  const [passes, setPasses] = useState<any[]>([]);
  const [bookings, setBookings] = useState<any[]>([]);
  const [activityLogs, setActivityLogs] = useState<any[]>([]);
  const [stats, setStats] = useState<any>({});
  const [loading, setLoading] = useState(true);

  // Filters & Search
  const [userSearch, setUserSearch] = useState("");
  const [userRoleFilter, setUserRoleFilter] = useState("ALL");
  const [userHostelFilter, setUserHostelFilter] = useState("ALL");

  const [passSearch, setPassSearch] = useState("");
  const [passStatusFilter, setPassStatusFilter] = useState("ALL");

  const [bookingStatusFilter, setBookingStatusFilter] = useState("ALL");

  // Modals & Forms
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [editingUser, setEditingUser] = useState<any | null>(null);
  const [actionAlert, setActionAlert] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // New User Form State
  const [newUserName, setNewUserName] = useState("");
  const [newUserRoll, setNewUserRoll] = useState("");
  const [newUserEmail, setNewUserEmail] = useState("");
  const [newUserPassword, setNewUserPassword] = useState("password123");
  const [newUserRole, setNewUserRole] = useState("student");
  const [newUserHostel, setNewUserHostel] = useState("KP-7A");
  const [newUserIsLead, setNewUserIsLead] = useState(false);
  const [newUserSociety, setNewUserSociety] = useState(KSAC_SOCIETIES[0]?.name || "Kalliope");
  const [newUserPosition, setNewUserPosition] = useState("President");
  const [newUserAllocatedRoom, setNewUserAllocatedRoom] = useState(getAllocatedRoomForSociety(KSAC_SOCIETIES[0]?.name || "Kalliope"));
  const [submittingUser, setSubmittingUser] = useState(false);

  const fetchAdminData = async () => {
    setLoading(true);
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.FETCH_ADMIN_DASHBOARD);
      if (res.ok && res.data) {
        setUsers(Array.isArray(res.data.users) ? res.data.users : []);
        setPasses(Array.isArray(res.data.passes) ? res.data.passes : []);
        setBookings(Array.isArray(res.data.bookings) ? res.data.bookings : []);
        setActivityLogs(Array.isArray(res.data.activityLogs) ? res.data.activityLogs : []);
        setStats(res.data.stats || {});
      }
    } catch (err) {
      console.error("Failed to fetch admin data", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleCreateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmittingUser(true);
    setActionAlert(null);

    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.ADMIN_CREATE_USER, {
        name: newUserName,
        rollNo: newUserRoll,
        email: newUserEmail,
        password: newUserPassword,
        role: newUserRole,
        hostel: newUserHostel,
        isSocietyLead: newUserIsLead,
        society: newUserIsLead ? newUserSociety : undefined,
        position: newUserIsLead ? newUserPosition : undefined,
        allocatedRoom: newUserIsLead ? newUserAllocatedRoom : undefined,
      });

      if (res.ok) {
        setActionAlert({ type: "success", message: `User ${newUserName} (${newUserRoll}) created successfully!` });
        setShowAddUserModal(false);
        setNewUserName("");
        setNewUserRoll("");
        setNewUserEmail("");
        fetchAdminData();
      } else {
        setActionAlert({ type: "error", message: res.message || "Failed to create user." });
      }
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Unexpected error." });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleUpdateUser = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSubmittingUser(true);
    setActionAlert(null);

    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.ADMIN_UPDATE_USER, {
        userId: editingUser._id,
        name: editingUser.name,
        rollNo: editingUser.rollNo,
        email: editingUser.email,
        role: editingUser.role,
        hostel: editingUser.hostel,
        isSocietyLead: editingUser.isSocietyLead,
        society: editingUser.society,
        position: editingUser.position,
        allocatedRoom: editingUser.allocatedRoom,
      });

      if (res.ok) {
        setActionAlert({ type: "success", message: `User ${editingUser.name} updated successfully!` });
        setEditingUser(null);
        fetchAdminData();
      } else {
        setActionAlert({ type: "error", message: res.message || "Failed to update user." });
      }
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Unexpected error." });
    } finally {
      setSubmittingUser(false);
    }
  };

  const handleDeleteUser = async (userId: string, name: string) => {
    if (!confirm(`Are you sure you want to permanently delete ${name} and all their records?`)) return;
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.ADMIN_DELETE_USER, { userId });
      if (res.ok) {
        setActionAlert({ type: "success", message: `User ${name} deleted.` });
        fetchAdminData();
      } else {
        setActionAlert({ type: "error", message: res.message || "Failed to delete user." });
      }
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Delete error." });
    }
  };

  const handleDeletePass = async (passId: string) => {
    if (!confirm("Are you sure you want to delete this GatePass record?")) return;
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.ADMIN_DELETE_PASS, { passId });
      if (res.ok) {
        setActionAlert({ type: "success", message: "Pass record deleted." });
        fetchAdminData();
      }
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Error deleting pass." });
    }
  };

  const handleOverridePass = async (passId: string, targetStatus: string) => {
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.ADMIN_OVERRIDE_PASS, { passId, status: targetStatus });
      if (res.ok) {
        setActionAlert({ type: "success", message: `Pass status set to ${targetStatus}.` });
        fetchAdminData();
      }
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Error overriding pass." });
    }
  };

  const handleDeleteBooking = async (bookingId: string) => {
    if (!confirm("Are you sure you want to delete this room booking?")) return;
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.ADMIN_DELETE_BOOKING, { bookingId });
      if (res.ok) {
        setActionAlert({ type: "success", message: "Room booking deleted." });
        fetchAdminData();
      }
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Error deleting booking." });
    }
  };

  const handleOverrideBooking = async (bookingId: string, status: string) => {
    try {
      const res = await dispatchGateway(GATEWAY_OPCODES.ADMIN_OVERRIDE_BOOKING, { bookingId, status, note: "Overridden by Master Admin" });
      if (res.ok) {
        setActionAlert({ type: "success", message: `Booking status changed to ${status}.` });
        fetchAdminData();
      }
    } catch (err: any) {
      setActionAlert({ type: "error", message: err.message || "Error overriding booking." });
    }
  };

  const filteredUsers = users.filter((u) => {
    if (userRoleFilter !== "ALL" && u.role !== userRoleFilter) return false;
    if (userHostelFilter !== "ALL" && u.hostel !== userHostelFilter) return false;
    if (userSearch.trim()) {
      const q = userSearch.toLowerCase();
      return (
        u.name?.toLowerCase().includes(q) ||
        u.rollNo?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q) ||
        u.hostel?.toLowerCase().includes(q) ||
        u.society?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredPasses = passes.filter((p) => {
    if (passStatusFilter !== "ALL" && p.status !== passStatusFilter) return false;
    if (passSearch.trim()) {
      const q = passSearch.toLowerCase();
      const sName = p.studentId?.name || "";
      const sRoll = p.studentId?.rollNo || "";
      const sHostel = p.hostel || p.studentId?.hostel || "";
      return (
        sName.toLowerCase().includes(q) ||
        sRoll.toLowerCase().includes(q) ||
        sHostel.toLowerCase().includes(q) ||
        p.society?.toLowerCase().includes(q)
      );
    }
    return true;
  });

  const filteredBookings = bookings.filter((b) => {
    if (bookingStatusFilter !== "ALL" && b.status !== bookingStatusFilter) return false;
    return true;
  });

  return (
    <div className="w-full max-w-7xl mx-auto space-y-6 sm:space-y-8 animate-in fade-in duration-300">
      {/* Header */}
      <header className="flex flex-col md:flex-row md:items-end justify-between gap-4 sm:gap-6">
        <div className="space-y-1.5 sm:space-y-2">
          <div className="flex items-center gap-2 sm:gap-3">
            <span className="bg-purple-700 text-white text-[9px] sm:text-[10px] font-black px-3 py-1 sm:px-3.5 sm:py-1.5 rounded-lg sm:rounded-xl uppercase tracking-wider sm:tracking-widest shadow-sm">
              Root Authority
            </span>
            <span className="text-[11px] sm:text-xs font-bold text-slate-400">
              KIIT Master Administration Portal
            </span>
          </div>
          <h1 className="text-2xl sm:text-4xl md:text-5xl font-black text-slate-900 tracking-tight sm:tracking-tighter">
            Admin Control Center
          </h1>
          <p className="text-slate-500 font-medium text-xs sm:text-base md:text-lg leading-relaxed">
            Logged in as <span className="text-purple-700 font-black">{user.name}</span> ({user.email})
          </p>
        </div>

        <div className="flex flex-wrap gap-2 sm:gap-3">
          <button
            onClick={fetchAdminData}
            disabled={loading}
            className="bg-white hover:bg-slate-50 px-3.5 sm:px-5 py-2 sm:py-3 rounded-xl sm:rounded-2xl border border-slate-200 flex items-center gap-2 transition-all active:scale-95 disabled:opacity-50 shadow-xs touch-btn"
          >
            <svg className={`w-3.5 h-3.5 text-purple-600 ${loading ? "animate-spin" : ""}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="3" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
            </svg>
            <span className="text-[9px] sm:text-[10px] font-black text-slate-700 uppercase tracking-wider">
              {loading ? "Syncing..." : "Sync All"}
            </span>
          </button>

          <button
            onClick={() => setShowAddUserModal(true)}
            className="bg-purple-700 text-white hover:bg-purple-800 px-4 sm:px-6 py-2 sm:py-3 rounded-xl sm:rounded-2xl flex items-center gap-2 transition-all active:scale-95 shadow-md shadow-purple-200 text-[10px] sm:text-xs font-black uppercase tracking-wider touch-btn"
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4v16m8-8H4" />
            </svg>
            <span>Add Student / User</span>
          </button>
        </div>
      </header>

      {/* Action Alert Banner */}
      {actionAlert && (
        <div
          className={`p-3 sm:p-4 rounded-xl sm:rounded-2xl text-xs font-bold animate-in fade-in flex items-center justify-between gap-3 ${
            actionAlert.type === "success"
              ? "bg-emerald-50 border border-emerald-200 text-emerald-800"
              : "bg-red-50 border border-red-200 text-red-700"
          }`}
        >
          <span>{actionAlert.message}</span>
          <button onClick={() => setActionAlert(null)} className="text-slate-400 hover:text-slate-700 font-black">✕</button>
        </div>
      )}

      {/* Global Quick Metrics */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 sm:gap-4">
        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Students</span>
          <span className="text-xl sm:text-2xl font-black text-slate-800 mt-0.5 sm:mt-1 block">{stats.totalStudents || 0}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">Society Leads</span>
          <span className="text-xl sm:text-2xl font-black text-amber-600 mt-0.5 sm:mt-1 block">{stats.totalLeads || 0}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">Active Outside Passes</span>
          <span className="text-xl sm:text-2xl font-black text-emerald-600 mt-0.5 sm:mt-1 block">{stats.activePasses || 0}</span>
        </div>

        <div className="bg-white p-3.5 sm:p-5 rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs">
          <span className="text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider block">Total Room Bookings</span>
          <span className="text-xl sm:text-2xl font-black text-purple-700 mt-0.5 sm:mt-1 block">{stats.totalBookings || 0}</span>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="flex gap-2 sm:gap-3 border-b border-slate-200/80 pb-1.5 overflow-x-auto no-scrollbar">
        <button
          onClick={() => setActiveTab("users")}
          className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 shrink-0 touch-btn ${
            activeTab === "users" ? "bg-slate-900 text-white shadow-md shadow-slate-900/10" : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-4 h-4 text-purple-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
          </svg>
          <span>Students & Users ({users.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("passes")}
          className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 shrink-0 touch-btn ${
            activeTab === "passes" ? "bg-purple-700 text-white shadow-md shadow-purple-200" : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M15 5v2m0 4v2m0 4v2M5 5a2 2 0 00-2 2v3a2 2 0 110 4v3a2 2 0 002 2h14a2 2 0 002-2v-3a2 2 0 110-4V7a2 2 0 00-2-2H5z" />
          </svg>
          <span>All GatePasses ({passes.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("rooms")}
          className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 shrink-0 touch-btn ${
            activeTab === "rooms" ? "bg-emerald-600 text-white shadow-md shadow-emerald-200" : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
          <span>Room Bookings ({bookings.length})</span>
        </button>

        <button
          onClick={() => setActiveTab("logs")}
          className={`flex items-center gap-2 px-4 sm:px-6 py-2.5 sm:py-3.5 rounded-xl sm:rounded-2xl font-black text-[11px] sm:text-xs uppercase tracking-wider transition-all duration-300 shrink-0 touch-btn ${
            activeTab === "logs" ? "bg-slate-800 text-white shadow-md shadow-slate-900/10" : "bg-white text-slate-500 hover:bg-slate-50 border border-slate-200/60"
          }`}
        >
          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Audit Logs</span>
        </button>
      </div>

      {/* TAB 1: USER & STUDENT CRUD */}
      {activeTab === "users" && (
        <div className="space-y-4">
          {/* Filter Toolbar */}
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by name, roll no, hostel..."
                value={userSearch}
                onChange={(e) => setUserSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <div className="flex flex-wrap gap-2 w-full sm:w-auto">
              <select
                value={userRoleFilter}
                onChange={(e) => setUserRoleFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Roles</option>
                <option value="student">Students</option>
                <option value="warden">Wardens</option>
                <option value="ksac">KSAC Officers</option>
                <option value="admin">Admins</option>
              </select>

              <select
                value={userHostelFilter}
                onChange={(e) => setUserHostelFilter(e.target.value)}
                className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
              >
                <option value="ALL">All Hostels</option>
                {COMMON_HOSTELS.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
            </div>
          </div>

          {/* User List Table */}
          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[700px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Student / User</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Hostel</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Role & Designation</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Room Booking Access</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredUsers.map((u) => (
                    <tr key={u._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-black text-slate-800">{u.name}</p>
                        <p className="text-[10px] font-bold text-slate-400">{u.rollNo} • {u.email}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="bg-slate-100 text-slate-700 font-bold px-2.5 py-1 rounded-lg text-[10px] border border-slate-200">
                          {u.hostel || "KP-7A"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider ${
                          u.role === "admin" ? "bg-purple-100 text-purple-800" :
                          u.role === "ksac" ? "bg-emerald-100 text-emerald-800" :
                          u.role === "warden" ? "bg-amber-100 text-amber-800" :
                          "bg-slate-100 text-slate-700"
                        }`}>
                          {u.role}
                        </span>
                        {u.society && (
                          <p className="text-[10px] font-semibold text-slate-500 mt-1">{u.society} ({u.position || "Member"})</p>
                        )}
                      </td>
                      <td className="px-5 py-3.5">
                        {u.isSocietyLead ? (
                          <div>
                            <span className="bg-amber-50 text-amber-800 border border-amber-200 font-black text-[9px] px-2 py-0.5 rounded uppercase">
                              Enabled (Lead)
                            </span>
                            {u.allocatedRoom && (
                              <p className="text-[9px] text-emerald-700 font-bold mt-0.5">{u.allocatedRoom}</p>
                            )}
                          </div>
                        ) : (
                          <span className="text-slate-400 font-semibold text-[10px]">Restricted</span>
                        )}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1.5">
                        <button
                          onClick={() => setEditingUser({ ...u })}
                          className="bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all active:scale-95"
                        >
                          Edit
                        </button>
                        <button
                          onClick={() => handleDeleteUser(u._id, u.name)}
                          className="bg-red-50 hover:bg-red-100 text-red-700 font-bold px-3 py-1.5 rounded-lg text-[10px] transition-all active:scale-95"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredUsers.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">No users matched search filter</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 2: GATEPASS OVERSIGHT & OVERRIDES */}
      {activeTab === "passes" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex flex-col sm:flex-row gap-3 items-center justify-between">
            <div className="w-full sm:w-80">
              <input
                type="text"
                placeholder="Search by student, hostel, society..."
                value={passSearch}
                onChange={(e) => setPassSearch(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
            <select
              value={passStatusFilter}
              onChange={(e) => setPassStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none w-full sm:w-auto"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">PENDING (Awaiting KSAC)</option>
              <option value="APPROVED">APPROVED (Verified at KSAC)</option>
              <option value="RETURNED">RETURNED (In Hostel)</option>
              <option value="REJECTED">REJECTED</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Student & Hostel</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Society & Purpose</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Target Curfew</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Admin Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredPasses.map((p) => (
                    <tr key={p._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <p className="font-black text-slate-800">{p.studentId?.name || "Student"}</p>
                        <p className="text-[10px] font-bold text-slate-400">{p.studentId?.rollNo}</p>
                        <span className="bg-slate-100 text-slate-700 font-bold px-2 py-0.5 rounded text-[9px] inline-block mt-0.5">
                          Hostel: {p.hostel || p.studentId?.hostel || "KP-7A"}
                        </span>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className="bg-emerald-50 text-emerald-800 font-black px-2 py-0.5 rounded text-[9px] border border-emerald-200">
                          {p.society}
                        </span>
                        <p className="text-[11px] text-slate-600 italic mt-1 line-clamp-1">"{p.reason}"</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <span className={`px-2.5 py-0.5 rounded-md font-black text-[9px] uppercase tracking-wider ${
                          p.status === "APPROVED" ? "bg-emerald-100 text-emerald-800" :
                          p.status === "PENDING" ? "bg-amber-100 text-amber-800" :
                          p.status === "RETURNED" ? "bg-teal-100 text-teal-800" :
                          "bg-red-100 text-red-800"
                        }`}>
                          {p.status}
                        </span>
                      </td>
                      <td className="px-5 py-3.5 font-bold text-slate-700">
                        {p.requestedExtension || "Standard"}
                      </td>
                      <td className="px-5 py-3.5 text-right space-x-1">
                        {p.status === "PENDING" && (
                          <button
                            onClick={() => handleOverridePass(p._id, "APPROVED")}
                            className="bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg text-[9px] hover:bg-emerald-700"
                          >
                            Approve
                          </button>
                        )}
                        {p.status === "APPROVED" && (
                          <button
                            onClick={() => handleOverridePass(p._id, "RETURNED")}
                            className="bg-teal-600 text-white font-bold px-2.5 py-1 rounded-lg text-[9px] hover:bg-teal-700"
                          >
                            Mark Return
                          </button>
                        )}
                        <button
                          onClick={() => handleDeletePass(p._id)}
                          className="bg-red-50 text-red-700 font-bold px-2.5 py-1 rounded-lg text-[9px] hover:bg-red-100"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredPasses.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">No pass records found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 3: ROOM BOOKINGS CRUD */}
      {activeTab === "rooms" && (
        <div className="space-y-4">
          <div className="bg-white p-4 rounded-2xl border border-slate-100 shadow-xs flex justify-between items-center">
            <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider">All Society Room Reservations</h2>
            <select
              value={bookingStatusFilter}
              onChange={(e) => setBookingStatusFilter(e.target.value)}
              className="bg-slate-50 border border-slate-200 p-2 rounded-xl text-xs font-bold text-slate-700 focus:outline-none"
            >
              <option value="ALL">All Statuses</option>
              <option value="PENDING">Pending</option>
              <option value="APPROVED">Approved</option>
              <option value="REJECTED">Rejected</option>
            </select>
          </div>

          <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 shadow-xs overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse min-w-[750px]">
                <thead>
                  <tr className="bg-slate-50/50 border-b border-slate-100">
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Room & Society</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Applicant</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Schedule</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3.5 text-[9px] sm:text-[10px] font-black text-slate-400 uppercase tracking-wider text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 text-xs">
                  {filteredBookings.map((b) => (
                    <tr key={b._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="px-5 py-3.5">
                        <span className="font-black text-slate-800 bg-emerald-50 px-2 py-0.5 rounded text-[10px] border border-emerald-200">
                          {b.room}
                        </span>
                        <p className="text-[10px] font-bold text-slate-500 mt-1">{b.society}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-black text-slate-800">{b.studentName || b.studentId?.name}</p>
                        <p className="text-[10px] text-slate-400">{b.studentRollNo || b.studentId?.rollNo}</p>
                      </td>
                      <td className="px-5 py-3.5">
                        <p className="font-bold text-slate-800">{b.date}</p>
                        <p className="text-[10px] text-emerald-700 font-bold">{b.timeslot || `${b.startTime} - ${b.endTime}`}</p>
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
                      <td className="px-5 py-3.5 text-right space-x-1">
                        {b.status === "PENDING" && (
                          <>
                            <button
                              onClick={() => handleOverrideBooking(b._id, "APPROVED")}
                              className="bg-emerald-600 text-white font-bold px-2.5 py-1 rounded-lg text-[9px]"
                            >
                              Approve
                            </button>
                            <button
                              onClick={() => handleOverrideBooking(b._id, "REJECTED")}
                              className="bg-red-600 text-white font-bold px-2.5 py-1 rounded-lg text-[9px]"
                            >
                              Reject
                            </button>
                          </>
                        )}
                        <button
                          onClick={() => handleDeleteBooking(b._id)}
                          className="bg-slate-100 text-red-700 font-bold px-2.5 py-1 rounded-lg text-[9px]"
                        >
                          Delete
                        </button>
                      </td>
                    </tr>
                  ))}
                  {filteredBookings.length === 0 && (
                    <tr>
                      <td colSpan={5} className="py-12 text-center text-slate-400 font-bold">No room bookings found</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      )}

      {/* TAB 4: AUDIT LOGS */}
      {activeTab === "logs" && (
        <div className="bg-white rounded-2xl sm:rounded-3xl border border-slate-100 p-5 shadow-xs space-y-3">
          <h2 className="text-sm font-black text-slate-800 uppercase tracking-wider mb-4">Real-time Activity Audit Trail</h2>
          <div className="space-y-2 max-h-[500px] overflow-y-auto">
            {activityLogs.map((log) => (
              <div key={log._id} className="p-3 bg-slate-50 rounded-xl flex items-center justify-between text-xs border border-slate-100">
                <div className="flex items-center gap-2.5">
                  <span className={`w-2 h-2 rounded-full ${log.activityType.includes("ENTRY") ? "bg-emerald-500" : "bg-purple-500"}`} />
                  <span className="font-black text-slate-800">{log.studentId?.name || "Student"}</span>
                  <span className="text-[10px] font-bold text-slate-400">({log.studentId?.rollNo})</span>
                  <span className="text-[10px] font-black text-purple-700 uppercase bg-purple-50 px-2 py-0.5 rounded">
                    {log.activityType}
                  </span>
                </div>
                <div className="text-right text-[10px] text-slate-400 font-semibold">
                  <span>{log.location}</span> • <span>{new Date(log.timestamp).toLocaleTimeString()}</span>
                </div>
              </div>
            ))}
            {activityLogs.length === 0 && (
              <p className="text-center py-10 text-slate-400 font-bold">No activity logs recorded yet</p>
            )}
          </div>
        </div>
      )}

      {/* MODAL: ADD USER / STUDENT */}
      {showAddUserModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Add New Student / Authority</h3>
              <button onClick={() => setShowAddUserModal(false)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleCreateUser} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Full Name</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. Rahul Sharma"
                    value={newUserName}
                    onChange={(e) => setNewUserName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Roll No</label>
                  <input
                    type="text"
                    required
                    placeholder="e.g. 23051999"
                    value={newUserRoll}
                    onChange={(e) => setNewUserRoll(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">KIIT Email</label>
                  <input
                    type="email"
                    required
                    placeholder="23051999@kiit.ac.in"
                    value={newUserEmail}
                    onChange={(e) => setNewUserEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Password</label>
                  <input
                    type="password"
                    required
                    value={newUserPassword}
                    onChange={(e) => setNewUserPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold focus:ring-2 focus:ring-purple-500 focus:outline-none"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Role</label>
                  <select
                    value={newUserRole}
                    onChange={(e) => setNewUserRole(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700"
                  >
                    <option value="student">Student</option>
                    <option value="warden">Warden</option>
                    <option value="ksac">KSAC Officer</option>
                    <option value="admin">Master Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Resident Hostel</label>
                  <select
                    value={newUserHostel}
                    onChange={(e) => setNewUserHostel(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold text-slate-700"
                  >
                    {COMMON_HOSTELS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Society Lead Room Booking Privileges */}
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={newUserIsLead}
                    onChange={(e) => setNewUserIsLead(e.target.checked)}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-xs font-black text-purple-900 uppercase">Grant Society Room Booking Privileges</span>
                </label>

                {newUserIsLead && (
                  <div className="space-y-2 pt-1">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400">Society</span>
                        <select
                          value={newUserSociety}
                          onChange={(e) => {
                            setNewUserSociety(e.target.value);
                            setNewUserAllocatedRoom(getAllocatedRoomForSociety(e.target.value));
                          }}
                          className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold"
                        >
                          {KSAC_SOCIETIES.map((s) => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400">Designation</span>
                        <select
                          value={newUserPosition}
                          onChange={(e) => setNewUserPosition(e.target.value)}
                          className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold"
                        >
                          <option value="President">President</option>
                          <option value="Vice-President">Vice-President</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400">Allocated Room</span>
                      <input
                        type="text"
                        value={newUserAllocatedRoom}
                        onChange={(e) => setNewUserAllocatedRoom(e.target.value)}
                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setShowAddUserModal(false)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="w-1/2 py-2.5 bg-purple-700 text-white rounded-xl font-bold text-xs hover:bg-purple-800"
                >
                  {submittingUser ? "Creating..." : "Save User"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* MODAL: EDIT USER & PRIVILEGES */}
      {editingUser && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 space-y-4 shadow-2xl animate-in zoom-in max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center pb-2 border-b border-slate-100">
              <h3 className="text-lg font-black text-slate-800">Edit User & Privileges</h3>
              <button onClick={() => setEditingUser(null)} className="text-slate-400 hover:text-slate-700 font-bold">✕</button>
            </div>

            <form onSubmit={handleUpdateUser} className="space-y-3.5">
              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Name</label>
                  <input
                    type="text"
                    value={editingUser.name}
                    onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold"
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Hostel</label>
                  <select
                    value={editingUser.hostel || "KP-7A"}
                    onChange={(e) => setEditingUser({ ...editingUser, hostel: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold"
                  >
                    {COMMON_HOSTELS.map((h) => (
                      <option key={h} value={h}>{h}</option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Role</label>
                  <select
                    value={editingUser.role}
                    onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-bold"
                  >
                    <option value="student">Student</option>
                    <option value="warden">Warden</option>
                    <option value="ksac">KSAC Officer</option>
                    <option value="admin">Master Admin</option>
                  </select>
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] font-black uppercase text-slate-400">Email</label>
                  <input
                    type="email"
                    value={editingUser.email}
                    onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                    className="w-full bg-slate-50 border border-slate-200 p-2.5 rounded-xl text-xs font-semibold"
                  />
                </div>
              </div>

              {/* Room Booking Privileges */}
              <div className="p-3 bg-purple-50/60 rounded-2xl border border-purple-100 space-y-3">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={editingUser.isSocietyLead || false}
                    onChange={(e) => setEditingUser({ ...editingUser, isSocietyLead: e.target.checked })}
                    className="w-4 h-4 text-purple-600 rounded"
                  />
                  <span className="text-xs font-black text-purple-900 uppercase">Room Booking Access</span>
                </label>

                {editingUser.isSocietyLead && (
                  <div className="space-y-2">
                    <div className="grid grid-cols-2 gap-2">
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400">Society</span>
                        <select
                          value={editingUser.society || KSAC_SOCIETIES[0]?.name}
                          onChange={(e) => setEditingUser({
                            ...editingUser,
                            society: e.target.value,
                            allocatedRoom: getAllocatedRoomForSociety(e.target.value),
                          })}
                          className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold"
                        >
                          {KSAC_SOCIETIES.map((s) => (
                            <option key={s.name} value={s.name}>{s.name}</option>
                          ))}
                        </select>
                      </div>
                      <div>
                        <span className="text-[9px] font-black uppercase text-slate-400">Position</span>
                        <select
                          value={editingUser.position || "President"}
                          onChange={(e) => setEditingUser({ ...editingUser, position: e.target.value })}
                          className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-bold"
                        >
                          <option value="President">President</option>
                          <option value="Vice-President">Vice-President</option>
                        </select>
                      </div>
                    </div>
                    <div>
                      <span className="text-[9px] font-black uppercase text-slate-400">Allocated Room</span>
                      <input
                        type="text"
                        value={editingUser.allocatedRoom || ""}
                        onChange={(e) => setEditingUser({ ...editingUser, allocatedRoom: e.target.value })}
                        className="w-full bg-white border border-slate-200 p-2 rounded-lg text-xs font-semibold"
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="flex gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="w-1/2 py-2.5 bg-slate-100 text-slate-700 rounded-xl font-bold text-xs"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submittingUser}
                  className="w-1/2 py-2.5 bg-purple-700 text-white rounded-xl font-bold text-xs hover:bg-purple-800"
                >
                  {submittingUser ? "Updating..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
