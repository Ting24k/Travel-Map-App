import Dexie, { type Table } from "dexie";
import type {
  TravelData,
  UserProfile,
  Visit,
  PlaceAppearance,
  UserPreferences,
} from "../types";
import { emptyData } from "../services/travel";
export interface TravelRepository {
  load(): Promise<TravelData>;
  save(data: TravelData): Promise<void>;
}
export class LocalTravelRepository implements TravelRepository {
  private db: Dexie;
  private profiles: Table<UserProfile, string>;
  private visits: Table<Visit, string>;
  private appearances: Table<PlaceAppearance, [string, string]>;
  private preferences: Table<UserPreferences & { userId: string }, string>;
  constructor(name = "our-little-world") {
    this.db = new Dexie(name);
    this.db
      .version(1)
      .stores({
        profiles: "id",
        visits: "id,userId,[userId+placeId]",
        appearances: "[userId+placeId],userId",
        preferences: "userId",
      });
    this.profiles = this.db.table("profiles");
    this.visits = this.db.table("visits");
    this.appearances = this.db.table("appearances");
    this.preferences = this.db.table("preferences");
  }
  async load() {
    const profile = await this.profiles.toCollection().first();
    if (!profile) {
      const data = emptyData();
      await this.save(data);
      return data;
    }
    const [visits, appearances, prefs] = await Promise.all([
      this.visits.where("userId").equals(profile.id).toArray(),
      this.appearances.where("userId").equals(profile.id).toArray(),
      this.preferences.get(profile.id),
    ]);
    if (!prefs) throw Error("Preferences missing");
    const { userId: _, ...preferences } = prefs;
    return {
      schemaVersion: 1 as const,
      profile,
      visits,
      appearances,
      preferences,
    };
  }
  async save(data: TravelData) {
    await this.db.transaction(
      "rw",
      [this.profiles, this.visits, this.appearances, this.preferences],
      async () => {
        // One local profile in Phase 1. Backup restore atomically replaces its full dataset.
        await Promise.all([
          this.profiles.clear(),
          this.visits.clear(),
          this.appearances.clear(),
          this.preferences.clear(),
        ]);
        await this.profiles.put(data.profile);
        await this.visits.bulkPut(data.visits);
        await this.appearances.bulkPut(data.appearances);
        await this.preferences.put({
          ...data.preferences,
          userId: data.profile.id,
        });
      },
    );
  }
  close() {
    this.db.close();
  }
  async delete() {
    await this.db.delete();
  }
}
export const repository = new LocalTravelRepository();
