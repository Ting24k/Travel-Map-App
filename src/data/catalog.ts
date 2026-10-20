import raw from "./places.json";
import type { Place, MapMode } from "../types";
export const places = raw as Place[];
export const placeById = new Map(places.map((p) => [p.id, p]));
export const placesFor = (mode: MapMode) =>
  places.filter(
    (p) => p.type === (mode === "world" ? "country" : "china_province"),
  );
export function searchPlaces(query: string, mode: MapMode) {
  const q = query.trim().toLocaleLowerCase();
  return placesFor(mode)
    .filter((p) =>
      [p.nameEn, p.nameZh, p.isoCode || "", p.id].some((n) =>
        n.toLocaleLowerCase().includes(q),
      ),
    )
    .sort((a, b) => a.nameEn.localeCompare(b.nameEn));
}
