import type { FeatureCollection, Geometry } from "geojson";
export type MapMode = "world" | "china";
export type Language = "en" | "zh";
export interface UserProfile {
  id: string;
  displayName: string;
  createdAt: string;
}
export interface Place {
  id: string;
  type: "country" | "china_province";
  nameEn: string;
  nameZh: string;
  parentId?: string;
  geometryRef: string;
  isoCode?: string | null;
}
export interface Visit {
  id: string;
  userId: string;
  placeId: string;
  visited: boolean;
  updatedAt: string;
}
export interface PlaceAppearance {
  userId: string;
  placeId: string;
  customColor: string;
}
export interface UserPreferences {
  language: Language;
  defaultVisitedColor: string;
  defaultMap: MapMode;
  theme: "light";
}
export interface TravelData {
  schemaVersion: 1 | 2;
  profile: UserProfile;
  visits: Visit[];
  appearances: PlaceAppearance[];
  preferences: UserPreferences;
  records?: import("../collaboration/types").PlaceRecord[];
  entries?: import("../collaboration/types").TravelEntry[];
}
export type MapGeo = FeatureCollection<Geometry, { id: string }>;
