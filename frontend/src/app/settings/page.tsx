"use client";
import { useQuery } from "@tanstack/react-query";
import { getMe } from "@/lib/api";
import { Key, User, Copy, Check } from "lucide-react";
import { useState } from "react";

export default function SettingsPage() {
  const [copied, setCopied] = useState(false);

  const { data: user, isLoading } = useQuery({
    queryKey: ["me"],
    queryFn: () => getMe().then((r) => r.data),
  });

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return <p className="text-gray-500">Loading…</p>;

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="grid grid-cols-2 gap-6 max-w-3xl">

        {/* Account */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <User size={15} /> Account
          </h2>
          {user && (
            <div className="space-y-3">
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Name</p>
                <p className="text-sm text-white">{user.name}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Email</p>
                <p className="text-sm text-white">{user.email}</p>
              </div>
              <div>
                <p className="text-xs text-gray-500 mb-0.5">Role</p>
                <p className="text-sm text-white">{user.is_admin ? "Admin" : "Member"}</p>
              </div>
            </div>
          )}
        </div>

        {/* API Key */}
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Key size={15} /> API Key
          </h2>
          <p className="text-gray-500 text-xs mb-3">
            Use as <code className="text-gray-400">X-API-Key</code> header to authenticate without a JWT — ideal for CI pipelines and ingest scripts.
          </p>
          {user && (
            <div className="relative">
              <code className="block bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs text-green-400 break-all pr-10 select-all">
                {user.api_key}
              </code>
              <button
                onClick={() => handleCopy(user.api_key)}
                className="absolute top-2.5 right-2.5 text-gray-500 hover:text-white transition-colors"
                title="Copy"
              >
                {copied ? <Check size={14} className="text-green-400" /> : <Copy size={14} />}
              </button>
            </div>
          )}
          <div className="mt-4 bg-gray-900 rounded-lg p-3 border border-gray-800">
            <p className="text-xs text-gray-500 mb-1.5">Publish an alert via curl:</p>
            <code className="text-xs text-green-400 whitespace-pre-wrap break-all">{`curl -X POST http://localhost:8000/notify/incidents \\
  -H "X-API-Key: ${user?.api_key ?? "your-api-key"}" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"DB Outage","message":"Primary down","priority":"urgent"}'`}</code>
          </div>
        </div>

      </div>
    </div>
  );
}
