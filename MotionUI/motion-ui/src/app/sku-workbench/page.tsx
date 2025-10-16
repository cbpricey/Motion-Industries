"use client";

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
  const searchParams = useSearchParams();

  // Read ALL possible filters from URL
  const mode = searchParams.get("mode") ?? undefined;
  const manufacturer = searchParams.get("manufacturer") ?? undefined;
  const selectedSkuParam = searchParams.get("sku_number") ?? searchParams.get("sku") ?? "All";
  const skuPrefix = searchParams.get("sku_prefix") ?? undefined;
  const minConfidence = searchParams.get("min_confidence") ?? undefined;
  const status = searchParams.get("status") ?? undefined; // "pending" | "approved" | "rejected"
  const sort = searchParams.get("sort") ?? undefined;     // "relevance" | "confidence_desc" | "newest" | "oldest"
  const from = searchParams.get("from") ?? undefined;
  const to = searchParams.get("to") ?? undefined;

  const [selectedSku, setSelectedSku] = useState<string>(selectedSkuParam);
  const [pending, setPending] = useState<Item[]>([]);
  const [approved, setApproved] = useState<Item[]>([]);
  const [rejected, setRejected] = useState<Item[]>([]);
  const [scrollY, setScrollY] = useState(0);

  // Modal state
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false);
  const [itemToReject, setItemToReject] = useState<Item | null>(null);

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

  // Fetch with ALL filters
  useEffect(() => {
    async function fetchProducts() {
      try {
        const qp = new URLSearchParams();

        // Primary filters from URL/state
        if (manufacturer) qp.set("manufacturer", manufacturer);
        if (selectedSku && selectedSku !== "All") qp.set("sku_number", selectedSku);
        if (skuPrefix) qp.set("sku_prefix", skuPrefix);
        if (minConfidence) qp.set("min_confidence", minConfidence);

        // Shared
        if (status) qp.set("status", status);
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
    // re-run if URL params change (Next refreshes searchParams on nav)
  }, [manufacturer, selectedSku, skuPrefix, minConfidence, status, sort, from, to]);

  async function handleApprove(item: Item) {
    console.log("[SKU Workbench] handleApprove", {
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
        console.error("Failed to update status:", await res.text());
        return; // don’t modify UI state if update failed
      }

      setApproved((prev) => [...prev, item]);
      setPending((prev) => prev.filter((r) => r !== item));
  } catch (e) {
    console.error("Error updating product status:", e);
  }
  setApproved((p) => [...p, item]);
  setPending((p) => p.filter((r) => r !== item));
}

  async function handleReject(item: Item) {
    setItemToReject(item); // Set the item to reject
    setIsRejectModalOpen(true); // Open the modal
  }

  async function confirmReject() {
    if (!itemToReject) return;

    console.log("[SKU Workbench] handleReject", {
      sku: (itemToReject as any).sku_number ?? (itemToReject as any).sku,
      img: (itemToReject as any).image_url,
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
        console.error("Failed to update status:", await res.text());
        return; // don’t modify UI state if update failed
      }

      setRejected((prev) => [...prev, itemToReject]);
      setPending((prev) => prev.filter((r) => r !== itemToReject));
    } catch (err) {
      console.error("Error updating product status:", err);
    } finally {
      setIsRejectModalOpen(false); // Close the modal
      setItemToReject(null); // Clear the item to reject
    }
  }

  function cancelReject() {
    setIsRejectModalOpen(false); // Close the modal
    setItemToReject(null); // Clear the item to reject
  }

  // Local filter by selectedSku (for dropdown switching)
  const bySku =
    selectedSku === "All"
      ? pending
      : pending.filter(
          (r) => (r as any).sku_number === selectedSku || (r as any).sku === selectedSku
        );
  const total = bySku.length;

  useEffect(() => {
    console.log("[SKU Workbench] mounted with params:", {
      mode, manufacturer, selectedSku, skuPrefix, minConfidence, status, sort, from, to,
    });
  }, []); // once

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
                if (status) qp.set("status", status);
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

          <div className="grid grid-cols-3 gap-4 md:col-span-2">
            <div className="rounded-lg border-2 border-red-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-red-600">{total}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Visible Items</div>
            </div>
            <div className="rounded-lg border-2 border-red-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-white">{approved.length}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Approved</div>
            </div>
            <div className="rounded-lg border-2 border-red-900/30 bg-zinc-900/50 p-4">
              <div className="text-2xl font-black text-white">{rejected.length}</div>
              <div className="text-xs font-bold uppercase tracking-wide text-gray-400">Rejected</div>
            </div>
          </div>
        </div>
      </div>

      {/* Grid */}
      <div className="relative px-6 pb-24">
        <div className="mx-auto w-full max-w-6xl">
          <PendingGrid items={bySku} onApprove={handleApprove} onReject={handleReject} title="Pending Review" />
        </div>
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
