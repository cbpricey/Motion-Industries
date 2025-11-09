"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ReviewCardProps } from "../../components/ReviewCard";
import { Filter, CheckCircle2, XCircle } from "lucide-react";
import ProductTile from "../../components/ProductTile";

type Item =
  | (ReviewCardProps & { sku_number?: string; id?: number | string })
  | (ReviewCardProps & { sku?: string; id?: number | string });

/* ───────────────────────── Grid ───────────────────────── */

function PendingGrid({
  items,
  onApprove,
  onReject,
  title = "Pending Review",
}: {
  items: Item[];
  onApprove: (item: Item) => void;
  onReject: (item: Item) => void;
  title?: string;
}) {
  return (
    <section className="w-full">
      <div className="mb-6 flex items-center gap-4">
        <div className="h-4 w-4 rotate-45 bg-red-600" />
        <h2 className="text-2xl font-black uppercase tracking-wider">{title}</h2>
        <div className="h-px flex-1 bg-red-900" />
      </div>

      {items.length === 0 ? (
        <p className="my-8 text-center text-sm text-gray-400">No results for this filter.</p>
      ) : (
        <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {items.map((item, idx) => (
            <ProductTile<Item>
              key={item.id}
              item={item}
              onApprove={onApprove}
              onReject={onReject}
            />
          ))}
        </div>
      )}
    </section>
  );
}

/* ─────────────────────── SKU Workbench Page ─────────────────────── */

