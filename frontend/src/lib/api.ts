import axios from "axios";

const BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://localhost:8000";

export const api = axios.create({ baseURL: BASE_URL });

// Attach auth token from localStorage on every request
api.interceptors.request.use((config) => {
  if (typeof window !== "undefined") {
    const token = localStorage.getItem("token");
    if (token) config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// --- Auth ---
export const login = (email: string, password: string) =>
  api.post<{ access_token: string }>("/auth/login", new URLSearchParams({ username: email, password }));

export const register = (name: string, email: string, password: string) =>
  api.post("/auth/register", { name, email, password });

export const getMe = () => api.get("/auth/me");

// --- Incidents ---
export const listIncidents = (params?: Record<string, string | number>) =>
  api.get("/incidents", { params });

export const getIncident = (id: string) => api.get(`/incidents/${id}`);

export const createIncident = (data: {
  title: string;
  description?: string;
  severity: string;
  topic?: string;
  tags?: string[];
}) => api.post("/incidents", data);

export const updateIncident = (id: string, data: Record<string, unknown>) =>
  api.patch(`/incidents/${id}`, data);

export const addNote = (id: string, note: string) =>
  api.post(`/incidents/${id}/notes`, { note });

export const addParticipant = (id: string, userId: string, role: string) =>
  api.post(`/incidents/${id}/participants`, { user_id: userId, role });

// --- Tasks ---
export const listTasks = (incidentId: string) =>
  api.get(`/incidents/${incidentId}/tasks`);

export const createTask = (incidentId: string, data: {
  title: string;
  description?: string;
  assignee_id?: string;
  due_at?: string;
}) => api.post(`/incidents/${incidentId}/tasks`, data);

export const updateTask = (incidentId: string, taskId: string, data: Record<string, unknown>) =>
  api.patch(`/incidents/${incidentId}/tasks/${taskId}`, data);

export const deleteTask = (incidentId: string, taskId: string) =>
  api.delete(`/incidents/${incidentId}/tasks/${taskId}`);

// --- Channels ---
export const listChannels = () => api.get("/channels");

export const createChannel = (data: Record<string, unknown>) =>
  api.post("/channels", data);

export const updateChannel = (id: string, data: Record<string, unknown>) =>
  api.patch(`/channels/${id}`, data);

export const deleteChannel = (id: string) => api.delete(`/channels/${id}`);

export const testChannel = (id: string) => api.post(`/channels/${id}/test`);

// --- Notifications ---
export const publishNotification = (topic: string, data: {
  title: string;
  message: string;
  priority?: string;
  tags?: string[];
  incident_id?: string;
}) => api.post(`/notify/${topic}`, data);

export const getNotificationHistory = (topic: string, params?: Record<string, number>) =>
  api.get(`/notify/${topic}`, { params });

// --- SSE ---
export function subscribeToTopic(
  topic: string,
  token: string,
  onMessage: (data: Record<string, unknown>) => void,
  onError?: (err: Event) => void,
): EventSource {
  const url = `${BASE_URL}/notify/${topic}/sse`;
  // EventSource doesn't support custom headers, so pass token as query param
  const src = new EventSource(`${url}?token=${encodeURIComponent(token)}`);
  src.onmessage = (e) => {
    try {
      onMessage(JSON.parse(e.data));
    } catch {
      // ignore parse errors (heartbeats etc.)
    }
  };
  if (onError) src.onerror = onError;
  return src;
}
