"use client";
import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { Sidebar } from "./Sidebar";

const PUBLIC_PATHS = ["/login"];

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const router = useRouter();
  const [checked, setChecked] = useState(false);

  const isPublic = PUBLIC_PATHS.includes(pathname);

  useEffect(() => {
    const token = localStorage.getItem("token");
    if (!token && !isPublic) {
      router.replace("/login");
    } else {
      setChecked(true);
    }
  }, [pathname, isPublic, router]);

  // Login page — full screen, no sidebar
  if (isPublic) {
    return <>{children}</>;
  }

  // Waiting for auth check — show nothing to avoid flash
  if (!checked) {
    return null;
  }

  return (
    <div className="flex h-screen">
      <Sidebar />
      <main className="flex-1 overflow-y-auto p-6">{children}</main>
    </div>
  );
}