export default function SkuWorkbench() {
  // ALL HOOKS MUST BE AT THE TOP - BEFORE ANY CONDITIONAL RETURNS
  const { data: session, status: authStatus } = useSession();
  const searchParams = useSearchParams();

  // Read ALL possible filters from URL
  const mode = searchParams.get("mode") ?? undefined;
  const manufacturer = searchParams.get("manufacturer") ?? undefined;
  const selectedSkuParam = searchParams.get("sku_number") ?? searchParams.get("sku") ?? "All";
  const skuPrefix = searchParams.get("sku_prefix") ?? undefined;
  const minConfidence = searchParams.get("min_confidence") ?? undefined;
  const statusFilter = searchParams.get("status") ?? undefined;
  const sort = searchParams.get("sort") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const [selectedSku, setSelectedSku] = useState<string>(selectedSkuParam);
  const [pending, setPending] = useState<Item[]>([]);
  const [approved, setApproved] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<Item[]>([]);
  const [pendingApproved, setPendingApproved] = useState<Item[]>([]);
  const [pendingRejected, setPendingRejected] = useState<Item[]>([]);
  const [pendingAccept, setPendingAccept] = useState<Item[]>([]);
  const [pendingRejectedDB, setPendingRejectedDB] = useState<Item[]>([]);
  const [scrollY, setScrollY] = useState(0);

  // Modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [itemToReject, setItemToReject] = useState<Item | null>(null);

  const userRole = session?.user?.role;
  const isAdmin = userRole === "admin";

  // Debug: Log user role on mount and when session changes
  useEffect(() => {
    console.log("[SKU Workbench] User Role:", userRole, "| isAdmin:", isAdmin);
  }, [userRole, isAdmin]);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Build SKU dropdown options from current pending list
  const skuOptions = useMemo(
    () =>
      Array.from(
        new Set(
          pending.map((r) => (r as any).sku_number ?? (r as any).sku).filter(Boolean)
        )
      ).sort(),
    [pending]
  );

  // Fetch with ALL filters - only when authenticated
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    async function fetchProducts() {
      try {
        const qp = new URLSearchParams();

        // Primary filters from URL/state
        if (manufacturer) qp.set("manufacturer", manufacturer);
        if (selectedSku && selectedSku !== "All") qp.set("sku_number", selectedSku);
        if (skuPrefix) qp.set("sku_prefix", skuPrefix);
        if (minConfidence) qp.set("min_confidence", minConfidence);

        // Shared
        if (statusFilter) qp.set("status", statusFilter);
        if (sort) qp.set("sort", sort);
        if (from) qp.set("from", from);
        if (to) qp.set("to", to);

        const url = `/api/products${qp.toString() ? `?${qp.toString()}` : ""}`;
        console.log("[SKU Workbench] fetch:", url);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Item[];
        console.log("[SKU Workbench] results:", data.length);
        setPending(data);
      } catch (e) {
        console.error("[SKU Workbench] Failed to fetch products:", e);
        setPending([]);
      }
    }
    fetchProducts();
  }, [authStatus, manufacturer, selectedSku, skuPrefix, minConfidence, statusFilter, sort, from, to]);

  // Fetch pending_accept items
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    async function fetchPendingAccept() {
      try {
        const qp = new URLSearchParams();
        qp.set("status", "pending_accept");

        const url = `/api/products?${qp.toString()}`;
        console.log("[SKU Workbench] fetch pending_accept:", url);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Item[];
        console.log("[SKU Workbench] pending_accept results:", data.length);
        setPendingAccept(data);
      } catch (e) {
        console.error("[SKU Workbench] Failed to fetch pending_accept:", e);
        setPendingAccept([]);
      }
    }
    fetchPendingAccept();
  }, [authStatus]);

  // Fetch pending_rejected items
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    async function fetchPendingRejected() {
      try {
        const qp = new URLSearchParams();
        qp.set("status", "pending_rejected");

        const url = `/api/products?${qp.toString()}`;
        console.log("[SKU Workbench] fetch pending_rejected:", url);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const data = (await res.json()) as Item[];
        console.log("[SKU Workbench] pending_rejected results:", data.length);
        setPendingRejectedDB(data);
      } catch (e) {
        console.error("[SKU Workbench] Failed to fetch pending_rejected:", e);
        setPendingRejectedDB([]);
      }
    }
    fetchPendingRejected();
  }, [authStatus]);

  useEffect(() => {
    console.log("[SKU Workbench] mounted with params:", {
      mode, manufacturer, selectedSku, skuPrefix, minConfidence, statusFilter, sort, from, to,
    });
  }, []);

  // Local filter by selectedSku (for dropdown switching)
  const bySku =
    selectedSku === "All"
      ? pending
      : pending.filter(
          (r) => (r as any).sku_number === selectedSku || (r as any).sku === selectedSku
        );
  const total = bySku.length;

  // HANDLER FUNCTIONS
  async function handleApprove(item: Item) {
    console.log("[SKU Workbench] handleApprove", {
      sku: (item as any).sku_number ?? (item as any).sku,
      img: (item as any).image_url,
      isAdmin,
    });

    try {
      const res = await fetch(`/api/products/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });

      if (!res.ok) {
        console.error("Failed to update status:", await res.text());
        return;
      }

      const { status: newStatus } = await res.json();

      // update local state visually
      if (newStatus === "pending-approve") {
        setPendingApproved((prev) => [...prev, item]);
      } else if (newStatus === "approved") {
        setApproved((prev) => [...prev, item]);
      }

      setPending((prev) => prev.filter((r) => r !== item));
    } catch (e) {
      console.error("Error updating product status:", e);
    }
  }

  async function confirmApprove(item: Item) {
    // This is only called for non-admins who need confirmation
    if (userRole !== "admin") {
      alert("Only administrators can finalize approvals.");
      return;
    }

    console.log("[SKU Workbench] confirmApprove", {
      sku: (item as any).sku_number ?? (item as any).sku,
      img: (item as any).image_url,
    });
    try {
      const res = await fetch(`/api/products/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "approved",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 403) {
          alert("Access denied: Admin privileges required");
        } else {
          console.error("Failed to update status:", errorText);
        }
        return;
      }

      setApproved((prev) => [...prev, item]);
      setPendingAccept((prev) => prev.filter((r) => r !== item));
    } catch (e) {
      console.error("Error updating product status:", e);
      alert("An error occurred while approving the item");
    }
  }

  async function handleReject(item: Item) {
    console.log("[SKU Workbench] handleReject", {
      sku: (item as any).sku_number ?? (item as any).sku,
      img: (item as any).image_url,
    });

    try {
      const res = await fetch(`/api/products/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "rejected" }),
      });

      if (!res.ok) {
        console.error("Failed to update status:", await res.text());
        return;
      }

      const { status: newStatus } = await res.json();

      if (newStatus === "pending-reject") {
        setPendingRejected((prev) => [...prev, item]);
      } else if (newStatus === "rejected") {
        setRejected((prev) => [...prev, item]);
      }

      setPending((prev) => prev.filter((r) => r !== item));
    } catch (e) {
      console.error("Error updating product status:", e);
    }
  }

  async function handlePendingReject(item: Item) {
    setItemToReject(item);
    setIsRejectModalOpen(true);
  }

  async function confirmReject() {
    if (!itemToReject) return;

    // Check if this is from pending list or direct admin action
    const isFromPending = pendingRejectedDB.includes(itemToReject);
    
    // If from pending, check admin privilege
    if (isFromPending && userRole !== "admin") {
      alert("Only administrators can finalize rejections.");
      setIsRejectModalOpen(false);
      setItemToReject(null);
      return;
    }

    console.log("[SKU Workbench] confirmReject", {
      sku: (itemToReject as any).sku_number ?? (itemToReject as any).sku,
      img: (itemToReject as any).image_url,
      isAdmin,
      isFromPending,
    });
    
    try {
      const res = await fetch(`/api/products/${itemToReject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        if (res.status === 403) {
          alert("Access denied: Admin privileges required");
        } else {
          console.error("Failed to update status:", errorText);
        }
        return;
      }

      // Move to rejected from either pending or pendingRejectedDB
      setRejected((prev) => [...prev, itemToReject]);

      if (isFromPending) {
        setPendingRejectedDB((prev) => prev.filter((r) => r !== itemToReject));
      } else {
        setPending((prev) => prev.filter((r) => r !== itemToReject));
      }
    } catch (err) {
      console.error("Error updating product status:", err);
      alert("An error occurred while rejecting the item");
    } finally {
      setIsRejectModalOpen(false);
      setItemToReject(null);
    }
  }

  function cancelReject() {
    setIsRejectModalOpen(false);
    setItemToReject(null);
  }

  // NOW CHECK AUTH STATUS - AFTER ALL HOOKS
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

  if (!session) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <h2 className="text-2xl font-bold mb-4">Authentication Required</h2>
          <p className="text-gray-400 mb-6">Please sign in to access the SKU Workbench</p>
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

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      {/* Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-zinc-900 p-6 text-center">
            <h2 className="mb-4 text-xl font-bold text-red-500">Are you sure?</h2>
            <p className="mb-6 text-gray-300">Do you really want to reject this item? This action cannot be undone.</p>
            <div className="flex justify-center gap-4">
              <button
                onClick={confirmReject}
                className="rounded-md bg-red-600 px-4 py-2 text-sm font-bold text-white hover:bg-red-700"
              >
                Yes, Reject
              </button>
              <button
                onClick={cancelReject}
                className="rounded-md bg-gray-600 px-4 py-2 text-sm font-bold text-white hover:bg-gray-700"
              >
                Cancel
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
              SKU Workbench
            </span>
          </div>
          <div className="h-px flex-1 bg-red-900" />
          {/* Show user role badge */}
          <div className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
            isAdmin 
              ? "bg-red-600 text-white" 
              : "bg-gray-700 text-gray-300"
          }`}>
            {userRole || "reviewer"}
          </div>
        </div>

        <div className="mb-8">
          <div className="mb-3 font-mono text-sm uppercase tracking-widest text-red-600">
            Capstone Project 2025
          </div>
          <h1 className="mb-4 text-5xl font-black leading-none tracking-tighter md:text-6xl">
            Image Review <span className="text-red-600">Workbench</span>
          </h1>
          <div className="mb-6 flex items-center gap-4">
            <div className="h-1 w-20 bg-red-600" />
            <p className="font-mono text-sm uppercase tracking-widest text-gray-400">
              Approve / Reject • Elastic Filters
              {isAdmin && <span className="ml-2 text-red-500">• Admin Mode: Direct Actions</span>}
            </p>
          </div>

          {/* Mini filter summary */}
          <div className="rounded-lg border-2 border-red-900/50 bg-zinc-950 p-4 text-xs text-gray-400 font-mono">
            <div className="text-red-400 mb-1">/api/products?…</div>
            <code className="break-all">
              {(() => {
                const qp = new URLSearchParams();
                if (manufacturer) qp.set("manufacturer", manufacturer);
                if (selectedSku !== "All") qp.set("sku_number", selectedSku);
                if (skuPrefix) qp.set("sku_prefix", skuPrefix);
                if (minConfidence) qp.set("min_confidence", minConfidence);
                if (statusFilter) qp.set("status", statusFilter);
                if (sort) qp.set("sort", sort);
                if (from) qp.set("from", from);
                if (to) qp.set("to", to);
                return qp.toString() || "(no filters)";
              })()}
            </code>
          </div>
        </div>

        {/* Controls + quick stats */}
        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-3">
          <div className="flex items-center gap-3 rounded-lg border-2 border-red-900/50 bg-zinc-950 p-4">
            <Filter className="h-5 w-5 text-red-500" />
            <div className="flex flex-wrap items-center gap-2">
              <label htmlFor="SKUFilter" className="text-xs font-black uppercase tracking-wider text-gray-300">
                Filter by SKU
              </label>
              <select
                id="SKUFilter"
                value={selectedSku}
                onChange={(e) => setSelectedSku(e.target.value)}
                className="rounded-md border-2 border-red-900/50 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-red-600"
              >
                <option value="All">All</option>
                {skuOptions.map((sku) => (
                  <option key={sku} value={sku}>
                    {sku}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="grid grid-cols-5 gap-4 md:col-span-2">
            <div className="rounded-lg border-2 border-red-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-red-600">{total}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Pending Review</div>
            </div>
            <div className="rounded-lg border-2 border-blue-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-blue-400">{pendingAccept.length}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Pending Accept</div>
            </div>
            <div className="rounded-lg border-2 border-orange-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-orange-500">{pendingRejectedDB.length}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Pending Rejected</div>
            </div>
            <div className="rounded-lg border-2 border-green-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-green-500">{approved.length}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Approved</div>
            </div>
            <div className="rounded-lg border-2 border-red-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-red-500">{rejected.length}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Rejected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="relative px-6 pb-24 space-y-12">
        <div className="mx-auto w-full max-w-6xl">
          <PendingGrid items={bySku} onApprove={handleApprove} onReject={handleReject} title="Pending Review" />
        </div>

        {/* Pending Accept Section - Only show if there are items */}
        {pendingAccept.length > 0 && (
          <div className="mx-auto w-full max-w-6xl">
            <section className="w-full">
              <div className="mb-6 flex items-center gap-4">
                <div className="h-4 w-4 rotate-45 bg-blue-500" />
                <h2 className="text-2xl font-black uppercase tracking-wider">Pending Accept</h2>
                <div className="h-px flex-1 bg-blue-900" />
                {isAdmin && <span className="text-xs text-blue-400 font-mono">Admin: Review for final approval</span>}
              </div>
              <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pendingAccept.map((item) => (
                  <ProductTile<Item>
                    key={item.id}
                    item={item}
                    onApprove={isAdmin ? confirmApprove : handleApprove}
                    onReject={isAdmin ? handleReject : () => {}}
                  />
                ))}
              </div>
            </section>
          </div>
        )}

        {/* Pending Rejected Section - Only show if there are items */}
        {pendingRejectedDB.length > 0 && (
          <div className="mx-auto w-full max-w-6xl">
            <section className="w-full">
              <div className="mb-6 flex items-center gap-4">
                <div className="h-4 w-4 rotate-45 bg-orange-500" />
                <h2 className="text-2xl font-black uppercase tracking-wider">Pending Rejected</h2>
                <div className="h-px flex-1 bg-orange-900" />
                {isAdmin && <span className="text-xs text-orange-400 font-mono">Admin: Review for final rejection</span>}
              </div>
              <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pendingRejectedDB.map((item) => (
                  <ProductTile<Item>
                    key={item.id}
                    item={item}
                    onApprove={isAdmin ? confirmApprove : () => {}}
                    onReject={isAdmin ? handlePendingReject : handleReject}
                  />
                ))}
              </div>
            </section>
          </div>
        )}
      </div>

      {/* Footer */}
      <div className="relative border-t-2 border-red-900 px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="font-mono text-sm text-gray-500">
            © {new Date().getFullYear()} Capstone Group 2 • {total} result{total === 1 ? "" : "s"}
            {selectedSku !== "All" ? ` • sku_number: ${selectedSku}` : ""}
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
