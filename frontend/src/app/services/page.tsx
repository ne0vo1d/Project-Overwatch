"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, X, Trash2, Tag, Users } from "lucide-react";
import type { User } from "@/lib/types";

interface ServiceMember {
  id: string;
  user_id: string;
  role: string;
  user_name?: string;
  user_email?: string;
}

interface Service {
  id: string;
  name: string;
  slug: string;
  description?: string;
  owner_id?: string;
  tags: string[];
  topic?: string;
  members: ServiceMember[];
}

const ROLES = ["owner", "member", "oncall"];

export default function ServicesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data: services = [], isLoading } = useQuery<Service[]>({
    queryKey: ["services"],
    queryFn: () => api.get("/services").then((r) => r.data),
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this service?")) return;
    await api.delete(`/services/${id}`);
    qc.invalidateQueries({ queryKey: ["services"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Services</h1>
          <p className="text-gray-500 text-sm mt-1">Service catalog — owns incidents and on-call schedules</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus size={15} /> New Service
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-600">Loading…</p>
      ) : (
        <div className="grid gap-4">
          {services.map((svc) => (
            <div key={svc.id} className="bg-[#161b22] border border-gray-800 rounded-lg p-5">
              <div className="flex items-start justify-between mb-3">
                <div>
                  <h3 className="font-semibold text-white">{svc.name}</h3>
                  <code className="text-xs text-gray-500">{svc.slug}</code>
                  {svc.description && <p className="text-sm text-gray-400 mt-1">{svc.description}</p>}
                </div>
                <button onClick={() => handleDelete(svc.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="flex items-center gap-4 text-xs text-gray-500 mb-3">
                {svc.topic && (
                  <span className="flex items-center gap-1">
                    <Tag size={11} /> topic: <code className="text-gray-400">{svc.topic}</code>
                  </span>
                )}
                <span className="flex items-center gap-1">
                  <Users size={11} /> {svc.members.length} member{svc.members.length !== 1 ? "s" : ""}
                </span>
              </div>

              {svc.tags.length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {svc.tags.map((t) => (
                    <span key={t} className="bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-xs text-gray-400">{t}</span>
                  ))}
                </div>
              )}

              {svc.members.length > 0 && (
                <div className="flex flex-wrap gap-2">
                  {svc.members.map((m) => (
                    <div key={m.id} className="flex items-center gap-1.5 bg-gray-800 border border-gray-700 rounded-full px-3 py-1">
                      <div className="w-4 h-4 rounded-full bg-gray-600 flex items-center justify-center text-xs font-bold text-white">
                        {m.user_name?.[0]?.toUpperCase() ?? "?"}
                      </div>
                      <span className="text-xs text-gray-300">{m.user_name ?? m.user_id}</span>
                      <span className="text-xs text-gray-600 capitalize">{m.role}</span>
                    </div>
                  ))}
                </div>
              )}
            </div>
          ))}
          {services.length === 0 && (
            <p className="text-gray-600 text-sm">No services yet. Create one to enable auto-participant assembly and on-call routing.</p>
          )}
        </div>
      )}

      {showCreate && (
        <CreateServiceModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ["services"] }); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function CreateServiceModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [slug, setSlug] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [topic, setTopic] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleNameChange = (v: string) => {
    setName(v);
    if (!slug) setSlug(v.toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, ""));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await api.post("/services", {
        name, slug, description: description || undefined,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        topic: topic || undefined,
      });
      onCreated();
    } catch {
      setError("Failed to create service. Slug may already exist.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-lg">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="font-semibold text-white">New Service</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Name *</label>
            <input value={name} onChange={(e) => handleNameChange(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Payments API" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Slug *</label>
            <input value={slug} onChange={(e) => setSlug(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" placeholder="payments-api" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" placeholder="What does this service do?" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="prod, database" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Default Topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="payments" />
            </div>
          </div>
          {error && <p className="text-red-400 text-sm">{error}</p>}
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium">{loading ? "Creating…" : "Create Service"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
