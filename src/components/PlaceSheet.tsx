import { MapPin, Check, RotateCcw } from "lucide-react";
import Modal from "./Modal";
import {
  manualVisited,
  derivedChina,
  setVisit,
  setColor,
  isVisited,
  statusFor,
  setStatus,
} from "../services/travel";
import type { Place, TravelData } from "../types";
import {collaborationMessages} from "../collaboration/i18n";
import { messages } from "../data/i18n";
export const palette = [
  "#88a48b",
  "#8cabc0",
  "#d69b85",
  "#aa9bc1",
  "#d5ba79",
  "#567d6c",
];
export default function PlaceSheet({
  place,
  data,
  update,
  onClose,
  onJournal,
}: {
  place: Place;
  data: TravelData;
  update: (fn: (d: TravelData) => TravelData) => void;
  onClose: () => void;
  onJournal?:()=>void;
}) {
  const t = {...messages[data.preferences.language],...collaborationMessages[data.preferences.language]},
    lang = data.preferences.language;
  const custom = data.appearances.find(
    (a) => a.placeId === place.id,
  )?.customColor;
  const color = custom || data.preferences.defaultVisitedColor;
  const derived = place.id === "country:CHN" && derivedChina(data);
  return (
    <Modal
      label={lang === "en" ? place.nameEn : place.nameZh}
      closeLabel={t.close}
      onClose={onClose}
      className="place-sheet"
    >
      <div className="sheet-marker" />
      <div
        className="place-symbol"
        style={{ background: isVisited(data, place.id) ? color : "#e6e9df" }}
      >
        <MapPin size={27} />
      </div>
      <p className="eyebrow">
        {place.type === "country" ? t.world : t.china} / {t.places}
      </p>
      <h2>{lang === "en" ? place.nameEn : place.nameZh}</h2>
      <p className="secondary-name">
        {lang === "en" ? place.nameZh : place.nameEn}
      </p>
      <label className="visit-toggle">
        <span>
          <Check size={18} />
          {place.id === "country:CHN" ? t.manualChina : t.recordVisit}
        </span>
        <input
          type="checkbox"
          checked={manualVisited(data, place.id)}
          onChange={(e) => update((d) => setVisit(d, place, e.target.checked))}
        />
        <span className="switch" aria-hidden="true" />
      </label>
      <label className="status-picker">{t.status}<select aria-label={t.status} value={statusFor(data,place.id)} onChange={e=>update(d=>setStatus(d,place,e.target.value as import('../collaboration/types').TravelStatus))}>{(['unvisited','wishlist','visited','lived'] as const).map(status=><option key={status} value={status}>{t[status]}</option>)}</select></label>
      {derived && <p className="derived-note">{t.derived}</p>}
      <div className="color-section">
        <h3>{t.color}</h3>
        <div className="swatches">
          {palette.map((c) => (
            <button
              key={c}
              aria-label={`${lang === "en" ? "Color" : "颜色"} ${c}`}
              aria-pressed={color === c}
              className="swatch"
              style={{ background: c }}
              onClick={() => update((d) => setColor(d, place.id, c))}
            >
              {color === c && <Check size={17} />}
            </button>
          ))}
          <label className="custom-color" title={t.color}>
            <input
              type="color"
              aria-label={t.color}
              value={color}
              onChange={(e) =>
                update((d) => setColor(d, place.id, e.target.value))
              }
            />
            <span aria-hidden="true">+</span>
          </label>
        </div>
        <button
          className="text-button reset-color"
          onClick={() => update((d) => setColor(d, place.id))}
        >
          <RotateCcw size={14} />
          {t.resetColor}
        </button>
      </div>
      {onJournal&&<button className="button journal-shortcut" onClick={onJournal}>{t.addEntry} · {(data.entries||[]).filter(e=>e.place_id===place.id&&!e.deleted).length}</button>}
      <p className="muted small">{t.savedAuto}</p>
      <button className="button primary full" onClick={onClose}>
        {t.saveClose}
        <Check size={16} />
      </button>
    </Modal>
  );
}
