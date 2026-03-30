"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { Plus, X, Trash2, Zap, ChevronDown, ChevronRight } from "lucide-react";

interface EscalationStep {
  id: string;
  step_order: number;
  delay_minutes: number;
  notify_channel_ids: string[];
  notify_oncall_secondary: boolean;
  message_template?: string;
}

interface EscalationPolicy {
  id: string;
  name: string;
  description?: string;
  service_id?: string;
  is_active: boolean;
  steps: EscalationStep[];
  created_at: string;
}

export default function EscalationsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [expanded, setExpanded] = useState<string | null>(null);
  const qc = useQueryClient();

  const { data: policies = [], isLoading } = useQuery<EscalationPolicy[]>({
    queryKey: ["escalations"],
    queryFn: () => api.get("/escalations").then((r) => r.data),
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this escalation policy?")) return;
    await api.delete(`/escalations/${id}`);
    qc.invalidateQueries({ queryKey: ["escalations"] });
  };

  const handleToggle = async (id: string, is_active: boolean) => {
    await api.patch(`/escalations/${id}`, { is_active: !is_active });
    qc.invalidateQueries({ queryKey: ["escalations"] });
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Escalation Policies</h1>
          <p className="text-gray-500 text-sm mt-1">Automatically notify responders when incidents go unacknowledged</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium"
        >
          <Plus size={15} /> New Policy
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-600">Loading…</p>
      ) : (
        <div className="grid gap-4">
          {policies.map((policy) => (
            <div key={policy.id} className="bg-[#161b22] border border-gray-800 rounded-lg">
              <div className="p-5">
                <div className="flex items-start justify-between mb-2">
                  <div className="flex items-center gap-3">
                    <button
                      onClick={() => setExpanded(expanded === policy.id ? null : policy.id)}
                      className="text-gray-500 hover:text-white transition-colors"
                    >
                      {expanded === policy.id ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    </button>
                    <Zap size={15} className={policy.is_active ? "text-yellow-400" : "text-gray-600"} />
                    <div>
                      <h3 className="font-semibold text-white">{policy.name}</h3>
                      {policy.description && <p className="text-xs text-gray-500 mt-0.5">{policy.description}</p>}
                    </div>
                    <span className={`text-xs rounded-full px-2 py-0.5 border ${
                      policy.is_active
                        ? "bg-green-900/30 border-green-800 text-green-400"
                        : "bg-gray-800 border-gray-700 text-gray-500"
                    }`}>
                      {policy.is_active ? "Active" : "Paused"}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleToggle(policy.id, policy.is_active)}
                      className="text-xs text-gray-500 hover:text-white border border-gray-700 rounded px-2 py-1 transition-colors"
                    >
                      {policy.is_active ? "Pause" : "Enable"}
                    </button>
                    <button onClick={() => handleDelete(policy.id)} className="text-gray-600 hover:text-red-400 transition-colors">
                      <Trash2 size={15} />
                    </button>
                  </div>
                </div>

                <div className="ml-8 text-xs text-gray-500">
                  {policy.steps.length} escalation step{policy.steps.length !== 1 ? "s" : ""}
                  {policy.service_id && <span className="ml-3">Service: <code className="text-gray-400">{policy.service_id}</code></span>}
                </div>
              </div>

              {expanded === policy.id && (
                <div className="border-t border-gray-800 px-5 pb-5">
                  <div className="mt-4 space-y-3">
                    {policy.steps.length === 0 ? (
                      <p className="text-xs text-gray-600">No steps yet. Add a step to start escalating.</p>
                    ) : (
                      policy.steps
                        .sort((a, b) => a.step_order - b.step_order)
                        .map((step) => (
                          <div key={step.id} className="flex items-start gap-3 bg-gray-900/50 border border-gray-800 rounded-lg p-3">
                            <div className="w-6 h-6 rounded-full bg-yellow-900/40 border border-yellow-800 flex items-center justify-center text-xs font-bold text-yellow-400 shrink-0">
                              {step.step_order}
                            </div>
                            <div className="flex-1 text-xs text-gray-400 space-y-1">
                              <p>
                                <span className="text-white font-medium">After {step.delay_minutes}m</span> of no acknowledgement
                              </p>
                              {step.notify_channel_ids.length > 0 && (
                                <p>Notify {step.notify_channel_ids.length} channel{step.notify_channel_ids.length !== 1 ? "s" : ""}</p>
                              )}
                              {step.notify_oncall_secondary && (
                                <p className="text-orange-400">+ Notify secondary on-call</p>
                              )}
                              {step.message_template && (
                                <p className="text-gray-600 italic">"{step.message_template}"</p>
                              )}
                            </div>
                            <StepDeleteButton policyId={policy.id} stepId={step.id} />
                          </div>
                        ))
                    )}
                  </div>
                  <AddStepForm policyId={policy.id} nextOrder={(policy.steps.length ?? 0) + 1} />
                </div>
              )}
            </div>
          ))}
          {policies.length === 0 && (
            <p className="text-gray-600 text-sm">
              No escalation policies. Create one to automatically page responders when incidents sit unacknowledged.
            </p>
          )}
        </div>
      )}

      {showCreate && (
        <CreatePolicyModal
          onClose={() => setShowCreate(false)}
          onCreated={() => { qc.invalidateQueries({ queryKey: ["escalations"] }); setShowCreate(false); }}
        />
      )}
    </div>
  );
}

