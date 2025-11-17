"use client";

import Link from "next/link";
import { useSession, signIn, signOut } from "next-auth/react";
import styles from "./NavBar.module.css";

export default function NavBar() {
  const { data: session, status } = useSession();

  console.log(session);

  return (
    <div className={styles.container}>
      <nav className={styles.navbar}>
        <div className={styles.navInner}>
          <ul className={styles["nav--list"]}>
            <li className={styles.item}>
              <Link href="/">Home</Link>
            </li>
            <li className={styles.item}>
              <Link href="/about">About</Link>
            </li>
            <li className={styles.item}>
              <Link href="/catalog-navigator">Catalog Navigator</Link>
            </li>
            <li className={styles.item}>
              <Link href="/review_history">Review History</Link>
            </li>
            {session?.user?.role?.toUpperCase() === "ADMIN" && (
              <li className={styles.item}>
                <Link href="/admin-crud">User Index</Link>
              </li>
            )}
            
          </ul>

          {/* --- Authentication Controls --- */}
          <div className={styles.authContainer}>
            {status === "loading" && <span>Loading...</span>}

            {!session && (
              <button
                onClick={() => signIn()}
                className={styles.authButton}
              >
                Sign In
              </button>
            )}

            {session && (
              <button onClick={() => signOut()} className={styles.authButton}>
                Sign Out ({session.user?.name?.split(" ")[0]})
              </button>
            )}
          </div>
        </div>
      </nav>
    </div>
  );
}