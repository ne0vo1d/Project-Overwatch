"use client";
import { useState } from "react";
import { createChannel } from "@/lib/api";
import type { ChannelType } from "@/lib/types";

const CHANNEL_TYPES: { value: ChannelType; label: string }[] = [
  { value: "slack", label: "Slack" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "webhook", label: "Generic Webhook" },
  { value: "ntfy", label: "ntfy" },
];

export function ChannelForm({ onSuccess }: { onSuccess: () => void }) {
  const [type, setType] = useState<ChannelType>("slack");
  const [name, setName] = useState("");
  const [webhookUrl, setWebhookUrl] = useState("");
  const [botToken, setBotToken] = useState("");
  const [slackChannel, setSlackChannel] = useState("#incidents");
  const [ntfyTopic, setNtfyTopic] = useState("");
  const [ntfyBaseUrl, setNtfyBaseUrl] = useState("https://ntfy.sh");
  const [topics, setTopics] = useState("");
  const [severities, setSeverities] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buildConfig = () => {
    if (type === "slack") return { webhook_url: webhookUrl, bot_token: botToken || undefined, channel: slackChannel };
    if (type === "teams") return { webhook_url: webhookUrl };
    if (type === "webhook") return { url: webhookUrl };
    if (type === "ntfy") return { base_url: ntfyBaseUrl, topic: ntfyTopic };
    return {};
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");
    try {
      await createChannel({
        name,
        type,
        config: buildConfig(),
        topics: topics.split(",").map((t) => t.trim()).filter(Boolean),
        severities: severities.split(",").map((s) => s.trim()).filter(Boolean),
      });
      onSuccess();
    } catch (err: unknown) {
      const msg = err instanceof Error ? err.message : "Failed to create channel";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Channel Name</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          required
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          placeholder="e.g. #security-incidents"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Type</label>
        <select
          value={type}
          onChange={(e) => setType(e.target.value as ChannelType)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
        >
          {CHANNEL_TYPES.map((t) => (
            <option key={t.value} value={t.value}>{t.label}</option>
          ))}
        </select>
      </div>

      {(type === "slack" || type === "teams" || type === "webhook") && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">
            {type === "webhook" ? "Webhook URL" : "Incoming Webhook URL"}
          </label>
          <input
            value={webhookUrl}
            onChange={(e) => setWebhookUrl(e.target.value)}
            required={type !== "slack" || !botToken}
            type="url"
            className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
            placeholder={type === "slack" ? "https://hooks.slack.com/services/…" : type === "teams" ? "https://…webhook.office.com/…" : "https://your-service.com/hook"}
          />
        </div>
      )}

      {type === "slack" && (
        <>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Bot Token (optional, for rich messages)</label>
            <input
              value={botToken}
              onChange={(e) => setBotToken(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="xoxb-…"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Slack Channel</label>
            <input
              value={slackChannel}
              onChange={(e) => setSlackChannel(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="#incidents"
            />
          </div>
        </>
      )}

      {type === "ntfy" && (
        <>
          <div>
            <label className="block text-sm text-gray-400 mb-1">ntfy Base URL</label>
            <input
              value={ntfyBaseUrl}
              onChange={(e) => setNtfyBaseUrl(e.target.value)}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="https://ntfy.sh"
            />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">ntfy Topic</label>
            <input
              value={ntfyTopic}
              onChange={(e) => setNtfyTopic(e.target.value)}
              required
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
              placeholder="my-incidents"
            />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm text-gray-400 mb-1">Subscribe to Topics (comma-separated, empty = all)</label>
        <input
          value={topics}
          onChange={(e) => setTopics(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          placeholder="incidents, security, infra"
        />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Severity Filter (comma-separated, empty = all)</label>
        <input
          value={severities}
          onChange={(e) => setSeverities(e.target.value)}
          className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500"
          placeholder="high, critical"
        />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button
        type="submit"
        disabled={loading}
        className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium transition-colors"
      >
        {loading ? "Creating…" : "Create Channel"}
      </button>
    </form>
  );
}
