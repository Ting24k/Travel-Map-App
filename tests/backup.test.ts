import { describe, it, expect } from "vitest";
import { emptyData, setVisit, setColor } from "../src/services/travel";
import {
  parseBackup,
  serializeBackup,
  validateBackup,
  MAX_BACKUP_BYTES,
} from "../src/services/backup";
import { placeById } from "../src/data/catalog";
describe("versioned backups", () => {
  const sample = () =>
    setColor(
      setVisit(emptyData(), placeById.get("province:CN-BJ")!, true),
      "province:CN-BJ",
      "#aa9bc1",
    );
  it("round trips all stable IDs, visits, colors and preferences", () => {
    const d = sample();
    d.preferences.language = "zh";
    expect(parseBackup(serializeBackup(d))).toEqual(d);
  });
  it("rejects malformed JSON, incompatible versions, missing fields and oversize data", () => {
    for (const s of [
      "{",
      "null",
      "{}",
      '{"schemaVersion":2}',
      " ".repeat(2 * 1024 * 1024 + 1),
    ])
      expect(() => parseBackup(s)).toThrow();
  });
  it("rejects unknown IDs, wrong owners, invalid dates and duplicate records", () => {
    const d = sample();
    for (const change of [
      { placeId: "country:INVALID" },
      { userId: "other" },
      { updatedAt: "yesterday" },
      { visited: "yes" },
      { id: "unexpected" },
    ])
      expect(() =>
        validateBackup({ ...d, visits: [{ ...d.visits[0], ...change }] }),
      ).toThrow();
    expect(() =>
      validateBackup({ ...d, visits: [...d.visits, ...d.visits] }),
    ).toThrow();
  });
  it("rejects invalid appearance values and unsupported preferences", () => {
    const d = sample();
    for (const customColor of [
      "red",
      "#fff",
      "url(https://example.com)",
      "<script>",
    ])
      expect(() =>
        validateBackup({
          ...d,
          appearances: [{ ...d.appearances[0], customColor }],
        }),
      ).toThrow();
    expect(() =>
      validateBackup({
        ...d,
        preferences: { ...d.preferences, language: "fr" },
      }),
    ).toThrow();
  });
  it("discards unknown fields without mutating its input", () => {
    const d = sample();
    const raw = {
      ...d,
      tracking: "no",
      profile: { ...d.profile, extra: "no" },
    };
    expect(validateBackup(raw)).toEqual(d);
    expect(raw.profile.extra).toBe("no");
  });
});

it('rejects an oversized otherwise-valid JSON backup before discarding unknown fields',()=>{const data=JSON.stringify({...emptyData(),extra:'x'.repeat(MAX_BACKUP_BYTES)});expect(()=>parseBackup(data)).toThrow('Backup too large')});
