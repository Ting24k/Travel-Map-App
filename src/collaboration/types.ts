import type { UserPreferences } from '../types';
export type TravelStatus = 'unvisited' | 'wishlist' | 'visited' | 'lived';
export type ViewMode = 'mine' | 'friend' | 'both' | 'comparison';
export type EntityKind = 'place' | 'journal' | 'profile';
export interface PlaceRecord {
    user_id: string;
    place_id: string;
    status: TravelStatus;
    custom_color: string | null;
    revision: number;
    updated_at: string;
}
export interface TravelEntry {
    id: string;
    user_id: string;
    place_id: string;
    start_date: string | null;
    end_date: string | null;
    cities: string[];
    note: string;
    deleted: boolean;
    revision: number;
    created_at: string;
    updated_at: string;
}
export interface CloudProfile {
    id: string;
    display_name: string;
    preferences: UserPreferences;
    revision: number;
    created_at: string;
    updated_at: string;
}
export interface Friend {
    id: string;
    display_name: string;
    connection_id: string;
}
export interface Invitation {
    id: string;
    expires_at: string;
    status: string;
}
export type RemoteRow = PlaceRecord | TravelEntry | CloudProfile;
export interface PendingOperation {
    userId: string;
    kind: EntityKind;
    entityId: string;
    id: string;
    baseRevision: number;
    payload: Record<string, unknown>;
    conflict?: RemoteRow | null;
}
export interface CachedRow {
    userId: string;
    kind: EntityKind;
    entityId: string;
    row: RemoteRow;
}
export interface AccountSnapshot {
    profile: CloudProfile;
    records: PlaceRecord[];
    entries: TravelEntry[];
}
export interface OperationResult {
    ok: boolean;
    row?: RemoteRow;
    current?: RemoteRow | null;
}
export interface CloudGateway {
    snapshot(): Promise<AccountSnapshot>;
    apply(op: PendingOperation): Promise<OperationResult>;
}
export interface AuthUser {
    id: string;
    email?: string;
}
export interface AuthSession {
    access_token: string;
    refresh_token: string;
    expires_at: number;
    user: AuthUser;
}
