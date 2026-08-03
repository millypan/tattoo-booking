"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

export default function ActiveNav() {
  const pathname = usePathname();
  const isCustom = pathname === "/custom" || pathname.startsWith("/custom/");

  return (
    <nav className="top" aria-label="主要頁面">
      <Link href="/" className={isCustom ? undefined : "on"}>認領圖</Link>
      <Link href="/custom" className={isCustom ? "on" : undefined}>客製刺青</Link>
    </nav>
  );
}
