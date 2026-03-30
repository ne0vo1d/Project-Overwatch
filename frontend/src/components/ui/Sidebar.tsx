"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AlertTriangle, Bell, Radio, Settings, Shield } from "lucide-react";
import { clsx } from "clsx";

const nav = [
  { href: "/", label: "Dashboard", icon: Shield },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/channels", label: "Channels", icon: Radio },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  return (
    <aside className="w-56 bg-[#161b22] border-r border-gray-800 flex flex-col py-6 px-3 shrink-0">
      <div className="flex items-center gap-2 px-3 mb-8">
        <Shield className="text-red-500" size={22} />
        <span className="font-bold text-white text-lg tracking-tight">Overwatch</span>
      </div>
      <nav className="flex flex-col gap-1">
        {nav.map(({ href, label, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            className={clsx(
              "flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-colors",
              path === href || (href !== "/" && path.startsWith(href))
                ? "bg-gray-700 text-white"
                : "text-gray-400 hover:text-white hover:bg-gray-800"
            )}
          >
            <Icon size={16} />
            {label}
          </Link>
        ))}
      </nav>
    </aside>
  );
}
