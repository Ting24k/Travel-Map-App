import { useEffect, useRef, useState } from "react";
import { Globe2, Map as MapIcon, MapPin, ChartNoAxesCombined, Settings, Search, Check, ArrowUpRight, Leaf, ShieldCheck, Languages, X, Compass, ChevronRight, Users, BookOpen, CircleUserRound,List, } from "lucide-react";
import TravelMap from "./components/TravelMap";
import { BackupPanel, ExportMap, ShareApp } from "./components/Sharing";
import PlaceSheet, { palette } from "./components/PlaceSheet";
import { useAccount } from "./collaboration/useAccount";
import { useFriends } from "./collaboration/useFriends";
import { collaborationMessages } from "./collaboration/i18n";
import AccountPanel from "./collaboration/AccountPanel";
import FriendsPanel, { invitationToken } from "./collaboration/FriendsPanel";
import { cloud } from "./collaboration/cloud";
import ComparisonControls from "./collaboration/ComparisonControls";
import ReadOnlyPlace from "./collaboration/ReadOnlyPlace";
import { pairStatistics, viewColor, comparisonColors } from "./collaboration/model";
import JournalPanel from "./collaboration/JournalPanel";
import type { ViewMode } from "./collaboration/types";
import { messages } from "./data/i18n";
import { searchPlaces, placesFor } from "./data/catalog";
import { colorFor, isVisited, statistics, effectiveStatus } from "./services/travel";
import type { MapMode, Place } from "./types";
type Page = "map" | "places" | "statistics" | "settings" | "friends" | "journal";
export default function App() {
    const account = useAccount();
    const { data, error, saving, update, retry, replace } = account;
    const shared = useFriends(account.session?.user.id);
    const [profileOpen, setProfileOpen] = useState(false);
    const [journalPlace, setJournalPlace] = useState<Place>();
    const [statusFilter, setStatusFilter] = useState("all");
    const [view, setView] = useState<ViewMode>("mine");
    useEffect(() => { setView("mine"); setSelected(undefined); }, [account.session?.user.id, shared.selectedId]);
    useEffect(() => { if (!shared.friendData && view !== "mine") {
        setView("mine");
        setSelected(undefined);
    } }, [shared.friendData, view]);
    const [mode, setMode] = useState<MapMode>("world");
    const [page, setPage] = useState<Page>(invitationToken() ? "friends" : "map");
    const [selected, setSelected] = useState<Place>();
    const [query, setQuery] = useState("");
    const [onlyVisited, setOnlyVisited] = useState(false);
    useEffect(()=>{const openInvite=()=>{if(invitationToken()){setPage('friends');setSelected(undefined);setProfileOpen(false)}};window.addEventListener('hashchange',openInvite);return()=>window.removeEventListener('hashchange',openInvite)},[]);

    const initialized = useRef(false);
    const [online, setOnline] = useState(navigator.onLine);
    useEffect(() => {
        if (data && !initialized.current) {
            initialized.current = true;
            setMode(data.preferences.defaultMap);
        }
    }, [data]);
    useEffect(() => {
        const on = () => setOnline(navigator.onLine);
        window.addEventListener("online", on);
        window.addEventListener("offline", on);
        return () => {
            window.removeEventListener("online", on);
            window.removeEventListener("offline", on);
        };
    }, []);
    useEffect(() => {
        document.documentElement.lang =
            data?.preferences.language === "zh" ? "zh-CN" : "en";
    }, [data?.preferences.language]);
    if (!account.ready || !data)
        return (<div className="loading-screen">
        <Globe2 size={40}/>
        <h1>Our Little World</h1>
        <p>
          {account.cloudError || (error
                ? "Unable to open local storage. Enable browser storage and retry."
                : "Opening your little world…")}
        </p>
        {(error || account.cloudError) && <button onClick={() => account.session ? void account.sync() : retry()}>Retry</button>}{account.session && <button onClick={() => void cloud?.signOut()}>Sign out</button>}
      </div>);
    const lang = data.preferences.language, t = { ...messages[lang], ...collaborationMessages[lang] }, stats = statistics(data, mode), world = statistics(data, "world"), china = statistics(data, "china");
    const pair = pairStatistics(data, shared.friendData, mode);
    const viewCount = view === 'mine' ? pair.mine : view === 'friend' ? pair.friend : pair.both;
    const visibleVisited = (id: string) => view === 'mine' ? isVisited(data, id) : view === 'friend' ? !!shared.friendData && isVisited(shared.friendData, id) : view === 'both' ? !!shared.friendData && isVisited(data, id) && isVisited(shared.friendData, id) : isVisited(data, id) || !!shared.friendData && isVisited(shared.friendData, id);
    const results = searchPlaces(query, mode).filter((p) => page !== "places" || ((!onlyVisited || isVisited(data, p.id)) && (statusFilter === 'all' || effectiveStatus(data, p.id) === statusFilter)));
    function switchMode(next: MapMode) {
        setMode(next);
        setSelected(undefined);
        setQuery("");
    }
    function select(place: Place) {
        setSelected(place);
        setQuery("");
        setPage("map");
    }
    const modes = (<div className="segmented" aria-label={t.activeMap}>
      {(["world", "china"] as const).map((m) => (<button key={m} className={mode === m ? "active" : ""} aria-pressed={mode === m} onClick={() => switchMode(m)}>
          {m === "world" ? <Globe2 size={16}/> : <MapPin size={16}/>} {t[m]}
        </button>))}
    </div>);
    const search = (<div className="search-wrap">
      <Search size={18}/>
      <input aria-label={t.openSearch} placeholder={t.search} value={query} onChange={(e) => setQuery(e.target.value)}/>
      {query && (<button className="icon-button" onClick={() => setQuery("")} aria-label={t.clearSearch}>
          <X size={16}/>
        </button>)}
      {page === "map" && query && (<div className="search-results">
          <p className="list-caption">
            {results.length} {t.places}
          </p>
          {results.length ? (results.map((p) => (<button key={p.id} onClick={() => select(p)}>
                <span>
                  {lang === "en" ? p.nameEn : p.nameZh}
                  <small>{lang === "en" ? p.nameZh : p.nameEn}</small>
                </span>
                {isVisited(data, p.id) ? (<Check size={17}/>) : (<ArrowUpRight size={17}/>)}
              </button>))) : (<p>{t.noResults}</p>)}
        </div>)}
    </div>);
    return (<div className="app-shell">
      <header className="app-header">
        <a href="#" className="brand" onClick={(e) => {
            e.preventDefault();
            setPage("map");
        }}>
          <span className="brand-mark">
            <Globe2 size={24}/>
            <span />
          </span>
          <div>
            <h1>Our Little World</h1>
            <span>{t.tagline}</span>
          </div>
        </a>
        <nav className="desktop-nav" aria-label={lang === "en" ? "Main navigation" : "主导航"}>
          {(["map", "journal", "statistics", "friends"] as Page[]).map((p) => (<button className={page === p ? "active" : ""} key={p} aria-current={page === p ? "page" : undefined} onClick={() => {
                setPage(p);
                setQuery("");
            }}>
              {t[p]}
            </button>))}
        </nav>
        <button className="language-button" aria-label={t.language} onClick={() => update((d) => ({
            ...d,
            preferences: {
                ...d.preferences,
                language: lang === "en" ? "zh" : "en",
            },
        }))}>
          <Languages size={17}/>
          <span>{lang === "en" ? "中文" : "EN"}</span>
        </button>
        <div className="profile-menu"><button className="icon-button" aria-label={t.account} aria-expanded={profileOpen} onClick={() => setProfileOpen(!profileOpen)}><CircleUserRound size={21}/></button>{profileOpen && <div className="profile-popover"><span>{account.session ? data.profile.displayName : t.localMode}</span><button onClick={() => { setPage("settings"); setProfileOpen(false); }}><Settings size={16}/>{t.settings}</button></div>}</div>
      </header>
      {!online && <div className="offline-banner">{t.offlineNow}</div>}
      {error && (<div className="error-banner" role="alert">
          {t.storageError}
          <button onClick={retry}>{t.retry}</button>
        </div>)}
      <main className={`main-content page-${page}`}>
        {page === "map" && (<>
            <section className="page-heading">
              <div>
                <p className="eyebrow">
                  <span /> {mode === "world" ? t.worldEyebrow : t.chinaEyebrow}
                </p>
                <h2>
                  {mode === "world" ? t.yourWorld : t.chinaTitle}{" "}
                  <em>{mode === "world" ? t.inColor : t.chinaSubtitle}</em>
                </h2>
                <p className="page-description">
                  {mode === "world" ? t.intro : t.chinaIntro}
                </p>
              </div>
              <div className="heading-actions">
                <ExportMap data={data} mode={mode} label={view === 'friend' ? shared.friendData?.profile.displayName : view === 'comparison' ? t.comparison : view === 'both' ? t.bothVisited : t.myMap} count={viewCount} legendEntries={view === 'comparison' ? [{ label: t.mineOnly, color: comparisonColors.mine }, { label: t.friendOnly, color: comparisonColors.friend }, { label: t.bothVisited, color: comparisonColors.both }, { label: t.neither, color: comparisonColors.neither }] : view === 'both' ? [{ label: t.bothVisited, color: comparisonColors.both }] : [{ label: t.visited, color: (view === 'friend' ? shared.friendData : data)?.preferences.defaultVisitedColor || '#88a48b' }, { label: t.wishlist, color: '#d5ba79' }, { label: t.lived, color: '#aa9bc1' }]}/>
              </div>
            </section>
            <section className="map-card">
              <div className="map-toolbar">
                {modes}
                {search}
                <button className="text-button browse-button" aria-label={t.browsePlaces} onClick={() => setPage('places')}><List size={16}/><span>{t.browsePlaces}</span></button>
              </div>
              <ComparisonControls language={lang} view={view} onView={v => { setView(v); setSelected(undefined); }} friends={shared.friends} selected={shared.selectedId} onSelect={shared.setSelectedId} friendData={shared.friendData} loading={shared.loading}/>
              <div className="map-stage">
                <TravelMap mode={mode} language={lang} selected={selected?.id} onSelect={setSelected} colorFor={(id) => viewColor(data, shared.friendData, view, id)} visited={visibleVisited}/>
                <div className="map-progress">
                  <span className="progress-orbit">
                    <Globe2 size={22}/>
                  </span>
                  <div>
                    <strong>
                      {viewCount}
                      <span> / {stats.total}</span>
                    </strong>
                    <small>
                      {mode === "world" ? t.countries : t.regions} · {t.visited}
                    </small>
                  </div>
                </div>
              </div>
              <div className="map-footer">
                <span>
                  <i style={{ background: data.preferences.defaultVisitedColor }}/>
                  {t.visited}
                  <i className="neutral"/>
                  {t.unvisited}<i style={{ background: '#d5ba79' }}/>{t.wishlist}<i style={{ background: '#aa9bc1' }}/>{t.lived}
                </span>
                <small>{t.mapHint}</small>
              </div>
            </section>
            <section className="under-map">
              <div className="memory-card">
                <span className="little-flower">✳</span>
                <div>
                  <p className="eyebrow">{t.legend}</p>
                  <h3>{t.paletteNote}</h3>
                </div>
                <div className="palette-preview">
                  {palette.slice(0, 4).map((c) => (<i key={c} style={{ background: c }}/>))}
                </div>
              </div>
              <button className="mini-stat" onClick={() => setPage("statistics")}>
                <div className="stat-icon">
                  <MapPin size={21}/>
                </div>
                <span>
                  <strong>
                    {world.count} <small>{t.countries}</small>
                  </strong>
                  <span>
                    {world.percent.toFixed(1)}% {t.explored}
                  </span>
                </span>
                <ArrowUpRight size={18}/>
              </button>
              <button className="mini-stat" onClick={() => {
                switchMode("china");
                setPage("statistics");
            }}>
                <div className="stat-icon lavender">
                  <Compass size={21}/>
                </div>
                <span>
                  <strong>
                    {china.count} <small>{t.regions}</small>
                  </strong>
                  <span>
                    {china.percent.toFixed(1)}% {t.explored}
                  </span>
                </span>
                <ArrowUpRight size={18}/>
              </button>
            </section>
          </>)}
        {page === "places" && (<>
            <section className="page-heading">
              <div>
                <p className="eyebrow">{t.places}</p>
                <h2>{t.placesTitle}</h2>
                <p className="page-description">{t.placesIntro}</p>
              </div>
            </section>
            <section className="content-card">
              <div className="places-toolbar">
                {modes}
                {search}
                <select aria-label={t.status} value={statusFilter} onChange={e => { setStatusFilter(e.target.value); setOnlyVisited(false); }}><option value="all">{t.allStatuses}</option>{(['wishlist', 'visited', 'lived', 'unvisited'] as const).map(status => <option key={status} value={status}>{t[status]}</option>)}</select>
                <label className="filter-label">
                  <input type="checkbox" checked={onlyVisited} onChange={(e) => { setOnlyVisited(e.target.checked); setStatusFilter('all'); }}/>
                  {t.onlyVisited}
                </label>
              </div>
              <p className="list-caption">
                {results.length} {t.places}
              </p>
              <div className="places-grid">
                {results.map((p) => (<button className="place-row" key={p.id} onClick={() => select(p)}>
                    <span className="place-dot" style={{ background: colorFor(data, p.id) }}>
                      {isVisited(data, p.id) ? (<Check size={16}/>) : (<MapPin size={16}/>)}
                    </span>
                    <span>
                      <strong>{lang === "en" ? p.nameEn : p.nameZh}</strong>
                      <small>{lang === "en" ? p.nameZh : p.nameEn}</small>
                    </span>
                    <ChevronRight size={17}/>
                  </button>))}
              </div>
              {!results.length && <p className="empty-state">{t.noResults}</p>}
            </section>
          </>)}
        {page === "statistics" && (<>
            <section className="page-heading">
              <div>
                <p className="eyebrow">{t.statistics}</p>
                <h2>{t.statsTitle}</h2>
                <p className="page-description">{t.statsIntro}</p>
              </div>
            </section>
            <section className="stats-grid">
              {(["world", "china"] as const).map((m) => {
                const s = statistics(data, m);
                return (<div className="content-card stats-card" key={m}>
                    <Globe2 size={30}/>
                    <h3>{m === "world" ? t.countries : t.regions}</h3>
                    <strong className="big-number">
                      {s.count}
                      <small> / {s.total}</small>
                    </strong>
                    <div className="progress-track">
                      <span style={{ width: `${s.percent}%` }}/>
                    </div>
                    <p>
                      {s.percent.toFixed(1)}% {t.explored}
                    </p>
                    <button className="text-button" onClick={() => {
                        switchMode(m);
                        setPage("map");
                    }}>
                      {t.startExploring}
                      <ArrowUpRight size={16}/>
                    </button>
                  </div>);
            })}
            </section>
            <section className="content-card wishlist-stats"><h3>{t.myWishlist}</h3>{(['world', 'china'] as const).map(m => <p key={m}>{m === 'world' ? t.countries : t.regions}: <strong>{pairStatistics(data, undefined, m).wishlist}</strong></p>)}</section>
            <p className="muted small stats-note">{t.statNote} {t.sharedNote}</p>
            {shared.friendData && <section className="content-card"><h3>{data.profile.displayName} + {shared.friendData.profile.displayName}</h3>{(['world', 'china'] as const).map(m => { const p = pairStatistics(data, shared.friendData, m); return <div className="pair-stats" key={m}><h4>{m === 'world' ? t.countries : t.regions} / {p.total}</h4>{[[t.myMap, p.mine], [t.friendMap, p.friend], [t.bothVisited, p.both], [t.mineOnly, p.onlyMine], [t.friendOnly, p.onlyFriend], [t.myWishlist, p.wishlist], [t.friendWishlist, p.friendWishlist]].map(([label, n]) => <p key={label}><span>{label}</span><strong>{n}</strong></p>)}</div>; })}</section>}
            <section className="content-card">
              <h3>{t.recent}</h3>
              <div className="visited-chips">
                {placesFor("world")
                .filter((p) => isVisited(data, p.id))
                .map((p) => (<button key={p.id} onClick={() => {
                    setMode("world");
                    select(p);
                }}>
                      <i style={{ background: colorFor(data, p.id) }}/>
                      {lang === "en" ? p.nameEn : p.nameZh}
                      <ArrowUpRight size={14}/>
                    </button>))}
              </div>
              {!world.count && (<div className="empty-state">
                  <Compass size={36}/>
                  <p>{t.noVisited}</p>
                  <button className="button primary" onClick={() => setPage("map")}>
                    {t.startExploring}
                  </button>
                </div>)}
            </section>
          </>)}
        {page === 'friends' && <FriendsPanel userId={account.session?.user.id} language={lang} shared={shared} onSignIn={() => setPage('settings')}/>}
        {page === 'journal' && <JournalPanel data={data} onSave={account.saveEntry} startPlace={journalPlace} onStartHandled={() => setJournalPlace(undefined)}/>}
        {page === "settings" && (<>
            <section className="page-heading">
              <div>
                <p className="eyebrow">{t.settings}</p>
                <h2>{t.settingsTitle}</h2>
                <p className="page-description">{t.settingsIntro}</p>
              </div>
            </section>
            <div className="settings-grid">
              <AccountPanel account={account}/>
              {!account.session && <BackupPanel data={data} replace={(d) => {
                    replace(d);
                    setMode(d.preferences.defaultMap);
                }}/>}
              <section className="content-card">
                <h3>
                  <Settings size={20}/>
                  {t.settings}
                </h3>
                <label className="setting-row">
                  {t.language}
                  <select value={lang} onChange={(e) => update((d) => ({
                ...d,
                preferences: {
                    ...d.preferences,
                    language: e.target.value as "en" | "zh",
                },
            }))}>
                    <option value="en">English</option>
                    <option value="zh">简体中文</option>
                  </select>
                </label>
                <label className="setting-row">
                  {t.mapDefault}
                  <select value={data.preferences.defaultMap} onChange={(e) => update((d) => ({
                ...d,
                preferences: {
                    ...d.preferences,
                    defaultMap: e.target.value as MapMode,
                },
            }))}>
                    <option value="world">{t.world}</option>
                    <option value="china">{t.china}</option>
                  </select>
                </label>
                <label className="setting-row">
                  {t.defaultColor}
                  <input aria-label={t.defaultColor} type="color" value={data.preferences.defaultVisitedColor} onChange={(e) => update((d) => ({
                ...d,
                preferences: {
                    ...d.preferences,
                    defaultVisitedColor: e.target.value,
                },
            }))}/>
                </label>
              </section>
              <section className="content-card">
                <h3>
                  <Leaf size={20}/>
                  {t.install}
                </h3>
                <p>{t.installNote}</p>
                <p className="soft-badge">
                  <Check size={15}/>
                  {t.offline}
                </p>
                <div className="share-app">
                  <ShareApp data={data}/>
                </div>
              </section>
              <section className="content-card policy-card">
                <h3>{t.dataPolicy}</h3>
                <p>{t.dataNote}</p>
                <a href={`${import.meta.env.BASE_URL}maps/provenance.json`} target="_blank" rel="noreferrer">
                  {t.source}
                  <ArrowUpRight size={14}/>
                </a>
              </section>
            </div>
          </>)}
      </main>
      <footer className="app-footer">
        <span>
          <ShieldCheck size={14}/>
          {account.session ? t.privateJournal : t.private}
        </span>
        <span>
          <span className={`status-dot ${saving ? "saving" : ""}`}/>
          {account.session ? (account.syncing ? t.syncing : account.cloudError ? t.syncError : account.pending.length ? `${account.pending.length} ${t.pending}` : account.lastSync ? t.synced : t.cached) : error ? (lang === 'en' ? 'Not saved' : '未保存') : saving ? t.saving : t.saved}
        </span>
      </footer>
      <nav className="mobile-nav" aria-label={lang === "en" ? "Main navigation" : "主导航"}>
        {([
            { page: "map", Icon: MapIcon },
            { page: "journal", Icon: BookOpen },
            { page: "statistics", Icon: ChartNoAxesCombined },
            { page: "friends", Icon: Users },
        ] as const).map(({ page: p, Icon }) => (<button key={p} className={page === p ? "active" : ""} aria-current={page === p ? "page" : undefined} onClick={() => {
                setPage(p);
                setQuery("");
            }}>
            <Icon size={21}/>
            <span>{t[p]}</span>
          </button>))}
      </nav>
      {selected && view !== 'mine' && shared.friendData && <ReadOnlyPlace place={selected} me={data} friend={shared.friendData} onClose={() => setSelected(undefined)}/>}
      {selected && view === 'mine' && (<PlaceSheet place={selected} data={data} update={update} onJournal={() => { setJournalPlace(selected); setSelected(undefined); setPage('journal'); }} onClose={() => setSelected(undefined)}/>)}
    </div>);
}
