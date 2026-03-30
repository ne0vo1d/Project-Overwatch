import Link from "next/link";
import { formatDistanceToNow } from "date-fns";
import { Users, Tag, Clock } from "lucide-react";
import { SeverityBadge, StatusBadge } from "@/components/ui/Badge";
import type { IncidentSummary } from "@/lib/types";

export function IncidentCard({ incident }: { incident: IncidentSummary }) {
  const age = formatDistanceToNow(new Date(incident.created_at), { addSuffix: true });

  return (
    <Link href={`/incidents/${incident.id}`} className="block">
      <div className="bg-[#161b22] border border-gray-800 rounded-lg p-4 hover:border-gray-600 transition-colors cursor-pointer">
        <div className="flex items-start justify-between gap-3 mb-3">
          <h3 className="font-semibold text-white text-sm leading-snug line-clamp-2">{incident.title}</h3>
          <div className="flex gap-2 shrink-0">
            <SeverityBadge severity={incident.severity} />
            <StatusBadge status={incident.status} />
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-gray-500">
          <span className="flex items-center gap-1">
            <Clock size={11} />
            {age}
          </span>
          {incident.topic && (
            <span className="flex items-center gap-1">
              <Tag size={11} />
              {incident.topic}
            </span>
          )}
          {incident.tags?.length > 0 && (
            <span className="flex items-center gap-1">
              <Users size={11} />
              {incident.tags.slice(0, 3).join(", ")}
            </span>
          )}
        </div>
      </div>
    </Link>
  );
}
