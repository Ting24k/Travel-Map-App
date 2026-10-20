import type { TravelData } from "../types";
import { placeById, places } from "../data/catalog";
const color = /^#[0-9a-f]{6}$/i;
const record = (x: unknown): x is Record<string, unknown> =>
  !!x && typeof x === "object" && !Array.isArray(x);
const text = (x: unknown, max = 150): x is string =>
  typeof x === "string" && x.length > 0 && x.length <= max;
const date = (x: unknown) =>
  typeof x === "string" &&
  /^\d{4}-\d{2}-\d{2}T/.test(x) &&
  Number.isFinite(Date.parse(x));
export function validateBackup(value: unknown): TravelData {
  function ensure(condition: unknown): asserts condition {
    if (!condition) throw Error("Invalid or incompatible backup");
  }
  ensure(record(value) && value.schemaVersion === 1);
  const p = value.profile;
  ensure(
    record(p) && text(p.id) && text(p.displayName, 100) && date(p.createdAt),
  );
  const prefs = value.preferences;
  ensure(
    record(prefs) &&
      ["en", "zh"].includes(String(prefs.language)) &&
      ["world", "china"].includes(String(prefs.defaultMap)) &&
      prefs.theme === "light" &&
      typeof prefs.defaultVisitedColor === "string" &&
      color.test(prefs.defaultVisitedColor),
  );
  ensure(
    Array.isArray(value.visits) &&
      value.visits.length <= places.length &&
      Array.isArray(value.appearances) &&
      value.appearances.length <= places.length,
  );
  const visits = new Set(),
    appearances = new Set();
  for (const v of value.visits) {
    ensure(
      record(v) &&
        text(v.placeId) &&
        placeById.has(v.placeId) &&
        v.userId === p.id &&
        v.id === `${p.id}:${v.placeId}` &&
        typeof v.visited === "boolean" &&
        date(v.updatedAt) &&
        !visits.has(v.placeId),
    );
    visits.add(v.placeId);
  }
  for (const a of value.appearances) {
    ensure(
      record(a) &&
        text(a.placeId) &&
        placeById.has(a.placeId) &&
        a.userId === p.id &&
        typeof a.customColor === "string" &&
        color.test(a.customColor) &&
        !appearances.has(a.placeId),
    );
    appearances.add(a.placeId);
  }
  // Construct only known fields; unknown properties never enter the database.
  return {
    schemaVersion: 1,
    profile: {
      id: p.id as string,
      displayName: p.displayName as string,
      createdAt: p.createdAt as string,
    },
    visits: value.visits.map((v) => ({
      id: v.id,
      userId: v.userId,
      placeId: v.placeId,
      visited: v.visited,
      updatedAt: v.updatedAt,
    })),
    appearances: value.appearances.map((a) => ({
      userId: a.userId,
      placeId: a.placeId,
      customColor: a.customColor,
    })),
    preferences: {
      language: prefs.language as "en" | "zh",
      defaultMap: prefs.defaultMap as "world" | "china",
      defaultVisitedColor: prefs.defaultVisitedColor,
      theme: "light",
    },
  };
}
export function parseBackup(text: string) {
  if (new TextEncoder().encode(text).length > 2 * 1024 * 1024)
    throw Error("Backup too large");
  return validateBackup(JSON.parse(text));
}
export function serializeBackup(data: TravelData) {
  return JSON.stringify(validateBackup(data), null, 2);
}
export function downloadBlob(blob: Blob, name: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = name;
  document.body.append(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 60_000);
}
