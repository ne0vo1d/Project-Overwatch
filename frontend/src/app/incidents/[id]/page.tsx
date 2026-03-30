"use client";
import { useState } from "react";
import { useParams } from "next/navigation";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { getIncident, updateIncident, addNote, listTasks, createTask, updateTask } from "@/lib/api";
import { IncidentTimeline } from "@/components/incidents/IncidentTimeline";
import { SeverityBadge, StatusBadge, TaskStatusBadge } from "@/components/ui/Badge";
import { format } from "date-fns";
import { CheckSquare, MessageSquare, Users, ChevronDown, Plus } from "lucide-react";
import type { Incident, Task, IncidentStatus, TaskStatus } from "@/lib/types";

const STATUSES: IncidentStatus[] = ["new", "active", "stable", "resolved", "closed"];

export default function IncidentDetailPage() {
  const { id } = useParams<{ id: string }>();
  const qc = useQueryClient();
  const [tab, setTab] = useState<"timeline" | "tasks" | "participants">("timeline");
  const [noteText, setNoteText] = useState("");
  const [submittingNote, setSubmittingNote] = useState(false);
  const [newTaskTitle, setNewTaskTitle] = useState("");
  const [addingTask, setAddingTask] = useState(false);

  const { data: incident, isLoading } = useQuery<Incident>({
    queryKey: ["incident", id],
    queryFn: () => getIncident(id).then((r) => r.data),
  });

  const { data: tasks = [] } = useQuery<Task[]>({
    queryKey: ["tasks", id],
    queryFn: () => listTasks(id).then((r) => r.data),
    enabled: tab === "tasks",
  });

  const handleStatusChange = async (status: IncidentStatus) => {
    await updateIncident(id, { status });
    qc.invalidateQueries({ queryKey: ["incident", id] });
    qc.invalidateQueries({ queryKey: ["incidents"] });
  };

  const handleAddNote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!noteText.trim()) return;
    setSubmittingNote(true);
    await addNote(id, noteText);
    setNoteText("");
    setSubmittingNote(false);
    qc.invalidateQueries({ queryKey: ["incident", id] });
  };

  const handleAddTask = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTaskTitle.trim()) return;
    setAddingTask(true);
    await createTask(id, { title: newTaskTitle });
    setNewTaskTitle("");
    setAddingTask(false);
    qc.invalidateQueries({ queryKey: ["tasks", id] });
  };

  const handleTaskStatus = async (taskId: string, status: TaskStatus) => {
    await updateTask(id, taskId, { status });
    qc.invalidateQueries({ queryKey: ["tasks", id] });
  };

  if (isLoading || !incident) return <div className="text-gray-500">Loading…</div>;

  return (
    <div>
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-start justify-between gap-4 mb-3">
          <h1 className="text-xl font-bold text-white leading-snug">{incident.title}</h1>
          <div className="flex items-center gap-2 shrink-0">
            <SeverityBadge severity={incident.severity} />
            <div className="relative group">
              <button className="flex items-center gap-1 text-xs">
                <StatusBadge status={incident.status} />
                <ChevronDown size={12} className="text-gray-500" />
              </button>
              <div className="absolute right-0 top-full mt-1 bg-gray-800 border border-gray-700 rounded-lg p-1 z-10 hidden group-hover:block min-w-[120px]">
                {STATUSES.map((s) => (
                  <button
                    key={s}
                    onClick={() => handleStatusChange(s)}
                    className="block w-full text-left px-3 py-1.5 text-sm text-gray-300 hover:bg-gray-700 rounded capitalize"
                  >
                    {s}
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span>Created {format(new Date(incident.created_at), "MMM d, yyyy HH:mm")}</span>
          {incident.topic && <span>Topic: <code className="text-gray-400">{incident.topic}</code></span>}
          {incident.tags?.length > 0 && (
            <span className="flex gap-1">
              {incident.tags.map((t) => (
                <span key={t} className="bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-gray-400">{t}</span>
              ))}
            </span>
          )}
        </div>

        {incident.description && (
          <p className="mt-3 text-gray-400 text-sm leading-relaxed">{incident.description}</p>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-1 border-b border-gray-800 mb-5">
        {(["timeline", "tasks", "participants"] as const).map((t) => (
          <button
            key={t}
            onClick={() => setTab(t)}
            className={`px-4 py-2 text-sm font-medium capitalize transition-colors border-b-2 -mb-px ${
              tab === t ? "border-blue-500 text-white" : "border-transparent text-gray-500 hover:text-gray-300"
            }`}
          >
            {t === "timeline" && <MessageSquare size={13} className="inline mr-1.5" />}
            {t === "tasks" && <CheckSquare size={13} className="inline mr-1.5" />}
            {t === "participants" && <Users size={13} className="inline mr-1.5" />}
            {t}
          </button>
        ))}
      </div>

      {/* Timeline */}
      {tab === "timeline" && (
        <div>
          <IncidentTimeline events={incident.timeline} />
          <form onSubmit={handleAddNote} className="mt-6 flex gap-3">
            <input
              value={noteText}
              onChange={(e) => setNoteText(e.target.value)}
              placeholder="Add a note…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button
              type="submit"
              disabled={submittingNote || !noteText.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium"
            >
              Post
            </button>
          </form>
        </div>
      )}

      {/* Tasks */}
      {tab === "tasks" && (
        <div>
          <div className="space-y-2 mb-4">
            {tasks.map((task) => (
              <div key={task.id} className="flex items-center gap-3 bg-[#161b22] border border-gray-800 rounded-lg px-4 py-3">
                <div className="flex-1">
                  <p className={`text-sm ${task.status === "done" ? "line-through text-gray-500" : "text-white"}`}>{task.title}</p>
                  {task.assignee_name && <p className="text-xs text-gray-500 mt-0.5">{task.assignee_name}</p>}
                </div>
                <select
                  value={task.status}
                  onChange={(e) => handleTaskStatus(task.id, e.target.value as TaskStatus)}
                  className="bg-gray-800 border border-gray-700 rounded px-2 py-1 text-xs text-white focus:outline-none"
                >
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="done">Done</option>
                </select>
                <TaskStatusBadge status={task.status} />
              </div>
            ))}
            {tasks.length === 0 && <p className="text-gray-600 text-sm">No tasks yet.</p>}
          </div>
          <form onSubmit={handleAddTask} className="flex gap-3">
            <input
              value={newTaskTitle}
              onChange={(e) => setNewTaskTitle(e.target.value)}
              placeholder="New task…"
              className="flex-1 bg-gray-800 border border-gray-700 rounded px-3 py-2 text-sm text-white focus:outline-none focus:border-blue-500"
            />
            <button type="submit" disabled={addingTask || !newTaskTitle.trim()} className="flex items-center gap-1.5 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white rounded px-4 py-2 text-sm font-medium">
              <Plus size={14} /> Add
            </button>
          </form>
        </div>
      )}

      {/* Participants */}
      {tab === "participants" && (
        <div className="space-y-2">
          {incident.participants.map((p) => (
            <div key={p.id} className="flex items-center gap-3 bg-[#161b22] border border-gray-800 rounded-lg px-4 py-3">
              <div className="w-8 h-8 rounded-full bg-gray-700 flex items-center justify-center text-sm font-semibold text-white">
                {p.user_name?.[0]?.toUpperCase() ?? "?"}
              </div>
              <div className="flex-1">
                <p className="text-sm text-white">{p.user_name ?? p.user_id}</p>
                {p.user_email && <p className="text-xs text-gray-500">{p.user_email}</p>}
              </div>
              <span className="text-xs bg-gray-800 border border-gray-700 rounded px-2 py-0.5 text-gray-400 capitalize">{p.role}</span>
            </div>
          ))}
          {incident.participants.length === 0 && <p className="text-gray-600 text-sm">No participants yet.</p>}
        </div>
      )}
    </div>
  );
}
