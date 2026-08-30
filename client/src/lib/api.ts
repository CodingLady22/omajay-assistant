import type {
  CalendarEvent,
  Contract,
  ContractStatus,
  DocType,
  DocumentSummary,
  Script,
  ScriptStatus,
  Trend,
} from "@/lib/types";

export const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

export type ApiResponse<T> = { success: true; data: T } | { success: false; error: string };

async function request<T>(path: string, init?: RequestInit): Promise<ApiResponse<T>> {
  try {
    const res = await fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: { "Content-Type": "application/json", ...init?.headers },
    });
    // res.json() returns `any`; the assertion is unavoidable here — every route
    // returns the same { success, data? | error? } wrapper validated by zod server-side.
    return (await res.json()) as ApiResponse<T>;
  } catch (error) {
    console.error("[lib/api]", error);
    return { success: false, error: "Couldn't reach the server — try again in a moment." };
  }
}

export async function sendChatMessage(text: string): Promise<ApiResponse<{ response: string }>> {
  return request("/api/chat", {
    method: "POST",
    body: JSON.stringify({ text }),
  });
}

export async function getTrends(): Promise<ApiResponse<Trend[]>> {
  return request("/api/trends");
}

export async function getScripts(): Promise<ApiResponse<Script[]>> {
  return request("/api/scripts");
}

export async function setScriptStatus(id: string, status: ScriptStatus): Promise<ApiResponse<Script>> {
  return request(`/api/scripts/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function getCalendarEvents(): Promise<ApiResponse<CalendarEvent[]>> {
  return request("/api/calendar");
}

export async function confirmCalendarEvent(eventId: string): Promise<ApiResponse<CalendarEvent>> {
  return request("/api/calendar/confirm", {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
}

export async function discardCalendarEvent(eventId: string): Promise<ApiResponse<null>> {
  return request("/api/calendar/discard", {
    method: "POST",
    body: JSON.stringify({ eventId }),
  });
}

export async function getContracts(): Promise<ApiResponse<Contract[]>> {
  return request("/api/contracts");
}

export async function setContractStatus(id: string, status: ContractStatus): Promise<ApiResponse<Contract>> {
  return request(`/api/contracts/${id}/status`, {
    method: "POST",
    body: JSON.stringify({ status }),
  });
}

export async function getDocuments(): Promise<ApiResponse<DocumentSummary[]>> {
  return request("/api/documents");
}

// Not routed through request() — a multipart body needs fetch to set its own
// Content-Type (with the boundary), which request()'s hardcoded
// "application/json" header would clobber.
export async function uploadDocument(
  file: File,
  docType: DocType
): Promise<ApiResponse<{ source: string; chunk_count: number }>> {
  const formData = new FormData();
  formData.append("file", file);
  formData.append("doc_type", docType);

  try {
    const res = await fetch(`${API_BASE_URL}/api/documents/upload`, { method: "POST", body: formData });
    return (await res.json()) as ApiResponse<{ source: string; chunk_count: number }>;
  } catch (error) {
    console.error("[lib/api]", error);
    return { success: false, error: "Couldn't reach the server — try again in a moment." };
  }
}

export async function deleteDocument(source: string): Promise<ApiResponse<{ deletedCount: number }>> {
  return request(`/api/documents/${encodeURIComponent(source)}`, { method: "DELETE" });
}
