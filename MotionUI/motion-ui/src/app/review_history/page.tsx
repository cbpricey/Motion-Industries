"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, History, Filter } from "lucide-react";
import { useSession } from "next-auth/react"; 
import { useRouter } from "next/navigation";

/**
 * Review History
 * — Displays accepted/rejected reviews with matching industrial design
 * — Consistent with Home / Catalog Navigator / About
 */

// keep existing types, just extend the filter options
type FilterType = "all" | "pending-approve" | "accepted" | "pending-reject" | "rejected";

interface ReviewHistoryItem {
  id: number | string;
  title: string;
  manufacturer: string;
  image_url: string;
  // include both pending_* states; exclude plain "pending" from history
  status: "pending-approve" | "accepted" | "pending-reject" | "rejected";
  created_at?: string;
  reviewed_by?: string;
  confidence_score: number;
  rejection_comment?: string;
}

interface ReviewerOption {
  id: string;
  name: string | null;
  email: string;
}

export default function ReviewHistoryPage() {
  const { data: session, status } = useSession(); 
  const [filter, setFilter] = useState<FilterType>("pending-approve");
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);
  const router = useRouter();
  const isAdmin = session?.user?.role?.toUpperCase() === "ADMIN";


  const [reviewers, setReviewers] = useState<ReviewerOption[]>([]);
  const [selectedReviewer, setSelectedReviewer] = useState<string>("ALL"); // email or "ALL"

  // search_after cursor
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  // Fetch data from the API
  useEffect(() => {
    const fetchReviewHistory = async () => {
      try {
        setLoading(true);
        setError(null);

        // Build query parameters dynamically
        const qp = new URLSearchParams();

        // Map UI -> API:
        // accepted => approved, rejected => rejected, pass-through the two pending_* states
        const statusForApi =
          filter === "accepted"
            ? "approved"
            : filter === "rejected"
            ? "rejected"
            : filter === "pending-approve"
            ? "pending-approve"
            : filter === "pending-reject"
            ? "pending-reject"
            : null;

        if (statusForApi) qp.set("status", statusForApi);

        qp.set("sort", "newest"); // Example: Sort by newest

        const url = `/api/products?${qp.toString()}`;
        console.log("[ReviewHistoryPage] fetch:", url);

        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const raw = await response.json();
        const rows = Array.isArray(raw) ? raw : raw.results ?? [];
        setCursor(raw.nextCursor)

        // Normalize, exclude *plain* pending (unreviewed) from history
        const allowed = ["approved", "rejected", "pending-approve", "pending-reject"];
        const arr: ReviewHistoryItem[] = rows
          .filter((d: Record<string, unknown>) => allowed.includes(d.status as string))
          .map((d: Record<string, unknown>) => ({
            id: (d.id ?? d._id ?? crypto.randomUUID()) as string,
            title: (d.title ?? d.product_title ?? "(Untitled)") as string,
            manufacturer: (d.manufacturer ?? "") as string,
            image_url: (d.image_url ?? d.thumbnail_url ?? "") as string,
            status:
              d.status === "approved"
                ? "accepted"
                : d.status === "rejected"
                ? "rejected"
                : (d.status as string), // keeps pending-approve / pending-reject
            created_at: (d.reviewed_at ?? d.created_at ?? d.updated_at ?? null) as string | null,
            confidence_score: (d.confidence_score ?? 0) as number,
            rejection_comment: (d.rejection_comment ?? "") as string,
            reviewed_by: d.reviewed_by ?? null,
          }));

        setReviewHistory(arr);
      } catch (err: unknown) {
        console.error("[ReviewHistoryPage] Failed to fetch review history:", err);
        setError(err instanceof Error ? err.message : "An error occurred");
        setReviewHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewHistory();
  }, [filter]); // Re-run when the filter changes

    // Load list of users for the admin dropdown
  useEffect(() => {
    const role = session?.user?.role?.toUpperCase();
    if (role !== "ADMIN") return;

    const fetchUsers = async () => {
      try {
        const res = await fetch("/api/users", { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = await res.json();

        // data comes from your /api/users GET: { id, name, email, role, created_at }
        const opts: ReviewerOption[] = data.map((u: any) => ({
          id: u.id,
          name: u.name,
          email: u.email,
        }));

        setReviewers(opts);
      } catch (e) {
        console.error("[ReviewHistoryPage] Failed to load users:", e);
      }
    };

    fetchUsers();
  }, [session]);
  

  async function loadMore() {
    if (!cursor) return;
    setLoadingMore(true);
  
    try {
      const qp = new URLSearchParams();
  
      // same status mapping as in useEffect
      const statusForApi =
        filter === "accepted"
          ? "approved"
          : filter === "rejected"
          ? "rejected"
          : filter === "pending-approve"
          ? "pending-approve"
          : filter === "pending-reject"
          ? "pending-reject"
          : null;
  
      if (statusForApi) qp.set("status", statusForApi);
      qp.set("sort", "newest");
  
      qp.set("cursor", JSON.stringify(cursor));
  
      const res = await fetch(`/api/products?${qp.toString()}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const data = await res.json();
      const rows = Array.isArray(data) ? data : data.results ?? [];
  
      const allowed = ["approved", "rejected", "pending-approve", "pending-reject"];
      const more: ReviewHistoryItem[] = rows
        .filter((d: Record<string, unknown>) => allowed.includes(d.status as string))
        .map((d: Record<string, unknown>) => ({
          id: (d.id ?? d._id ?? crypto.randomUUID()) as string,
          title: (d.title ?? d.product_title ?? "(Untitled)") as string,
          manufacturer: (d.manufacturer ?? "") as string,
          image_url: (d.image_url ?? d.thumbnail_url ?? "") as string,
          status:
            d.status === "approved"
              ? "accepted"
              : d.status === "rejected"
              ? "rejected"
              : (d.status as string),
          created_at: (d.reviewed_at ?? d.created_at ?? d.updated_at ?? null) as string | null,
          confidence_score: (d.confidence_score ?? 0) as number,
          rejection_comment: (d.rejection_comment ?? "") as string,
        }));
  
      setReviewHistory((prev) => [...prev, ...more]);
      setCursor(data.nextCursor);
    } catch (err) {
      console.error("[ReviewHistoryPage] Failed to load more:", err);
      setError(err instanceof Error ? err.message : "An error occurred");
    } finally {
      setLoadingMore(false);
    }
  }
  

  // Background scroll parallax
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  const role = session?.user?.role?.toUpperCase();
  const userEmail = session?.user?.email ?? null;
  // const isAdmin = role === "ADMIN";

  // First: status filter (pending-approve / pending-reject / accepted / rejected)
  const statusFiltered =
    filter === "all"
      ? reviewHistory
      : reviewHistory.filter((r) => r.status === filter);

  // Second: user filter
  const visible = statusFiltered.filter((r) => {
    // If we don't know who the user is yet, just show everything to avoid flashing empty
    if (!userEmail) return true;

    // Admin: filter by selectedReviewer dropdown
    if (isAdmin) {
      if (selectedReviewer === "ALL") return true;
      return r.reviewed_by === selectedReviewer;
    }

    // Generic reviewer: only show their own reviews
    return r.reviewed_by === userEmail;
  });


  // Pretty label for buttons
  const pretty = (s: FilterType) =>
    s === "all" ? "All" : s.split("_").map(w => w[0].toUpperCase() + w.slice(1)).join(" ");

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
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

      {/* Glows */}
      <div
        className="pointer-events-none absolute right-0 top-0 h-96 w-96 blur-3xl"
        style={{ backgroundColor: "rgba(220,38,38,0.10)" }}
      />
      <div
        className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 blur-3xl"
        style={{ backgroundColor: "rgba(220,38,38,0.05)" }}
      />

      {/* Header */}
      <div className="relative mx-auto w-full max-w-6xl px-6 pt-10">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse bg-red-600" />
            <span className="font-mono text-sm uppercase tracking-wider text-red-600">
              Review History
            </span>
          </div>
          <div className="h-px flex-1 bg-red-900" />
        </div>

        <div className="mb-8">
          <div className="mb-3 font-mono text-sm uppercase tracking-widest text-red-600">
            Capstone Project 2025
          </div>
          <h1 className="mb-4 text-5xl font-black leading-none tracking-tighter md:text-6xl">
            Review <span className="text-red-600">History</span>
          </h1>
          {/* if user is an admin show "displaying approvals and rejections for ___ user"
          the ___ should be a drop down menu where the admin can select what user they want to show for 

          if the user is an generic reviewer then it should only display what they have approved/rejected */}
          <div className="mb-6 flex flex-wrap items-center gap-4">
            <div className="h-1 w-20 bg-red-600" />
            {isAdmin ? (
              <div className="flex flex-wrap items-center gap-2 text-sm text-gray-400">
                <span className="font-mono uppercase tracking-widest">
                  Displaying approvals and rejections for
                </span>
                <select
                  value={selectedReviewer}
                  onChange={(e) => setSelectedReviewer(e.target.value)}
                  className="rounded-md border border-red-900 bg-zinc-950 px-3 py-1 text-xs font-mono uppercase tracking-widest text-gray-100 focus:outline-none focus:ring-2 focus:ring-red-600"
                >
                  <option value="ALL">All reviewers</option>
                  {reviewers.map((u) => (
                    <option key={u.id} value={u.email}>
                      {u.name || u.email}
                    </option>
                  ))}
                </select>
              </div>
            ) : (
              <p className="font-mono text-sm uppercase tracking-widest text-gray-400">
                Your past approvals and rejections
              </p>
            )}
          </div>
        </div>

        {/* Filters (now includes pending_* buttons) */}
        <div className="mb-10 flex flex-wrap gap-3">
          {(["pending-approve", "pending-reject", "accepted", "rejected"] as FilterType[]).map((f) => (
            <button
              key={f}
              onClick={() => setFilter(f)}

              className={`inline-flex items-center gap-2 rounded-md border-2 px-4 py-2 font-mono text-sm uppercase transition-all duration-200 ${
                filter === f
                  ? "border-red-600 bg-red-600 text-white"
                  : "border-red-900/50 bg-zinc-950 text-gray-300 hover:border-red-600"
              }`}
            >
              <Filter className="h-4 w-4" />
              {pretty(f)}
            </button>
          ))}
        </div> 

        {/* Review list */}
        <div className="grid grid-cols-1 gap-6 pb-20">
          {loading && (
            <div className="flex items-center gap-2 text-gray-400">
              <Clock className="h-4 w-4 animate-spin" />
              <span className="font-mono text-sm uppercase">Loading…</span>
            </div>
          )}

          {!loading && error && (
            <p className="my-4 text-sm text-red-400">{error}</p>
          )}

          {!loading && !error && visible.map((r) => {
            const canOpenAdminTerminal =
              isAdmin && (r.status === "pending-approve" || r.status === "pending-reject");

            return (
              <div
                key={r.id}
                onClick={
                  canOpenAdminTerminal
                    ? () =>
                        router.push(
                          `/admin-review?id=${encodeURIComponent(
                            String(r.id)
                          )}&back=${encodeURIComponent("/review_history")}`
                        )
                    : undefined
                }
                className={`flex items-center justify-between rounded-xl border-2 border-red-900/50 bg-zinc-950 p-4 transition-all ${
                  canOpenAdminTerminal ? "cursor-pointer hover:border-red-600" : ""
                }`}
              >
                <div className="flex items-center gap-4 flex-1">
                  <img
                    src={r.image_url}
                    alt={r.title}
                    className="h-20 w-20 rounded-lg border border-red-900/30 object-contain bg-zinc-900"
                  />
                  <div className="flex-1">
                    <div className="text-lg font-black">{r.title}</div>
                    <div className="text-sm text-gray-400">{r.manufacturer}</div>
                    <div className="text-xs text-gray-500">
                      Reviewed {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                    </div>
                    <div className="text-xs text-gray-500">
                      reviewed by {r.reviewed_by ?? "—"}
                    </div>
                    {(r.status === "rejected" || r.status === "pending-reject") &&
                      r.rejection_comment && (
                        <div className="mt-2 rounded-md border border-red-900/40 bg-red-950/30 p-2">
                          <div className="text-xs font-semibold text-red-400 mb-1">
                            Rejection Reason:
                          </div>
                          <div className="text-xs text-gray-300">
                            {r.rejection_comment}
                          </div>
                        </div>
                      )}
                  </div>
                </div>

                <div
                  className={`inline-flex items-center gap-2 rounded-md px-3 py-1 font-mono text-sm border ${
                    r.status === "accepted" || r.status === "pending-approve"
                      ? "bg-green-600/20 text-green-400 border-green-700"
                      : "bg-red-600/20 text-red-400 border-red-700"
                  }`}
                >
                  {r.status === "accepted" || r.status === "pending-approve" ? (
                    <CheckCircle2 className="h-4 w-4" />
                  ) : (
                    <XCircle className="h-4 w-4" />
                  )}
                  {r.status.toUpperCase()}
                </div>
              </div>
            );
          })}

        </div>
      </div>

      <div className="flex justify-center py-6">
        <button onClick={loadMore} disabled={!cursor || loadingMore}
        className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#4C0F0F] bg-[#6B0F1A] px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-[#4C0F0F] disabled:opacity-50">
          Show More
        </button>
      </div>

      {/* Footer */}
      <div className="relative border-t-2 border-red-900 px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="font-mono text-sm text-gray-500">
            © {new Date().getFullYear()} Capstone Group 2 • Review History
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
            <span className="font-mono text-sm uppercase text-gray-500">
              Synced
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
