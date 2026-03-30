"use client";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  AreaChart, Area, BarChart, Bar, XAxis, YAxis, CartesianGrid,
  Tooltip, ResponsiveContainer, Cell, PieChart, Pie, Legend,
} from "recharts";
import { format } from "date-fns";
import { TrendingUp, Clock, AlertTriangle, CheckCircle2 } from "lucide-react";

interface Metrics {
  total_incidents: number;
  open_incidents: number;
  resolved_last_30d: number;
  severity_breakdown: Record<string, number>;
  status_breakdown: Record<string, number>;
  mttr_minutes: number | null;
  mttr_by_severity: Record<string, number | null>;
  daily_counts: { date: string; count: number }[];
  top_services: { service_id: string; service_name: string; count: number }[];
}

const SEV_COLORS: Record<string, string> = {
  low: "#36a64f",
  medium: "#f0c929",
  high: "#e07b39",
  critical: "#cc0000",
};

const STATUS_COLORS: Record<string, string> = {
  new: "#3b82f6",
  active: "#ef4444",
  stable: "#22c55e",
  resolved: "#6b7280",
  closed: "#374151",
};

function mttrLabel(minutes: number | null): string {
  if (!minutes) return "—";
  const h = Math.floor(minutes / 60);
  const m = Math.round(minutes % 60);
  return h > 0 ? `${h}h ${m}m` : `${m}m`;
}

export default function MetricsPage() {
  const { data, isLoading } = useQuery<Metrics>({
    queryKey: ["metrics"],
    queryFn: () => api.get("/metrics").then((r) => r.data),
    refetchInterval: 60_000,
  });

  if (isLoading || !data) return <p className="text-gray-500">Loading…</p>;

  const severityPieData = Object.entries(data.severity_breakdown)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v }));

  const statusPieData = Object.entries(data.status_breakdown)
    .filter(([, v]) => v > 0)
    .map(([k, v]) => ({ name: k, value: v }));

  const dailyData = data.daily_counts.map((d) => ({
    date: format(new Date(d.date), "MMM d"),
    count: d.count,
  }));

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Metrics</h1>
        <p className="text-gray-500 text-sm mt-1">Last 30 days · updates every minute</p>
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-4 gap-4 mb-8">
        {[
          { label: "Total Incidents", value: data.total_incidents, icon: AlertTriangle, color: "text-white" },
          { label: "Open Right Now", value: data.open_incidents, icon: TrendingUp, color: "text-red-400" },
          { label: "Resolved (30d)", value: data.resolved_last_30d, icon: CheckCircle2, color: "text-green-400" },
          { label: "Avg MTTR", value: mttrLabel(data.mttr_minutes), icon: Clock, color: "text-blue-400" },
        ].map((s) => (
          <div key={s.label} className="bg-[#161b22] border border-gray-800 rounded-lg p-4">
            <div className="flex items-center justify-between mb-2">
              <span className="text-gray-500 text-xs">{s.label}</span>
              <s.icon size={15} className={s.color} />
            </div>
            <p className={`text-3xl font-bold ${s.color}`}>{s.value}</p>
          </div>
        ))}
      </div>

      {/* Daily chart */}
      <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5 mb-6">
        <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">
          Incidents per day — last 30 days
        </h2>
        <ResponsiveContainer width="100%" height={200}>
          <AreaChart data={dailyData} margin={{ top: 5, right: 10, left: -20, bottom: 0 }}>
            <defs>
              <linearGradient id="incidentGrad" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="#21262d" />
            <XAxis dataKey="date" tick={{ fill: "#6e7681", fontSize: 11 }} tickLine={false} axisLine={false} interval={4} />
            <YAxis tick={{ fill: "#6e7681", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
            <Tooltip
              contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: "#e2e8f0" }}
              itemStyle={{ color: "#3b82f6" }}
            />
            <Area type="monotone" dataKey="count" name="Incidents" stroke="#3b82f6" strokeWidth={2} fill="url(#incidentGrad)" />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      <div className="grid grid-cols-3 gap-6 mb-6">
        {/* Severity breakdown */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">By Severity</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={severityPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                {severityPieData.map((entry) => (
                  <Cell key={entry.name} fill={SEV_COLORS[entry.name] ?? "#6b7280"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: "#8b949e", fontSize: 12 }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* Status breakdown */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">By Status</h2>
          <ResponsiveContainer width="100%" height={160}>
            <PieChart>
              <Pie data={statusPieData} cx="50%" cy="50%" innerRadius={45} outerRadius={65} dataKey="value" paddingAngle={3}>
                {statusPieData.map((entry) => (
                  <Cell key={entry.name} fill={STATUS_COLORS[entry.name] ?? "#6b7280"} />
                ))}
              </Pie>
              <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, fontSize: 12 }} />
              <Legend iconType="circle" iconSize={8} formatter={(v) => <span style={{ color: "#8b949e", fontSize: 12, textTransform: "capitalize" }}>{v}</span>} />
            </PieChart>
          </ResponsiveContainer>
        </div>

        {/* MTTR by severity */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">MTTR by Severity</h2>
          <div className="space-y-3 mt-2">
            {(["critical", "high", "medium", "low"] as const).map((sev) => {
              const val = data.mttr_by_severity[sev];
              return (
                <div key={sev} className="flex items-center justify-between">
                  <span className="text-xs capitalize" style={{ color: SEV_COLORS[sev] }}>{sev}</span>
                  <span className="text-sm font-mono text-white">{mttrLabel(val)}</span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* Top services */}
      {data.top_services.length > 0 && (
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-5">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-4">Top Services by Incident Count</h2>
          <ResponsiveContainer width="100%" height={180}>
            <BarChart data={data.top_services} layout="vertical" margin={{ left: 0, right: 20 }}>
              <CartesianGrid strokeDasharray="3 3" stroke="#21262d" horizontal={false} />
              <XAxis type="number" tick={{ fill: "#6e7681", fontSize: 11 }} tickLine={false} axisLine={false} allowDecimals={false} />
              <YAxis type="category" dataKey="service_name" tick={{ fill: "#e2e8f0", fontSize: 12 }} tickLine={false} axisLine={false} width={120} />
              <Tooltip contentStyle={{ background: "#161b22", border: "1px solid #30363d", borderRadius: 8, fontSize: 12 }} />
              <Bar dataKey="count" name="Incidents" fill="#3b82f6" radius={[0, 4, 4, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </div>
      )}
    </div>
  );
}
