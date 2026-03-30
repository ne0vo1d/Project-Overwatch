"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listIncidents, createIncident } from "@/lib/api";
import { IncidentCard } from "@/components/incidents/IncidentCard";
import { Plus, X } from "lucide-react";
import type { IncidentSummary, Severity } from "@/lib/types";

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];
const STATUSES = ["new", "active", "stable", "resolved", "closed"];

export default function IncidentsPage() {
  const [statusFilter, setStatusFilter] = useState("");
  const [severityFilter, setSeverityFilter] = useState("");
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data: incidents = [], isLoading } = useQuery<IncidentSummary[]>({
    queryKey: ["incidents", statusFilter, severityFilter],
    queryFn: () =>
      listIncidents({
        ...(statusFilter && { status: statusFilter }),
        ...(severityFilter && { severity: severityFilter }),
      }).then((r) => r.data),
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Incidents</h1>
          <p className="text-gray-500 text-sm mt-1">{incidents.length} incidents</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus size={15} /> New Incident
        </button>
      </div>

      <div className="flex gap-3 mb-5">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All statuses</option>
          {STATUSES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select
          value={severityFilter}
          onChange={(e) => setSeverityFilter(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm text-white focus:outline-none focus:border-blue-500"
        >
          <option value="">All severities</option>
          {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
      </div>

      {isLoading ? (
        <p className="text-gray-600">Loading…</p>
      ) : (
        <div className="grid gap-3">
          {incidents.map((i) => <IncidentCard key={i.id} incident={i} />)}
          {incidents.length === 0 && <p className="text-gray-600 text-sm">No incidents found.</p>}
        </div>
      )}

      {showCreate && (
        <CreateIncidentModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ["incidents"] }); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function CreateIncidentModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [severity, setSeverity] = useState<Severity>("medium");
  const [topic, setTopic] = useState("incidents");
  const [tags, setTags] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createIncident({
        title,
        description: description || undefined,
        severity,
        topic: topic || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
      });
      onCreated();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create incident";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="font-semibold text-white">New Incident</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Title *</label>
            <input value={title} onChange={(e) => setTitle(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Brief description of the incident" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={3} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" placeholder="What is happening?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="incidents" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
            <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="database, prod, outage" />
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 text-sm font-medium transition-colors">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium transition-colors">{loading ? "Creating…" : "Create Incident"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
