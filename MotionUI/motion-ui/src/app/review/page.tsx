"use client";

import { useEffect, useState } from "react";
import { useSearchParams } from "next/navigation";
import ReviewCard, { ReviewCardProps } from "../../components/ReviewCard";
import styles from "../page.module.css";

export default function Review() {
  const [selectedSKU, setSelectedSKU] =
    useState<string>("All");
  const [pending, setPending] = useState<ReviewCardProps[]>([]);
  const [approved, setApproved] = useState<ReviewCardProps[]>([]);
  const [rejected, setRejected] = useState<ReviewCardProps[]>([]);
  const searchParams = useSearchParams();
  const selectedManufacturer = searchParams.get("manufacturer") ?? "All";

  // Fetch from backend
  useEffect(() => {
    async function fetchProducts() {
      const url =
        selectedManufacturer === "All"
        ? `/api/products`
        : `/api/products?manufacturer=${encodeURIComponent(
            selectedManufacturer
        )}`;
      const res = await fetch(url);
      const data = await res.json();
      setPending(data);
    }
    fetchProducts();
  }, [selectedManufacturer]);

  // async function updateApprove(SKUid: string) {
  //   await client.update({
  //     index: 'products',
  //     id: SKUid,
  //     doc: {
  //       status: 'approved'
  //     }
  //   });
  // }

  useEffect(() => {
    if (
      selectedSKU !== "All" &&
      !pending.some((r) => r.sku === selectedSKU)
    ) {
      setSelectedSKU("All");
    }
  }, [pending, selectedSKU]);

  useEffect(() => {
    async function fetchProducts() {
      try {
        const url =
          selectedManufacturer === "All"
            ? "/api/products"
            : `/api/products?manufacturer=${encodeURIComponent(
                selectedManufacturer
              )}`;
  
        console.log("Fetching:", url); // sanity check
  
        const res = await fetch(url, { cache: "no-store" });
  
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
  
        const data = await res.json();
        setPending(data);
      } catch (err) {
        console.error("Failed to fetch products:", err);
      }
    }
  
    fetchProducts();
  }, [selectedManufacturer]);
  


  function handleApprove(id: number) {
    const review = pending.find((r) => r.id === id);
    if (!review) return;

    setApproved((prev) => [...prev, review]);
    setPending((prev) => prev.filter((r) => r.id !== id));
    // updateApprove(id.toString())
  }



  function handleReject(id: number) {
    const review = pending.find((r) => r.id === id);
    if (!review) return;

    setRejected((prev) => [...prev, review]);
    setPending((prev) => prev.filter((r) => r.id !== id));
  }

  /** Undo an approval/rejection (moves image back to top of pending) */
  function handleUndoApprove(id: number) {
    const review = approved.find((r) => r.id === id);
    if (!review) return;

    setPending((prev) => [review, ...prev]); // add to top
    setApproved((prev) => prev.filter((r) => r.id !== id));
  }

  function handleUndoReject(id: number) {
    const review = rejected.find((r) => r.id === id);
    if (!review) return;

    setPending((prev) => [review, ...prev]); // add to top
    setRejected((prev) => prev.filter((r) => r.id !== id));
  }

  // Filter the pending list based on the selected manufacturer
  const filteredByManufacturer =
    selectedManufacturer === "All"
      ? pending
      : pending.filter((r) => r.manufacturer === selectedManufacturer);

  const filteredPending =
    selectedSKU === "All"
      ? filteredByManufacturer
      : filteredByManufacturer.filter((r) => r.sku === selectedSKU);

  const current = filteredPending[0];

  return (
    <main className={styles.main}>
      <h1 className={styles.header}>
        Reviewing {selectedManufacturer} Products
      </h1>

      <div className={styles.filterContainer}>
        <label htmlFor="SKUFilter">Filter by SKU: </label>
        <select
          id="SKUFilter"
          value={selectedSKU}
          onChange={(e) => setSelectedSKU(e.target.value)}
        >
          <option value="All">All</option>
          {[...new Set(filteredByManufacturer.map((r) => r.sku))].map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>

      <section className={styles.pending}>
        <h2 className={styles.pendingTitle}>Pending Review</h2>
        <div className={styles.pendingCard}>
          {current ? (
            <ReviewCard
              key={current.id}
              {...current}
              onApprove={() => handleApprove(current.id)}
              onReject={() => handleReject(current.id)}
            />
          ) : (
            <p>No more pending reviews 🎉</p>
          )}
        </div>
      </section>

      <section className={styles.approved}>
        <h2>Approved</h2>
        {approved.length === 0 ? (
          <p className={styles.placeholder}>None yet</p>
        ) : (
          approved.map((r) => (
            <p
              key={r.id}
              className={styles.undo}
              onClick={() => handleUndoApprove(r.id)}
              style={{ cursor: "pointer", color: "green" }}
              title="Click to move back to pending"
            >
              {r.title} ✅
            </p>
          ))
        )}
      </section>

      <section className={styles.rejected}>
        <h2>Rejected</h2>
        {rejected.length === 0 ? (
          <p className={styles.placeholder}>None yet</p>
        ) : (
          rejected.map((r) => (
            <p
              key={r.id}
              className={styles.undo}
              onClick={() => handleUndoReject(r.id)}
              style={{ cursor: "pointer", color: "red" }}
              title="Click to move back to pending"
            >
              {r.title} ❌
            </p>
          ))
        )}
      </section>
    </main>
  );
}
