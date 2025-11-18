"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { CheckCircle2, XCircle } from "lucide-react";
import { getProxiedImageUrl, getOriginalImageUrl } from "@/lib/imageProxy";

/** Minimal fields the tile actually uses */
export interface BaseItem {
  image_url: string;
  title?: string;
  manufacturer?: string;
  sku_number?: string;
  sku?: string;
  id?: string | number;
  confidence_score?: number;
  [key: string]: unknown; // allow extra fields like description, status, etc.

}

type ProductTileProps<T extends BaseItem> = {
  item: T;
  onApprove: (item: T) => void;
  onReject: (item: T) => void;
};

function ProductTileInner<T extends BaseItem>({
  item,
  onApprove,
  onReject,
}: ProductTileProps<T>) {
  const router = useRouter();
  const [imgSrc, setImgSrc] = useState(getProxiedImageUrl(item.image_url));
  const [imgError, setImgError] = useState(false);

  const sku = item.sku_number ?? item.sku;
  const manufacturer = item.manufacturer ?? "";
  const confidence_score = item.confidence_score ?? 0;

  function goToImageProfile() {
    const back =
      typeof window !== "undefined"
        ? window.location.pathname + window.location.search
        : "/sku-workbench";
    router.push(`/image-profile?id=${item.id}&back=${encodeURIComponent(back)}`);
  }

  function handleImageError() {
    // If proxy failed, try original URL as fallback
    if (!imgError) {
      setImgError(true);
      const originalUrl = getOriginalImageUrl(imgSrc);
      if (originalUrl && originalUrl !== imgSrc) {
        console.log('Proxy failed, falling back to original URL:', originalUrl);
        setImgSrc(originalUrl);
      }
    }
  }

  const color = `hsl(${(confidence_score / 100) * 120}, 100%, 50%)`;
  return (
    <div
      onClick={goToImageProfile}
      onKeyDown={(e) => e.key === "Enter" && goToImageProfile()}
      role="button"
      tabIndex={0}
      className="group relative flex h-full cursor-pointer flex-col overflow-hidden rounded-xl border-2 border-red-900/50 bg-zinc-900/70 p-4 backdrop-blur-sm transition-all duration-300 hover:border-red-600"
    >
      {/* Visual accent (never blocks clicks) */}
      <div className="pointer-events-none absolute left-0 top-0 z-0 h-full w-1 bg-red-600 transition-all duration-300 group-hover:w-full group-hover:opacity-10" />

      {/* Image */}
      <img
        src={imgSrc}
        alt={item.title || "Product"}
        onError={handleImageError}
        className="relative z-10 mb-3 aspect-[4/3] w-full rounded-lg border border-zinc-700 bg-zinc-800 object-cover"
      />

      {/* Meta */}
      <div className="relative z-10 mb-3 min-h-16 space-y-1">
        <div className="truncate text-sm font-semibold text-gray-400">{manufacturer}</div>
        <div className="truncate text-lg font-extrabold text-white">{sku}</div>
        <div className="line-clamp-2 text-xs text-gray-400" style={{ color }}>{`Confidence: ${confidence_score.toFixed(2)}%`}</div>
      </div>

      <div className="flex-1" />

      {/* Actions (stop bubbling so card click doesn't fire) */}
      <div className="relative z-10 mt-2 grid grid-cols-2 gap-2">
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log("[Tile] Approve clicked", { sku, imgSrc });
            onApprove(item);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-green-700 bg-green-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-green-700"
        >
          <CheckCircle2 className="h-4 w-4" /> Approve
        </button>
        <button
          onClick={(e) => {
            e.stopPropagation();
            console.log("[Tile] Reject clicked", { sku, imgSrc });
            onReject(item);
          }}
          className="inline-flex items-center justify-center gap-2 rounded-lg border-2 border-red-700 bg-red-600 px-3 py-2 text-xs font-black uppercase tracking-wider text-white transition-colors hover:bg-red-700"
        >
          <XCircle className="h-4 w-4" /> Reject
        </button>
      </div>
    </div>
  );
}

/** Generic default export so consumers can pass their own item type */
const ProductTile = <T extends BaseItem>(props: ProductTileProps<T>) => (
  <ProductTileInner {...props} />
);
export default ProductTile;
