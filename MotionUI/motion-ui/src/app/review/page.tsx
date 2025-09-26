"use client";

import { useEffect, useState } from "react";
import ReviewCard, { ReviewCardProps } from "../../components/ReviewCard";
import styles from "../page.module.css";
import mockIndex from "../../data/mock_index.json";

const foundSKUImages = mockIndex as ReviewCardProps[];

export default function Review() {
  const [selectedManufacturer, setSelectedManufacturer] =
    useState<string>("All");
  const [pending, setPending] = useState<ReviewCardProps[]>([]);
  const [approved, setApproved] = useState<ReviewCardProps[]>([]);
  const [rejected, setRejected] = useState<ReviewCardProps[]>([]);

  // Fetch from backend
  useEffect(() => {
    async function fetchProducts() {
      const res = await fetch("/api/products");
      const data = await res.json();
      setPending(data); // seed pending with live Elastic docs
    }
    fetchProducts();
  }, []);

  function handleApprove(id: number) {
    const review = pending.find((r) => r.id === id);
    if (!review) return;

    setApproved((prev) => [...prev, review]);
    setPending((prev) => prev.filter((r) => r.id !== id));
  }

  // function handleSearch(sku: string) {
  //   const review[] = pending.find()
  // }

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
  const filteredPending =
    selectedManufacturer === "All"
      ? pending
      : pending.filter((r) => r.manufacturer === selectedManufacturer);

  const current = filteredPending[0];

  return (
    <main className={styles.main}>
      <h1 className={styles.header}>Motion Industries Review Flow</h1>

      <div className={styles.filterContainer}>
        <label htmlFor="manufacturerFilter">Filter by Manufacturer: </label>
        <select
          id="manufacturerFilter"
          value={selectedManufacturer}
          onChange={(e) => setSelectedManufacturer(e.target.value)}
        >
          <option value="All">All</option>
          {[...new Set(pending.map((r) => r.manufacturer))].map((m) => (
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
