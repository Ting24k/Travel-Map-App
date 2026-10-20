import type { TravelData, Language } from '../types';
import type { ViewMode, Friend } from './types';
import { collaborationMessages } from './i18n';
import { comparisonColors } from './model';
export default function ComparisonControls({ language, view, onView, friends, selected, onSelect, friendData, loading }: {
    language: Language;
    view: ViewMode;
    onView: (v: ViewMode) => void;
    friends: Friend[];
    selected: string;
    onSelect: (id: string) => void;
    friendData?: TravelData;
    loading: boolean;
}) { const t = collaborationMessages[language]; const labels = { mine: t.myMap, friend: t.friendMap, both: t.bothVisited, comparison: t.comparison }; return <div className="comparison-controls"><div className="map-view-selector" aria-label={t.comparison}>{(['mine', 'friend', 'both', 'comparison'] as const).map(v => <button key={v} disabled={v !== 'mine' && !friendData} aria-pressed={view === v} className={view === v ? 'active' : ''} onClick={() => onView(v)}>{labels[v]}</button>)}{friends.length > 1 ? <select aria-label={t.selectFriend} value={selected} onChange={e => onSelect(e.target.value)}>{friends.map(f => <option key={f.id} value={f.id}>{f.display_name}</option>)}</select> : null}</div>{loading && <p className="small muted">{t.busy}</p>}{view !== 'mine' && friendData && <p className="view-owner"><strong>{view === 'friend' ? friendData.profile.displayName : `${t.myMap} + ${friendData.profile.displayName}`}</strong><span>{t.readOnly}</span></p>}{view === 'comparison' && <div className="comparison-legend">{(['mine', 'friend', 'both', 'neither'] as const).map(k => <span key={k}><i style={{ background: comparisonColors[k] }}/>{({ mine: t.mineOnly, friend: t.friendOnly, both: t.bothVisited, neither: t.neither })[k]}</span>)}</div>}{view === 'both' && <p className="small muted">{t.sharedNote}</p>}</div>; }
