"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import {
  Factory, Filter, Search, Settings2, GitBranch, PackageSearch, Layers,
  Calendar, ArrowRight, SortAsc, Database
} from "lucide-react";

/**
 * Select Navigator
 * — Landing page to traverse your Elastic-backed catalog before entering the review workbench
 * — Matches Home/Review styling: black bg, red accents, industrial grid, status bar
 */

// Types for form state
type TraversalMode = "manufacturer" | "sku" | "confidence" | "recent";
type ManufacturerOption = string;

export default function SelectNavigatorPage() {
  const router = useRouter();

  // UI state
  const [mode, setMode] = useState<TraversalMode>("manufacturer");
  const [manufacturer, setManufacturer] = useState<ManufacturerOption>("All");
  const [sku, setSku] = useState("");
  const [skuPrefix, setSkuPrefix] = useState("");
  const [minConfidence, setMinConfidence] = useState<number>(0);
  const [status, setStatus] = useState<"any" | "pending" | "approved" | "rejected">("any");
  const [sortBy, setSortBy] = useState<"relevance" | "confidence_desc" | "newest" | "oldest">("relevance");
  const [dateFrom, setDateFrom] = useState<string>("");
  const [dateTo, setDateTo] = useState<string>("");
  const [scrollY, setScrollY] = useState(0);

  // Dynamic manufacturers
  const [manufacturers, setManufacturers] = useState<string[]>(["All"]);
  const [manuLoading, setManuLoading] = useState(false);
  const [manuError, setManuError] = useState<string | null>(null);

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Fetch manufacturers dynamically based on current filters
  useEffect(() => {
    let cancelled = false;

    type FacetBucket = { key: string; doc_count?: number };
    type FacetResponse = { buckets?: FacetBucket[] } | string[];

    async function fetchManufacturers() {
      try {
        setManuError(null);
        setManuLoading(true);

        const qp = new URLSearchParams();
        qp.set("field", "manufacturer");
        if (mode === "recent") {
          if (dateFrom) qp.set("from", dateFrom);
          if (dateTo) qp.set("to", dateTo);
        }
        if (mode === "confidence") qp.set("min_confidence", String(minConfidence));
        if (status && status !== "any") qp.set("status", status);
        if (skuPrefix) qp.set("sku_prefix", skuPrefix);

        const res = await fetch(`/api/facets?${qp.toString()}`, { cache: "no-store" });
        if (!res.ok) throw new Error(`HTTP ${res.status}`);

        const data: FacetResponse = await res.json();

        // Normalize to string[]
        const dynamic: string[] = Array.isArray((data as { buckets?: FacetBucket[] })?.buckets)
          ? ((data as { buckets: FacetBucket[] }).buckets ?? []).map((b) => String(b.key))
          : Array.isArray(data)
          ? (data as string[]).map((s) => String(s))
          : [];

        const uniqueSorted: string[] = Array.from(new Set(dynamic)).sort((a, b) => a.localeCompare(b));
        const next: string[] = ["All", ...uniqueSorted];

        if (!cancelled) {
          setManufacturers(next);
          setManufacturer((prev) => (next.includes(prev) ? prev : "All"));
        }
      } catch (e: unknown) {
        console.error("[Navigator] manufacturer facets failed:", e);
        if (!cancelled) setManuError(e instanceof Error ? e.message : "Failed to load manufacturers");
      } finally {
        if (!cancelled) setManuLoading(false);
      }
    }

    fetchManufacturers();
    return () => {
      cancelled = true;
    };
  }, [mode, dateFrom, dateTo, minConfidence, status, skuPrefix]);

  /* ---------- MISSING HELPERS (added) ---------- */

  function buildQueryParams(): string {
    const qp = new URLSearchParams();

    if (manufacturer && manufacturer !== "All") qp.set("manufacturer", manufacturer);
    if (mode) qp.set("mode", mode);

    if (mode === "sku") {
      if (sku.trim()) qp.set("sku_number", sku.trim());
      if (skuPrefix.trim()) qp.set("sku_prefix", skuPrefix.trim());
    }
    if (mode === "confidence") {
      qp.set("min_confidence", String(minConfidence));
    }
    if (mode === "recent") {
      if (dateFrom) qp.set("from", dateFrom);
      if (dateTo) qp.set("to", dateTo);
    }

    if (status !== "any") qp.set("status", status);
    if (sortBy !== "relevance") qp.set("sort", sortBy);

    return qp.toString();
  }

  function handleStart() {
    const qs = buildQueryParams();
    const url = `/sku-workbench${qs ? `?${qs}` : ""}`;
    console.log("[Navigator] push →", url);
    router.push(url);
  }

  function Stat({ value, label }: { value: string; label: string }) {
    return (
      <div className="rounded-lg border-2 border-red-900/30 bg-zinc-900/50 p-4">
        <div className="text-2xl font-black text-red-600">{value}</div>
        <div className="text-xs font-bold uppercase tracking-wide text-gray-400">{label}</div>
      </div>
    );
  }

  /* -------------------------------------------- */

  // Derived hint
  const hint = useMemo(() => {
    switch (mode) {
      case "manufacturer":
        return manufacturer === "All"
          ? "Browse all manufacturers, then refine in Review."
          : `Browse items from ${manufacturer}.`;
      case "sku":
        return sku
          ? `Open workbench for SKU ${sku}.`
          : skuPrefix
          ? `Browse SKUs starting with ${skuPrefix}.`
          : "Filter by exact SKU or a prefix.";
      case "confidence":
        return `Show items with confidence ≥ ${minConfidence}.`;
      case "recent":
        return dateFrom || dateTo
          ? `Show items between ${dateFrom || "…"} and ${dateTo || "…"}.`
          : "Filter by date range of ingestion.";
    }
  }, [mode, manufacturer, sku, skuPrefix, minConfidence, dateFrom, dateTo]);

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      {/* Industrial grid bg */}
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
      <div className="pointer-events-none absolute right-0 top-0 h-96 w-96 blur-3xl" style={{ backgroundColor: "rgba(220,38,38,0.10)" }} />
      <div className="pointer-events-none absolute bottom-0 left-0 h-96 w-96 blur-3xl" style={{ backgroundColor: "rgba(220,38,38,0.05)" }} />

      {/* Header / Status Bar */}
      <div className="relative mx-auto w-full max-w-6xl px-6 pt-10">
        <div className="mb-6 flex items-center gap-4">
          <div className="flex items-center gap-2">
            <div className="h-2 w-2 animate-pulse bg-red-600" />
            <span className="font-mono text-sm uppercase tracking-wider text-red-600">Navigator</span>
          </div>
          <div className="h-px flex-1 bg-red-900" />
        </div>

        <div className="mb-8">
          <div className="mb-3 font-mono text-sm uppercase tracking-widest text-red-600">Capstone Project 2025</div>
          <h1 className="mb-4 text-5xl font-black leading-none tracking-tighter md:text-6xl">
            Catalog <span className="text-red-600">Navigator</span>
          </h1>
          <div className="mb-6 flex items-center gap-4">
            <div className="h-1 w-20 bg-red-600" />
            <p className="font-mono text-sm uppercase tracking-widest text-gray-400">
              Choose traversal • Build filters • Enter Review
            </p>
          </div>
        </div>

        {/* Mode Cards */}
        <div className="mb-10 grid grid-cols-1 gap-4 md:grid-cols-4">
          {[
            { key: "manufacturer" as TraversalMode, title: "By Manufacturer", icon: <Factory className="h-5 w-5" />, desc: "Pick a vendor, then drill into SKUs in Review." },
            { key: "sku" as TraversalMode, title: "By SKU", icon: <PackageSearch className="h-5 w-5" />, desc: "Jump straight to an exact SKU or prefix." },
            { key: "confidence" as TraversalMode, title: "By Confidence", icon: <Settings2 className="h-5 w-5" />, desc: "Filter items by model confidence score." },
            { key: "recent" as TraversalMode, title: "Recently Added", icon: <Calendar className="h-5 w-5" />, desc: "Browse the latest ingested items." },
          ].map((c) => (
            <button
              key={c.key}
              onClick={() => setMode(c.key)}
              className={`group flex flex-col items-start gap-2 rounded-xl border-2 p-4 text-left transition-all duration-300 ${
                mode === c.key ? "border-red-600 bg-zinc-900" : "border-red-900/50 bg-zinc-950 hover:border-red-600"
              }`}
            >
              <div className="inline-flex items-center gap-2 text-red-500">{c.icon}<GitBranch className="h-4 w-4 opacity-60" /></div>
              <div className="text-lg font-black">{c.title}</div>
              <div className="text-xs text-gray-400">{c.desc}</div>
            </button>
          ))}
        </div>

        {/* Filter Panel */}
        <div className="mb-10 grid grid-cols-1 gap-4 rounded-xl border-2 border-red-900/50 bg-zinc-950 p-6 md:grid-cols-3">
          {/* Column 1: Primary selector */}
          <div className="space-y-4">
            <div className="text-sm font-black uppercase tracking-wider text-gray-300">Primary</div>

            {mode === "manufacturer" && (
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Manufacturer</span>
                <div className="flex items-center gap-2">
                  <Database className="h-4 w-4 text-red-500" />
                  <select
                    value={manufacturer}
                    onChange={(e) => setManufacturer(e.target.value)}
                    disabled={manuLoading}
                    className="w-full rounded-md border-2 border-red-900/50 bg-black px-3 py-2 text-sm text-white outline-none transition disabled:opacity-60 focus:border-red-600"
                  >
                    {manufacturers.map((m) => (
                      <option key={m} value={m}>{m}</option>
                    ))}
                  </select>
                </div>
                <div className="mt-1 h-5 text-xs text-gray-500">
                  {manuLoading ? "Loading manufacturers…" : manuError ? `Error: ${manuError}` : null}
                </div>
              </label>
            )}

            {mode === "sku" && (
              <div className="space-y-4">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Exact SKU</span>
                  <div className="flex items-center gap-2">
                    <Search className="h-4 w-4 text-red-500" />
                    <input
                      value={sku}
                      onChange={(e) => setSku(e.target.value)}
                      placeholder="e.g. 7010374755"
                      className="w-full rounded-md border-2 border-red-900/50 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-red-600"
                    />
                  </div>
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">SKU Prefix</span>
                  <div className="flex items-center gap-2">
                    <Layers className="h-4 w-4 text-red-500" />
                    <input
                      value={skuPrefix}
                      onChange={(e) => setSkuPrefix(e.target.value)}
                      placeholder="e.g. 7010*"
                      className="w-full rounded-md border-2 border-red-900/50 bg-black px-3 py-2 text-sm text-white outline-none placeholder:text-gray-600 focus:border-red-600"
                    />
                  </div>
                </label>
              </div>
            )}

            {mode === "confidence" && (
              <label className="block">
                <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Min Confidence</span>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step={1}
                  value={minConfidence}
                  onChange={(e) => setMinConfidence(Number(e.target.value))}
                  className="w-full appearance-none accent-red-600
                    [&::-webkit-slider-runnable-track]:h-2
                    [&::-webkit-slider-runnable-track]:rounded-full
                    [&::-webkit-slider-runnable-track]:bg-zinc-800
                    [&::-webkit-slider-thumb]:appearance-none
                    [&::-webkit-slider-thumb]:h-4
                    [&::-webkit-slider-thumb]:w-4
                    [&::-webkit-slider-thumb]:-mt-1
                    [&::-webkit-slider-thumb]:rounded-full
                    [&::-webkit-slider-thumb]:bg-red-600
                    [&::-webkit-slider-thumb]:border-2
                    [&::-webkit-slider-thumb]:border-black
                    [&::-moz-range-track]:h-2
                    [&::-moz-range-track]:rounded-full
                    [&::-moz-range-track]:bg-zinc-800
                    [&::-moz-range-thumb]:h-4
                    [&::-moz-range-thumb]:w-4
                    [&::-moz-range-thumb]:rounded-full
                    [&::-moz-range-thumb]:bg-red-600
                    [&::-moz-range-thumb]:border-2
                    [&::-moz-range-thumb]:border-black"
                />
                <div className="mt-1 text-xs text-gray-400">{minConfidence}</div>
              </label>
            )}

            {mode === "recent" && (
              <div className="grid grid-cols-2 gap-3">
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">From</span>
                  <input
                    type="date"
                    value={dateFrom}
                    onChange={(e) => setDateFrom(e.target.value)}
                    className="w-full rounded-md border-2 border-red-900/50 bg-black px-3 py-2 text-sm text-white outline-none focus:border-red-600"
                  />
                </label>
                <label className="block">
                  <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">To</span>
                  <input
                    type="date"
                    value={dateTo}
                    onChange={(e) => setDateTo(e.target.value)}
                    className="w-full rounded-md border-2 border-red-900/50 bg-black px-3 py-2 text-sm text-white outline-none focus:border-red-600"
                  />
                </label>
              </div>
            )}
          </div>

          {/* Column 2: Shared filters */}
          <div className="space-y-4">
            <div className="text-sm font-black uppercase tracking-wider text-gray-300">Filters</div>

            <label className="block">
              <span className="mb-2 block text-xs font-bold uppercase tracking-wide text-gray-400">Sort</span>
              <div className="flex items-center gap-2">
                <SortAsc className="h-4 w-4 text-red-500" />
                <select
                  value={sortBy}
                  onChange={(e) => setSortBy(e.target.value as "relevance" | "confidence_desc" | "newest" | "oldest")}
                  className="w-full rounded-md border-2 border-red-900/50 bg-black px-3 py-2 text-sm text-white outline-none transition focus:border-red-600"
                >
                  <option value="relevance">Relevance</option>
                  <option value="confidence_desc">Confidence ↓</option>
                  <option value="newest">Newest</option>
                  <option value="oldest">Oldest</option>
                </select>
              </div>
            </label>
          </div>

          {/* Column 3: Live preview & Start */}
          <div className="flex flex-col justify-between gap-4">
            <div>
              <div className="mb-2 text-sm font-black uppercase tracking-wider text-gray-300">Preview</div>
              <div className="rounded-xl border-2 border-red-900/50 bg-black p-4 font-mono text-xs text-gray-400">
                <div className="mb-2 text-red-400">/sku-workbench?…</div>
                <code className="break-all">{buildQueryParams() || "(no filters)"}</code>
              </div>
            </div>

            <div className="flex gap-3">
              <button
                onClick={handleStart}
                className="group inline-flex flex-1 items-center justify-center gap-3 rounded-lg border-2 border-red-600 bg-red-600 px-6 py-4 text-sm font-black uppercase tracking-wider text-white transition-colors hover:bg-red-700"
              >
                Enter Review <ArrowRight className="h-4 w-4 transition-transform group-hover:translate-x-1" />
              </button>
            </div>

            <div className="text-xs text-gray-500">
              Tip: Exact SKU jumps straight into a focused workbench. Otherwise, you’ll land in the grid and can continue filtering there.
            </div>
          </div>
        </div>

        {/* Little stats row */}
        <div className="mb-16 grid grid-cols-2 gap-6 md:grid-cols-4">
          <Stat value="4" label="Traversal Modes" />
          <Stat value="∞" label="SKUs" />
          <Stat value="95%+" label="Quality Target" />
          <Stat value="2025" label="Capstone Year" />
        </div>
      </div>

      {/* Footer */}
      <div className="relative border-t-2 border-red-900 px-6 py-8">
        <div className="mx-auto flex w-full max-w-6xl items-center justify-between">
          <div className="font-mono text-sm text-gray-500">
            © {new Date().getFullYear()} Capstone Group 2 • Navigator
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
