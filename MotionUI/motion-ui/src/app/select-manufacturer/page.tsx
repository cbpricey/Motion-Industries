"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import styles from "../page.module.css";

export default function SelectManufacturerPage() {
  const router = useRouter();
  const [manufacturer, setManufacturer] = useState("All");

  const handleStart = () => {
    router.push(`/review?manufacturer=${encodeURIComponent(manufacturer)}`);
  };

  return (
    <main className={styles.main}>
      <h1 className={styles.header}>Select Manufacturer</h1>

      <div className={styles.filterContainer}>
        <label htmlFor="manufacturerFilter">Manufacturer: </label>
        <select
          id="manufacturerFilter"
          value={manufacturer}
          onChange={(e) => setManufacturer(e.target.value)}
        >
          <option value="All">All</option>
          <option value="Danfoss">Danfoss</option>
          <option value="Emerson">Emerson</option>
          <option value="Timken">Timken</option>
          {/* TODO: Make dynamic from Elastic */}
        </select>
      </div>

      <button onClick={handleStart} className={styles.button}>
        Start Reviewing
      </button>
    </main>
  );
}
