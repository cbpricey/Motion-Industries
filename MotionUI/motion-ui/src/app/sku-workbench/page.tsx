"use client";

import { useSession, signIn } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";
import { useSearchParams, useRouter } from "next/navigation";
import type { ReviewCardProps } from "../../components/ReviewCard";
import { Filter, CheckCircle2, XCircle } from "lucide-react";
import ProductTile from "../../components/ProductTile";

type Item = ReviewCardProps & {
  sku_number?: string;
  sku?: string;
  id?: number | string;
};

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
        <h2 className="text-2xl font-black uppercase tracking-wider">
          {title}
        </h2>
        <div className="h-px flex-1 bg-red-900" />
      </div>

      {items.length === 0 ? (
        <p className="my-8 text-center text-sm text-gray-400">
          No results for this filter.
        </p>
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
  const router = useRouter();

  // Read ALL possible filters from URL
  const mode = searchParams.get("mode") ?? undefined;
  const manufacturer = searchParams.get("manufacturer") ?? undefined;
  const selectedSkuParam =
    searchParams.get("sku_number") ?? searchParams.get("sku") ?? "All";
  const skuPrefix = searchParams.get("sku_prefix") ?? undefined;
  const minConfidence = searchParams.get("min_confidence") ?? undefined;
  const statusFilter = searchParams.get("status") ?? undefined;
  const sort = searchParams.get("sort") ?? undefined;
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  // search_after cursor
  const [cursor, setCursor] = useState(null);
  const [loadingMore, setLoadingMore] = useState(false);

  const [selectedSku, setSelectedSku] = useState<string>(selectedSkuParam);
  const [pending, setPending] = useState<Item[]>([]);
  const [approved, setApproved] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<Item[]>([]);
  const [pendingApproval, setPendingApproval] = useState<Item[]>([]);
  const [pendingRejection, setPendingRejection] = useState<Item[]>([]);
  const [scrollY, setScrollY] = useState(0);

  // Modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [itemToReject, setItemToReject] = useState<Item | null>(null);
  const [rejectionComment, setRejectionComment] = useState("");

  const userRole = session?.user?.role;
  const isAdmin = userRole === "ADMIN";

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
        new Set(pending.map((r) => r.sku_number ?? r.sku).filter(Boolean))
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
        if (selectedSku && selectedSku !== "All")
          qp.set("sku_number", selectedSku);
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
        const resJson = await res.json();
        const data = Array.isArray(resJson.results) ? resJson.results : [];
        setCursor(resJson.nextCursor);
        console.log("[SKU Workbench] results:", data.length);
        setPending(data);
      } catch (e) {
        console.error("[SKU Workbench] Failed to fetch products:", e);
        setPending([]);
      }
    }
    fetchProducts();
  }, [
    authStatus,
    manufacturer,
    selectedSku,
    skuPrefix,
    minConfidence,
    statusFilter,
    sort,
    from,
    to,
  ]);

  // Fetch pending-approve items
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    async function fetchPendingApproval() {
      try {
        const qp = new URLSearchParams();
        qp.set("status", "pending-approve");

        const url = `/api/products?${qp.toString()}`;
        console.log("[SKU Workbench] fetch pending-approve:", url);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data = Array.isArray(json.results) ? json.results : [];
        console.log("[SKU Workbench] pending-approve results:", data.length);
        setPendingApproval(data);
      } catch (e) {
        console.error("[SKU Workbench] Failed to fetch pending-approve:", e);
        setPendingApproval([]);
      }
    }
    fetchPendingApproval();
  }, [authStatus]);

  // Fetch pending-reject items
  useEffect(() => {
    if (authStatus !== "authenticated") return;

    async function fetchPendingRejection() {
      try {
        const qp = new URLSearchParams();
        qp.set("status", "pending-reject");

        const url = `/api/products?${qp.toString()}`;
        console.log("[SKU Workbench] fetch pending-reject:", url);
        const res = await fetch(url, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const json = await res.json();
        const data = Array.isArray(json.results) ? json.results : [];
        console.log("[SKU Workbench] pending-reject results:", data.length);
        setPendingRejection(data);
      } catch (e) {
        console.error("[SKU Workbench] Failed to fetch pending-reject:", e);
        setPendingRejection([]);
      }
    }
    fetchPendingRejection();
  }, [authStatus]);

  useEffect(() => {
    console.log("[SKU Workbench] mounted with params:", {
      mode,
      manufacturer,
      selectedSku,
      skuPrefix,
      minConfidence,
      statusFilter,
      sort,
      from,
      to,
    });
  }, []);

  // Local filter by selectedSku (for dropdown switching)
  const bySku =
    selectedSku === "All"
      ? pending
      : pending.filter(
          (r) => r.sku_number === selectedSku || r.sku === selectedSku
        );
  const total = bySku.length;

  // HANDLER FUNCTIONS
  async function handleApprove(item: Item) {
    console.log("[SKU Workbench] handleApprove", {
      sku: item.sku_number ?? item.sku,
      img: item.image_url,
      isAdmin,
    });

    try {
      const res = await fetch(`/api/products/${item.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: "approved" }),
      });
      router.refresh();

      if (!res.ok) {
        console.error("Failed to update status:", await res.text());
        return;
      }

      const { status: newStatus } = await res.json();

      // update local state visually
      if (newStatus === "pending-approve") {
        setPendingApproval((prev) => [...prev, item]);
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
    if (userRole !== "ADMIN") {
      alert("Only administrators can finalize approvals.");
      return;
    }

    console.log("[SKU Workbench] confirmApprove", {
      sku: item.sku_number ?? item.sku,
      img: item.image_url,
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
      setPendingApproval((prev) => prev.filter((r) => r !== item));
    } catch (e) {
      console.error("Error updating product status:", e);
      alert("An error occurred while approving the item");
    }
  }

  async function handleReject(item: Item) {
    console.log("[SKU Workbench] handleReject", {
      sku: item.sku_number ?? item.sku,
      img: item.image_url,
      isAdmin,
    });

    // Show modal for both admin and non-admin to get rejection comment
    setItemToReject(item);
    setIsRejectModalOpen(true);
  }

  async function handlePendingReject(item: Item) {
    setItemToReject(item);
    setIsRejectModalOpen(true);
  }

  async function confirmReject() {
    if (!itemToReject) return;

    console.log("[SKU Workbench] confirmReject", {
      sku: itemToReject.sku_number ?? itemToReject.sku,
      img: itemToReject.image_url,
      comment: rejectionComment,
    });

    try {
      const res = await fetch(`/api/products/${itemToReject.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "rejected",
          rejection_comment: rejectionComment,
        }),
      });

      if (!res.ok) {
        const errorText = await res.text();
        console.error("Failed to update status:", errorText);

        if (res.status === 403) {
          alert("Access denied: Admin privileges required");
        }
        return;
      }

      // Backend decides finalStatus → return { status: "pending-reject" | "rejected" }
      const { status: newStatus } = await res.json();

      if (newStatus === "rejected") {
        // Item fully rejected (admin)
        setRejected((prev) => [...prev, itemToReject]);
        setPendingRejection((prev) =>
          prev.filter((r) => r.id !== itemToReject.id)
        );
        setPending((prev) => prev.filter((r) => r.id !== itemToReject.id));
      } else if (newStatus === "pending-reject") {
        // Reviewer submitted rejection request
        setPendingRejection((prev) => [...prev, itemToReject]);
        setPending((prev) => prev.filter((r) => r.id !== itemToReject.id));
      }
    } catch (err) {
      console.error("Error updating product status:", err);
      alert("An error occurred while rejecting the item");
    } finally {
      setIsRejectModalOpen(false);
      setItemToReject(null);
      setRejectionComment("");
    }
  }

  function cancelReject() {
    setIsRejectModalOpen(false);
    setItemToReject(null);
    setRejectionComment(""); // Clear the comment
  }

  async function loadMore() {
    setLoadingMore(true);

    const qp = new URLSearchParams();
    if (cursor) qp.set("cursor", JSON.stringify(cursor));

    const res = await fetch(`/api/products?${qp.toString()}`);
    const data = await res.json();

    setPending((prev) => [...prev, ...data.results]);
    setCursor(data.nextCursor);
    setLoadingMore(false);
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
          <p className="text-gray-400 mb-6">
            Please sign in to access the SKU Workbench
          </p>
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
          <div className="w-full max-w-md rounded-lg bg-zinc-900 p-6">
            <h2 className="mb-4 text-center text-xl font-bold text-red-500">
              Reject Item
            </h2>
            <p className="mb-4 text-center text-gray-300">
              Do you really want to reject this item?
            </p>

            {/* Comment textarea */}
            <div className="mb-6">
              <label
                htmlFor="rejection-comment"
                className="mb-2 block text-left text-sm font-semibold text-gray-300"
              >
                Reason for rejection (optional):
              </label>
              <textarea
                id="rejection-comment"
                value={rejectionComment}
                onChange={(e) => setRejectionComment(e.target.value)}
                placeholder="Enter reason for rejection..."
                className="w-full rounded-md border border-zinc-700 bg-zinc-800 p-3 text-sm text-white placeholder-gray-500 focus:border-red-500 focus:outline-none focus:ring-2 focus:ring-red-500"
                rows={4}
              />
            </div>

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
              SKU Workbench
            </span>
          </div>
          <div className="h-px flex-1 bg-red-900" />
          {/* Show user role badge */}
          <div
            className={`rounded-full px-3 py-1 text-xs font-bold uppercase ${
              isAdmin ? "bg-red-600 text-white" : "bg-gray-700 text-gray-300"
            }`}
          >
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
              {isAdmin && (
                <span className="ml-2 text-red-500">
                  • Admin Mode: Direct Actions
                </span>
              )}
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
              <label
                htmlFor="SKUFilter"
                className="text-xs font-black uppercase tracking-wider text-gray-300"
              >
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
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Pending Review
              </div>
            </div>
            <div className="rounded-lg border-2 border-blue-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-blue-400">
                {pendingApproval.length}
              </div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Pending Approval
              </div>
            </div>
            <div className="rounded-lg border-2 border-orange-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-orange-500">
                {pendingRejection.length}
              </div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Pending Rejection
              </div>
            </div>
            <div className="rounded-lg border-2 border-green-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-green-500">
                {approved.length}
              </div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Approved
              </div>
            </div>
            <div className="rounded-lg border-2 border-red-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-red-500">
                {rejected.length}
              </div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">
                Rejected
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="relative px-6 pb-24 space-y-12">
        <div className="mx-auto w-full max-w-6xl">
          <PendingGrid
            items={bySku}
            onApprove={handleApprove}
            onReject={handleReject}
            title="Pending Review"
          />
        </div>

        {/* Pending Approve Section - Only show if there are items */}
        {pendingApproval.length > 0 && (
          <div className="mx-auto w-full max-w-6xl">
            <section className="w-full">
              <div className="mb-6 flex items-center gap-4">
                <div className="h-4 w-4 rotate-45 bg-blue-500" />
                <h2 className="text-2xl font-black uppercase tracking-wider">
                  Pending Approval
                </h2>
                <div className="h-px flex-1 bg-blue-900" />
                {isAdmin && (
                  <span className="text-xs text-blue-400 font-mono">
                    Admin: Review for final approval
                  </span>
                )}
              </div>
              <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pendingApproval.map((item) => (
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
        {pendingRejection.length > 0 && (
          <div className="mx-auto w-full max-w-6xl">
            <section className="w-full">
              <div className="mb-6 flex items-center gap-4">
                <div className="h-4 w-4 rotate-45 bg-orange-500" />
                <h2 className="text-2xl font-black uppercase tracking-wider">
                  Pending Rejection
                </h2>
                <div className="h-px flex-1 bg-orange-900" />
                {isAdmin && (
                  <span className="text-xs text-orange-400 font-mono">
                    Admin: Review for final rejection
                  </span>
                )}
              </div>
              <div className="mx-auto grid w-full max-w-6xl grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                {pendingRejection.map((item) => (
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

      <div className="flex justify-center py-6">
        <button
          onClick={loadMore}
          disabled={!cursor || loadingMore}
          className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-[#4C0F0F] bg-[#6B0F1A] px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-[#4C0F0F] disabled:opacity-50"
        >
          Show More
        </button>
      </div>

      {/* Footer */}
      <div className="relative border-t-2 border-red-900 px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="font-mono text-sm text-gray-500">
            © {new Date().getFullYear()} Capstone Group 2 • {total} result
            {total === 1 ? "" : "s"}
            {selectedSku !== "All" ? ` • sku_number: ${selectedSku}` : ""}
          </div>
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse rounded-full bg-green-600" />
            <span className="font-mono text-sm uppercase text-gray-500">
              Online
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
