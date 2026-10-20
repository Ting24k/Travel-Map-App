import { placesFor, placeById } from "../data/catalog";
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
export function manualVisited(data: TravelData, id: string) {
  return data.visits.some(
    (v) => v.userId === data.profile.id && v.placeId === id && v.visited,
  );
}
export function derivedChina(data: TravelData) {
  return data.visits.some(
    (v) =>
      v.userId === data.profile.id &&
      v.visited &&
      placeById.get(v.placeId)?.type === "china_province",
  );
}
export function isVisited(data: TravelData, id: string) {
  return (
    manualVisited(data, id) || (id === "country:CHN" && derivedChina(data))
  );
}
export function colorFor(data: TravelData, id: string) {
  return isVisited(data, id)
    ? data.appearances.find(
        (a) => a.userId === data.profile.id && a.placeId === id,
      )?.customColor || data.preferences.defaultVisitedColor
    : "#dedfd5";
}
export function setVisit(
  data: TravelData,
  place: Place,
  visited: boolean,
): TravelData {
  return {
    ...data,
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
