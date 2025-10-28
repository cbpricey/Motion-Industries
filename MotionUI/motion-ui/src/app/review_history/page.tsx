"use client";

import { useState, useEffect } from "react";
import { Clock, CheckCircle2, XCircle, History, Filter } from "lucide-react";

/**
 * Review History
 * — Displays accepted/rejected reviews with matching industrial design
 * — Consistent with Home / Catalog Navigator / About
 */

type ReviewStatus = "accepted" | "rejected";
type FilterType = "all" | ReviewStatus;

interface ReviewHistoryItem {
  id: number;
  title: string;
  manufacturer: string;
  image_url: string;
  status: ReviewStatus;
  dateReviewed: string;
}

export default function ReviewHistoryPage() {
  const [filter, setFilter] = useState<FilterType>("all");
  const [scrollY, setScrollY] = useState(0);

  const mockData: ReviewHistoryItem[] = [
    {
      id: 1,
      title: "Ball Bearing 6203ZZ",
      manufacturer: "Danfoss",
      image_url:
        "https://static1.simpleflyingimages.com/wordpress/wp-content/uploads/2024/07/air-india-a350-900.jpg",
      status: "accepted",
      dateReviewed: "2025-10-10",
    },
    {
      id: 2,
      title: "Hydraulic Pump A10VSO",
      manufacturer: "Bosch Rexroth",
      image_url:
        "https://www.shutterstock.com/shutterstock/photos/1743331667/display_1500/stock-vector-composition-of-air-vector-illustration-gas-structure-educational-scheme-with-separated-pie-1743331667.jpg",
      status: "rejected",
      dateReviewed: "2025-10-09",
    },
  ];

  const filtered = mockData.filter(
    (item) => filter === "all" || item.status === filter
  );

  useEffect(() => {
    const onScroll = () => setScrollY(window.scrollY);
    window.addEventListener("scroll", onScroll);
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

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

        {/* Filters */}
        <div className="mb-10 flex flex-wrap gap-3">
          {(["all", "accepted", "rejected"] as FilterType[]).map((f) => (
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
              {f.charAt(0).toUpperCase() + f.slice(1)}
            </button>
          ))}
        </div>

        {/* Review list */}
        <div className="grid grid-cols-1 gap-6 pb-20">
          {filtered.map((r) => (
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
                    Reviewed {r.dateReviewed}
                  </div>
                </div>
              </div>
              <div
                className={`inline-flex items-center gap-2 rounded-md px-3 py-1 font-mono text-sm ${
                  r.status === "accepted"
                    ? "bg-green-600/20 text-green-400 border border-green-700"
                    : "bg-red-600/20 text-red-400 border border-red-700"
                }`}
              >
                {r.status === "accepted" ? (
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
