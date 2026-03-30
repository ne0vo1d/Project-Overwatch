"use client";
import { useState, useEffect } from "react";
import { NotificationFeed } from "@/components/notifications/NotificationFeed";

export default function NotificationsPage() {
  const [topic, setTopic] = useState("*");
  const [inputTopic, setInputTopic] = useState("*");
  const [token, setToken] = useState("");

  useEffect(() => {
    if (typeof window !== "undefined") {
      const stored = localStorage.getItem("token");
      if (stored) setToken(stored);
    }
  }, []);

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Notifications</h1>
        <p className="text-gray-500 text-sm mt-1">Real-time SSE feed — subscribe to any topic</p>
      </div>

      <div className="flex gap-3 mb-6">
        <input
          value={inputTopic}
          onChange={(e) => setInputTopic(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500 w-64"
          placeholder="Topic (* = all)"
        />
        <button
          onClick={() => setTopic(inputTopic.trim() || "*")}
          className="bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium"
        >
          Subscribe
        </button>
      </div>

      {token ? (
        <NotificationFeed topic={topic} token={token} />
      ) : (
        <p className="text-gray-500 text-sm">Please log in to view the notification feed.</p>
      )}
    </div>
  );
}
