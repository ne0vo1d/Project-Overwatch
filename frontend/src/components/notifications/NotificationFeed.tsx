"use client";
import { useEffect, useRef, useState } from "react";
import { format } from "date-fns";
import { Wifi, WifiOff } from "lucide-react";
import { clsx } from "clsx";

const PRIORITY_STYLES: Record<string, string> = {
  min: "border-gray-700 bg-gray-800/30",
  low: "border-gray-700 bg-gray-800/30",
  default: "border-blue-800 bg-blue-900/20",
  high: "border-orange-700 bg-orange-900/20",
  urgent: "border-red-700 bg-red-900/20",
};

interface FeedEvent {
  id: string;
  topic: string;
  title: string;
  message: string;
  priority: string;
  severity?: string;
  incident_id?: string;
  timestamp: string;
}

export function NotificationFeed({ topic, token }: { topic: string; token: string }) {
  const [events, setEvents] = useState<FeedEvent[]>([]);
  const [connected, setConnected] = useState(false);
  const srcRef = useRef<EventSource | null>(null);

  useEffect(() => {
    const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";
    const url = `${BASE_URL}/notify/${topic}/sse`;
    const src = new EventSource(`${url}?token=${encodeURIComponent(token)}`);
    srcRef.current = src;

    src.onopen = () => setConnected(true);
    src.onerror = () => setConnected(false);
    src.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (data.type === "notification") {
          setEvents((prev) => [
            { ...data, id: crypto.randomUUID() },
            ...prev.slice(0, 99),
          ]);
        }
      } catch {
        // ignore heartbeats
      }
    };

    return () => { src.close(); setConnected(false); };
  }, [topic, token]);

  return (
    <div>
      <div className="flex items-center gap-2 mb-4">
        <span className={clsx("live-dot w-2 h-2 rounded-full", connected ? "bg-green-500" : "bg-gray-600")} />
        <span className="text-sm text-gray-400 flex items-center gap-1">
          {connected ? <><Wifi size={13} /> Live — topic: <code className="text-gray-300">{topic}</code></> : <><WifiOff size={13} /> Connecting…</>}
        </span>
      </div>

      {events.length === 0 && (
        <p className="text-gray-600 text-sm">Waiting for events…</p>
      )}

      <div className="space-y-2">
        {events.map((ev) => (
          <div key={ev.id} className={clsx("border rounded-lg p-3", PRIORITY_STYLES[ev.priority] ?? PRIORITY_STYLES.default)}>
            <div className="flex items-center justify-between mb-1">
              <span className="text-sm font-semibold text-white">{ev.title}</span>
              <span className="text-xs text-gray-500">{format(new Date(ev.timestamp), "HH:mm:ss")}</span>
            </div>
            <p className="text-sm text-gray-300">{ev.message}</p>
            <div className="flex items-center gap-3 mt-1">
              <span className="text-xs text-gray-600">topic: {ev.topic}</span>
              {ev.severity && <span className="text-xs text-gray-600">severity: {ev.severity}</span>}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
