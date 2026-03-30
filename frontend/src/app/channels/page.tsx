"use client";
import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { listChannels, deleteChannel, testChannel } from "@/lib/api";
import { ChannelForm } from "@/components/channels/ChannelForm";
import { Plus, X, Slack, Radio, Webhook, Trash2, TestTube2, CheckCircle2, XCircle } from "lucide-react";
import type { NotificationChannel } from "@/lib/types";

const TYPE_ICONS: Record<string, React.ElementType> = {
  slack: Slack,
  teams: Radio,
  webhook: Webhook,
  ntfy: Radio,
};

const TYPE_COLORS: Record<string, string> = {
  slack: "text-green-400",
  teams: "text-blue-400",
  webhook: "text-purple-400",
  ntfy: "text-orange-400",
};

export default function ChannelsPage() {
  const [showCreate, setShowCreate] = useState(false);
  const [testResult, setTestResult] = useState<Record<string, "ok" | "fail">>({});
  const qc = useQueryClient();

  const { data: channels = [], isLoading } = useQuery<NotificationChannel[]>({
    queryKey: ["channels"],
    queryFn: () => listChannels().then((r) => r.data),
  });

  const handleDelete = async (id: string) => {
    if (!confirm("Delete this channel?")) return;
    await deleteChannel(id);
    qc.invalidateQueries({ queryKey: ["channels"] });
  };

  const handleTest = async (id: string) => {
    try {
      await testChannel(id);
      setTestResult((p) => ({ ...p, [id]: "ok" }));
    } catch {
      setTestResult((p) => ({ ...p, [id]: "fail" }));
    }
    setTimeout(() => setTestResult((p) => { const n = { ...p }; delete n[id]; return n; }), 4000);
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold text-white">Channels</h1>
          <p className="text-gray-500 text-sm mt-1">Slack, Teams, webhooks, and ntfy integrations</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg px-4 py-2 text-sm font-medium transition-colors"
        >
          <Plus size={15} /> Add Channel
        </button>
      </div>

      {isLoading ? (
        <p className="text-gray-600">Loading…</p>
      ) : (
        <div className="grid gap-3">
          {channels.map((ch) => {
            const Icon = TYPE_ICONS[ch.type] ?? Radio;
            const color = TYPE_COLORS[ch.type] ?? "text-gray-400";
            const result = testResult[ch.id];
            return (
              <div key={ch.id} className="bg-[#161b22] border border-gray-800 rounded-lg p-4 flex items-center gap-4">
                <Icon size={20} className={color} />
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-0.5">
                    <span className="text-sm font-semibold text-white">{ch.name}</span>
                    <span className={`text-xs uppercase font-medium ${color}`}>{ch.type}</span>
                    {!ch.is_active && <span className="text-xs text-gray-600 border border-gray-700 rounded px-1.5">disabled</span>}
                  </div>
                  <div className="text-xs text-gray-500 flex gap-3">
                    {ch.topics.length > 0 ? (
                      <span>Topics: {ch.topics.join(", ")}</span>
                    ) : (
                      <span>All topics</span>
                    )}
                    {ch.severities.length > 0 && <span>Severities: {ch.severities.join(", ")}</span>}
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  {result === "ok" && <CheckCircle2 size={16} className="text-green-400" />}
                  {result === "fail" && <XCircle size={16} className="text-red-400" />}
                  <button
                    onClick={() => handleTest(ch.id)}
                    className="flex items-center gap-1 text-xs text-gray-400 hover:text-white border border-gray-700 hover:border-gray-500 rounded px-2 py-1 transition-colors"
                  >
                    <TestTube2 size={12} /> Test
                  </button>
                  <button
                    onClick={() => handleDelete(ch.id)}
                    className="text-gray-600 hover:text-red-400 transition-colors"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            );
          })}
          {channels.length === 0 && (
            <p className="text-gray-600 text-sm">No channels configured. Add a Slack or Teams channel to get started.</p>
          )}
        </div>
      )}

      {showCreate && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-[#161b22] border border-gray-700 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-5 border-b border-gray-800">
              <h2 className="font-semibold text-white">Add Notification Channel</h2>
              <button onClick={() => setShowCreate(false)} className="text-gray-500 hover:text-white"><X size={18} /></button>
            </div>
            <div className="p-5">
              <ChannelForm onSuccess={() => { qc.invalidateQueries({ queryKey: ["channels"] }); setShowCreate(false); }} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
