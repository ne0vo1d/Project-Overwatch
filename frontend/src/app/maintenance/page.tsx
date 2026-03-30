"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, X, Trash2, Wrench, Clock, CheckCircle, AlertCircle } from "lucide-react";
import { format, parseISO } from "date-fns";

interface MaintenanceWindow {
  id: string;
  name: string;
  description?: string;
  start_at: string;
  end_at: string;
  service_ids: string[];
  topics: string[];
  is_active: boolean;
  is_currently_active: boolean;
  created_at: string;
}

export default function MaintenancePage() {
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data: windows = [], isLoading } = useQuery<MaintenanceWindow[]>({
    queryKey: ["maintenance"],
    queryFn: () => api.get("/maintenance").then((r) => r.data),
    refetchInterval: 30_000,
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this maintenance window?")) return;
    await api.delete(`/maintenance/${id}`);
    qc.invalidateQueries({ queryKey: ["maintenance"] });
  };

  const now = new Date();
  const active = windows.filter((w) => w.is_currently_active);
  const upcoming = windows.filter((w) => !w.is_currently_active && new Date(w.start_at) > now);
  const past = windows.filter((w) => !w.is_currently_active && new Date(w.end_at) <= now);

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Maintenance Windows</h1>
          <p className="text-gray-500 text-sm mt-1">Silence notifications during planned maintenance</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus size={15} /> New Window
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-600">Loading…</p>
      ) : (
        <div className="space-y-8">
          {/* Active */}
          {active.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <CheckCircle size={15} className="text-green-400" />
                <h2 className="text-sm font-semibold text-green-400 uppercase tracking-wider">Active Now</h2>
              </div>
              <div className="grid gap-3">
                {active.map((w) => <WindowCard key={w.id} window={w} onDelete={handleDelete} />)}
              </div>
            </section>
          )}

          {/* Upcoming */}
          {upcoming.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <Clock size={15} className="text-blue-400" />
                <h2 className="text-sm font-semibold text-blue-400 uppercase tracking-wider">Upcoming</h2>
              </div>
              <div className="grid gap-3">
                {upcoming.map((w) => <WindowCard key={w.id} window={w} onDelete={handleDelete} />)}
              </div>
            </section>
          )}

          {/* Past */}
          {past.length > 0 && (
            <section>
              <div className="flex items-center gap-2 mb-3">
                <AlertCircle size={15} className="text-gray-500" />
                <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wider">Past</h2>
              </div>
              <div className="grid gap-3">
                {past.map((w) => <WindowCard key={w.id} window={w} onDelete={handleDelete} />)}
              </div>
            </section>
          )}

          {windows.length === 0 && (
            <p className="text-gray-600 text-sm">
              No maintenance windows. Create one to silence notifications during planned downtime.
            </p>
          )}
        </div>
      )}

      {showCreate && (
        <CreateWindowModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ["maintenance"] }); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function WindowCard({ window: w, onDelete }: { window: MaintenanceWindow; onDelete: (id: string) => void }) {
  const isActive = w.is_currently_active;
  const isPast = new Date(w.end_at) <= new Date();

  return (
    <div className={`bg-[#161b22] border rounded-lg p-5 ${isActive ? "border-green-800" : "border-gray-800"}`}>
      <div className="flex items-start justify-between mb-3">
        <div className="flex items-center gap-3">
          <Wrench size={15} className={isActive ? "text-green-400" : isPast ? "text-gray-600" : "text-blue-400"} />
          <div>
            <h3 className="font-semibold text-white">{w.name}</h3>
            {w.description && <p className="text-xs text-gray-500 mt-0.5">{w.description}</p>}
          </div>
          {isActive && (
            <span className="text-xs bg-green-900/40 border border-green-800 text-green-400 rounded-full px-2 py-0.5">
              ACTIVE
            </span>
          )}
        </div>
        {!isPast && (
          <button onClick={() => onDelete(w.id)} className="text-gray-600 hover:text-red-400 transition-colors">
            <Trash2 size={15} />
          </button>
        )}
      </div>

      <div className="ml-6 space-y-2 text-xs text-gray-500">
        <div className="flex items-center gap-2">
          <Clock size={11} />
          <span>
            {format(parseISO(w.start_at), "MMM d, yyyy HH:mm")} → {format(parseISO(w.end_at), "MMM d, yyyy HH:mm")}
          </span>
        </div>
        <div className="flex flex-wrap gap-3">
          {w.topics.length > 0 && (
            <span>
              Topics:{" "}
              {w.topics.map((t) => (
                <code key={t} className="text-gray-400 mr-1">{t}</code>
              ))}
            </span>
          )}
          {w.service_ids.length > 0 && (
            <span className="text-gray-500">{w.service_ids.length} service{w.service_ids.length !== 1 ? "s" : ""} silenced</span>
          )}
          {w.topics.length === 0 && w.service_ids.length === 0 && (
            <span className="text-yellow-600">All notifications silenced</span>
          )}
        </div>
      </div>
    </div>
  );
}

function CreateWindowModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [topics, setTopics] = useState("");
  const [serviceIds, setServiceIds] = useState("");
  const [loading, setLoading] = useState(false);

  // Default times: now → now+2h
  const toLocalInput = (d: Date) => {
    const pad = (n: number) => String(n).padStart(2, "0");
    return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/maintenance", {
        name,
        description: description || undefined,
        start_at: new Date(startAt).toISOString(),
        end_at: new Date(endAt).toISOString(),
        topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
        service_ids: serviceIds.split(",").map((t) => t.trim()).filter(Boolean),
      });
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  const now = new Date();
  const later = new Date(now.getTime() + 2 * 60 * 60 * 1000);

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="font-semibold text-white">New Maintenance Window</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Database migration v4.2"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Planned schema migration, expect brief downtime"
            />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Start *</label>
              <input
                type="datetime-local"
                value={startAt || toLocalInput(now)}
                onChange={(e) => setStartAt(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">End *</label>
              <input
                type="datetime-local"
                value={endAt || toLocalInput(later)}
                onChange={(e) => setEndAt(e.target.value)}
                required
                className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Topics to silence (comma-separated)</label>
            <input
              value={topics}
              onChange={(e) => setTopics(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="database, payments"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Service IDs to silence (comma-separated)</label>
            <input
              value={serviceIds}
              onChange={(e) => setServiceIds(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="svc-abc123, svc-def456"
            />
            <p className="text-xs text-gray-600 mt-1">Leave both empty to silence ALL notifications</p>
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium">
              {loading ? "Creating…" : "Create Window"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
