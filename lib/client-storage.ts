import type { DashboardData } from "./types";

const STORAGE_KEY = "yumyum_dashboard_data";

export function getStoredData(): DashboardData | null {
  if (typeof window === "undefined") return null;

  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    if (!stored) return null;
    return JSON.parse(stored) as DashboardData;
  } catch {
    return null;
  }
}

export function saveStoredData(data: DashboardData): void {
  if (typeof window === "undefined") return;

  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
  } catch (error) {
    console.error("Failed to save to localStorage:", error);
  }
}

export function clearStoredData(): void {
  if (typeof window === "undefined") return;
  localStorage.removeItem(STORAGE_KEY);
}
