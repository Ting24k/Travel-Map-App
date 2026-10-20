import { useEffect, useState } from 'react';
import { UserPlus, Copy, RefreshCw } from 'lucide-react';
import { cloud } from './cloud';
import { collaborationMessages } from './i18n';
import type { Language } from '../types';
import type { Invitation } from './types';
import type { useFriends } from './useFriends';
export function invitationToken() { const params = new URLSearchParams(location.hash.slice(1)); return params.has('invite') ? (params.get('invite') || 'invalid').slice(0, 1024) : undefined; }
export default function FriendsPanel({ userId, language, shared, onSignIn }: {
    userId?: string;
    language: Language;
    shared: ReturnType<typeof useFriends>;
    onSignIn: () => void;
}) {
    const t = collaborationMessages[language];
    const [token, setToken] = useState(invitationToken), [preview, setPreview] = useState<{
        display_name: string;
    }>(), [invites, setInvites] = useState<Invitation[]>([]), [link, setLink] = useState(''), [notice, setNotice] = useState(''), [error, setError] = useState(''), [busy, setBusy] = useState(false);
    useEffect(() => { const read = () => { setToken(invitationToken()); setPreview(undefined); }; window.addEventListener('hashchange', read); return () => window.removeEventListener('hashchange', read); }, []);
    useEffect(() => { setLink(''); setInvites([]); setPreview(undefined); setError(''); setNotice(''); if (userId && cloud && navigator.onLine) {
        void cloud.invitations().then(setInvites).catch(e => setError((e as Error).message));
        if (token)
            void cloud.rpc<{
                display_name: string;
            }>('preview_invitation', { p_token: token }).then(setPreview).catch(() => setError(t.inviteUnavailable));
    } }, [userId, token, t.inviteUnavailable]);
    async function run(fn: () => Promise<void>) { setBusy(true); setError(''); setNotice(''); try {
        if (!navigator.onLine)
            throw Error(t.onlineRequired);
        await fn();
    }
    catch (e) {
        setError((e as Error).message);
    }
    finally {
        setBusy(false);
    } }
    function dismiss() { history.replaceState(null, '', location.pathname + location.search); setToken(undefined); setPreview(undefined); }
    return <><section className="content-card"><h3>{t.friends}</h3><p>{t.sharingNote}</p>{!userId ? <><p>{token ? t.inviteSignIn : t.noFriends}</p><button className="button primary" onClick={onSignIn}>{t.signIn}</button></> : <><div className="backup-actions"><button className="button primary" disabled={busy || !navigator.onLine} onClick={() => void run(async () => { const invite = await cloud!.rpc<{
        token: string;
    }>('create_invitation'); const url = new URL(import.meta.env.BASE_URL, location.origin); url.hash = 'invite=' + invite.token; setLink(url.href); setNotice(t.inviteCreated); setInvites(await cloud!.invitations()); })}><UserPlus size={17}/>{t.inviteFriend}</button><button className="button" disabled={busy || !navigator.onLine} onClick={() => void run(async () => { await shared.refresh(); setInvites(await cloud!.invitations()); })}><RefreshCw size={16}/>{t.refresh}</button></div>{link && <div className="invitation-link"><p>{t.inviteNote}</p><input readOnly aria-label={t.copyInvite} value={link} onFocus={e => e.target.select()}/><div className="backup-actions"><button className="button" onClick={() => void run(async () => { await navigator.clipboard.writeText(link); setNotice(t.inviteCopied); })}><Copy size={16}/>{t.copyInvite}</button>{!!navigator.share && <button className="button" onClick={() => void run(() => navigator.share({ title: 'Our Little World', url: link }))}>{language === 'en' ? 'Share' : '分享'}</button>}</div></div>}<div className="friend-list">{shared.friends.map(f => <article key={f.id}><strong>{f.display_name}</strong><span>{t.readOnly}</span><button className="button" disabled={busy} onClick={() => { if (confirm(t.disconnectConfirm))
        void run(async () => { await cloud!.rpc('disconnect_friend', { p_id: f.connection_id }); await shared.refresh(); setNotice(t.disconnectDone); }); }}>{t.disconnect}</button></article>)}</div>{!shared.friends.length && <p className="empty-state">{t.noFriends}</p>}<h4>{t.pendingInvites}</h4>{!invites.length && <p className="small muted">{t.noInvites}</p>}{invites.map(i => <div className="invite-row" key={i.id}><span>{({ pending: t.pendingInvitation, expired: t.expired, accepted: t.accepted, declined: t.declined, revoked: t.revoked } as Record<string, string>)[i.status]} · {new Date(i.expires_at).toLocaleDateString(language === 'en' ? 'en-US' : 'zh-CN')}</span>{i.status === 'pending' && <button className="text-button" disabled={busy} onClick={() => void run(async () => { await cloud!.rpc('revoke_invitation', { p_id: i.id }); setInvites(await cloud!.invitations()); setLink(''); })}>{t.revoke}</button>}</div>)}</>}{(error || shared.error) && <p className="form-error" role="alert">{error || shared.error}</p>}{notice && <p className="form-success" role="status">{notice}</p>}</section>
 {token && <section className="content-card invitation-review"><h3>{preview ? `${preview.display_name} ${t.invitedBy}` : t.inviteSignIn}</h3><p>{t.sharingNote}</p><div className="backup-actions">{!userId ? <button className="button primary" onClick={onSignIn}>{t.signIn}</button> : preview && <><button className="button primary" disabled={busy} onClick={() => void run(async () => { await cloud!.rpc('respond_invitation', { p_token: token, p_accept: true }); dismiss(); await shared.refresh(); setNotice(t.inviteAccepted); })}>{t.accept}</button><button className="button" disabled={busy} onClick={() => void run(async () => { await cloud!.rpc('respond_invitation', { p_token: token, p_accept: false }); dismiss(); })}>{t.decline}</button></>}<button className="button" onClick={dismiss}>{t.clearInvite}</button></div></section>}
 </>;
}
