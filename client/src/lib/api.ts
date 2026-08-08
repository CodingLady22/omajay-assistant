import type { Trend } from "@/lib/types";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "";

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
