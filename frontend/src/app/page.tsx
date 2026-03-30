"use client";
import { useQuery } from "@tanstack/react-query";
import { listIncidents } from "@/lib/api";
import { IncidentCard } from "@/components/incidents/IncidentCard";
import { AlertTriangle, CheckCircle2, Activity, Clock } from "lucide-react";
import type { IncidentSummary } from "@/lib/types";

export default function DashboardPage() {
  const { data: incidents = [], isLoading } = useQuery<IncidentSummary[]>({
    queryKey: ["incidents"],
    queryFn: () => listIncidents({ limit: 100 }).then((r) => r.data),
  });

  const active = incidents.filter((i) => i.status === "active");
  const newOnes = incidents.filter((i) => i.status === "new");
  const stable = incidents.filter((i) => i.status === "stable");
  const resolved = incidents.filter((i) => ["resolved", "closed"].includes(i.status));
  const critical = incidents.filter((i) => i.severity === "critical" && !["resolved", "closed"].includes(i.status));

  const stats = [
    { label: "Active", value: active.length, icon: Activity, color: "text-red-400" },
    { label: "New", value: newOnes.length, icon: Clock, color: "text-blue-400" },
    { label: "Stable", value: stable.length, icon: AlertTriangle, color: "text-yellow-400" },
    { label: "Resolved (24h)", value: resolved.length, icon: CheckCircle2, color: "text-green-400" },
  ];

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Dashboard</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time incident overview</p>
      </div>

      <div className="grid grid-cols-4 gap-4 mb-8">
        {stats.map((s) => (
          <div key={s.label} className="bg-[#161b22] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-sm">{s.label}</span>
              <s.icon size={16} className={s.color} />
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {critical.length > 0 && (
        <div className="mb-6">
          <h2 className="text-sm font-semibold text-red-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="live-dot w-2 h-2 rounded-full bg-red-500 inline-block" />
            Critical
          </h2>
          <div className="grid gap-3">
            {critical.map((i) => <IncidentCard key={i.id} incident={i} />)}
          </div>
        </div>
      )}

      <div>
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">
          All Open Incidents
        </h2>
        {isLoading ? (
          <p className="text-gray-600">Loading…</p>
        ) : (
          <div className="grid gap-3">
            {incidents
              .filter((i) => !["resolved", "closed"].includes(i.status))
              .map((i) => <IncidentCard key={i.id} incident={i} />)}
            {incidents.filter((i) => !["resolved", "closed"].includes(i.status)).length === 0 && (
              <p className="text-gray-600 text-sm">No open incidents.</p>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
