"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, X, Trash2, BookOpen, ExternalLink } from "lucide-react";
import { SeverityBadge } from "@/components/ui/Badge";
import type { Severity } from "@/lib/types";

interface TaskItem { title: string; description?: string }
interface Template {
  id: string; name: string; description?: string;
  incident_title_template?: string; incident_description_template?: string;
  severity: Severity; tags: string[]; topic?: string;
  service_id?: string; runbook_url?: string; tasks: TaskItem[];
}

const SEVERITIES: Severity[] = ["low", "medium", "high", "critical"];

export default function TemplatesPage() {
  const [showCreate, setShowCreate] = useState(false);
  const qc = useQueryClient();

  const { data: templates = [], isLoading } = useQuery<Template[]>({
    queryKey: ["templates"],
    queryFn: () => api.get("/templates").then((r) => r.data),
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this template?")) return;
    await api.delete(`/templates/${id}`);
    qc.invalidateQueries({ queryKey: ["templates"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Incident Templates</h1>
          <p className="text-gray-500 text-sm mt-1">Playbooks that pre-fill incidents with the right severity, tags, and tasks</p>
        </div>
        <button onClick={() => setShowCreate(true)} className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium">
          <Plus size={15} /> New Template
        </button>
      </div>

      {isLoading ? <p className="text-gray-600">Loading…</p> : (
        <div className="grid gap-4">
          {templates.map((t) => (
            <div key={t.id} className="bg-[#161b22] border border-gray-800 rounded-lg p-5">
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <BookOpen size={15} className="text-blue-400" />
                    <h3 className="font-semibold text-white">{t.name}</h3>
                    <SeverityBadge severity={t.severity} />
                  </div>
                  {t.description && <p className="text-sm text-gray-500 ml-6">{t.description}</p>}
                </div>
                <button onClick={() => handleDelete(t.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                  <Trash2 size={15} />
                </button>
              </div>

              <div className="ml-6 space-y-2">
                {t.incident_title_template && (
                  <p className="text-xs text-gray-400">
                    <span className="text-gray-600">Title: </span>{t.incident_title_template}
                  </p>
                )}
                <div className="flex flex-wrap gap-3 text-xs text-gray-500">
                  {t.topic && <span>Topic: <code className="text-gray-400">{t.topic}</code></span>}
                  {t.tags.length > 0 && (
                    <span className="flex gap-1">
                      {t.tags.map((tag) => (
                        <span key={tag} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-400">{tag}</span>
                      ))}
                    </span>
                  )}
                  {t.runbook_url && (
                    <a href={t.runbook_url} target="_blank" rel="noopener noreferrer"
                      className="flex items-center gap-1 text-blue-400 hover:text-blue-300">
                      <ExternalLink size={11} /> Runbook
                    </a>
                  )}
                </div>
                {t.tasks.length > 0 && (
                  <div>
                    <p className="text-xs text-gray-600 mb-1">{t.tasks.length} pre-defined task{t.tasks.length !== 1 ? "s" : ""}</p>
                    <div className="flex flex-wrap gap-1">
                      {t.tasks.slice(0, 5).map((task, i) => (
                        <span key={i} className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-gray-400">{task.title}</span>
                      ))}
                      {t.tasks.length > 5 && <span className="text-xs text-gray-600">+{t.tasks.length - 5} more</span>}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {templates.length === 0 && (
            <p className="text-gray-600 text-sm">No templates yet. Create a "Database Outage" or "Security Breach" template to speed up incident creation.</p>
          )}
        </div>
      )}

      {showCreate && (
        <CreateTemplateModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ["templates"] }); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function CreateTemplateModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [titleTemplate, setTitleTemplate] = useState("");
  const [descTemplate, setDescTemplate] = useState("");
  const [severity, setSeverity] = useState<Severity>("high");
  const [tags, setTags] = useState("");
  const [topic, setTopic] = useState("");
  const [runbookUrl, setRunbookUrl] = useState("");
  const [taskLines, setTaskLines] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      const tasks = taskLines.split("\n").map((l) => l.trim()).filter(Boolean).map((title) => ({ title }));
      await api.post("/templates", {
        name, description: description || undefined,
        incident_title_template: titleTemplate || undefined,
        incident_description_template: descTemplate || undefined,
        severity,
        tags: tags.split(",").map((t) => t.trim()).filter(Boolean),
        topic: topic || undefined,
        runbook_url: runbookUrl || undefined,
        tasks,
      });
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4 overflow-y-auto">
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-lg my-4">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="font-semibold text-white">New Incident Template</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Template Name *</label>
            <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Database Outage" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input value={description} onChange={(e) => setDescription(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Use when primary DB is unreachable" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Default Severity</label>
              <select value={severity} onChange={(e) => setSeverity(e.target.value as Severity)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
                {SEVERITIES.map((s) => <option key={s} value={s}>{s}</option>)}
              </select>
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Default Topic</label>
              <input value={topic} onChange={(e) => setTopic(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="database" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Incident Title Template</label>
            <input value={titleTemplate} onChange={(e) => setTitleTemplate(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Primary database unreachable — {env}" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Incident Description Template</label>
            <textarea value={descTemplate} onChange={(e) => setDescTemplate(e.target.value)} rows={2} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none" placeholder="The primary database is unreachable. Check connection pool and replica lag." />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">Tags (comma-separated)</label>
              <input value={tags} onChange={(e) => setTags(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="prod, database" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">Runbook URL</label>
              <input value={runbookUrl} onChange={(e) => setRunbookUrl(e.target.value)} type="url" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="https://wiki.example.com/…" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Pre-defined Tasks (one per line)</label>
            <textarea value={taskLines} onChange={(e) => setTaskLines(e.target.value)} rows={4} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 resize-none font-mono" placeholder={"Check connection pool status\nRestart read replicas\nNotify customers via status page\nPost-mortem within 24h"} />
          </div>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 text-sm font-medium">Cancel</button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium">{loading ? "Creating…" : "Create Template"}</button>
          </div>
        </form>
      </div>
    </div>
  );
}
