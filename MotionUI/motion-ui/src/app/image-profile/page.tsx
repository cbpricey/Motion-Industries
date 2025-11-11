"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  ArrowLeft,
  ExternalLink,
  Copy,
  CheckCircle2,
  XCircle,
  Link2 as LinkIcon,
  Image as ImageIcon,
  Info,
  Clock,
} from "lucide-react";

interface ItemRecord {
  id?: string | number;
  manufacturer?: string;
  sku_number?: string;
  sku?: string;
  title?: string;
  image_url: string;
  source_url?: string;
  confidence_score?: number;
  status?: string;
  created_at?: string;
  width?: number;
  height?: number;
  filesize_kb?: number;
  mime_type?: string;
  [key: string]: unknown;
}

export default function ImageProfilePage() {
  const router = useRouter();
  const sp = useSearchParams();

  const id = sp.get("id") ?? undefined;
  const image = sp.get("image") ?? undefined;
  const skuQS = sp.get("sku") ?? undefined;
  const manuQS = sp.get("manufacturer") ?? undefined;
  const back = sp.get("back") ?? "/sku-workbench";

  const [scrollY, setScrollY] = useState(0);
  const [record, setRecord] = useState<ItemRecord | null>(null);
  const [siblings, setSiblings] = useState<ItemRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [isRejectModalOpen, setIsRejectModalOpen] = useState(false); // Modal state

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  useEffect(() => {
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        console.log("[ImageProfile] fetch:", id);
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const rec = await res.json();

        setRecord(rec ?? null);

        // Fetch siblings by SKU
        const skuKey = rec?.sku_number ?? rec?.sku ?? skuQS;
        if (skuKey) {
          const sibRes = await fetch(
            `/api/products?sku_number=${encodeURIComponent(skuKey)}`,
            { cache: "no-store" }
          );
          if (sibRes.ok) {
            const arr = (await sibRes.json()) as ItemRecord[];
            setSiblings(arr.filter((r) => r.image_url !== rec?.image_url));
          }
        }
      } catch (e: unknown) {
        console.error(e);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
    fetchAll();
  }, [id, image, skuQS]);

  const display: ItemRecord | null =
    record ?? (image ? { image_url: image, sku_number: skuQS, manufacturer: manuQS } : null);

  const sku = display?.sku_number ?? display?.sku;

  function copy(text: string) {
    navigator.clipboard?.writeText(text).then(() => {
      console.log("[ImageProfile] copied:", text);
    });
  }
async function approve() {
  console.log("[ImageProfile] Approve", { sku, image: display?.image_url });
  try {
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "pending_approval",
      }),
    });

    if (!res.ok) {
      console.error("Failed to update status:", await res.text());
      // alert("Failed to update status to pending approval");
      return;
    }

    // Update local state
    setRecord((prev) => prev ? { ...prev, status: "pending_approval" } : null);
    // alert("Status updated to Pending Approval");
  } catch (e) {
    console.error("Error updating product status:", e);
    alert("Error updating status");
  }
}

function reject() {
  setIsRejectModalOpen(true); // Open the modal
}

