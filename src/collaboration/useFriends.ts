import { useCallback, useEffect, useRef, useState } from 'react';
import { cloud } from './cloud';
import { toTravelData } from './model';
import { defaults } from '../services/travel';
import type { Friend, PlaceRecord } from './types';
import type { TravelData } from '../types';
export function useFriends(userId?: string) {
    const [friends, setFriends] = useState<Friend[]>([]), [selectedId, setSelectedId] = useState(''), [friendData, setFriendData] = useState<TravelData>(), [loading, setLoading] = useState(false), [error, setError] = useState('');
    const sequence = useRef(0), owner = useRef(userId);
    owner.current = userId;
    const refresh = useCallback(async () => { const seq = ++sequence.current; setFriendData(undefined); if (!userId || !cloud || !navigator.onLine) {
        setFriends([]);
        setLoading(false);
        return;
    } setLoading(true); setError(''); try {
        const list = await cloud.friends();
        if (sequence.current !== seq || owner.current !== userId)
            return;
        setFriends(list);
        const selected = list.find(f => f.id === selectedId) || list[0];
        if (!selected) {
            setSelectedId('');
            return;
        }
        setSelectedId(selected.id);
        const map = await cloud.rpc<{
            id: string;
            display_name: string;
            default_color: string;
            records: PlaceRecord[];
        }>('friend_map', { p_friend: selected.id });
        if (sequence.current !== seq || owner.current !== userId)
            return;
        const now = new Date().toISOString();
        setFriendData(toTravelData({ profile: { id: map.id, display_name: map.display_name, preferences: { ...defaults, defaultVisitedColor: map.default_color }, created_at: now, updated_at: now, revision: 0 }, records: map.records, entries: [] }));
    }
    catch (e) {
        if (sequence.current === seq) {
            setFriends([]);
            setFriendData(undefined);
            setError((e as Error).message);
        }
    }
    finally {
        if (sequence.current === seq)
            setLoading(false);
    } }, [userId, selectedId]);
    useEffect(() => { setFriends([]); setFriendData(undefined); setSelectedId(''); setError(''); sequence.current++; }, [userId]);
    useEffect(() => { void refresh(); const update = () => { if (!document.hidden)
        void refresh(); }; window.addEventListener('online', update); window.addEventListener('offline', update); window.addEventListener('focus', update); document.addEventListener('visibilitychange', update); const timer = setInterval(update, 30000); return () => { sequence.current++; clearInterval(timer); window.removeEventListener('online', update); window.removeEventListener('offline', update); window.removeEventListener('focus', update); document.removeEventListener('visibilitychange', update); }; }, [refresh]);
    return { friends, selectedId, setSelectedId, friendData: userId ? friendData : undefined, loading, error, refresh };
}
