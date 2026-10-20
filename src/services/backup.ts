import {validateEntry} from "../collaboration/model";
import type {PlaceRecord,TravelEntry} from "../collaboration/types";
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
  ensure(record(value) && (value.schemaVersion === 1||value.schemaVersion===2));
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
  let records:PlaceRecord[]|undefined,entries:TravelEntry[]|undefined;
  if(value.schemaVersion===2){
   ensure(Array.isArray(value.records)&&value.records.length<=places.length&&Array.isArray(value.entries)&&value.entries.length<=10000);
   const ids=new Set(),entryIds=new Set();
   records=value.records.map(r=>{ensure(record(r)&&r.user_id===p.id&&text(r.place_id)&&placeById.has(r.place_id)&&!ids.has(r.place_id)&&['unvisited','wishlist','visited','lived'].includes(String(r.status))&&(r.custom_color===null||(typeof r.custom_color==='string'&&color.test(r.custom_color)))&&Number.isSafeInteger(r.revision)&&Number(r.revision)>=0&&date(r.updated_at));ids.add(r.place_id);return {user_id:r.user_id,place_id:r.place_id,status:r.status,custom_color:r.custom_color,revision:r.revision,updated_at:r.updated_at} as PlaceRecord});
   entries=value.entries.map(e=>{ensure(record(e)&&text(e.id)&&/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(e.id)&&!entryIds.has(e.id)&&e.user_id===p.id&&text(e.place_id)&&Array.isArray(e.cities)&&e.cities.every(c=>typeof c==='string')&&typeof e.note==='string'&&typeof e.deleted==='boolean'&&(e.start_date===null||typeof e.start_date==='string')&&(e.end_date===null||typeof e.end_date==='string')&&Number.isSafeInteger(e.revision)&&Number(e.revision)>=0&&date(e.created_at)&&date(e.updated_at));entryIds.add(e.id);const entry={id:e.id,user_id:e.user_id,place_id:e.place_id,start_date:e.start_date,end_date:e.end_date,cities:[...e.cities],note:e.note,deleted:e.deleted,revision:e.revision,created_at:e.created_at,updated_at:e.updated_at} as TravelEntry;return validateEntry(entry)});
  }
  // Construct only known fields; unknown properties never enter the database.
  return {
    schemaVersion: value.schemaVersion,
    ...(records?{records}:{}),...(entries?{entries}:{}),
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
  return JSON.stringify(validateBackup(data.schemaVersion===2?{...data,records:data.records||[],entries:data.entries||[]}:data), null, 2);
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
