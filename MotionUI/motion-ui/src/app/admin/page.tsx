"use client";

import { useEffect, useState } from "react";
import { useSession } from "next-auth/react";

export default function AdminPage() {
  const { data: session, status } = useSession();
  const [users, setUsers] = useState<any[]>([]);

  useEffect(() => {
    async function fetchUsers() {
      const res = await fetch("/api/users");
      if (res.ok) {
        const data = await res.json();
        setUsers(data);
      }
    }

    if (session?.user?.role === "admin") {
      fetchUsers();
    }
  }, [session]);

  if (status === "loading") return <p>Loading session...</p>;

  if (session?.user?.role !== "admin") {
    return <p>Access denied. Admins only.</p>;
  }

  return (
    <div style={{ padding: "2rem" }}>
      <h1>Admin Dashboard</h1>
      <h2>All Users</h2>
      <table border={1} cellPadding={6} style={{ marginTop: "1rem" }}>
        <thead>
          <tr>
            <th>Email</th>
            <th>Name</th>
            <th>Role</th>
            <th>Created</th>
          </tr>
        </thead>
        <tbody>
          {users.map((u, i) => (
            <tr key={i}>
              <td>{u.email}</td>
              <td>{u.name}</td>
              <td>{u.role}</td>
              <td>{new Date(u.created_at).toLocaleString()}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
