"use client";
import { useState } from "react";
import { login, register } from "@/lib/api";
import { Key, LogIn, UserPlus } from "lucide-react";

export default function SettingsPage() {
  const [mode, setMode] = useState<"login" | "register">("login");
  const [email, setEmail] = useState("");
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [apiKey, setApiKey] = useState<string | null>(null);

  const storedToken = typeof window !== "undefined" ? localStorage.getItem("token") : null;

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      const { data } = await login(email, password);
      localStorage.setItem("token", data.access_token);
      setSuccess("Logged in. Refresh the page to use authenticated API calls.");
    } catch {
      setError("Invalid credentials.");
    }
  };

  const handleRegister = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    try {
      await register(name, email, password);
      setSuccess("Account created. Switch to Login to continue.");
    } catch {
      setError("Registration failed. Email may already be taken.");
    }
  };

  return (
    <div>
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-white">Settings</h1>
      </div>

      <div className="grid grid-cols-2 gap-6">
        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4">Account</h2>

          {storedToken && (
            <div className="mb-4 p-3 bg-green-900/20 border border-green-800 rounded-lg text-sm text-green-400">
              Logged in. Token stored in localStorage.
            </div>
          )}

          <div className="flex gap-2 mb-4">
            <button onClick={() => setMode("login")} className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${mode === "login" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white"}`}>
              <LogIn size={13} className="inline mr-1.5" />Login
            </button>
            <button onClick={() => setMode("register")} className={`flex-1 py-1.5 rounded text-sm font-medium transition-colors ${mode === "register" ? "bg-gray-700 text-white" : "text-gray-500 hover:text-white"}`}>
              <UserPlus size={13} className="inline mr-1.5" />Register
            </button>
          </div>

          <form onSubmit={mode === "login" ? handleLogin : handleRegister} className="space-y-3">
            {mode === "register" && (
              <input value={name} onChange={(e) => setName(e.target.value)} required placeholder="Full name" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            )}
            <input type="email" value={email} onChange={(e) => setEmail(e.target.value)} required placeholder="Email" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            <input type="password" value={password} onChange={(e) => setPassword(e.target.value)} required placeholder="Password" className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500" />
            {error && <p className="text-red-400 text-sm">{error}</p>}
            {success && <p className="text-green-400 text-sm">{success}</p>}
            <button type="submit" className="w-full bg-blue-600 hover:bg-blue-700 text-white rounded px-4 py-2 text-sm font-medium">
              {mode === "login" ? "Log In" : "Create Account"}
            </button>
          </form>
        </div>

        <div className="bg-[#161b22] border border-gray-800 rounded-xl p-6">
          <h2 className="font-semibold text-white mb-4 flex items-center gap-2">
            <Key size={15} /> API Key (ntfy-style)
          </h2>
          <p className="text-gray-500 text-sm mb-4">
            Use your API key to publish notifications directly without a browser session.
          </p>
          <code className="block bg-gray-800 rounded p-3 text-xs text-green-400 break-all">
            {apiKey ?? "Log in to reveal your API key."}
          </code>
          <p className="text-gray-600 text-xs mt-3">
            Pass as <code className="text-gray-400">X-API-Key</code> header or use Bearer token auth.
          </p>
          <div className="mt-4 bg-gray-800 rounded p-3">
            <p className="text-xs text-gray-500 mb-2">Example publish:</p>
            <code className="text-xs text-green-400 whitespace-pre">{`curl -X POST http://localhost:8000/notify/incidents \\
  -H "X-API-Key: your-api-key" \\
  -H "Content-Type: application/json" \\
  -d '{"title":"DB Outage","message":"Primary down","priority":"urgent"}'`}</code>
          </div>
        </div>
      </div>
    </div>
  );
}
