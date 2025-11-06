"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, History, Filter } from "lucide-react";

/**
 * Review History
 * — Displays accepted/rejected reviews with matching industrial design
 * — Consistent with Home / Catalog Navigator / About
 */

// keep existing types, just extend the filter options
type FilterType = "all" | "pending_approval" | "accepted" | "pending_rejected" | "rejected";

interface ReviewHistoryItem {
  id: number | string;
  title: string;
  manufacturer: string;
  image_url: string;
  // include both pending_* states; exclude plain "pending" from history
  status: "pending_approval" | "accepted" | "pending_rejected" | "rejected";
  created_at?: string;
  confidence_score: number;
}

export default function ReviewHistoryPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [reviewHistory, setReviewHistory] = useState<ReviewHistoryItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [scrollY, setScrollY] = useState(0);

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
            : filter === "pending_approval"
            ? "pending_approval"
            : filter === "pending_rejected"
            ? "pending_rejected"
            : null;

        if (statusForApi) qp.set("status", statusForApi);

        qp.set("sort", "newest"); // Example: Sort by newest

        const url = `/api/products?${qp.toString()}`;
        console.log("[ReviewHistoryPage] fetch:", url);

        const response = await fetch(url, { cache: "no-store" });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);

        const raw = await response.json();
        const rows = Array.isArray(raw) ? raw : raw.items ?? [];

        // Normalize, exclude *plain* pending (unreviewed) from history
        const allowed = ["approved", "rejected", "pending_approval", "pending_rejected"];
        const arr: ReviewHistoryItem[] = rows
          .filter((d: any) => allowed.includes(d.status))
          .map((d: any) => ({
            id: d.id ?? d._id ?? crypto.randomUUID(),
            title: d.title ?? d.product_title ?? "(Untitled)",
            manufacturer: d.manufacturer ?? "",
            image_url: d.image_url ?? d.thumbnail_url ?? "",
            status:
              d.status === "approved"
                ? "accepted"
                : d.status === "rejected"
                ? "rejected"
                : d.status, // keeps pending_approval / pending_rejected
            created_at: d.reviewed_at ?? d.created_at ?? d.updated_at ?? null,
            confidence_score: d.confidence_score ?? 0,
          }));

        setReviewHistory(arr);
      } catch (err: any) {
        console.error("[ReviewHistoryPage] Failed to fetch review history:", err);
        setError(err.message || "An error occurred");
        setReviewHistory([]);
      } finally {
        setLoading(false);
      }
    };

    fetchReviewHistory();
  }, [filter]); // Re-run when the filter changes

  // Background scroll parallax
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Local filter for current view
  const filtered =
    filter === "all" ? reviewHistory : reviewHistory.filter((r) => r.status === filter);

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
          <div className="mb-6 flex items-center gap-4">
            <div className="h-1 w-20 bg-red-600" />
            <p className="font-mono text-sm uppercase tracking-widest text-gray-400">
              Your past approvals and rejections
            </p>
          </div>
        </div>

        {/* Filters (now includes pending_* buttons) */}
        <div className="mb-10 flex flex-wrap gap-3">
          {(["pending_approval", "pending_rejected", "accepted", "rejected"] as FilterType[]).map((f) => (
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

          {!loading && !error && filtered.map((r) => (
            <div
              key={r.id}
              className="flex items-center justify-between rounded-xl border-2 border-red-900/50 bg-zinc-950 p-4 hover:border-red-600 transition-all"
            >
              <div className="flex items-center gap-4">
                <img
                  src={r.image_url}
                  alt={r.title}
                  className="h-20 w-20 rounded-lg border border-red-900/30 object-contain bg-zinc-900"
                />
                <div>
                  <div className="text-lg font-black">{r.title}</div>
                  <div className="text-sm text-gray-400">{r.manufacturer}</div>
                  <div className="text-xs text-gray-500">
                    Reviewed {r.created_at ? new Date(r.created_at).toLocaleString() : "—"}
                  </div>
                </div>
              </div>

              {/* Green for accepted/pending_approval, Red for rejected/pending_rejected */}
              <div
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1 font-mono text-sm border ${
                  r.status === "accepted" || r.status === "pending_approval"
                    ? "bg-green-600/20 text-green-400 border-green-700"
                    : "bg-red-600/20 text-red-400 border-red-700"
                }`}
              >
                {r.status === "accepted" || r.status === "pending_approval" ? (
                  <CheckCircle2 className="h-4 w-4" />
                ) : (
                  <XCircle className="h-4 w-4" />
                )}
                {r.status.toUpperCase()}
              </div>
            </div>
          ))}
        </div>
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
