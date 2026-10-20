import { useCallback, useEffect, useRef, useState } from 'react';
import { cloud } from './cloud';
import { accountCache } from './cache';
import { SyncEngine } from './sync';
import { toTravelData, recordsFromData, journalPayload, validateEntry } from './model';
import type { AuthSession, PendingOperation, TravelEntry } from './types';
import type { TravelData } from '../types';
import { useTravel } from '../hooks/useTravel';
export function useAccount() {
    const local = useTravel();
    const [session, setSession] = useState<AuthSession>();
    const [cloudData, setCloudData] = useState<TravelData>();
    const [pending, setPending] = useState<PendingOperation[]>([]);
    const [syncing, setSyncing] = useState(false);
    const [cloudError, setCloudError] = useState('');
    const [ready, setReady] = useState(false);
    const [lastSync, setLastSync] = useState<string>();
    const active = useRef<string | undefined>(undefined), engine = useRef<SyncEngine | undefined>(undefined), latest = useRef<TravelData | undefined>(undefined);
    const writes = useRef(Promise.resolve());
    const reload = useCallback(async (userId: string) => { const [snapshot, ops] = await Promise.all([accountCache.snapshot(userId), accountCache.pending(userId)]); if (active.current !== userId)
        return; if (snapshot) {
        const d = toTravelData(snapshot);
        latest.current = d;
        setCloudData(d);
    } setPending(ops); }, []);
    const sync = useCallback(async () => { const id = active.current; if (!id || !cloud || !navigator.onLine)
        return; setSyncing(true); setCloudError(''); try {
        await writes.current;
        await cloud.ensureProfile();
        await engine.current?.run();
        if (active.current === id) {
            await reload(id);
            setLastSync(new Date().toISOString());
            if ((await accountCache.pending(id)).length === 0) {
                const markers = await accountCache.migrations.toArray();
                for (const m of markers.filter(m => m.userId === id && m.completedAt === 'queued'))
                    await accountCache.migrations.put({ ...m, completedAt: new Date().toISOString() });
            }
        }
    }
    catch (e) {
        if (active.current === id)
            setCloudError((e as Error).message);
    }
    finally {
        if (active.current === id)
            setSyncing(false);
    } }, [reload]);
    useEffect(() => { if (!cloud) {
        setReady(true);
        return;
    } let disposed = false; const change = (s: AuthSession | undefined) => { if (disposed)
        return; const id = s?.user.id; if (active.current !== id) {
        active.current = id;
        latest.current = undefined;
        setCloudData(undefined);
        setPending([]);
        setCloudError('');
        setLastSync(undefined);
        setSyncing(false);
        engine.current = id ? new SyncEngine(accountCache, cloud!, id) : undefined;
    } setSession(s); if (id)
        void reload(id).catch(e => setCloudError(String(e))); }; cloud.onSession = change; cloud!.recover().then(s => change(s)).catch(e => setCloudError((e as Error).message)).finally(() => { if (!disposed)
        setReady(true); }); return () => { disposed = true; cloud!.onSession = undefined; }; }, [reload]);
    useEffect(() => { const id = session?.user.id; if (!id || !cloud)
        return; let cancelled = false; async function start() { try {
        if (navigator.onLine) {
            await cloud!.ensureProfile();
            if (!cancelled)
                await sync();
        }
    }
    catch (e) {
        if (!cancelled)
            setCloudError((e as Error).message);
    } } void start(); const refresh = () => { if (!document.hidden)
        void sync(); }; window.addEventListener('online', refresh); window.addEventListener('focus', refresh); document.addEventListener('visibilitychange', refresh); const timer = setInterval(refresh, 30000); return () => { cancelled = true; clearInterval(timer); window.removeEventListener('online', refresh); window.removeEventListener('focus', refresh); document.removeEventListener('visibilitychange', refresh); }; }, [session?.user.id, sync]);
    function update(fn: (d: TravelData) => TravelData) { if (!session) {
        local.update(fn);
        return;
    } const id = active.current, before = latest.current; if (!id || !before)
        return; const next = fn(before); latest.current = next; setCloudData(next); setCloudError(''); writes.current = writes.current.catch(() => { }).then(async () => { const a = new Map(recordsFromData(before).map(r => [r.place_id, r])); for (const r of recordsFromData(next)) {
        const old = a.get(r.place_id);
        if (!old || old.status !== r.status || old.custom_color !== r.custom_color)
            await accountCache.queue(id, 'place', r.place_id, { status: r.status, custom_color: r.custom_color });
    } if (JSON.stringify(before.preferences) !== JSON.stringify(next.preferences) || before.profile.displayName !== next.profile.displayName)
        await accountCache.queue(id, 'profile', id, { display_name: next.profile.displayName, preferences: next.preferences }); const oldEntries = new Map((before.entries || []).map(e => [e.id, e])); for (const e of next.entries || []) {
        validateEntry(e);
        if (JSON.stringify(oldEntries.get(e.id)) !== JSON.stringify(e))
            await accountCache.queue(id, 'journal', e.id, journalPayload(e));
    } if (latest.current === next)
        await reload(id); }).then(() => { void sync(); }).catch(e => setCloudError((e as Error).message)); }
    function saveEntry(entry: TravelEntry) { validateEntry(entry); update(d => ({ ...d, schemaVersion: 2, entries: [...(d.entries || []).filter(e => e.id !== entry.id), entry] })); }
    async function resolve(op: PendingOperation, keepMine: boolean) { try {
        await accountCache.resolve(op, keepMine);
        await reload(op.userId);
        await sync();
    }
    catch (e) {
        setCloudError((e as Error).message);
    } }
    return { ...local, data: session ? cloudData : local.data, localData: local.data, ready, session, configured: !!cloud, pending, syncing, lastSync, cloudError, sync, update, saveEntry, resolve, reload, replace: local.replace };
}
