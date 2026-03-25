"use client";

export const API_BASE = process.env.NEXT_PUBLIC_API_BASE ?? "http://localhost:4000";
export const ANALYST_ROLES = new Set(["admin", "analyst"]);
export const STAGE_X = { ENTRY: 80, MIDDLE: 360, EXIT: 640 };

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = filename;
  anchor.click();
  URL.revokeObjectURL(url);
}

export function formatTimestamp(value) {
  if (!value) return "N/A";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) {
    return value;
  }
  return date.toLocaleString();
}
