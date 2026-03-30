import { format } from "date-fns";
import { GitCommitHorizontal, MessageSquare, UserPlus, Activity, Plus } from "lucide-react";
import type { TimelineEvent } from "@/lib/types";

const EVENT_ICONS: Record<string, React.ElementType> = {
  created: Plus,
  updated: Activity,
  note: MessageSquare,
  participant_added: UserPlus,
};

const EVENT_COLORS: Record<string, string> = {
  created: "text-blue-400 bg-blue-900/30 border-blue-700",
  updated: "text-yellow-400 bg-yellow-900/30 border-yellow-700",
  note: "text-purple-400 bg-purple-900/30 border-purple-700",
  participant_added: "text-green-400 bg-green-900/30 border-green-700",
};

export function IncidentTimeline({ events }: { events: TimelineEvent[] }) {
  if (!events.length) {
    return <p className="text-gray-500 text-sm">No timeline events yet.</p>;
  }

  return (
    <div className="relative">
      <div className="absolute left-4 top-0 bottom-0 w-px bg-gray-800" />
      <div className="space-y-4">
        {events.map((event) => {
          const Icon = EVENT_ICONS[event.event_type] ?? GitCommitHorizontal;
          const colorClass = EVENT_COLORS[event.event_type] ?? "text-gray-400 bg-gray-800/30 border-gray-700";
          return (
            <div key={event.id} className="flex gap-4 pl-0">
              <div className={`relative z-10 flex items-center justify-center w-8 h-8 rounded-full border shrink-0 ${colorClass}`}>
                <Icon size={14} />
              </div>
              <div className="flex-1 pb-1">
                <p className="text-sm text-gray-200">{event.description}</p>
                <div className="flex items-center gap-3 mt-1">
                  {event.user_name && (
                    <span className="text-xs text-gray-500">{event.user_name}</span>
                  )}
                  <span className="text-xs text-gray-600">
                    {format(new Date(event.created_at), "MMM d, HH:mm")}
                  </span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
