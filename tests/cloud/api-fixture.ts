// Deterministic Supabase endpoint contract double. Not a live Auth/RLS test.
// Production SQL permissions are exercised separately in PostgreSQL CI.
import type { BrowserContext, Route } from '@playwright/test';
import type { CloudProfile, PlaceRecord, TravelEntry } from '../../src/collaboration/types';
const defaults = { language: 'en' as const, defaultMap: 'world' as const, theme: 'light' as const, defaultVisitedColor: '#88a48b' };
export const ids = { a: 'aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa', b: 'bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb' };
export function fixture() {
    const users = new Map<string, {
        profile: CloudProfile;
        records: Map<string, PlaceRecord>;
        entries: Map<string, TravelEntry>;
    }>(), receipts = new Map();
    const invites = new Map<string, {
        creator: string;
        status: string;
        id: string;
        expires_at: string;
    }>(), connections = new Set<string>();
    let counter = 0;
    const pair = (a: string, b: string) => [a, b].sort().join(':');
    function user(id: string) { if (!users.has(id)) {
        const now = new Date().toISOString();
        users.set(id, { profile: { id, display_name: 'Traveler', preferences: { ...defaults }, revision: 1, created_at: now, updated_at: now }, records: new Map(), entries: new Map() });
    } return users.get(id)!; }
    function friends(id: string) { return [...users.values()].filter(u => u.profile.id !== id && connections.has(pair(id, u.profile.id))).map(u => ({ id: u.profile.id, display_name: u.profile.display_name, connection_id: pair(id, u.profile.id) })); }
    async function route(route: Route) {
        const request = route.request(), url = new URL(request.url()), headers = { 'access-control-allow-origin': '*', 'access-control-allow-headers': '*', 'access-control-allow-methods': 'GET,POST,OPTIONS', 'content-type': 'application/json' };
        const respond = (value: unknown, status = 200) => route.fulfill({ status, headers, body: JSON.stringify(value) });
        if (request.method() === 'OPTIONS')
            return route.fulfill({ status: 204, headers });
        const body = request.postDataJSON() || {}, path = url.pathname, token = request.headers().authorization?.replace('Bearer access-', ''), id = token && Object.values(ids).includes(token) ? token : undefined;
        if (path === '/auth/v1/otp')
            return respond({});
        if (path === '/auth/v1/verify') {
            if (body.token !== '123456')
                return respond({ message: 'Invalid code' }, 400);
            const uid = body.email === 'a@example.com' ? ids.a : ids.b;
            user(uid);
            return respond({ access_token: 'access-' + uid, refresh_token: 'refresh-' + uid, expires_in: 3600, user: { id: uid, email: body.email } });
        }
        if (!id)
            return respond({ message: 'Sign in required' }, 401);
        if (path === '/auth/v1/user')
            return respond({ id, email: id === ids.a ? 'a@example.com' : 'b@example.com' });
        if (path === '/auth/v1/logout')
            return route.fulfill({ status: 204, headers });
        const u = user(id), name = path.split('/').pop();
        if (path.startsWith('/rest/v1/rpc/')) {
            if (name === 'ensure_profile')
                return respond(u.profile);
            if (name === 'list_friends')
                return respond(friends(id));
            if (name === 'list_invitations')
                return respond([...invites.values()].filter(i => i.creator === id).map(i => ({ id: i.id, status: i.status, expires_at: i.expires_at })));
            if (name === 'friend_map') {
                if (!connections.has(pair(id, body.p_friend)))
                    return respond({ message: 'Accepted connection required' }, 403);
                const friend = user(body.p_friend);
                return respond({ id: friend.profile.id, display_name: friend.profile.display_name, default_color: friend.profile.preferences.defaultVisitedColor, records: [...friend.records.values()] });
            }
            if (name === 'create_invitation') {
                const value = (++counter).toString(16).padStart(64, '0'), invite = { creator: id, status: 'pending', id: crypto.randomUUID(), expires_at: new Date(Date.now() + 604800000).toISOString() };
                invites.set(value, invite);
                return respond({ ...invite, token: value });
            }
            if (name === 'preview_invitation' || name === 'respond_invitation') {
                const i = invites.get(body.p_token);
                if (!i || i.status !== 'pending' || Date.parse(i.expires_at) < Date.now() || i.creator === id)
                    return respond({ message: 'Invitation unavailable, expired or already used' }, 400);
                if (name === 'preview_invitation')
                    return respond({ display_name: user(i.creator).profile.display_name, expires_at: i.expires_at });
                i.status = body.p_accept ? 'accepted' : 'declined';
                if (body.p_accept)
                    connections.add(pair(id, i.creator));
                return respond(pair(id, i.creator));
            }
            if (name === 'disconnect_friend') {
                if (!friends(id).some(f => f.connection_id === body.p_id))
                    return respond({ message: 'Connection unavailable' }, 403);
                connections.delete(body.p_id);
                return respond(null);
            }
            if (name === 'revoke_invitation') {
                const i = [...invites.values()].find(i => i.id === body.p_id && i.creator === id);
                if (!i)
                    return respond({ message: 'Invitation unavailable' }, 403);
                i.status = 'revoked';
                return respond(null);
            }
            if (name === 'apply_operation') {
                const key = id + ':' + body.p_operation_id;
                if (receipts.has(key))
                    return respond(receipts.get(key));
                const kind = body.p_kind, entity = body.p_entity_id, payload = body.p_payload;
                const old = kind === 'place' ? u.records.get(entity) : kind === 'journal' ? u.entries.get(entity) : u.profile;
                if ((old?.revision || 0) !== body.p_base_revision) {
                    const result = { ok: false, current: old || null };
                    receipts.set(key, result);
                    return respond(result);
                }
                const row = { ...old, ...payload, revision: (old?.revision || 0) + 1, updated_at: new Date().toISOString() };
                if (kind === 'place') {
                    Object.assign(row, { user_id: id, place_id: entity });
                    u.records.set(entity, row as PlaceRecord);
                }
                else if (kind === 'journal') {
                    Object.assign(row, { user_id: id, id: entity, created_at: (old as TravelEntry)?.created_at || new Date().toISOString() });
                    u.entries.set(entity, row as TravelEntry);
                }
                else
                    Object.assign(u.profile, row);
                const result = { ok: true, row };
                receipts.set(key, result);
                return respond(result);
            }
        }
        const owner = (url.searchParams.get('user_id') || url.searchParams.get('id') || 'eq.' + id).slice(3), target = users.get(owner);
        if (name === 'profiles')
            return respond(owner === id ? [u.profile] : []);
        if (name === 'place_records')
            return respond(target && (owner === id || connections.has(pair(id, owner))) ? [...target.records.values()] : []);
        if (name === 'travel_entries')
            return respond(owner === id ? [...u.entries.values()].slice(Number(url.searchParams.get('offset') || 0), Number(url.searchParams.get('offset') || 0) + 500) : []);
        return respond({ message: 'Unexpected test endpoint ' + path }, 500);
    }
    return { users, invites, connections, install: (context: BrowserContext) => context.route('http://127.0.0.1:54329/**', route) };
}
