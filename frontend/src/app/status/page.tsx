"use client";
import { useQuery } from "@tanstack/react-query";
import axios from "axios";
import { CheckCircle, AlertTriangle, XCircle, AlertCircle, Clock, Activity } from "lucide-react";
import { format } from "date-fns";

const baseURL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:8000";

interface ServiceStatus {
  service_id: string;
  service_name: string;
  status: "operational" | "degraded" | "outage" | "maintenance";
  open_incident_count: number;
  active_incident?: {
    id: string;
    title: string;
    severity: string;
    created_at: string;
  };
}

interface StatusPage {
  overall: "operational" | "degraded" | "outage" | "maintenance";
  services: ServiceStatus[];
  open_incidents: number;
  last_updated: string;
}

const STATUS_CONFIG = {
  operational: { label: "All Systems Operational", color: "text-green-400", bg: "bg-green-900/20 border-green-800", icon: CheckCircle },
  degraded: { label: "Partial Degradation", color: "text-yellow-400", bg: "bg-yellow-900/20 border-yellow-800", icon: AlertCircle },
  outage: { label: "Major Outage", color: "text-red-400", bg: "bg-red-900/20 border-red-800", icon: XCircle },
  maintenance: { label: "Under Maintenance", color: "text-blue-400", bg: "bg-blue-900/20 border-blue-800", icon: Clock },
};

const SEV_COLORS: Record<string, string> = {
  low: "text-green-400",
  medium: "text-yellow-400",
  high: "text-orange-400",
  critical: "text-red-400",
};

export default function StatusPage() {
  const { data, isLoading, error } = useQuery<StatusPage>({
    queryKey: ["status"],
    queryFn: () => axios.get(`${baseURL}/status`).then((r) => r.data),
    refetchInterval: 30_000,
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="flex items-center gap-3 text-gray-500">
          <Activity size={20} className="animate-pulse" />
          <span>Loading status…</span>
        </div>
      </div>
    );
  }

  if (error || !data) {
    return (
      <div className="min-h-screen bg-[#0d1117] flex items-center justify-center">
        <div className="text-center">
          <XCircle size={48} className="text-red-500 mx-auto mb-4" />
          <p className="text-white font-semibold text-lg">Unable to load status</p>
          <p className="text-gray-500 text-sm mt-1">Check your connection and try again.</p>
        </div>
      </div>
    );
  }

  const overall = STATUS_CONFIG[data.overall] ?? STATUS_CONFIG.operational;
  const OverallIcon = overall.icon;

  return (
    <div className="min-h-screen bg-[#0d1117] text-white">
      {/* Header */}
      <div className="border-b border-gray-800 px-6 py-4">
        <div className="max-w-3xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Activity size={20} className="text-blue-400" />
            <span className="font-bold text-white text-lg">System Status</span>
          </div>
          <span className="text-xs text-gray-600">
            Updated {format(new Date(data.last_updated), "HH:mm:ss")}
          </span>
        </div>
      </div>

      <div className="max-w-3xl mx-auto px-6 py-10">
        {/* Overall status banner */}
        <div className={`flex items-center gap-4 border rounded-xl p-5 mb-10 ${overall.bg}`}>
          <OverallIcon size={32} className={overall.color} />
          <div>
            <h1 className={`text-xl font-bold ${overall.color}`}>{overall.label}</h1>
            {data.open_incidents > 0 && (
              <p className="text-sm text-gray-400 mt-0.5">
                {data.open_incidents} active incident{data.open_incidents !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {/* Service list */}
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Services</h2>
        {data.services.length === 0 ? (
          <div className="bg-[#161b22] border border-gray-800 rounded-xl p-8 text-center">
            <p className="text-gray-500 text-sm">No services configured.</p>
          </div>
        ) : (
          <div className="space-y-2 mb-10">
            {data.services.map((svc) => {
              const cfg = STATUS_CONFIG[svc.status] ?? STATUS_CONFIG.operational;
              const SvcIcon = cfg.icon;
              return (
                <div
                  key={svc.service_id}
                  className="flex items-start justify-between bg-[#161b22] border border-gray-800 rounded-xl px-5 py-4"
                >
                  <div className="flex-1">
                    <div className="flex items-center gap-3">
                      <p className="font-medium text-white">{svc.service_name}</p>
                      {svc.active_incident && (
                        <span className={`text-xs font-semibold capitalize ${SEV_COLORS[svc.active_incident.severity] ?? "text-gray-400"}`}>
                          {svc.active_incident.severity}
                        </span>
                      )}
                    </div>
                    {svc.active_incident && (
                      <p className="text-xs text-gray-500 mt-1 line-clamp-1">{svc.active_incident.title}</p>
                    )}
                  </div>
                  <div className="flex items-center gap-2 shrink-0">
                    <span className={`text-sm font-medium ${cfg.color}`}>
                      {svc.status === "operational" ? "Operational" :
                       svc.status === "degraded" ? "Degraded" :
                       svc.status === "outage" ? "Outage" : "Maintenance"}
                    </span>
                    <SvcIcon size={16} className={cfg.color} />
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Active incidents */}
        {data.open_incidents > 0 && (
          <>
            <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Active Incidents</h2>
            <div className="space-y-2">
              {data.services
                .filter((s) => s.active_incident)
                .map((s) => (
                  <div key={s.active_incident!.id} className="bg-[#161b22] border border-gray-800 rounded-xl px-5 py-4">
                    <div className="flex items-center gap-2 mb-1">
                      <AlertTriangle size={14} className={SEV_COLORS[s.active_incident!.severity] ?? "text-gray-400"} />
                      <span className={`text-xs font-semibold capitalize ${SEV_COLORS[s.active_incident!.severity] ?? "text-gray-400"}`}>
                        {s.active_incident!.severity}
                      </span>
                      <span className="text-xs text-gray-600">·</span>
                      <span className="text-xs text-gray-500">{s.service_name}</span>
                    </div>
                    <p className="text-sm text-white">{s.active_incident!.title}</p>
                    <p className="text-xs text-gray-600 mt-1">
                      Started {format(new Date(s.active_incident!.created_at), "MMM d, HH:mm")}
                    </p>
                  </div>
                ))}
            </div>
          </>
        )}
      </div>

      {/* Footer */}
      <div className="border-t border-gray-800 px-6 py-4 mt-8">
        <div className="max-w-3xl mx-auto text-center text-xs text-gray-600">
          This status page is powered by{" "}
          <span className="text-gray-500">Project Overwatch</span>
          {" · "}Auto-refreshes every 30 seconds
        </div>
      </div>
    </div>
  );
}
