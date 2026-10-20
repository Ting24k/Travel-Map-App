import "fake-indexeddb/auto";
import { describe, it, expect } from "vitest";
import {
  emptyData,
  setVisit,
  setColor,
  isVisited,
  manualVisited,
  colorFor,
  statistics,
} from "../src/services/travel";
import { placeById, searchPlaces } from "../src/data/catalog";
import { LocalTravelRepository } from "../src/db/repository";
const france = placeById.get("country:FRA")!,
  beijing = placeById.get("province:CN-BJ")!,
  china = placeById.get("country:CHN")!;
describe("travel records", () => {
  it("marks and unmarks a country without losing appearance", () => {
    let d = setVisit(emptyData(), france, true);
    expect(isVisited(d, france.id)).toBe(true);
    d = setColor(d, france.id, "#d69b85");
    expect(colorFor(d, france.id)).toBe("#d69b85");
    d = setVisit(d, france, false);
    expect(isVisited(d, france.id)).toBe(false);
    expect(colorFor(d, france.id)).toBe("#dedfd5");
    d = setVisit(d, france, true);
    expect(colorFor(d, france.id)).toBe("#d69b85");
    expect(colorFor(setColor(d, france.id), france.id)).toBe(
      d.preferences.defaultVisitedColor,
    );
  });
  it("derives China once and keeps manual country visits independent", () => {
    let d = setVisit(emptyData(), beijing, true);
    expect(isVisited(d, china.id)).toBe(true);
    expect(manualVisited(d, china.id)).toBe(false);
    expect(statistics(d, "world").count).toBe(1);
    d = setVisit(d, china, true);
    expect(statistics(d, "world").count).toBe(1);
    d = setVisit(d, beijing, false);
    expect(isVisited(d, china.id)).toBe(true);
    d = setVisit(d, china, false);
    expect(isVisited(d, china.id)).toBe(false);
    expect(statistics(d, "china").count).toBe(0);
    d = setVisit(d, china, true);
    expect(statistics(d, "china").count).toBe(0);
  });
  it("uses catalog totals and English/Chinese partial search for small places", () => {
    expect(statistics(emptyData(), "world").total).toBe(258);
    expect(statistics(emptyData(), "china").total).toBe(34);
    expect(searchPlaces("vatic", "world")[0].id).toBe("country:VAT");
    expect(searchPlaces("澳门", "china")[0].id).toBe("province:CN-MO");
    expect(searchPlaces("beiJ", "china")[0].id).toBe(beijing.id);
  });
  it("persists records, preferences, and appearances across repository instances", async () => {
    const name = "test-" + crypto.randomUUID();
    let repo = new LocalTravelRepository(name);
    let d = setColor(setVisit(emptyData(), france, true), france.id, "#aa9bc1");
    d.preferences.language = "zh";
    await repo.save(d);
    repo.close();
    repo = new LocalTravelRepository(name);
    expect(await repo.load()).toEqual(d);
    await repo.delete();
  });
});
