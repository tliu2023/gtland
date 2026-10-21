"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

const tabs = [
  { href: "/catalog", label: "Catalog", match: ["/catalog", "/products"] },
  { href: "/dashboard", label: "Dashboard", match: ["/dashboard"] },
  { href: "/contact", label: "Contact", match: ["/contact"] },
];

export function NavTabs() {
  const pathname = usePathname();
  return (
    <nav aria-label="Main" className="flex items-stretch gap-6 self-stretch text-sm font-medium">
      {tabs.map(({ href, label, match }) => {
        const active = match.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`));
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={`flex items-center border-b-2 ${
              active
                ? "border-black text-black dark:border-white dark:text-zinc-50"
                : "border-transparent text-zinc-500 hover:text-black dark:hover:text-zinc-50"
            }`}
          >
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
