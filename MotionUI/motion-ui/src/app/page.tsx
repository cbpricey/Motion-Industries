"use client";

import { useState } from 'react';
import ReviewCard, {ReviewCardProps} from '../components/ReviewCard'
import styles from "./page.module.css";

type SKU = ReviewCardProps & { id: number };

const foundSKUImages: SKU[] = [
    {
        id: 1,
        title: "Ball Bearing",
        text: "Good resolution",
        rating: 4,
        imageSrc: "https://picsum.photos/300/200",
        imageAlt: "Sample product",
        isFeatured: true,
    },
    {
        id: 2,
        title: "Engine",
        text: "Low resolution",
        rating: 2,
        imageSrc: "https://picsum.photos/300/201",
        imageAlt: "Another product",
        isFeatured: false,
    },
    {
        id: 3,
        title: "Pump",
        text: "Clear Image",
        rating: 5,
        imageSrc: "https://picsum.photos/300/202",
        imageAlt: "Another product",
        isFeatured: false,
    },
    {
        id: 4,
        title: "Air Filter",
        text: "Blurry",
        rating: 3,
        imageSrc: "https://picsum.photos/300/203",
        imageAlt: "Another product",
        isFeatured: false,
    },
    {
        id: 5,
        title: "Hose",
        text: "Clear image w/ watermark",
        rating: 3,
        imageSrc: "https://picsum.photos/300/204",
        imageAlt: "Another product",
        isFeatured: false,
    },
    {
        id: 6,
        title: "Pipe",
        text: "Cluttered background",
        rating: 2,
        imageSrc: "https://picsum.photos/300/205",
        imageAlt: "Another product",
        isFeatured: false,
    },
];

export default function MyApp() {
  const [pending, setPending] = useState(foundSKUImages);
  const [approved, setApproved] = useState<SKU[]>([]);
  const [rejected, setRejected] = useState<SKU[]>([]);

  function handleApprove(id: number) {
    const review = pending.find(r => r.id === id);
    if (!review) return;

    setApproved((prev) => [...prev, review]);
    setPending((prev) => prev.filter(r => r.id !== id));
  }

  function handleReject(id: number) {
    const review = pending.find(r => r.id === id);
    if (!review) return;

    setRejected((prev) => [...prev, review]);
    setPending((prev) => prev.filter(r => r.id !== id));
  }

  const current = pending[0];

  return (
    <main className={styles.main}>
      <h1 className={styles.header}>
        Motion Industries Review Flow
      </h1>

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
            approved.map(r => <p key={r.id}>{r.title} ✅</p>)
          )}
      </section>

      <section className={styles.rejected}>
          <h2>Rejected</h2>
          {rejected.length === 0 ? (
            <p className={styles.placeholder}>None yet</p>
          ) : (
            rejected.map(r => <p key={r.id}>{r.title} ❌</p>)
          )}
      </section>
    </main>
  );
}