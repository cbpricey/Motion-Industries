"use client";

import {useState} from "react"
import ReviewCard, {ReviewCardProps} from "../../components/ReviewCard"
import styles from "../page.module.css"
import mockIndex from "../../data/mock_index.json"

const foundSKUImages = mockIndex as ReviewCardProps[];


export default function Review () {
  const [pending, setPending] = useState(foundSKUImages);
  const [approved, setApproved] = useState<ReviewCardProps[]>([]);
  const [rejected, setRejected] = useState<ReviewCardProps[]>([]);

  function handleApprove(sku: string) {
    const review = pending.find((r) => r.sku === sku);
    if (!review) return;

    setApproved((prev) => [...prev, review]);
    setPending((prev) => prev.filter((r) => r.sku !== sku));
  }

  // function handleSearch(sku: string) {
  //   const review[] = pending.find()
  // }

  function handleReject(sku: string) {
    const review = pending.find((r) => r.sku === sku);
    if (!review) return;

    setRejected((prev) => [...prev, review]);
    setPending((prev) => prev.filter((r) => r.sku !== sku));
  }

  /** Undo an approval/rejection (moves image back to top of pending) */
  function handleUndoApprove(sku: string) {
    const review = approved.find((r) => r.sku === sku);
    if (!review) return;

    setPending((prev) => [review, ...prev]); // add to top
    setApproved((prev) => prev.filter((r) => r.sku !== sku));
  }

  function handleUndoReject(sku: string) {
    const review = rejected.find((r) => r.sku === sku);
    if (!review) return;

    setPending((prev) => [review, ...prev]); // add to top
    setRejected((prev) => prev.filter((r) => r.sku !== sku));
  }

  const current = pending[0];

  return (
    <main className={styles.main}>
      <h1 className={styles.header}>Motion Industries Review Flow</h1>

      <section className={styles.pending}>
        <h2 className={styles.pendingTitle}>Pending Review</h2>
        <div className={styles.pendingCard}>
          {current ? (
            <ReviewCard
              key={current.sku}
              {...current}
              onApprove={() => handleApprove(current.sku)}
              onReject={() => handleReject(current.sku)}
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
              key={r.sku}
              className={styles.undo}
              onClick={() => handleUndoApprove(r.sku)}
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
              key={r.sku}
              className={styles.undo}
              onClick={() => handleUndoReject(r.sku)}
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