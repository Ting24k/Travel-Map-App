import { useEffect, useRef, useState } from "react";
import {
  Download,
  Upload,
  Image as ImageIcon,
  Share2,
  ShieldCheck,
  Check,
} from "lucide-react";
import type { TravelData, MapMode } from "../types";
import { messages } from "../data/i18n";
import { downloadBlob, parseBackup, serializeBackup } from "../services/backup";
import { mapToPng } from "../services/image";
import { statistics } from "../services/travel";
import Modal from "./Modal";
export function BackupPanel({
  data,
  replace,
}: {
  data: TravelData;
  replace: (d: TravelData) => void;
}) {
  const t = messages[data.preferences.language],
    input = useRef<HTMLInputElement>(null);
  const [pending, setPending] = useState<TravelData>();
  const [status, setStatus] = useState("");
  const [error, setError] = useState(false);
  async function read(file?: File) {
    if (!file) return;
    try {
      if (file.size > 2 * 1024 * 1024) throw Error("Too large");
      setPending(parseBackup(await file.text()));
      setError(false);
      setStatus("");
    } catch {
      setError(true);
      setStatus(t.invalidBackup);
    }
  }
  return (
    <section className="content-card backup-card">
      <h3>
        <ShieldCheck size={20} />
        {t.backup}
      </h3>
      <p>{t.backupNote}</p>
      <div className="backup-actions">
        <button
          className="button"
          onClick={() => {
            downloadBlob(
              new Blob([serializeBackup(data)], { type: "application/json" }),
              `our-little-world-${new Date().toISOString().slice(0, 10)}.json`,
            );
            setError(false);
            setStatus(t.exported);
          }}
        >
          <Download size={16} />
          {t.exportData}
        </button>
        <button className="button" onClick={() => input.current?.click()}>
          <Upload size={16} />
          {t.importData}
        </button>
        <input
          ref={input}
          data-testid="backup-file"
          className="visually-hidden"
          tabIndex={-1}
          type="file"
          accept=".json,application/json"
          aria-label={t.importData}
          onChange={(e) => {
            void read(e.target.files?.[0]);
            e.target.value = "";
          }}
        />
      </div>
      {status && (
        <p
          className={error ? "form-error" : "form-success"}
          role={error ? "alert" : "status"}
        >
          {status}
        </p>
      )}
      {pending && (
        <Modal
          label={t.importReady}
          closeLabel={t.close}
          onClose={() => setPending(undefined)}
          className="import-modal"
        >
          <div className="place-symbol">
            <Upload size={24} />
          </div>
          <h2>{t.importReady}</h2>
          <p className="modal-description">{t.importConfirm}</p>
          <div className="import-summary">
            <Check size={17} />
            {statistics(pending, "world").count} {t.countries} ·{" "}
            {statistics(pending, "china").count} {t.regions}
          </div>
          <div className="backup-actions">
            <button className="button" onClick={() => setPending(undefined)}>
              {t.cancel}
            </button>
            <button
              className="button primary"
              onClick={() => {
                replace(pending);
                setPending(undefined);
                setStatus(messages[pending.preferences.language].restored);
              }}
            >
              {t.replace}
            </button>
          </div>
        </Modal>
      )}
    </section>
  );
}
export function ExportMap({ data, mode }: { data: TravelData; mode: MapMode }) {
  const t = messages[data.preferences.language];
  const [image, setImage] = useState<{ blob: Blob; url: string }>();
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  useEffect(
    () => () => {
      if (image) URL.revokeObjectURL(image.url);
    },
    [image],
  );
  async function generate() {
    const svg = document.querySelector<SVGSVGElement>("#travel-map");
    if (!svg) return;
    setBusy(true);
    setError(false);
    try {
      const s = statistics(data, mode);
      const blob = await mapToPng(svg, {
        title: "Our Little World",
        subtitle: `${t[mode]} · ${s.count} / ${s.total} ${t.visited}`,
        legend: t.visited,
        color: data.preferences.defaultVisitedColor,
      });
      setImage({ blob, url: URL.createObjectURL(blob) });
    } catch {
      setError(true);
    } finally {
      setBusy(false);
    }
  }
  async function share() {
    if (!image) return;
    const file = new File([image.blob], "our-little-world.png", {
      type: "image/png",
    });
    try {
      if (navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: "Our Little World" });
      } else downloadBlob(image.blob, "our-little-world.png");
    } catch (e) {
      if ((e as Error).name !== "AbortError") setError(true);
    }
  }
  return (
    <>
      <button
        className="button export-map"
        disabled={busy}
        onClick={() => void generate()}
      >
        <ImageIcon size={16} />
        {busy ? t.loading : t.exportMap}
        <ArrowIcon />
      </button>
      {error && (
        <span className="form-error export-error" role="alert">
          {t.imageError}
        </span>
      )}
      {image && (
        <Modal
          label={t.imagePreview}
          closeLabel={t.close}
          onClose={() => setImage(undefined)}
          className="image-modal"
        >
          <p className="eyebrow">{t.snapshot}</p>
          <h2>{t.imageReady}</h2>
          <img src={image.url} alt={t.imagePreview} />
          <div className="backup-actions">
            <button
              className="button primary"
              onClick={() => downloadBlob(image.blob, "our-little-world.png")}
            >
              <Download size={16} />
              {t.download}
            </button>
            <button className="button" onClick={() => void share()}>
              <Share2 size={16} />
              {t.share}
            </button>
          </div>
        </Modal>
      )}
    </>
  );
}
function ArrowIcon() {
  return <span aria-hidden="true">↗</span>;
}
export function ShareApp({ data }: { data: TravelData }) {
  const t = messages[data.preferences.language];
  const [status, setStatus] = useState("");
  async function share() {
    const url = new URL(import.meta.env.BASE_URL, location.origin).href;
    try {
      if (navigator.share)
        await navigator.share({ title: "Our Little World", url });
      else {
        await navigator.clipboard.writeText(url);
        setStatus(t.copied);
      }
    } catch (e) {
      if ((e as Error).name !== "AbortError") setStatus(t.shareFailed);
    }
  }
  return (
    <>
      <button className="button" onClick={() => void share()}>
        <Share2 size={16} />
        {t.shareApp}
      </button>
      {status && (
        <p className="small muted" role="status">
          {status}
        </p>
      )}
    </>
  );
}
