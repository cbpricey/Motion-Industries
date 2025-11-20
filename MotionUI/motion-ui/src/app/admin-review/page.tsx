"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { useSession } from "next-auth/react";
import {
  ArrowLeft,
  ArrowRightCircle,
  CheckCircle2,
  XCircle,
  Clock,
  Info,
  Link2 as LinkIcon,
  Image as ImageIcon,
} from "lucide-react";
import { getProxiedImageUrl } from "@/lib/imageProxy";

interface AdminReviewRecord {
    id?: string | number;
    manufacturer?: string;
    sku_number?: string;
    sku?: string;
    title?: string;
    image_url: string;
    status?: string;
    confidence_score?: number;
    rejection_comment?: string;
  
    reviewed_by?: string | null;
    updated_by?: string | null;
    updated_at?: string | null;
    created_at?: string | null;
  
    original_status?: string | null;
    final_status?: string | null;
    originalStatus?: string | null;
    finalStatus?: string | null;
  
    [key: string]: unknown;
  }

export default function AdminReviewTerminalPage() {
  const router = useRouter();
  const sp = useSearchParams();
  const { data: session, status: sessionStatus } = useSession();

  const id = sp.get("id") ?? undefined;
  const back = sp.get("back") ?? "/review_history";

  const [scrollY, setScrollY] = useState(0);
  const [record, setRecord] = useState<AdminReviewRecord | null>(null);
  const [siblings, setSiblings] = useState<AdminReviewRecord[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Background parallax
  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  // Role gate: only admins should be here
  useEffect(() => {
    if (sessionStatus === "loading") return;
    const role = session?.user?.role?.toUpperCase();
    if (role !== "ADMIN") {
      router.replace(back);
    }
  }, [session, sessionStatus, router, back]);

  // Fetch record + siblings
  useEffect(() => {
    if (!id) return;
  
    async function fetchAll() {
      setLoading(true);
      setError(null);
      try {
        console.log("[AdminReview] fetch:", id);
        const res = await fetch(`/api/products/${id}`);
        if (!res.ok) throw new Error(`HTTP ${res.status}`);
        const raw = await res.json();
        console.log("[AdminReview] raw record", raw);
        setRecord(raw ?? null); 
  
        if (!raw || typeof raw !== "object") {
          setRecord(null);
          setSiblings([]);
          setLoading(false);
          return;
        }
  
        const d = raw as Record<string, any>;
  
        const main: AdminReviewRecord = {
          ...d,
          id: (d.id ?? d._id) as string | number | undefined,
          title: (d.title ?? d.product_title ?? "(Untitled)") as string,
          manufacturer: (d.manufacturer ?? "") as string,
          image_url: (d.image_url ?? d.thumbnail_url ?? "") as string,
          status: d.status as string | undefined,
          confidence_score: (d.confidence_score ?? 0) as number,
          rejection_comment: (d.rejection_comment ?? "") as string,
  
          // 👇 same logic as ReviewHistoryItem
          created_at: (d.reviewed_at ?? d.created_at ?? d.updated_at ?? null) as string | null,
          reviewed_by: (d.reviewed_by ?? null) as string | null,
  
          // extra convenience for “last updated” etc.
          updated_at: (d.updated_at ?? d.reviewed_at ?? d.created_at ?? null) as string | null,
          updated_by: (d.updated_by ?? d.reviewed_by ?? null) as string | null,
  
          original_status:
            ((d.original_status ?? d.originalStatus ?? d.status) as string | null) ?? null,
          final_status:
            ((d.final_status ?? d.finalStatus ?? d.status) as string | null) ?? null,
        };
  
        setRecord(main);
  
        // Siblings (can be looser, you only use title/status/image_url/id)
        const skuKey = d.sku_number ?? d.sku;
        if (skuKey) {
          const sibRes = await fetch(
            `/api/products?sku_number=${encodeURIComponent(skuKey)}`,
            { cache: "no-store" }
          );
          if (sibRes.ok) {
            const resJson = await sibRes.json();
            const rows = Array.isArray(resJson) ? resJson : resJson.results ?? [];
            const arr: AdminReviewRecord[] = rows.map((r: Record<string, any>) => ({
              ...r,
              id: (r.id ?? r._id) as string | number | undefined,
              title: (r.title ?? r.product_title ?? "(Untitled)") as string,
              manufacturer: (r.manufacturer ?? "") as string,
              image_url: (r.image_url ?? r.thumbnail_url ?? "") as string,
              status: r.status as string | undefined,
            }));
            setSiblings(arr.filter((r) => r.id !== main.id));
          } else {
            setSiblings([]);
          }
        } else {
          setSiblings([]);
        }
      } catch (e: unknown) {
        console.error("[AdminReview] fetch error:", e);
        setError(e instanceof Error ? e.message : String(e));
      } finally {
        setLoading(false);
      }
    }
  
    fetchAll();
  }, [id]);

  const display = record;
  const sku = display?.sku_number ?? display?.sku;
  const currentStatus = (display?.status ?? "").toString();
  const isPendingApprove = currentStatus === "pending-approve";
  const isPendingReject = currentStatus === "pending-reject";

  // Reviewer proposal: what the reviewer intended
  const reviewerProposal = isPendingApprove
    ? "Approve"
    : isPendingReject
    ? "Reject"
    : null;

  // Pull original/final status (support snake + camel)
  const originalStatusRaw =
    (display?.original_status ??
      display?.originalStatus ??
      null) || null;
  const finalStatusRaw =
    (display?.final_status ??
      display?.finalStatus ??
      null) || null;

  // Map statuses to human words
  const mapStatusToMeaning = (s?: string | null) => {
    if (!s) return null;
    if (s === "pending-approve") return "Approve";
    if (s === "pending-reject") return "Reject";
    if (s === "approved") return "Approve";
    if (s === "rejected") return "Reject";
    return s;
  };

  let overrideText: string | null = null;
  if (originalStatusRaw && finalStatusRaw) {
    const origMeaning = mapStatusToMeaning(originalStatusRaw);
    const finalMeaning = mapStatusToMeaning(finalStatusRaw);

    const isMeaningfulOverride =
      (originalStatusRaw === "pending-approve" &&
        finalStatusRaw === "rejected") ||
      (originalStatusRaw === "pending-reject" &&
        finalStatusRaw === "approved");

    if (isMeaningfulOverride && origMeaning && finalMeaning) {
      overrideText = `Admin override: Reviewer proposed ${origMeaning} \u2192 Final ${finalMeaning}`;
    }
  }

  // All metadata except the image & title
  const metaPairs = useMemo(() => {
    if (!display) return [] as Array<{ k: string; v: unknown }>;
    const omit = new Set(["image_url", "title"]);
    return Object.entries(display)
      .filter(([k]) => !omit.has(k))
      .map(([k, v]) => ({
        k: k === "id" ? "ITEM_ID" : k,
        v,
      }));
  }, [display]);

  function getReviewerIdentity(rec: AdminReviewRecord | null): string {
    if (!rec) return "Unknown";
    return (
      (rec.reviewed_by as string | undefined) ??
      (rec.updated_by as string | undefined) ??
      "Unknown"
    );
  }

  function getReviewerInitials(identity: string): string {
    if (!identity || identity === "Unknown") return "?";
    const beforeAt = identity.split("@")[0];
    const parts = beforeAt.split(/[.\s_-]+/).filter(Boolean);
    if (parts.length === 0) return identity.charAt(0).toUpperCase();
    if (parts.length === 1) return parts[0].charAt(0).toUpperCase();
    return (
      parts[0].charAt(0).toUpperCase() +
      parts[1].charAt(0).toUpperCase()
    );
  }

  async function finalizeReviewerDecision() {
    if (!id || !reviewerProposal || !display) return;
    setBusy(true);
    try {
      const finalStatus =
        reviewerProposal === "Approve" ? "approved" : "rejected";

      console.log("[AdminReview] finalize", {
        id,
        finalStatus,
      });

      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: finalStatus,
          original_status:
            display.original_status ??
            display.originalStatus ??
            display.status ??
            null,
          final_status: finalStatus,
        }),
      });

      if (!res.ok) {
        console.error("Failed to finalize decision:", await res.text());
        return;
      }

      setRecord((prev) =>
        prev
          ? {
              ...prev,
              status: finalStatus,
              original_status:
                prev.original_status ??
                prev.originalStatus ??
                prev.status,
              final_status: finalStatus,
            }
          : prev
      );
    } catch (e) {
      console.error("[AdminReview] finalize error:", e);
    } finally {
      setBusy(false);
    }
  }

  async function overrideReviewerDecision() {
    if (!id || !reviewerProposal || !display) return;
    setBusy(true);
    try {
      // Do the opposite meaning of the reviewer’s proposal
      const finalStatus =
        reviewerProposal === "Approve" ? "rejected" : "approved";

      console.log("[AdminReview] override", {
        id,
        finalStatus,
      });

      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: finalStatus,
          original_status:
            display.original_status ??
            display.originalStatus ??
            display.status ??
            null,
          final_status: finalStatus,
        }),
      });

      if (!res.ok) {
        console.error("Failed to override decision:", await res.text());
        return;
      }

      setRecord((prev) =>
        prev
          ? {
              ...prev,
              status: finalStatus,
              original_status:
                prev.original_status ??
                prev.originalStatus ??
                prev.status,
              final_status: finalStatus,
            }
          : prev
      );
    } catch (e) {
      console.error("[AdminReview] override error:", e);
    } finally {
      setBusy(false);
    }
  }

  async function sendBackToPending() {
    if (!id || !display) return;
    setBusy(true);
    try {
      console.log("[AdminReview] send back to pending", { id });

      const res = await fetch(`/api/products/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          status: "pending",
          original_status:
            display.original_status ??
            display.originalStatus ??
            display.status ??
            null,
          final_status: "pending",
        }),
      });

      if (!res.ok) {
        console.error("Failed to send back to pending:", await res.text());
        return;
      }

      setRecord((prev) =>
        prev
          ? {
              ...prev,
              status: "pending",
              original_status:
                prev.original_status ??
                prev.originalStatus ??
                prev.status,
              final_status: "pending",
            }
          : prev
      );
    } catch (e) {
      console.error("[AdminReview] pending error:", e);
    } finally {
      setBusy(false);
    }
  }

  async function goToNextPending() {
    setBusy(true);
    try {
      // First look for oldest pending-approve; if none, pending-reject
      async function fetchNext(status: string) {
        const qp = new URLSearchParams();
        qp.set("status", status);
        qp.set("sort", "oldest");
        const res = await fetch(`/api/products?${qp.toString()}`, {
          cache: "no-store",
        });
        if (!res.ok) return null;
        const json = await res.json();
        const rows = Array.isArray(json)
          ? json
          : json.results ?? [];
        const next = rows.find(
          (r: { id?: string | number }) =>
            r.id && String(r.id) !== String(id)
        );
        return next ?? null;
      }

      let next =
        (await fetchNext("pending-approve")) ??
        (await fetchNext("pending-reject"));

      if (next?.id) {
        router.push(
          `/admin-review?id=${encodeURIComponent(
            String(next.id)
          )}&back=${encodeURIComponent(back)}`
        );
      } else {
        console.log("[AdminReview] no more pending items found");
      }
    } catch (e) {
      console.error("[AdminReview] next pending error:", e);
    } finally {
      setBusy(false);
    }
  }

  function jumpToSibling(siblingId: string | number | undefined) {
    if (!siblingId) return;
    router.push(
      `/admin-review?id=${encodeURIComponent(
        String(siblingId)
      )}&back=${encodeURIComponent(back)}`
    );
  }

  // Keyboard shortcuts
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      // Don't hijack when typing in inputs/textareas
      const target = e.target as HTMLElement | null;
      if (
        target &&
        ["INPUT", "TEXTAREA", "SELECT"].includes(target.tagName)
      ) {
        return;
      }

      if (e.key === "a" || e.key === "A") {
        if (!busy && reviewerProposal) {
          e.preventDefault();
          void finalizeReviewerDecision();
        }
      } else if (e.key === "o" || e.key === "O") {
        if (!busy && reviewerProposal) {
          e.preventDefault();
          void overrideReviewerDecision();
        }
      } else if (e.key === "p" || e.key === "P") {
        if (!busy) {
          e.preventDefault();
          void sendBackToPending();
        }
      } else if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
        if (!display) return;
        e.preventDefault();

        const all: AdminReviewRecord[] = [
          display,
          ...siblings,
        ].filter(Boolean) as AdminReviewRecord[];
        const idx = all.findIndex(
          (r) => String(r.id) === String(display.id)
        );
        if (idx === -1) return;

        if (e.key === "ArrowRight") {
          const next = all[idx + 1];
          if (next && next.id) {
            jumpToSibling(next.id);
          } else {
            // No more siblings → fall back to next pending item
            void goToNextPending();
          }
        } else if (e.key === "ArrowLeft") {
          const prev = all[idx - 1];
          if (prev && prev.id) {
            jumpToSibling(prev.id);
          }
        }
      }
    }

    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, reviewerProposal, siblings, display, id, back]);

  if (!id) {
    return (
      <div className="min-h-screen bg-black p-10 text-white">
        No review item selected.
      </div>
    );
  }

  if (!display) {
    return (
      <div className="min-h-screen bg-black p-10 text-white">
        {loading ? "Loading…" : error ?? "No data found"}
      </div>
    );
  }

  const reviewerIdentity = getReviewerIdentity(display);
  const reviewerInitials = getReviewerInitials(reviewerIdentity);

  return (
    <div className="min-h-screen overflow-x-hidden bg-black text-white">
      {/* Industrial background */}
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

      <div className="relative mx-auto w-full max-w-6xl px-6 pt-8 pb-16">
        {/* Top bar */}
        <div className="mb-6 flex items-center justify-between">
          <button
            onClick={() => router.push(back)}
            className="inline-flex items-center gap-2 rounded-md border-2 border-red-900/50 bg-zinc-950 px-3 py-2 text-xs font-black uppercase tracking-wider text-gray-200 hover:border-red-600"
          >
            <ArrowLeft className="h-4 w-4" /> Back
          </button>
          <div className="flex items-center gap-2 text-xs text-gray-400">
            <Clock className="h-4 w-4" />
            <span>{loading ? "Loading…" : error ? "Error" : "Ready"}</span>
          </div>
        </div>

        {/* Header */}
        <div className="mb-8">
          <div className="mb-2 font-mono text-xs uppercase tracking-[0.3em] text-red-600">
            Admin Review Terminal
          </div>
          <h1 className="mb-3 text-4xl font-black leading-none tracking-tighter md:text-5xl">
            {sku || "Review Item"}
          </h1>
          <div className="flex flex-wrap items-center gap-3 text-xs text-gray-300">
            {display.manufacturer && (
              <span className="rounded border border-red-900/40 bg-zinc-900 px-2 py-1 font-mono uppercase tracking-wider text-red-400">
                {display.manufacturer}
              </span>
            )}
            {sku && (
              <span className="rounded border border-red-900/40 bg-zinc-900 px-2 py-1 font-mono uppercase tracking-wider">
                SKU: {sku}
              </span>
            )}
            {typeof display.confidence_score === "number" && (
              <span className="rounded border border-red-900/40 bg-zinc-900 px-2 py-1 font-mono uppercase tracking-wider">
                Confidence: {display.confidence_score.toFixed(1)}%
              </span>
            )}
            {display.status && (
              <span className="rounded border border-red-900/40 bg-zinc-900 px-2 py-1 font-mono uppercase tracking-wider">
                Status: {String(display.status)}
              </span>
            )}
          </div>
        </div>

        {/* Layout: image / terminal / metadata */}
        <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
          {/* Left: main image */}
          <div className="lg:col-span-2">
            <div className="overflow-hidden rounded-xl border border-zinc-800 bg-zinc-950 p-3">
              <img
                src={getProxiedImageUrl(display.image_url)}
                alt={String(display.title ?? "Image")}
                className="max-h-[70vh] w-full rounded-lg object-contain"
              />
            </div>
          </div>

          {/* Right: decision terminal */}
          <div className="space-y-6">
            {/* Decision */}
            <div className="rounded-xl border-2 border-red-900/60 bg-zinc-950 p-4">
              <div className="mb-3 flex items-center gap-2">
                <CheckCircle2 className="h-5 w-5 text-red-500" />
                <h2 className="text-lg font-black uppercase tracking-wider">
                  Decision Terminal
                </h2>
              </div>

              <div className="mb-3 space-y-2 text-xs text-gray-300">
                <div className="flex items-center gap-2">
                  <span className="inline-flex h-6 w-6 items-center justify-center rounded-full bg-red-900/60 font-mono text-[10px] font-bold uppercase text-red-100">
                    {reviewerInitials}
                  </span>
                  <div>
                    <div className="font-mono uppercase tracking-widest text-gray-500">
                      Reviewer
                    </div>
                    <div className="text-[11px] text-gray-200">
                      {reviewerIdentity}
                    </div>
                  </div>
                </div>

                {reviewerProposal ? (
                  <div>
                    <span className="font-mono uppercase tracking-widest text-gray-500">
                      Reviewer proposal:
                    </span>{" "}
                    <span
                      className={
                        isPendingApprove ? "text-green-400" : "text-red-400"
                      }
                    >
                      {reviewerProposal}
                    </span>
                  </div>
                ) : (
                  <div className="text-gray-500">
                    This item is not currently in a pending-approval/rejection
                    state.
                  </div>
                )}

                {display.created_at && (
                  <div className="text-[11px] text-gray-500">
                    Last updated:{" "}
                    {new Date(display.created_at).toLocaleString()}
                  </div>
                )}

                {overrideText && (
                  <div className="mt-2 rounded-md border border-red-800 bg-red-950/40 p-2 text-[11px] text-red-200">
                    <div className="mb-1 font-mono uppercase tracking-widest text-red-400">
                      Admin Override
                    </div>
                    <div>{overrideText}</div>
                  </div>
                )}
              </div>

              <div className="mt-4 flex flex-col gap-2">
                {/* Accept reviewer proposal */}
                <button
                  disabled={!reviewerProposal || busy}
                  onClick={finalizeReviewerDecision}
                  className={`inline-flex items-center justify-center gap-2 rounded-md px-4 py-2 text-xs font-black uppercase tracking-wider ${
                    reviewerProposal === "Approve"
                      ? "bg-green-600 text-white hover:bg-green-700 disabled:bg-green-900/40"
                      : "bg-red-600 text-white hover:bg-red-700 disabled:bg-red-900/40"
                  }`}
                >
                  {reviewerProposal === "Approve" ? (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Accept Approval
                    </>
                  ) : (
                    <>
                      <XCircle className="h-4 w-4" />
                      Accept Rejection
                    </>
                  )}
                </button>

                {/* Override reviewer proposal */}
                <button
                  disabled={!reviewerProposal || busy}
                  onClick={overrideReviewerDecision}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-zinc-600 bg-zinc-900 px-4 py-2 text-xs font-black uppercase tracking-wider text-gray-100 hover:bg-zinc-800 disabled:opacity-40"
                >
                  {reviewerProposal === "Approve" ? (
                    <>
                      <XCircle className="h-4 w-4" />
                      Override: Reject Instead
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="h-4 w-4" />
                      Override: Approve Instead
                    </>
                  )}
                </button>

                {/* Send back to pending */}
                <button
                  disabled={busy}
                  onClick={sendBackToPending}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-yellow-600 bg-yellow-600/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-yellow-300 hover:bg-yellow-600/20 disabled:opacity-40"
                >
                  Send Back to Pending
                </button>

                {/* Next pending item */}
                <button
                  disabled={busy}
                  onClick={goToNextPending}
                  className="inline-flex items-center justify-center gap-2 rounded-md border border-blue-600 bg-blue-600/10 px-4 py-2 text-xs font-black uppercase tracking-wider text-blue-300 hover:bg-blue-600/20 disabled:opacity-40"
                >
                  <ArrowRightCircle className="h-4 w-4" />
                  Next Pending Item
                </button>

                <p className="mt-2 text-[10px] text-gray-500">
                  Shortcuts: <span className="font-mono">A</span> accept ·{" "}
                  <span className="font-mono">O</span> override ·{" "}
                  <span className="font-mono">P</span> pending ·{" "}
                  <span className="font-mono">←/→</span> cycle SKU images /
                  next pending.
                </p>

                <p className="mt-1 text-[11px] text-gray-500">
                  To approve or reject a different image for this SKU, choose
                  one from{" "}
                  <span className="font-mono uppercase text-gray-300">
                    Other Images for this SKU
                  </span>{" "}
                  below and repeat the review.
                </p>
              </div>
            </div>

            {/* Compact metadata card (high-level) */}
            <div className="rounded-xl border-2 border-red-900/50 bg-zinc-950 p-4">
              <div className="mb-3 flex items-center gap-2">
                <Info className="h-5 w-5 text-red-500" />
                <h3 className="text-sm font-black uppercase tracking-wider">
                  Snapshot
                </h3>
              </div>
              <div className="space-y-1 text-xs text-gray-300">
                <div>
                  <span className="font-mono uppercase tracking-widest text-gray-500">
                    Item ID:
                  </span>{" "}
                  <span>{display.id ?? "—"}</span>
                </div>
                <div>
                  <span className="font-mono uppercase tracking-widest text-gray-500">
                    Created:
                  </span>{" "}
                  <span>
                    {display.created_at
                      ? new Date(display.created_at).toLocaleString()
                      : "—"}
                  </span>
                </div>
                {display.rejection_comment && (
                  <div className="mt-2 rounded-md border border-red-900/40 bg-red-950/20 p-2 text-[11px] text-gray-200">
                    <div className="mb-1 font-mono uppercase tracking-widest text-red-400">
                      Rejection Comment
                    </div>
                    <div>{display.rejection_comment}</div>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* Full metadata table */}
        <div className="mt-10">
          <div className="mb-3 flex items-center gap-2">
            <ImageIcon className="h-5 w-5 text-red-500" />
            <h3 className="text-lg font-black uppercase tracking-wider">
              Record Details
            </h3>
          </div>
          <div className="rounded-xl border-2 border-red-900/50 bg-zinc-950 p-4">
            <dl className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {metaPairs.map(({ k, v }) => (
                <div key={k} className="border-t border-zinc-800 pt-3">
                  <dt className="text-[11px] uppercase tracking-widest text-gray-500">
                    {k}
                  </dt>
                  <dd className="break-words text-sm text-gray-200">
                    {k === "confidence_score" && typeof v === "number"
                      ? `${(v as number).toFixed(2)}%`
                      : String(v)}
                  </dd>
                </div>
              ))}
            </dl>
          </div>
        </div>

        {/* Siblings */}
        {siblings.length > 0 && (
          <div className="mt-10">
            <div className="mb-3 flex items-center gap-2">
              <LinkIcon className="h-5 w-5 text-red-500" />
              <h3 className="text-lg font-black uppercase tracking-wider">
                Other Images for this SKU
              </h3>
            </div>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {siblings.map((s, i) => {
                let statusClasses =
                  "border-zinc-700 text-gray-300 bg-zinc-900/60";
                if (s.status === "approved") {
                  statusClasses =
                    "border-green-700 text-green-300 bg-green-900/30";
                } else if (s.status === "rejected") {
                  statusClasses =
                    "border-red-700 text-red-300 bg-red-900/30";
                } else if (
                  s.status === "pending-approve" ||
                  s.status === "pending-reject"
                ) {
                  statusClasses =
                    "border-yellow-700 text-yellow-300 bg-yellow-900/30";
                }

                return (
                  <button
                    key={s.id ?? i}
                    onClick={() => jumpToSibling(s.id)}
                    className="overflow-hidden rounded-lg border border-zinc-800 bg-zinc-950 p-2 text-left hover:border-red-600"
                  >
                    <img
                      src={s.image_url}
                      alt={String(s.title ?? "Sibling")}
                      className="aspect-[4/3] w-full rounded object-cover"
                    />
                    <div className="mt-2 text-[11px] text-gray-300">
                      {s.title || s.sku_number || "Image"}
                    </div>
                    {s.status && (
                      <div
                        className={`mt-1 inline-flex items-center gap-1 rounded px-2 py-0.5 text-[10px] font-mono uppercase tracking-widest ${statusClasses}`}
                      >
                        <span className="h-1.5 w-1.5 rounded-full bg-current" />
                        <span>{s.status}</span>
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        )}

        {/* Footer */}
        <div className="mt-12 border-t-2 border-red-900 py-6 text-center font-mono text-sm text-gray-500">
          © {new Date().getFullYear()} Capstone Group 2 • Admin Review
          Terminal
        </div>
      </div>
    </div>
  );
}
