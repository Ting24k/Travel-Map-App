import Dexie, { type Table } from 'dexie';
import type { AccountSnapshot, CachedRow, EntityKind, PendingOperation, RemoteRow, CloudProfile, PlaceRecord, TravelEntry, OperationResult } from './types';
export class AccountCache extends Dexie {
    rows!: Table<CachedRow, [
        string,
        EntityKind,
        string
    ]>;
    outbox!: Table<PendingOperation, [
        string,
        EntityKind,
        string
    ]>;
    migrations!: Table<{
        userId: string;
        fingerprint: string;
        completedAt: string;
    }, [
        string,
        string
    ]>;
    auth!: Table<{
        key: string;
        value: unknown;
    }, string>;
    constructor(name = 'our-little-world-accounts') { super(name); this.version(1).stores({ rows: '[userId+kind+entityId],userId', outbox: '[userId+kind+entityId],userId', migrations: '[userId+fingerprint]', auth: 'key' }); }
    async pending(userId: string) { return this.outbox.where('userId').equals(userId).toArray(); }
    async queue(userId: string, kind: EntityKind, entityId: string, payload: Record<string, unknown>) { await this.transaction('rw', this.rows, this.outbox, async () => { const key: [
        string,
        EntityKind,
        string
    ] = [userId, kind, entityId], previous = await this.outbox.get(key), base = await this.rows.get(key); await this.outbox.put({ userId, kind, entityId, id: crypto.randomUUID(), baseRevision: previous?.baseRevision ?? base?.row.revision ?? 0, payload, ...(previous && 'conflict' in previous ? { conflict: previous.conflict } : {}) }); }); }
    async acceptSnapshot(userId: string, s: AccountSnapshot) { await this.transaction('rw', this.rows, async () => { await this.rows.where('userId').equals(userId).delete(); await this.rows.bulkPut([{ userId, kind: 'profile', entityId: userId, row: s.profile }, ...s.records.map(row => ({ userId, kind: 'place' as const, entityId: row.place_id, row })), ...s.entries.map(row => ({ userId, kind: 'journal' as const, entityId: row.id, row }))]); }); }
    async settle(sent: PendingOperation, result: OperationResult) {
        await this.transaction('rw', this.rows, this.outbox, async () => {
            const key: [
                string,
                EntityKind,
                string
            ] = [sent.userId, sent.kind, sent.entityId], pending = await this.outbox.get(key);
            const row = result.ok ? result.row : result.current;
            if (row)
                await this.rows.put({ userId: sent.userId, kind: sent.kind, entityId: sent.entityId, row });
            if (!pending)
                return;
            if (!result.ok) {
                await this.outbox.put({ ...pending, conflict: result.current ?? null });
                return;
            }
            if (pending.id === sent.id)
                await this.outbox.delete(key);
            else
                await this.outbox.put({ ...pending, baseRevision: result.row!.revision });
        });
    }
    async resolve(op: PendingOperation, keepMine: boolean) { await this.transaction('rw', this.outbox, async () => { const key: [
        string,
        EntityKind,
        string
    ] = [op.userId, op.kind, op.entityId]; const current = await this.outbox.get(key); if (!current || current.id !== op.id)
        throw Error('Conflict changed; review it again'); if (keepMine) {
        const { conflict, ...rest } = current;
        await this.outbox.put({ ...rest, id: crypto.randomUUID(), baseRevision: conflict?.revision ?? 0 });
    }
    else
        await this.outbox.delete(key); }); }
    async snapshot(userId: string): Promise<AccountSnapshot | undefined> { const rows = await this.rows.where('userId').equals(userId).toArray(), pending = await this.pending(userId); const map = new Map(rows.map(r => [r.kind + ':' + r.entityId, r.row])); const now = new Date().toISOString(); for (const op of pending) {
        const key = op.kind + ':' + op.entityId, old = map.get(key);
        map.set(key, { ...old, ...op.payload, ...(op.kind === 'profile' ? { id: userId } : { user_id: userId }), ...(op.kind === 'place' ? { place_id: op.entityId } : op.kind === 'journal' ? { id: op.entityId, created_at: (old as TravelEntry)?.created_at || now } : {}), revision: op.baseRevision, updated_at: now } as RemoteRow);
    } const profile = map.get('profile:' + userId) as CloudProfile | undefined; if (!profile)
        return; return { profile, records: [...map.entries()].filter(([k]) => k.startsWith('place:')).map(([, r]) => r as PlaceRecord), entries: [...map.entries()].filter(([k]) => k.startsWith('journal:')).map(([, r]) => r as TravelEntry) }; }
}
export const accountCache = new AccountCache();
