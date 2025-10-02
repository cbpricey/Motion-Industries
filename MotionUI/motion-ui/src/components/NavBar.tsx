"use client";

import Link from "next/link";
import styles from "./NavBar.module.css";

export default function NavBar() {
  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <ul className={styles["nav--list"]}>
          <li className={styles.active}></li>
          <li className={styles.item}>
            <Link href="/">Home</Link>
          </li>
          <li className={styles.item}>
            <Link href="/about">About</Link>
          </li>
          <li className={styles.item}>
            <Link href="/select-manufacturer">SKU Tinder</Link>
          </li>
        </ul>
      </nav>
    </div>
  );
}
