"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { AlertTriangle, Bell, Radio, Settings, Shield, Server, Clock, LogOut, BarChart2, BookOpen, Wrench, Zap } from "lucide-react";
import { clsx } from "clsx";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api";

const nav = [
  { href: "/", label: "Dashboard", icon: Shield },
  { href: "/incidents", label: "Incidents", icon: AlertTriangle },
  { href: "/services", label: "Services", icon: Server },
  { href: "/oncall", label: "On-Call", icon: Clock },
  { href: "/metrics", label: "Metrics", icon: BarChart2 },
  { href: "/templates", label: "Templates", icon: BookOpen },
  { href: "/escalations", label: "Escalations", icon: Zap },
  { href: "/maintenance", label: "Maintenance", icon: Wrench },
  { href: "/notifications", label: "Notifications", icon: Bell },
  { href: "/channels", label: "Channels", icon: Radio },
  { href: "/settings", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const path = usePathname();
  const router = useRouter();

  const { data: user } = useQuery({
    queryKey: ["me"],
    queryFn: () => getMe().then((r) => r.data),
    retry: false,
  });

  const handleSignOut = () => {
    localStorage.removeItem("token");
    router.push("/login");
  };

  return (
    <aside className="w-56 bg-[#161b22] border-r border-gray-800 flex flex-col py-6 px-3 shrink-0">
      <div className="flex items-center gap-2 px-3 mb-8">
        <Shield className="text-red-500" size={22} />
        <span className="font-bold text-white text-lg tracking-tight">Overwatch</span>
      </div>

      <nav className="flex flex-col gap-1 flex-1">
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

      {/* User info + sign out */}
      <div className="mt-4 pt-4 border-t border-gray-800">
        {user && (
          <div className="px-3 mb-2">
            <p className="text-xs font-medium text-white truncate">{user.name}</p>
            <p className="text-xs text-gray-500 truncate">{user.email}</p>
          </div>
        )}
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-lg text-sm font-medium text-gray-500 hover:text-white hover:bg-gray-800 transition-colors"
        >
          <LogOut size={16} />
          Sign Out
        </button>
      </div>
    </aside>
  );
}