function StepDeleteButton({ policyId, stepId }: { policyId: string; stepId: string }) {
  const qc = useQueryClient();
  const handleDelete = async () => {
    await api.delete(`/escalations/${policyId}/steps/${stepId}`);
    qc.invalidateQueries({ queryKey: ["escalations"] });
  };
  return (
    <button onClick={handleDelete} className="text-gray-700 hover:text-red-400 transition-colors shrink-0">
      <Trash2 size={13} />
    </button>
  );
}

function AddStepForm({ policyId, nextOrder }: { policyId: string; nextOrder: number }) {
  const qc = useQueryClient();
  const [delayMinutes, setDelayMinutes] = useState("30");
  const [channelIds, setChannelIds] = useState("");
  const [notifySecondary, setNotifySecondary] = useState(false);
  const [messageTemplate, setMessageTemplate] = useState("");
  const [loading, setLoading] = useState(false);
  const [open, setOpen] = useState(false);

  const handleAdd = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post(`/escalations/${policyId}/steps`, {
        step_order: nextOrder,
        delay_minutes: parseInt(delayMinutes),
        notify_channel_ids: channelIds.split(",").map((c) => c.trim()).filter(Boolean),
        notify_oncall_secondary: notifySecondary,
        message_template: messageTemplate || undefined,
      });
      qc.invalidateQueries({ queryKey: ["escalations"] });
      setOpen(false);
      setDelayMinutes("30");
      setChannelIds("");
      setNotifySecondary(false);
      setMessageTemplate("");
    } finally {
      setLoading(false);
    }
  };

  if (!open) {
    return (
      <button
        onClick={() => setOpen(true)}
        className="mt-3 flex items-center gap-1.5 text-xs text-gray-500 hover:text-blue-400 transition-colors"
      >
        <Plus size={13} /> Add escalation step
      </button>
    );
  }

  return (
    <form onSubmit={handleAdd} className="mt-3 bg-gray-900/50 border border-gray-800 rounded-lg p-4 space-y-3">
      <p className="text-xs font-semibold text-gray-400">New Step #{nextOrder}</p>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="block text-xs text-gray-500 mb-1">Delay (minutes) *</label>
          <input
            type="number"
            min="1"
            value={delayMinutes}
            onChange={(e) => setDelayMinutes(e.target.value)}
            required
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
          />
        </div>
        <div>
          <label className="block text-xs text-gray-500 mb-1">Channel IDs (comma-sep)</label>
          <input
            value={channelIds}
            onChange={(e) => setChannelIds(e.target.value)}
            className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
            placeholder="ch-abc123"
          />
        </div>
      </div>
      <div>
        <label className="block text-xs text-gray-500 mb-1">Custom message template</label>
        <input
          value={messageTemplate}
          onChange={(e) => setMessageTemplate(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-2 py-1.5 text-white text-xs focus:outline-none focus:border-blue-500"
          placeholder="ESCALATION: {incident_title} still unresolved"
        />
      </div>
      <label className="flex items-center gap-2 text-xs text-gray-400 cursor-pointer">
        <input
          type="checkbox"
          checked={notifySecondary}
          onChange={(e) => setNotifySecondary(e.target.checked)}
          className="rounded"
        />
        Also notify secondary on-call
      </label>
      <div className="flex gap-2">
        <button type="button" onClick={() => setOpen(false)} className="text-xs text-gray-500 hover:text-white px-3 py-1.5 rounded border border-gray-700">
          Cancel
        </button>
        <button type="submit" disabled={loading} className="text-xs bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white px-3 py-1.5 rounded font-medium">
          {loading ? "Adding…" : "Add Step"}
        </button>
      </div>
    </form>
  );
}

function CreatePolicyModal({ onClose, onCreated }: { onClose: () => void; onCreated: () => void }) {
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    try {
      await api.post("/escalations", {
        name,
        description: description || undefined,
        service_id: serviceId || undefined,
      });
      onCreated();
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
      <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-md">
        <div className="flex items-center justify-between p-5 border-b border-gray-800">
          <h2 className="font-semibold text-white">New Escalation Policy</h2>
          <button onClick={onClose} className="text-gray-500 hover:text-white"><X size={18} /></button>
        </div>
        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="block text-sm text-gray-400 mb-1">Policy Name *</label>
            <input
              value={name}
              onChange={(e) => setName(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Default P1 Escalation"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Description</label>
            <input
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="Escalate unacknowledged P1s after 15 minutes"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Service ID (optional)</label>
            <input
              value={serviceId}
              onChange={(e) => setServiceId(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="svc-abc123 (leave blank for global policy)"
            />
          </div>
          <p className="text-xs text-gray-600">After creating the policy, expand it to add escalation steps.</p>
          <div className="flex gap-3 pt-1">
            <button type="button" onClick={onClose} className="flex-1 bg-gray-700 hover:bg-gray-600 text-white rounded px-4 py-2 text-sm font-medium">
              Cancel
            </button>
            <button type="submit" disabled={loading} className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium">
              {loading ? "Creating…" : "Create Policy"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
