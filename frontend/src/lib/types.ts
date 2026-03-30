export type Severity = "low" | "medium" | "high" | "critical";
export type IncidentStatus = "new" | "active" | "stable" | "resolved" | "closed";
export type TaskStatus = "open" | "in_progress" | "done";
export type ChannelType = "slack" | "teams" | "webhook" | "ntfy";
export type NotificationStatus = "pending" | "sent" | "failed";
export type Priority = "min" | "low" | "default" | "high" | "urgent";

export interface User {
  id: string;
  email: string;
  name: string;
  api_key: string;
  is_active: boolean;
  is_admin: boolean;
  slack_user_id?: string;
  teams_user_id?: string;
  created_at: string;
}

export interface Participant {
  id: string;
  user_id: string;
  role: string;
  joined_at: string;
  user_name?: string;
  user_email?: string;
}

export interface TimelineEvent {
  id: string;
  event_type: string;
  description: string;
  user_id?: string;
  user_name?: string;
  created_at: string;
}

export interface IncidentSummary {
  id: string;
  title: string;
  severity: Severity;
  status: IncidentStatus;
  topic?: string;
  tags: string[];
  commander_id?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
}

export interface Incident extends IncidentSummary {
  description?: string;
  participants: Participant[];
  timeline: TimelineEvent[];
}

export interface Task {
  id: string;
  title: string;
  description?: string;
  status: TaskStatus;
  incident_id: string;
  assignee_id?: string;
  assignee_name?: string;
  created_at: string;
  due_at?: string;
}

export interface NotificationChannel {
  id: string;
  name: string;
  type: ChannelType;
  config: Record<string, unknown>;
  topics: string[];
  severities: string[];
  is_active: boolean;
  created_at: string;
}

export interface Notification {
  id: string;
  topic: string;
  title: string;
  message: string;
  priority: Priority;
  tags?: string[];
  incident_id?: string;
  channel_id?: string;
  status: NotificationStatus;
  error?: string;
  created_at: string;
  sent_at?: string;
}
