// Natural Earth public-domain data. Pinned upstream revision; no API at runtime.
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { execFileSync } from "node:child_process";
import crypto from "node:crypto";
import mapshaper from "mapshaper";
import { geoArea } from "d3";
const revision = "ca96624a56bd078437bca8184e78163e5039ad19";
const temp = fs.mkdtempSync(path.join(os.tmpdir(), "little-world-geo-"));
const sources = [];
const componentCounts = {};
function source(file) {
  const url = `https://raw.githubusercontent.com/nvkelso/natural-earth-vector/${revision}/geojson/${file}.geojson`;
  const out = path.join(temp, file + ".json");
  execFileSync("python", [
    "-c",
    'import urllib.request,sys;open(sys.argv[2],"wb").write(urllib.request.urlopen(sys.argv[1],timeout=120).read())',
    url,
    out,
  ]);
  const bytes = fs.readFileSync(out);
  sources.push({
    url,
    sha256: crypto.createHash("sha256").update(bytes).digest("hex"),
  });
  return JSON.parse(bytes);
}
const world = source("ne_10m_admin_0_countries");
const allProvinces = source("ne_10m_admin_1_states_provinces");
const places = [];
for (const f of world.features) {
  const p = f.properties;
  const id = "country:" + p.ADM0_A3;
  f.id = id;
  f.properties = { id };
  places.push({
    id,
    type: "country",
    nameEn: p.ADM0_A3 === "CHN" ? "China" : p.NAME_EN || p.NAME,
    nameZh: p.ADM0_A3 === "CHN" ? "中国" : p.NAME_ZH || p.NAME_EN,
    isoCode: p.ISO_A2_EH === "-99" ? null : p.ISO_A2_EH,
    geometryRef: "world#" + id,
  });
}
const china = { type: "FeatureCollection", features: [] };
for (const f of allProvinces.features.filter(
  (f) => f.properties.adm0_a3 === "CHN",
)) {
  const p = f.properties;
  // NE has a separate disputed Paracel feature: retain its polygons under Hainan.
  if (p.iso_3166_2 === "CN-X01~") continue;
  const id = "province:" + p.iso_3166_2;
  f.id = id;
  f.properties = { id };
  china.features.push(f);
  places.push({
    id,
    type: "china_province",
    nameEn: p.name_en,
    nameZh: p.name_zh,
    parentId: "country:CHN",
    geometryRef: "china#" + id,
  });
}
const paracel = allProvinces.features.find(
  (f) =>
    f.properties.adm0_a3 === "CHN" && f.properties.iso_3166_2 === "CN-X01~",
);
const hainan = china.features.find((f) => f.id === "province:CN-HI");
function polygons(g) {
  return g.type === "Polygon" ? [g.coordinates] : g.coordinates;
}
if (paracel)
  hainan.geometry = {
    type: "MultiPolygon",
    coordinates: [...polygons(hainan.geometry), ...polygons(paracel.geometry)],
  };
for (const [code, en, zh] of [
  ["HKG", "Hong Kong", "香港特别行政区"],
  ["MAC", "Macau", "澳门特别行政区"],
  ["TWN", "Taiwan", "台湾"],
]) {
  const f = world.features.find((f) => f.id === "country:" + code);
  if (!f) throw Error("Missing " + code);
  const id = "province:" + { HKG: "CN-HK", MAC: "CN-MO", TWN: "CN-TW" }[code];
  china.features.push({ ...f, id, properties: { id } });
  places.push({
    id,
    type: "china_province",
    nameEn: en,
    nameZh: zh,
    parentId: "country:CHN",
    geometryRef: "china#" + id,
  });
}
if (
  world.features.length !== 258 ||
  china.features.length !== 34 ||
  new Set(places.map((p) => p.id)).size !== places.length
)
  throw Error("Catalog count or identifier mismatch");
fs.mkdirSync("public/maps", { recursive: true });
fs.mkdirSync("src/data", { recursive: true });
for (const [name, data] of [
  ["world", world],
  ["china", china],
]) {
  const input = path.join(temp, name + ".json");
  fs.writeFileSync(input, JSON.stringify(data));
  await new Promise((resolve, reject) =>
    mapshaper.runCommands(
      `-i ${input} -explode -simplify weighted 8% keep-shapes -dissolve id -o public/maps/${name}.json format=geojson precision=0.00001 force`,
      (err) => (err ? reject(err) : resolve()),
    ),
  );
  const output = JSON.parse(fs.readFileSync(`public/maps/${name}.json`));
  // D3 expects clockwise exterior rings (opposite to RFC 7946). Rewind each polygon.
  for (const feature of output.features) {
    for (const coords of polygons(feature.geometry)) {
      if (geoArea({ type: "Polygon", coordinates: coords }) > 2 * Math.PI)
        coords.forEach((ring) => ring.reverse());
    }
  }
  fs.writeFileSync(`public/maps/${name}.json`, JSON.stringify(output));
  if (
    output.features.length !== data.features.length ||
    output.features.some((f) => !f.geometry)
  )
    throw Error("Simplification lost a feature");
  for (const f of data.features) {
    const out = output.features.find(
      (o) => o.properties.id === f.properties.id,
    );
    if (!out || polygons(out.geometry).length !== polygons(f.geometry).length)
      throw Error(
        "Simplification changed polygon count for " + f.properties.id,
      );
  }
  componentCounts[name] = output.features.reduce(
    (n, f) => n + polygons(f.geometry).length,
    0,
  );
  console.log(
    name,
    output.features.length,
    "features",
    fs.statSync(`public/maps/${name}.json`).size,
    "bytes",
  );
}
fs.writeFileSync("src/data/places.json", JSON.stringify(places, null, 2));
fs.writeFileSync(
  "public/maps/provenance.json",
  JSON.stringify(
    {
      revision,
      componentCounts,
      license: "Natural Earth public domain",
      attribution: "Made with Natural Earth. naturalearthdata.com",
      sources,
      worldUnits: 258,
      chinaUnits: 34,
      policy:
        "All 258 NE admin-0 map units retained, including territories, disputed units, and Antarctica; world statistics count these catalog units, not sovereign states. China view: 31 mainland units plus Hong Kong, Macau, Taiwan. Separate NE Paracel feature merged into Hainan without discarding geometry. Classification is for travel organization and does not assert sovereignty. NE de facto boundary policy; not navigation or legal evidence. IDs are NE ADM0_A3 and ISO 3166-2, independent across views.",
    },
    null,
    2,
  ),
);
fs.rmSync(temp, { recursive: true });
