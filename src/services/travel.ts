import { placesFor } from "../data/catalog";
import type { TravelData, Place, MapMode, Language } from "../types";
export const defaults = {
  language: "en" as Language,
  defaultVisitedColor: "#88a48b",
  defaultMap: "world" as MapMode,
  theme: "light" as const,
};
export function emptyData(): TravelData {
  return {
    schemaVersion: 1,
    profile: {
      id: crypto.randomUUID(),
      displayName: "Traveler",
      createdAt: new Date().toISOString(),
    },
    visits: [],
    appearances: [],
    preferences: { ...defaults },
  };
}
export function statusFor(data:TravelData,id:string):import("../collaboration/types").TravelStatus {
 const row=data.records?.find(r=>r.user_id===data.profile.id&&r.place_id===id);
 return row?.status || (data.visits.some(v=>v.userId===data.profile.id&&v.placeId===id&&v.visited)?"visited":"unvisited");
}
export function manualVisited(data: TravelData, id: string) {
 if(data.records?.some(r=>r.place_id===id&&r.user_id===data.profile.id))return ["visited","lived"].includes(statusFor(data,id));
  return data.visits.some(
    (v) => v.userId === data.profile.id && v.placeId === id && v.visited,
  );
}
export function derivedChina(data: TravelData) {
  return placesFor("china").some(p=>manualVisited(data,p.id));
}
export function isVisited(data: TravelData, id: string) {
  return (
    manualVisited(data, id) || (id === "country:CHN" && derivedChina(data))
  );
}
export function colorFor(data: TravelData, id: string) {
  const status=statusFor(data,id);
  return isVisited(data, id)||status==="wishlist"
    ? data.appearances.find(
        (a) => a.userId === data.profile.id && a.placeId === id,
      )?.customColor || (status==="wishlist"?"#d5ba79":status==="lived"?"#aa9bc1":data.preferences.defaultVisitedColor)
    : "#dedfd5";
}
export function setVisit(
  data: TravelData,
  place: Place,
  visited: boolean,
): TravelData {
  return {
    ...data,
    ...(data.records?{records:data.records.map(r=>r.place_id===place.id?{...r,status:visited?"visited" as const:"unvisited" as const}:r)}:{}),
    visits: [
      ...data.visits.filter((v) => v.placeId !== place.id),
      {
        id: `${data.profile.id}:${place.id}`,
        userId: data.profile.id,
        placeId: place.id,
        visited,
        updatedAt: new Date().toISOString(),
      },
    ],
  };
}
export function setColor(
  data: TravelData,
  id: string,
  color?: string,
): TravelData {
  return {
    ...data,
    ...(data.records?{records:data.records.map(r=>r.place_id===id?{...r,custom_color:color||null}:r)}:{}),
    appearances: [
      ...data.appearances.filter((a) => a.placeId !== id),
      ...(color
        ? [{ userId: data.profile.id, placeId: id, customColor: color }]
        : []),
    ],
  };
}
export function statistics(data: TravelData, mode: MapMode) {
  const all = placesFor(mode);
  const count = all.filter((p) => isVisited(data, p.id)).length;
  return {
    count,
    total: all.length,
    percent: all.length ? (count / all.length) * 100 : 0,
  };
}

export function setStatus(data:TravelData,place:Place,status:import("../collaboration/types").TravelStatus):TravelData {
 const updated=setVisit(data,place,status==="visited"||status==="lived");
 const old=data.records?.find(r=>r.place_id===place.id);
 return {...updated,schemaVersion:2,records:[...(data.records||[]).filter(r=>r.place_id!==place.id),{user_id:data.profile.id,place_id:place.id,status,custom_color:data.appearances.find(a=>a.placeId===place.id)?.customColor||null,revision:old?.revision||0,updated_at:new Date().toISOString()}]};
}
