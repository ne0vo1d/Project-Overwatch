import { clsx } from "clsx";
import type { Severity, IncidentStatus, TaskStatus } from "@/lib/types";

const SEVERITY_STYLES: Record<Severity, string> = {
  low: "bg-green-900/50 text-green-400 border border-green-700",
  medium: "bg-yellow-900/50 text-yellow-400 border border-yellow-700",
  high: "bg-orange-900/50 text-orange-400 border border-orange-700",
  critical: "bg-red-900/50 text-red-400 border border-red-700",
};

const STATUS_STYLES: Record<IncidentStatus, string> = {
  new: "bg-blue-900/50 text-blue-400 border border-blue-700",
  active: "bg-red-900/50 text-red-400 border border-red-700",
  stable: "bg-green-900/50 text-green-400 border border-green-700",
  resolved: "bg-gray-700/50 text-gray-300 border border-gray-600",
  closed: "bg-gray-800/50 text-gray-500 border border-gray-700",
};

const TASK_STATUS_STYLES: Record<TaskStatus, string> = {
  open: "bg-blue-900/50 text-blue-400 border border-blue-700",
  in_progress: "bg-yellow-900/50 text-yellow-400 border border-yellow-700",
  done: "bg-green-900/50 text-green-400 border border-green-700",
};

export function SeverityBadge({ severity }: { severity: Severity }) {
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide", SEVERITY_STYLES[severity])}>
      {severity}
    </span>
  );
}

export function StatusBadge({ status }: { status: IncidentStatus }) {
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold uppercase tracking-wide", STATUS_STYLES[status])}>
      {status.replace("_", " ")}
    </span>
  );
}

export function TaskStatusBadge({ status }: { status: TaskStatus }) {
  return (
    <span className={clsx("inline-flex items-center px-2 py-0.5 rounded text-xs font-semibold", TASK_STATUS_STYLES[status])}>
      {status.replace("_", " ")}
    </span>
  );
}
