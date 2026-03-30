"use client";
import { useState } from "react";
import { createChannel } from "@/lib/api";
import type { ChannelType } from "@/lib/types";

const CHANNEL_TYPES: { value: ChannelType; label: string }[] = [
  { value: "slack", label: "Slack" },
  { value: "teams", label: "Microsoft Teams" },
  { value: "email", label: "Email (SendGrid)" },
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
  // Email fields
  const [sgApiKey, setSgApiKey] = useState("");
  const [sgFromEmail, setSgFromEmail] = useState("");
  const [sgFromName, setSgFromName] = useState("Project Overwatch");
  const [sgToEmails, setSgToEmails] = useState("");
  const [topics, setTopics] = useState("");
  const [severities, setSeverities] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const buildConfig = () => {
    if (type === "slack") return { webhook_url: webhookUrl || undefined, bot_token: botToken || undefined, channel: slackChannel };
    if (type === "teams") return { webhook_url: webhookUrl };
    if (type === "webhook") return { url: webhookUrl };
    if (type === "ntfy") return { base_url: ntfyBaseUrl, topic: ntfyTopic };
    if (type === "email") return {
      api_key: sgApiKey,
      from_email: sgFromEmail,
      from_name: sgFromName,
      to_emails: sgToEmails.split(",").map((e) => e.trim()).filter(Boolean),
    };
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
    } catch {
      setError("Failed to create channel.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <label className="block text-sm text-gray-400 mb-1">Channel Name</label>
        <input value={name} onChange={(e) => setName(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="e.g. #security-incidents" />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Type</label>
        <select value={type} onChange={(e) => setType(e.target.value as ChannelType)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500">
          {CHANNEL_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
        </select>
      </div>

      {/* Slack */}
      {type === "slack" && (
        <>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Incoming Webhook URL</label>
            <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} type="url" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="https://hooks.slack.com/services/…" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Bot Token (optional — for richer messages)</label>
            <input value={botToken} onChange={(e) => setBotToken(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="xoxb-…" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">Slack Channel</label>
            <input value={slackChannel} onChange={(e) => setSlackChannel(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="#incidents" />
          </div>
        </>
      )}

      {/* Teams */}
      {type === "teams" && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Incoming Webhook URL</label>
          <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} required type="url" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="https://…webhook.office.com/…" />
        </div>
      )}

      {/* Email (SendGrid) */}
      {type === "email" && (
        <>
          <div className="p-3 bg-blue-900/20 border border-blue-800 rounded-lg text-xs text-blue-300">
            Uses SendGrid Web API v3. Create an API key at app.sendgrid.com with <strong>Mail Send</strong> permission.
            Your sender domain must be verified in SendGrid.
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">SendGrid API Key *</label>
            <input value={sgApiKey} onChange={(e) => setSgApiKey(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500 font-mono" placeholder="SG.xxxxxxxx…" />
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-sm text-gray-400 mb-1">From Email *</label>
              <input value={sgFromEmail} onChange={(e) => setSgFromEmail(e.target.value)} required type="email" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="alerts@yourdomain.com" />
            </div>
            <div>
              <label className="block text-sm text-gray-400 mb-1">From Name</label>
              <input value={sgFromName} onChange={(e) => setSgFromName(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="Project Overwatch" />
            </div>
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">To Emails (comma-separated) *</label>
            <input value={sgToEmails} onChange={(e) => setSgToEmails(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="oncall@yourdomain.com, team@yourdomain.com" />
          </div>
        </>
      )}

      {/* Generic webhook */}
      {type === "webhook" && (
        <div>
          <label className="block text-sm text-gray-400 mb-1">Webhook URL *</label>
          <input value={webhookUrl} onChange={(e) => setWebhookUrl(e.target.value)} required type="url" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="https://your-service.com/hook" />
        </div>
      )}

      {/* ntfy */}
      {type === "ntfy" && (
        <>
          <div>
            <label className="block text-sm text-gray-400 mb-1">ntfy Base URL</label>
            <input value={ntfyBaseUrl} onChange={(e) => setNtfyBaseUrl(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="https://ntfy.sh" />
          </div>
          <div>
            <label className="block text-sm text-gray-400 mb-1">ntfy Topic *</label>
            <input value={ntfyTopic} onChange={(e) => setNtfyTopic(e.target.value)} required className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="my-incidents" />
          </div>
        </>
      )}

      <div>
        <label className="block text-sm text-gray-400 mb-1">Subscribe to Topics (comma-separated, empty = all)</label>
        <input value={topics} onChange={(e) => setTopics(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="incidents, security, infra" />
      </div>

      <div>
        <label className="block text-sm text-gray-400 mb-1">Severity Filter (comma-separated, empty = all)</label>
        <input value={severities} onChange={(e) => setSeverities(e.target.value)} className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-white text-sm focus:outline-none focus:border-blue-500" placeholder="high, critical" />
      </div>

      {error && <p className="text-red-400 text-sm">{error}</p>}

      <button type="submit" disabled={loading} className="w-full bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium transition-colors">
        {loading ? "Creating…" : "Create Channel"}
      </button>
    </form>
  );
}
