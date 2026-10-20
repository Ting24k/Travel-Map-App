import { describe, it, expect } from "vitest";
import { readFileSync } from "node:fs";
import { geoArea, geoPath, geoEqualEarth } from "d3";
import { places, placesFor } from "../src/data/catalog";
import type { MapGeo } from "../src/types";
describe("bundled geographic assets", () => {
  for (const mode of ["world", "china"] as const) {
    it(`${mode}: retains every catalog feature, identifier and valid polygon`, () => {
      const g = JSON.parse(
        readFileSync(`public/maps/${mode}.json`, "utf8"),
      ) as MapGeo;
      expect(g.features.length).toBe(mode === "world" ? 258 : 34);
      expect(new Set(g.features.map((f) => f.properties.id))).toEqual(
        new Set(placesFor(mode).map((p) => p.id)),
      );
      for (const f of g.features) {
        expect(["Polygon", "MultiPolygon"]).toContain(f.geometry.type);
        expect(geoArea(f)).toBeGreaterThan(0);
        expect(geoArea(f)).toBeLessThan(2 * Math.PI);
        expect(geoPath(geoEqualEarth())(f)).toBeTruthy();
      }
    });
  }
  it("includes small countries, multipolygons, and bilingual names", () => {
    for (const id of [
      "country:VAT",
      "country:MCO",
      "country:IDN",
      "province:CN-HK",
      "province:CN-MO",
      "province:CN-TW",
    ])
      expect(places.find((p) => p.id === id)?.nameZh).toBeTruthy();
    const g = JSON.parse(readFileSync("public/maps/world.json", "utf8"));
    expect(
      g.features.find((f: any) => f.properties.id === "country:IDN").geometry
        .type,
    ).toBe("MultiPolygon");
  });
});
