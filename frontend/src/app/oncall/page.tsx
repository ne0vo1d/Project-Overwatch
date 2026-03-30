"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, X, Trash2, Clock, User as UserIcon } from "lucide-react";
import { format } from "date-fns";

interface OnCallEntry {
  id: string;
  schedule_id: string;
  user_id: string;
  user_name?: string;
  user_email?: string;
  start_at: string;
  end_at: string;
  role: string;
}

interface Schedule {
  id: string;
  name: string;
  description?: string;
  service_id?: string;
  timezone: string;
  is_active: boolean;
  entries: OnCallEntry[];
}

interface CurrentOnCall {
  schedule_id: string;
  schedule_name: string;
  primary?: OnCallEntry;
  secondary?: OnCallEntry;
}

export default function OnCallPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [expandedSchedule, setExpandedSchedule] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: current = [] } = useQuery<CurrentOnCall[]>({
    queryKey: ["oncall-current"],
    queryFn: () => api.get("/oncall/current").then((r) => r.data),
    refetchInterval: 60_000,
  });

  const { data: schedules = [], isLoading } = useQuery<Schedule[]>({
    queryKey: ["oncall-schedules"],
    queryFn: () => api.get("/oncall/schedules").then((r) => r.data),
  });

  const handleDeleteSchedule = async (id: string) => {
    if (!confirm("Delete this schedule and all entries?")) return;
    await api.delete(`/oncall/schedules/${id}`);
    qc.invalidateQueries({ queryKey: ["oncall-schedules"] });
    qc.invalidateQueries({ queryKey: ["oncall-current"] });
  };

  const handleDeleteEntry = async (scheduleId: string, entryId: string) => {
    await api.delete(`/oncall/schedules/${scheduleId}/entries/${entryId}`);
    qc.invalidateQueries({ queryKey: ["oncall-schedules"] });
    qc.invalidateQueries({ queryKey: ["oncall-current"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">On-Call</h1>
          <p className="text-gray-500 text-sm mt-1">Schedules and rotation management</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus size={15} /> New Schedule
        </button>
      </div>

      {/* Current on-call */}
      {current.length > 0 && (
        <div className="mb-8">
          <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <span className="live-dot w-2 h-2 rounded-full bg-green-500 inline-block" />
            Currently On-Call
          </h2>
          <div className="grid gap-3">
            {current.map((c) => (
              <div key={c.schedule_id} className="bg-[#161b22] border border-gray-800 rounded-lg p-4">
                <p className="text-xs text-gray-500 mb-2 font-medium uppercase tracking-wide">{c.schedule_name}</p>
                <div className="flex gap-6">
                  {c.primary && (
                    <div>
                      <p className="text-xs text-green-400 font-semibold mb-0.5">Primary</p>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-green-900 border border-green-700 flex items-center justify-center text-xs font-bold text-green-400">
                          {c.primary.user_name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="text-sm text-white">{c.primary.user_name}</p>
                          <p className="text-xs text-gray-500">{c.primary.user_email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {c.secondary && (
                    <div>
                      <p className="text-xs text-blue-400 font-semibold mb-0.5">Secondary</p>
                      <div className="flex items-center gap-2">
                        <div className="w-7 h-7 rounded-full bg-blue-900 border border-blue-700 flex items-center justify-center text-xs font-bold text-blue-400">
                          {c.secondary.user_name?.[0]?.toUpperCase() ?? "?"}
                        </div>
                        <div>
                          <p className="text-sm text-white">{c.secondary.user_name}</p>
                          <p className="text-xs text-gray-500">{c.secondary.user_email}</p>
                        </div>
                      </div>
                    </div>
                  )}
                  {!c.primary && !c.secondary && (
                    <p className="text-sm text-gray-600">Nobody on call right now.</p>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* All schedules */}
      <h2 className="text-sm font-semibold text-gray-400 uppercase tracking-wider mb-3">All Schedules</h2>
      {isLoading ? (
        <p className="text-gray-600">Loading…</p>
      ) : (
        <div className="space-y-3">
          {schedules.map((sched) => (
            <div key={sched.id} className="bg-[#161b22] border border-gray-800 rounded-lg overflow-hidden">
              <div
                className="flex items-center justify-between p-4 cursor-pointer hover:bg-gray-800/30"
                onClick={() => setExpandedSchedule(expandedSchedule === sched.id ? null : sched.id)}
              >
                <div>
                  <span className="font-medium text-white">{sched.name}</span>
                  {!sched.is_active && <span className="ml-2 text-xs text-gray-600 border border-gray-700 rounded px-1.5">disabled</span>}
                  {sched.description && <p className="text-xs text-gray-500 mt-0.5">{sched.description}</p>}
                </div>
                <div className="flex items-center gap-3">
                  <span className="text-xs text-gray-500">{sched.entries.length} entries · {sched.timezone}</span>
                  <button onClick={(e) => { e.stopPropagation(); handleDeleteSchedule(sched.id); }} className="text-gray-600 hover:text-red-400">
                    <Trash2 size={14} />
                  </button>
                </div>
              </div>

              {expandedSchedule === sched.id && (
                <div className="border-t border-gray-800 p-4">
                  <div className="space-y-2 mb-4">
                    {sched.entries.map((entry) => (
                      <div key={entry.id} className="flex items-center gap-3 bg-gray-800/40 rounded px-3 py-2">
                        <div className={`w-2 h-2 rounded-full ${entry.role === "primary" ? "bg-green-500" : "bg-blue-500"}`} />
                        <div className="flex-1">
                          <span className="text-sm text-white">{entry.user_name ?? entry.user_id}</span>
                          <span className="text-xs text-gray-500 ml-2 capitalize">({entry.role})</span>
                        </div>
                        <span className="text-xs text-gray-500">
                          {format(new Date(entry.start_at), "MMM d HH:mm")} → {format(new Date(entry.end_at), "MMM d HH:mm")}
                        </span>
                        <button onClick={() => handleDeleteEntry(sched.id, entry.id)} className="text-gray-600 hover:text-red-400">
                          <Trash2 size={12} />
                        </button>
                      </div>
                    ))}
                    {sched.entries.length === 0 && <p className="text-gray-600 text-sm">No entries yet.</p>}
                  </div>
                  <AddEntryForm scheduleId={sched.id} onAdded={() => qc.invalidateQueries({ queryKey: ["oncall-schedules", "oncall-current"] })} />
                </div>
              )}
            </div>
          ))}
          {schedules.length === 0 && (
            <p className="text-gray-600 text-sm">No schedules yet. Create one to define who gets auto-assigned as incident commander.</p>
          )}
        </div>
      )}

      {showCreate && (
        <CreateScheduleModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ["oncall-schedules"] }); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function AddEntryForm({ scheduleId, onAdded }: { scheduleId: string; onAdded: () => void }) {
  const [userId, setUserId] = useState("");
  const [startAt, setStartAt] = useState("");
  const [endAt, setEndAt] = useState("");
  const [role, setRole] = useState("primary");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/oncall/schedules/${scheduleId}/entries`, {
        user_id: userId, start_at: startAt, end_at: endAt, role,
      });
      setUserId(""); setStartAt(""); setEndAt("");
      onAdded();
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="flex gap-2 flex-wrap">
      <input value={userId} onChange={(e) => setUserId(e.target.value)} required placeholder="User ID" className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500 flex-1 min-w-[140px]" />
      <input type="datetime-local" value={startAt} onChange={(e) => setStartAt(e.target.value)} required className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500" />
      <input type="datetime-local" value={endAt} onChange={(e) => setEndAt(e.target.value)} required className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none focus:border-blue-500" />
      <select value={role} onChange={(e) => setRole(e.target.value)} className="bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-xs text-white focus:outline-none">
        <option value="primary">Primary</option>
        <option value="secondary">Secondary</option>
      </select>
      <button type="submit" disabled={loading} className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-3 py-1.5 text-xs font-medium">Add</button>
    </form>
  );
}

function CreateScheduleModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [timezone, setTimezone] = useState("UTC");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/oncall/schedules", { name, description: description || undefined, timezone });
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="font-semibold text-white">New On-Call Schedule</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Primary On-Call" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Weekly rotation…" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Timezone</label>
            <input value={timezone} onChange={(e) => setTimezone(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" placeholder="UTC" />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium">{loading ? "Creating…" : "Create"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
