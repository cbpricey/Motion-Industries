"use client";

import { useSession, signIn, signOut } from "next-auth/react";
import { useEffect, useState } from "react";
import { Users, Trash2, Edit, LogOut, ArrowLeft } from "lucide-react";
import { useRouter } from "next/navigation";

type User = {
  id: string;
  name: string;
  email: string;
  role: string;
  created_at: string;
};

export default function AdminCRUD() {
  const { data: session, status: authStatus } = useSession();
  const router = useRouter();
  
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState(false);
  const [userToDelete, setUserToDelete] = useState<User | null>(null);
  const [scrollY, setScrollY] = useState(0);

  const userRole = session?.user?.role;
  const isAdmin = userRole === "admin";

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    if (authStatus === "authenticated" && isAdmin) {
      fetchUsers();
    }
  }, [authStatus, isAdmin]);

  async function fetchUsers() {
    try {
      setLoading(true);
      const res = await fetch("/api/users");
      if (!res.ok) throw new Error("Failed to fetch users");
      const data = await res.json();
      setUsers(data);
    } catch (e) {
      console.error("Error fetching users:", e);
      alert("Failed to load users");
    } finally {
      setLoading(false);
    }
  }

  async function handleUpdateUser() {
    if (!editingUser) return;

    try {
      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role: editingUser.role,
          name: editingUser.name,
          email: editingUser.email
        }),
      });

      if (!res.ok) throw new Error("Failed to update user");

      setUsers(users.map(u => u.id === editingUser.id ? editingUser : u));
      setIsEditModalOpen(false);
      setEditingUser(null);
    } catch (e) {
      console.error("Error updating user:", e);
      alert("Failed to update user");
    }
  }

  async function handleDeleteUser(userId: string) {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || "Failed to delete user");
      }

      setUsers(users.filter(u => u.id !== userId));
      setIsDeleteModalOpen(false);
      setUserToDelete(null);
    } catch (e: any) {
      console.error("Error deleting user:", e);
      alert(e.message || "Failed to delete user");
    }
  }

  function openEditModal(user: User) {
    setEditingUser({ ...user });
    setIsEditModalOpen(true);
  }

  function openDeleteModal(user: User) {
    setUserToDelete(user);
    setIsDeleteModalOpen(true);
  }

  // Handle loading state
  if (authStatus === "loading") {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent mb-4 mx-auto" />
          <p className="text-gray-400">Loading...</p>
        </div>
      </div>
    );
  }

  // Require authentication
  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-400 mb-6">Please sign in to access the Admin Panel</p>
          <button
            onClick={() => signIn()}
            className="rounded-md bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700 transition"
          >
            Sign In
          </button>
        </div>
      </div>
    );
  }

  // Check if user is admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4 text-red-500">Access Denied</h2>
          <p className="text-gray-400 mb-6">You do not have permission to access this page</p>
          <button
            onClick={() => router.push("/")}
            className="rounded-md bg-red-600 px-6 py-3 text-sm font-bold text-white hover:bg-red-700 transition"
          >
            Go Back
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      {/* Edit Modal */}
      {isEditModalOpen && editingUser && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-zinc-900 p-6">
            <h2 className="mb-4 text-xl font-bold text-red-500">Edit User</h2>
            <div className="space-y-4 mb-4">
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Name</label>
                <input
                  type="text"
                  value={editingUser.name}
                  onChange={(e) => setEditingUser({ ...editingUser, name: e.target.value })}
                  className="w-full rounded-md border-2 border-red-900/50 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-red-600"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Email</label>
                <input
                  type="email"
                  value={editingUser.email}
                  onChange={(e) => setEditingUser({ ...editingUser, email: e.target.value })}
                  className="w-full rounded-md border-2 border-red-900/50 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-red-600"
                />
              </div>
              <div>
                <label className="block text-sm font-bold text-gray-300 mb-2">Role</label>
                <select
                  value={editingUser.role}
                  onChange={(e) => setEditingUser({ ...editingUser, role: e.target.value })}
                  className="w-full rounded-md border-2 border-red-900/50 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-red-600"
                >
                  <option value="reviewer">Reviewer</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
            </div>
            <div className="flex justify-end gap-4">
              <button
                onClick={() => {
                  setIsEditModalOpen(false);
                  setEditingUser(null);
                }}
                className="rounded-md bg-gray-600 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleUpdateUser}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Save Changes
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Delete Modal */}
      {isDeleteModalOpen && userToDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-zinc-900 p-6 text-center">
            <h2 className="mb-4 text-xl font-bold text-red-500">Delete User?</h2>
            <p className="mb-2 text-gray-300">Are you sure you want to delete this user?</p>
            <p className="mb-6 text-sm text-gray-400">{userToDelete.name} ({userToDelete.email})</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={() => {
                  setIsDeleteModalOpen(false);
                  setUserToDelete(null);
                }}
                className="rounded-md bg-gray-600 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={() => handleDeleteUser(userToDelete.id)}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Background grid */}
      <div className="pointer-events-none fixed inset-0 opacity-10">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,0,0,0.3) 1px, transparent 1px), linear-gradient(90deg, rgba(255,0,0,0.3) 1px, transparent 1px)",
            backgroundSize: "50px 50px",
            transform: `translateY(${scrollY * 0.5}px)`,
          }}
        />
      </div>
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 blur-3xl" style={{ backgroundColor: "rgba(220,38,38,0.10)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 blur-3xl" style={{ backgroundColor: "rgba(220,38,38,0.05)" }} />

      {/* Header */}
      <div className="relative mx-auto w-full max-w-6xl px-6 pt-10">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse bg-red-600" />
            <span className="font-mono text-sm uppercase tracking-wider text-red-600">
              Admin Panel
            </span>
          </div>
          <div className="h-px flex-1 bg-red-900" />
          <button
            onClick={() => router.push("/")}
            className="flex items-center gap-2 rounded-md bg-zinc-900 px-4 py-2 text-sm font-bold text-gray-300 hover:bg-zinc-800 transition"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to Workbench
          </button>
          <button
            onClick={() => signOut()}
            className="flex items-center gap-2 rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700 transition"
          >
            <LogOut className="h-4 w-4" />
            Sign Out
          </button>
        </div>

        <div className="mb-8">
          <div className="mb-3 font-mono text-sm uppercase tracking-widest text-red-600">
            Capstone Project 2025
          </div>
          <h1 className="mb-4 text-5xl font-black leading-none tracking-tighter md:text-6xl">
            User <span className="text-red-600">Management</span>
          </h1>
          <div className="mb-6 flex items-center gap-4">
            <div className="h-1 w-20 bg-red-600" />
            <p className="font-mono text-sm uppercase tracking-widest text-gray-400">
              Read • Update • Delete
            </p>
          </div>
        </div>

        {/* Content */}
        <div className="mb-10">
          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="h-8 w-8 animate-spin rounded-full border-4 border-red-600 border-t-transparent" />
            </div>
          ) : (
            <>
              {/* Action Bar */}
              <div className="mb-6 flex items-center gap-4">
                <Users className="h-6 w-6 text-red-500" />
                <h2 className="text-2xl font-black uppercase tracking-wider">All Users</h2>
              </div>

              {/* Users Table */}
              <div className="rounded-lg border-2 border-red-900/50 bg-zinc-950 overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead className="bg-zinc-900">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-300">
                          Name
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-300">
                          Email
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-300">
                          Role
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-300">
                          Created At
                        </th>
                        <th className="px-6 py-3 text-left text-xs font-black uppercase tracking-wider text-gray-300">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-red-900/30">
                      {users.map((user) => (
                        <tr key={user.id} className="hover:bg-zinc-900/50 transition">
                          <td className="px-6 py-4 text-sm text-white">{user.name}</td>
                          <td className="px-6 py-4 text-sm text-gray-400">{user.email}</td>
                          <td className="px-6 py-4">
                            <span
                              className={`inline-block rounded-full px-3 py-1 text-xs font-bold uppercase ${
                                user.role === "admin"
                                  ? "bg-red-600 text-white"
                                  : "bg-gray-700 text-gray-300"
                              }`}
                            >
                              {user.role}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-sm text-gray-400">
                            {new Date(user.created_at).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4">
                            <div className="flex gap-2">
                              <button
                                onClick={() => openEditModal(user)}
                                className="rounded-md bg-blue-600 p-2 text-white hover:bg-blue-700 transition"
                                title="Edit User"
                              >
                                <Edit className="h-4 w-4" />
                              </button>
                              <button
                                onClick={() => openDeleteModal(user)}
                                className="rounded-md bg-red-600 p-2 text-white hover:bg-red-700 transition"
                                title="Delete User"
                                disabled={user.email === session.user?.email}
                              >
                                <Trash2 className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {users.length === 0 && (
                <p className="my-8 text-center text-sm text-gray-400">No users found.</p>
              )}
            </>
          )}
        </div>
      </div>

      {/* Footer */}
      <div className="relative border-t-2 border-red-900 px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="font-mono text-sm text-gray-500">
            © {new Date().getFullYear()} Capstone Group • {users.length} user{users.length === 1 ? "" : "s"}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
            <span className="font-mono text-sm uppercase text-gray-500">Online</span>
          </div>
        </div>
      </div>
    </div>
  );
}