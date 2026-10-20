import { useEffect, useMemo, useRef, useState } from "react";
import * as d3 from "d3";
import { Minus, Plus, LocateFixed } from "lucide-react";
import type { MapGeo, MapMode, Place, Language } from "../types";
import { placeById } from "../data/catalog";
interface Props {
  mode: MapMode;
  language: Language;
  selected?: string;
  onSelect: (place: Place) => void;
  colorFor?: (id: string) => string;
  visited?: (id: string) => boolean;
  resetKey?: number;
}
export default function TravelMap({
  mode,
  language,
  selected,
  onSelect,
  colorFor = () => "#dedfd5",
  visited = () => false,
  resetKey = 0,
}: Props) {
  const [geo, setGeo] = useState<MapGeo>();
  const [error, setError] = useState(false);
  const [zoomLevel, setZoomLevel] = useState(1);
  const svg = useRef<SVGSVGElement>(null);
  const group = useRef<SVGGElement>(null);
  const zoom = useRef<d3.ZoomBehavior<SVGSVGElement, unknown>>(null);
  useEffect(() => {
    let active = true;
    setGeo(undefined);
    setError(false);
    fetch(`${import.meta.env.BASE_URL}maps/${mode}.json`)
      .then((r) => {
        if (!r.ok) throw Error();
        return r.json();
      })
      .then((data) => {
        if (active) setGeo(data);
      })
      .catch(() => {
        if (active) setError(true);
      });
    return () => {
      active = false;
    };
  }, [mode, resetKey]);
  const projection = useMemo(() => {
    if (!geo) return;
    return (mode === "world" ? d3.geoEqualEarth() : d3.geoMercator()).fitExtent(
      [
        [35, 55],
        [965, 565],
      ],
      geo,
    );
  }, [geo, mode]);
  const path = useMemo(() => d3.geoPath(projection), [projection]);
  useEffect(() => {
    if (!svg.current || !group.current || !geo) return;
    const z = d3
      .zoom<SVGSVGElement, unknown>()
      .scaleExtent([1, 18])
      .extent([
        [0, 0],
        [1000, 620],
      ])
      .translateExtent([
        [-200, -150],
        [1200, 770],
      ])
      .on("zoom", (e) => {
        d3.select(group.current).attr("transform", e.transform.toString());
        setZoomLevel(e.transform.k);
      });
    zoom.current = z;
    d3.select(svg.current).call(z).call(z.transform, d3.zoomIdentity);
    return () => {
      d3.select(svg.current).on(".zoom", null);
    };
  }, [geo]);
  useEffect(() => {
    if (!selected || !geo || !svg.current || !zoom.current) return;
    const f = geo.features.find((f) => f.properties.id === selected);
    if (!f) return;
    const [[x0, y0], [x1, y1]] = path.bounds(f);
    const k = Math.min(
      12,
      Math.max(1.7, 0.65 / Math.max((x1 - x0) / 1000, (y1 - y0) / 620)),
    );
    const t = d3.zoomIdentity
      .translate(500, 310)
      .scale(k)
      .translate(-(x0 + x1) / 2, -(y0 + y1) / 2);
    d3.select(svg.current)
      .transition()
      .duration(350)
      .call(zoom.current.transform, t);
  }, [selected, geo, path]);
  const labels = useMemo(() => {
    if (!geo) return [];
    const used: Array<[number, number, number, number]> = [];
    return [...geo.features]
      .sort((a, b) => path.area(b) - path.area(a))
      .flatMap((f) => {
        if (path.area(f) < (mode === "world" ? 2000 : 500)) return [];
        const p = placeById.get(f.properties.id);
        if (!p) return [];
        const name =
          language === "en"
            ? p.nameEn
            : p.nameZh.replace(
                /省|市|壮族自治区|回族自治区|维吾尔自治区|自治区/g,
                "",
              );
        const [x, y] = path.centroid(f);
        const w = name.length * (language === "en" ? 6 : 11);
        const box: [number, number, number, number] = [
          x - w / 2,
          y - 7,
          x + w / 2,
          y + 7,
        ];
        if (
          !Number.isFinite(x) ||
          used.some(
            (b) =>
              box[0] < b[2] + 8 &&
              box[2] > b[0] - 8 &&
              box[1] < b[3] + 5 &&
              box[3] > b[1] - 5,
          )
        )
          return [];
        used.push(box);
        return [{ id: p.id, name, x, y }];
      });
  }, [geo, path, mode, language]);
  function zoomBy(factor: number) {
    if (svg.current && zoom.current)
      d3.select(svg.current)
        .transition()
        .duration(200)
        .call(zoom.current.scaleBy, factor);
  }
  function reset() {
    if (svg.current && zoom.current)
      d3.select(svg.current)
        .transition()
        .duration(250)
        .call(zoom.current.transform, d3.zoomIdentity);
  }
  return (
    <div className="map-canvas" aria-busy={!geo && !error}>
      {error ? (
        <div className="map-message" role="alert">
          {language === "en"
            ? "Map unavailable. Check your connection, then retry."
            : "地图加载失败，请检查网络后重试。"}
        </div>
      ) : !geo ? (
        <div className="map-message">
          {language === "en" ? "Unfolding your world…" : "正在展开地图…"}
        </div>
      ) : null}
      <svg
        ref={svg}
        id="travel-map"
        viewBox="0 0 1000 620"
        role="group"
        aria-label={
          language === "en"
            ? `${mode === "world" ? "World" : "China"} travel map`
            : `${mode === "world" ? "世界" : "中国"}旅行地图`
        }
      >
        <defs>
          <pattern
            id="ocean-dots"
            width="16"
            height="16"
            patternUnits="userSpaceOnUse"
          >
            <circle cx="1" cy="1" r="0.65" fill="#a9bdb7" opacity="0.25" />
          </pattern>
        </defs>
        <rect width="1000" height="620" fill="#edf1ed" />
        <rect width="1000" height="620" fill="url(#ocean-dots)" />
        <g ref={group}>
          {geo?.features.map((f) => {
            const id = f.properties.id,
              p = placeById.get(id)!;
            return (
              <path
                key={id}
                data-place-id={id}
                d={path(f) || ""}
                fill={colorFor(id)}
                stroke={selected === id ? "#3d6556" : "#f9faf6"}
                strokeWidth={selected === id ? 2.5 : 0.7}
                vectorEffect="non-scaling-stroke"
                className={`map-region ${selected === id ? "selected" : ""}`}
                role="button"
                tabIndex={0}
                aria-label={`${language === "en" ? p.nameEn : p.nameZh}${visited(id) ? (language === "en" ? ", visited" : "，已去过") : ""}`}
                onClick={() => onSelect(p)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" || e.key === " ") {
                    e.preventDefault();
                    onSelect(p);
                  }
                }}
              >
                <title>
                  {p.nameEn} · {p.nameZh}
                </title>
              </path>
            );
          })}
          {zoomLevel < 3 &&
            labels.map((l) => (
              <text
                key={l.id}
                x={l.x}
                y={l.y}
                textAnchor="middle"
                className="map-label"
              >
                {l.name}
              </text>
            ))}
        </g>
      </svg>
      <div className="map-controls">
        <button
          aria-label={language === "en" ? "Zoom in" : "放大"}
          onClick={() => zoomBy(1.6)}
        >
          <Plus size={18} />
        </button>
        <button
          aria-label={language === "en" ? "Zoom out" : "缩小"}
          onClick={() => zoomBy(1 / 1.6)}
        >
          <Minus size={18} />
        </button>
        <span />
        <button
          aria-label={language === "en" ? "Reset map view" : "重置地图"}
          onClick={reset}
        >
          <LocateFixed size={18} />
        </button>
      </div>
      <div className="map-attribution">
        Natural Earth ·{" "}
        {language === "en" ? "Explore with a tap" : "轻点，探索世界"}
      </div>
    </div>
  );
}