async function confirmReject() {
  console.log("[ImageProfile] Reject confirmed", { sku, image: display?.image_url });
  setIsRejectModalOpen(false); // Close the modal
  
  try {
    const res = await fetch(`/api/products/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        status: "pending_rejected",
      }),
    });

    if (!res.ok) {
      console.error("Failed to update status:", await res.text());
      alert("Failed to update status to pending rejected");
      return;
    }

    // Update local state
    setRecord((prev) => prev ? { ...prev, status: "pending_rejected" } : null);
    // alert("Status updated to Pending Rejected");
  } catch (e) {
    console.error("Error updating product status:", e);
    alert("Error updating status");
  }
}

  function cancelReject() {
    setIsRejectModalOpen(false); // Close the modal
  }

  const metaPairs = useMemo(() => {
    if (!display) return [] as Array<{ k: string; v: unknown }>;
    const omit = new Set(["image_url", "title"]); // Exclude "title" from metadata
    return Object.entries(display)
      .filter(([k]) => !omit.has(k))
      .map(([k, v]) => ({
        k: k === "id" ? "ITEM_NO" : k, // Change "id" to "ITEM_NO"
        v,
      }));
  }, [display]);

  if (!display) {
    return <div className="min-h-screen bg-black p-10 text-white">No image selected.</div>;
  }

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      {/* Modal */}
      {isRejectModalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black bg-opacity-50">
          <div className="w-full max-w-md rounded-lg bg-zinc-900 p-6 text-center">
            <h2 className="mb-4 text-xl font-bold text-red-500">Are you sure?</h2>
            <p className="mb-6 text-gray-300">Do you really want to reject this image? This action cannot be undone.</p>
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

      {/* Industrial grid background */}
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

      <div className="relative mx-auto w-full max-w-6xl px-6 pt-8">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() =>  router.back()}
            className="inline-flex items-center gap-2 rounded-md border-2 border-red-900/50 bg-zinc-950 px-3 py-2 text-xs font-black uppercase tracking-wider text-gray-200 hover:border-red-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{loading ? "Loading…" : error ? "Error" : "Loaded"}</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-6">
          <div className="mb-2 font-mono text-sm uppercase tracking-widest text-red-600">
            Image Profile
          </div>
          <h1 className="mb-2 text-4xl font-black leading-none tracking-tighter md:text-5xl">
            {sku || "Product Image"} {/* Use SKU as the main title */}
          </h1>
          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-400">
            {display.manufacturer && (
              <span className="rounded border border-red-900/40 bg-zinc-900 px-2 py-1 font-mono uppercase tracking-wider text-red-400">
                {display.manufacturer}
              </span>
            )}
            {sku && (
              <span className="rounded border border-red-900/40 bg-zinc-900 px-2 py-1 font-mono uppercase tracking-wider text-gray-300">
                SKU: {sku}
              </span>
            )}
            {typeof display.confidence_score !== "undefined" && (
              <span className="rounded border border-red-900/40 bg-zinc-900 px-2 py-1 font-mono uppercase tracking-wider text-gray-300">
                {`Confidence: ${display.confidence_score.toFixed(2)}%`}
              </span>
            )}
            {display.status && (
              <span className="rounded border border-red-900/40 bg-zinc-900 px-2 py-1 font-mono uppercase tracking-wider text-gray-300">
                Status: {String(display.status)}
              </span>
            )}
          </div>
        </div>

        {/* Main content */}
        <div className="grid grid-cols-1 gap-6 md:grid-cols-3">
          {/* Left: Large image + actions */}
          <div className="md:col-span-2">
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <img
                src={display.image_url}
                alt={String(display.title ?? "Image")}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
            </div>

            <div className="mt-4 flex flex-wrap gap-3">
              {display.source_url && (
                <a
                  href={display.source_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-2 rounded-md border-2 border-white/20 bg-transparent px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-white/5"
                >
                  <ExternalLink className="h-4 w-4" /> Open Source
                </a>
              )}
              <button
                onClick={() => copy(display.image_url)}
                className="inline-flex items-center gap-2 rounded-md border-2 border-white/20 bg-transparent px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-white/5"
              >
                <Copy className="h-4 w-4" /> Copy Image URL
              </button>
              <button
                onClick={approve}
                className="inline-flex items-center gap-2 rounded-md border-2 border-green-700 bg-green-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-green-700"
              >
                <CheckCircle2 className="h-4 w-4" /> Approve
              </button>
              <button
                onClick={reject}
                className="inline-flex items-center gap-2 rounded-md border-2 border-red-700 bg-red-600 px-4 py-2 text-xs font-black uppercase tracking-wider text-white hover:bg-red-700"
              >
                <XCircle className="h-4 w-4" /> Reject
              </button>
            </div>
          </div>

          {/* Right: Metadata */}
          <div>
            <div className="mb-3 flex items-center gap-2">
              <Info className="h-5 w-5 text-red-500" />
              <h2 className="text-lg font-black uppercase tracking-wider">Metadata</h2>
            </div>

            <div className="rounded-xl border-2 border-red-900/50 bg-zinc-950 p-4">
              <dl className="grid grid-cols-1 gap-3 text-sm">
                <div className="flex items-center gap-2">
                  <ImageIcon className="h-4 w-4 text-gray-400" />
                  <span className="text-gray-400">Image URL</span>
                </div>
                <button
                  onClick={() => copy(display.image_url)}
                  className="truncate text-left text-xs text-red-400 underline-offset-2 hover:underline"
                >
                  {display.image_url}
                </button>

                {metaPairs.map(({ k, v }) => (
                  <div key={k} className="border-t border-zinc-800 pt-3">
                    <div className="text-[11px] uppercase tracking-wider text-gray-500">{k}</div>
                    <div className="break-words text-sm text-gray-200">{String(v)}</div>
                  </div>
                ))}
              </dl>
            </div>
          </div>
        </div>

        {/* Siblings */}
        {siblings.length > 0 && (
          <div className="mt-10">
            <div className="mb-3 flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-black uppercase tracking-wider">Other Images for this SKU</h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {siblings.map((s, i) => (
                <button
                  key={s.image_url ?? i}
                  onClick={() => {
                    router.push(`/image-profile?id=${s.id}&back=${encodeURIComponent(back)}`);
                  }}
                  className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-2 hover:border-red-600"
                >
                  <img
                    src={s.image_url}
                    alt={String(s.title ?? "Sibling")}
                    className="aspect-[4/3] w-full rounded object-cover"
                  />
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="my-12 border-t-2 border-red-900 py-6 text-center font-mono text-sm text-gray-500">
          © {new Date().getFullYear()} Capstone Group 2 • Image Profile
        </div>
      </div>
    </div>
  );
}
