import { useState, useEffect, useRef } from "react";
import {
  useAuthState,
  saveUniverseProgress,
  loadUniverseProgress,
  snapshotWeek as firestoreSnapshotWeek,
  SyncBadge,
  AuthButton,
} from "./services/firebase";

// ── Palette ────────────────────────────────────────────────────────────────
const C = {
  bg:     "#080810",
  panel:  "#0E0E1A",
  card:   "#13131F",
  card2:  "#191928",
  border: "#1E1E32",
  gold:   "#E0BA52",
  teal:   "#2ECFCF",
  green:  "#4CAF6E",
  red:    "#CF4C4C",
  orange: "#E07B3A",
  purple: "#9B7FE8",
  pink:   "#E06BAA",
  blue:   "#4A9FE8",
  jade:   "#00C896",
  dim:    "#8080A4",
  mid:    "#A0A0C0",
  white:  "#F4F4FF",
};

// ── Project Universe Definition ────────────────────────────────────────────
const PILLARS = [
  {
    id: "album",
    label: "THE ALBUM",
    color: C.gold,
    icon: "🎵",
    phase: "PRIMARY",
    desc: "Full original album — Ghost Circuit universe",
    projects: [
      { id: "song1", label: "Song 1 — Final Recording", color: C.gold,
        milestones: ["Composition","Rehearsal","Refinement","Final Recording","Mix","Master"],
        note: "Near ready — rehearsal & refinement phase" },
      { id: "song2", label: "Song 2 — Writing", color: C.gold,
        milestones: ["Concept","Songwriting","Arrangement","Rehearsal","Final Recording","Mix","Master"],
        note: "Writing has begun" },
      { id: "songX", label: "Additional Songs (TBD)", color: C.gold,
        milestones: ["Concept","Songwriting","Arrangement","Rehearsal","Recording","Mix","Master"],
        note: "Slots for remaining tracks" },
      { id: "albumArt", label: "Album Artwork — All Songs", color: C.gold,
        milestones: ["Concept","Grease Pencil Sketches","3D Compositing","Front Cover","Back Cover","Print Ready"],
        note: "One cover per song + front/back" },
    ]
  },
  {
    id: "apps",
    label: "APPLICATIONS",
    color: C.teal,
    icon: "⚙",
    phase: "SECONDARY",
    desc: "Sellable software — Gumroad/Patreon pipeline",
    projects: [
      { id: "quickalign", label: "QuickAlign — Path 3", color: C.teal,
        milestones: ["DSP Engine","CLI","GUI","Polish","Gumroad Listing","Launched"],
        note: "Sprint starting this week" },
      { id: "gridmix", label: "GRID Mix — Path 2", color: C.teal,
        milestones: ["FL API Research","Track Parser","Template Library","UI","Polish","Launched"],
        note: "Pending Path 3 completion" },
      { id: "conductor", label: "Conductor — Path 1 (Full VST)", color: C.teal,
        milestones: ["Blender UI Design","JUCE Shell","3D UI / CEF","MIDI Integration","DSP Port","Beta","Launched"],
        note: "Long game — 12–18 months" },
      { id: "casino", label: "RAD Casino (WebXR)", color: C.teal,
        milestones: ["Architecture","A-Frame Prototype","Multiplayer (NAF)","UI/UX","Meta Quest Build","Beta","Launched"],
        note: "Play-money social casino, Quest 2/3" },
      { id: "drummachine", label: "Drum Machine → Full DAW/GNAW", color: C.teal,
        milestones: ["Core Refine","Pattern Engine","Instrument Tracks","DAW Features","Plugin Support","Beta","Launched"],
        note: "Evolves into full DAW" },
      { id: "comicforge", label: "Comic Book Forge App", color: C.teal,
        milestones: ["Core Engine","Panel Layout","Asset Import","Script Integration","Export","Beta","Launched"],
        note: "Feeds comic pipeline directly" },
    ]
  },
  {
    id: "band3d",
    label: "3D BAND — GHOST CIRCUIT",
    color: C.purple,
    icon: "🎸",
    phase: "SECONDARY",
    desc: "Animated band in Blender — MIDI-driven performance",
    projects: [
      { id: "lujac", label: "Lujac — Drummer (CC4 Rig)", color: C.purple,
        milestones: ["Import","Rigging","IK Setup","MIDI Binding","Drum Kit Scene","Performance Ready"],
        note: "Rigify overlay in progress" },
      { id: "otherChars", label: "Full Cast — 6 Remaining Members", color: C.purple,
        milestones: ["Design","CC4 Export","Import","Rigging","Instrument Models","Performance Ready"],
        note: "Zorya, Vorn, Dredd Knox, Santiago, Nova + 1" },
      { id: "instruments", label: "All Instruments — 3D Models", color: C.purple,
        milestones: ["Drum Kit ✓","Guitar","Bass","Keys","Synth/Electronics","Mic/Vocal Rig"],
        note: "Drum kit complete with IK targets" },
      { id: "singer", label: "Singer — Lipsync + Expression System", color: C.purple,
        milestones: ["Character Rig","Audio Analysis","Lipsync System","Expression Drivers","MP3/Lyrics Input","Ready"],
        note: "Audio + text lyric input combo" },
      { id: "rehearsalScene", label: "Rehearsal Space — Scene 1", color: C.purple,
        milestones: ["Set Design","Build","Lighting","All Characters Placed","MIDI Performance Test","Final Render"],
        note: "Starting point — iterate from here" },
      { id: "stageScenes", label: "Performance Stages — Iteration Set", color: C.purple,
        milestones: ["Stage 1 (Simple)","Stage 2 (Lights)","Stage 3 (Smoke/FX)","Stage 4 (Pyro)","Stage 5 (Full Show)","Palette Complete"],
        note: "Build up to full production show" },
    ]
  },
  {
    id: "comic",
    label: "COMIC + ANIMATED SERIES",
    color: C.pink,
    icon: "📖",
    phase: "POST-ALBUM",
    desc: "Ghost Circuit comic → animated series pipeline",
    projects: [
      { id: "comicScript1", label: "Comic #1 — Script", color: C.pink,
        milestones: ["Story Outline","Script Draft","Script Final","Panel Breakdown","Approved"],
        note: "Ghost Circuit universe" },
      { id: "comicScript2", label: "Comic #2 — Script (optional)", color: C.pink,
        milestones: ["Story Outline","Script Draft","Script Final","Panel Breakdown","Approved"],
        note: "Fang Fei & Wei Li / parallel story" },
      { id: "comicAssets", label: "Comic Art Assets", color: C.pink,
        milestones: ["Character Sheets","Environment Art","Panel Art","Lettering","Cover Art","Print Ready"],
        note: "Grease Pencil + 3D composite" },
      { id: "animScript", label: "Animated Series — Scripts (S1)", color: C.pink,
        milestones: ["Series Bible","Ep 1 Script","Ep 2 Script","Ep 3 Script","Ep 4 Script","Season Arc"],
        note: "Adapts from comic + original content" },
      { id: "mvScripts", label: "Music Videos — Performance Clips", color: C.pink,
        milestones: ["Song 1 Concept","Song 1 Animatic","Song 1 Final","Song 2 Concept","Song 2 Animatic","Song 2 Final"],
        note: "Band performance + narrative cuts" },
      { id: "3dSets", label: "3D Sets + VFX Palette", color: C.pink,
        milestones: ["Rehearsal Set","Street Scene","Club/Venue","Sci-Fi Interior","Exterior World","FX Library"],
        note: "Feeds animation + game pipeline" },
    ]
  },
  {
    id: "game",
    label: "GAME DEVELOPMENT",
    color: C.blue,
    icon: "🎮",
    phase: "PIPELINE END",
    desc: "Comic → Animated Series → Game pipeline",
    projects: [
      { id: "gameDesign", label: "Game Design Document", color: C.blue,
        milestones: ["Concept","Genre/Mechanics","Story Integration","World Design","GDD Draft","GDD Final"],
        note: "Same universe — Ghost Circuit" },
      { id: "gameEngine", label: "Engine + Tech Stack", color: C.blue,
        milestones: ["Engine Choice","Project Setup","Core Systems","Asset Pipeline","Prototype","Alpha"],
        note: "TBD — Godot / Unity / Unreal" },
      { id: "gameAssets", label: "3D Assets — Comic→Game Port", color: C.blue,
        milestones: ["Character Port","Environment Port","Animation Port","VFX Port","UI","Complete"],
        note: "Leverages all prior 3D work" },
    ]
  },
  {
    id: "marketing",
    label: "MARKETING STRATEGY",
    color: C.orange,
    icon: "📡",
    phase: "ONGOING",
    desc: "YouTube, Patreon, Gumroad, Reddit — always on",
    projects: [
      { id: "youtube", label: "YouTube — Build In Public", color: C.orange,
        milestones: ["Channel Setup","10 Videos","50 Videos","1K Subs","10K Subs","Content Engine Running"],
        note: "All work documented on camera" },
      { id: "patreon", label: "Patreon — Early Access", color: C.orange,
        milestones: ["Page Setup","First Drop","10 Patrons","50 Patrons","100 Patrons","Sustainable"],
        note: "Early builds, templates, behind scenes" },
      { id: "gumroad", label: "Gumroad — Product Ladder", color: C.orange,
        milestones: ["Store Setup","First Product","$1K Revenue","$5K Revenue","$10K Revenue","Recurring"],
        note: "QuickAlign first, ladder up" },
      { id: "brand", label: "Plumbmonkey Brand Identity", color: C.orange,
        milestones: ["Logo System","Color/Type","Product Visual Language","Social Templates","Press Kit","Established"],
        note: "Blender renders as brand assets" },
    ]
  },
];

const PIPELINE_PHASES = [
  { id: "now",        label: "NOW",         desc: "Album + Apps",                          color: C.gold },
  { id: "postAlbum",  label: "POST-ALBUM",  desc: "Comic #1 (maybe #2)",                  color: C.pink },
  { id: "postComic",  label: "POST-COMIC",  desc: "Animated Series",                       color: C.purple },
  { id: "postSeries", label: "POST-SERIES", desc: "Video Game",                            color: C.blue },
  { id: "ongoing",    label: "ONGOING",     desc: "Marketing always on",                   color: C.orange },
];

// ── HanziFlow — Mandarin Study Component ──────────────────────────────────
const HF_PHASES = [
  { id: "p1", label: "Phase 1 — Foundation & Anki Link", color: C.teal,
    milestones: ["GitHub Pages repo","AnkiConnect handshake","Field Mapper UI","Queue Management","Live ✓"] },
  { id: "p2", label: "Phase 2 — Core Learning Wizard", color: C.purple,
    milestones: ["Comprehension Screen","Speech Verification","STPVO Word Sort","Hanzi Canvas","Short Loop / Stash","Complete ✓"] },
  { id: "p3", label: "Phase 3 — Dynamic Workload Engine", color: C.orange,
    milestones: ["25-min Timer","Pacing Algorithm","Timebox Alert Modal","Anki Sync (Pass/Fail)","Complete ✓"] },
  { id: "p4", label: "Phase 4 — HSK Benchmarks & Analytics", color: C.jade,
    milestones: ["localStorage Streaks","HSK JSON Import","Vocabulary Matching","Chart.js Dashboard","Encouragement Engine","Complete ✓"] },
];

const HSK_VOCAB_TOTAL = { 1: 150, 2: 300, 3: 600, 4: 1200, 5: 2500, 6: 5000 };
const HF_IDIOMS = [
  "加油 (jiā yóu)",
  "熟能生巧 (shú néng shēng qiǎo)",
  "一步一个脚印 (yī bù yī gè jiǎoyìn)",
  "学无止境 (xué wú zhǐjìng)",
  "坚持就是胜利 (jiānchí jiùshì shènglì)",
];

function calcStreak(sessions) {
  if (!sessions.length) return { current: 0, best: 0 };
  const days = [...new Set(sessions.map(s => s.date))].sort();
  const rev  = [...days].reverse();
  let cur = 0;
  let d   = new Date(); d.setHours(0, 0, 0, 0);
  for (const day of rev) {
    const dd = new Date(day); dd.setHours(0, 0, 0, 0);
    if (Math.round((d - dd) / 86400000) <= 1) { cur++; d = dd; } else break;
  }
  let best = 0, run = 1;
  for (let i = 1; i < days.length; i++) {
    if (Math.round((new Date(days[i]) - new Date(days[i - 1])) / 86400000) === 1) { run++; best = Math.max(best, run); }
    else run = 1;
  }
  return { current: cur, best: Math.max(best, cur) };
}

const HF_KEY = "pm_hanziflow_v1";
const loadHF = () => { try { const r = localStorage.getItem(HF_KEY); return r ? JSON.parse(r) : null; } catch { return null; } };
const saveHF = d => { try { localStorage.setItem(HF_KEY, JSON.stringify(d)); } catch {} };

function HanziFlowPanel() {
  const { user } = useAuthState();
  const today = new Date().toISOString().slice(0, 10);
  const saved  = loadHF();

  const [sessions,    setSessions]    = useState(saved?.sessions    || []);
  const [hskMastered, setHskMastered] = useState(saved?.hskMastered || { 1:0, 2:0, 3:0, 4:0, 5:0, 6:0 });
  const [phases,      setPhases]      = useState(saved?.phases      || { p1:0, p2:0, p3:0, p4:0 });
  const [idiomIdx]                    = useState(() => Math.floor(Math.random() * HF_IDIOMS.length));

  const [logDate,   setLogDate]   = useState(today);
  const [logMins,   setLogMins]   = useState(25);
  const [logNew,    setLogNew]    = useState(10);
  const [logReview, setLogReview] = useState(20);
  const [logAcc,    setLogAcc]    = useState(85);
  const [logStash,  setLogStash]  = useState(0);

  useEffect(() => { saveHF({ sessions, hskMastered, phases }); }, [sessions, hskMastered, phases]);

  function logSession() {
    const entry = {
      date: logDate, duration: logMins, cardsNew: logNew,
      cardsReview: logReview, accuracy: logAcc, stashSize: logStash,
      ts: new Date().toISOString(),
    };
    setSessions(p => [{ ...entry, id: Date.now().toString() }, ...p]);
  }

  function pushConfig(hsk, ph) {
    // HanziFlow config saved to localStorage via saveHF() in the state effect above.
    // Full Firestore sync for HanziFlow sessions can be wired via the service in a future sprint.
    void hsk; void ph;
  }
  function updateHsk(lvl, val) {
    const next = { ...hskMastered, [lvl]: Math.max(0, Math.min(HSK_VOCAB_TOTAL[lvl], val)) };
    setHskMastered(next); pushConfig(next, phases);
  }
  function updatePhase(key, val) {
    const ph   = HF_PHASES.find(p => p.id === key);
    const next = { ...phases, [key]: Math.max(0, Math.min(ph.milestones.length, val)) };
    setPhases(next); pushConfig(hskMastered, next);
  }

  const streak     = calcStreak(sessions);
  const totalMins  = sessions.reduce((a, s) => a + (s.duration    || 0), 0);
  const totalCards = sessions.reduce((a, s) => a + (s.cardsNew    || 0) + (s.cardsReview || 0), 0);
  const avgAcc     = sessions.length ? Math.round(sessions.reduce((a, s) => a + (s.accuracy || 0), 0) / sessions.length) : 0;
  const accColor   = avgAcc >= 90 ? C.green : avgAcc >= 70 ? C.orange : C.red;

  const numInput = (val, setter, max = 999) => (
    <input type="number" min={0} max={max} value={val}
      onChange={e => setter(Number(e.target.value))}
      style={{ width: 58, background: C.card2, border: `1px solid ${C.border}`, borderRadius: 4,
        color: C.white, fontFamily: "'Courier New', monospace", fontSize: 13,
        padding: "4px 6px", textAlign: "center" }} />
  );

  return (
    <div style={{ padding: "16px 20px" }}>
      {/* ─ Header ─ */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 16 }}>
        <div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.jade, letterSpacing: 2 }}>汉字FLOW</div>
          <div style={{ fontSize: 13, color: C.dim, letterSpacing: 2 }}>MANDARIN STUDY TRACKER — HANZIFLOW PRD</div>
        </div>
        <div style={{ textAlign: "right" }}>
          <SyncBadge status={user ? "live" : "local"} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 13, color: C.jade, fontStyle: "italic" }}>{HF_IDIOMS[idiomIdx]}</div>
        </div>
      </div>

      {/* ─ Stat pills ─ */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8, marginBottom: 14 }}>
        {[
          { label: "STREAK",   val: `${streak.current}d`, sub: `best ${streak.best}d`,  col: C.orange },
          { label: "SESSIONS", val: sessions.length,       sub: `${totalMins}min total`, col: C.jade   },
          { label: "CARDS",    val: totalCards,             sub: "all time",              col: C.teal   },
          { label: "AVG ACC",  val: `${avgAcc}%`,          sub: "across sessions",       col: accColor },
        ].map(s => (
          <div key={s.label} style={{ background: C.card, borderRadius: 8, padding: "10px 12px",
            border: `1px solid ${s.col}33`, textAlign: "center" }}>
            <div style={{ fontSize: 13, color: C.dim, letterSpacing: 1 }}>{s.label}</div>
            <div style={{ fontSize: 22, fontWeight: 900, color: s.col, lineHeight: 1.2 }}>{s.val}</div>
            <div style={{ fontSize: 13, color: C.mid }}>{s.sub}</div>
          </div>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
        {/* ─ Log Session ─ */}
        <div style={{ background: C.card, borderRadius: 8, padding: 14, border: `1px solid ${C.jade}33` }}>
          <div style={{ fontSize: 14, color: C.jade, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>+ LOG SESSION</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 6, marginBottom: 10 }}>
            <div>
              <div style={{ fontSize: 13, color: C.dim, marginBottom: 3 }}>DATE</div>
              <input type="date" value={logDate} onChange={e => setLogDate(e.target.value)}
                style={{ width: "100%", background: C.card2, border: `1px solid ${C.border}`,
                  borderRadius: 4, color: C.white, fontFamily: "inherit", fontSize: 14,
                  padding: "4px 6px", colorScheme: "dark" }} />
            </div>
            {[
              { label: "MINS",       val: logMins,   set: setLogMins,   max: 120 },
              { label: "NEW CARDS",  val: logNew,    set: setLogNew,    max: 200 },
              { label: "REVIEWS",    val: logReview, set: setLogReview, max: 500 },
              { label: "ACCURACY %", val: logAcc,    set: setLogAcc,    max: 100 },
              { label: "STASH ✗",   val: logStash,  set: setLogStash,  max: 100 },
            ].map(f => (
              <div key={f.label}>
                <div style={{ fontSize: 13, color: C.dim, marginBottom: 3 }}>{f.label}</div>
                {numInput(f.val, f.set, f.max)}
              </div>
            ))}
          </div>
          <button onClick={logSession}
            style={{ width: "100%", padding: "8px 0", background: C.jade + "22",
              border: `1px solid ${C.jade}`, color: C.jade, fontFamily: "inherit",
              fontSize: 14, fontWeight: 700, letterSpacing: 1, borderRadius: 4, cursor: "pointer" }}>
            RECORD SESSION
          </button>
        </div>

        {/* ─ Recent Sessions ─ */}
        <div style={{ background: C.card, borderRadius: 8, padding: 14, border: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, color: C.dim, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
            RECENT SESSIONS
          </div>
          {sessions.length === 0 ? (
            <div style={{ fontSize: 13, color: C.dim, textAlign: "center", paddingTop: 30, lineHeight: 1.8 }}>
              No sessions logged yet.<br/>Record your first study block →
            </div>
          ) : (
            <div style={{ display: "flex", flexDirection: "column", gap: 5, maxHeight: 220, overflowY: "auto" }}>
              {sessions.slice(0, 10).map((s, i) => {
                const sc = s.accuracy >= 90 ? C.green : s.accuracy >= 70 ? C.orange : C.red;
                return (
                  <div key={s.id || i} style={{ background: C.card2, borderRadius: 5, padding: "6px 10px",
                    border: `1px solid ${C.border}` }}>
                    <div style={{ display: "flex", justifyContent: "space-between" }}>
                      <span style={{ fontSize: 14, color: C.mid }}>{s.date}</span>
                      <span style={{ fontSize: 14, color: C.dim }}>{s.duration}min</span>
                      <span style={{ fontSize: 14, fontWeight: 700, color: sc }}>{s.accuracy}%</span>
                    </div>
                    <div style={{ fontSize: 13, color: C.dim, marginTop: 2 }}>
                      {s.cardsNew}N + {s.cardsReview}R &nbsp;·&nbsp; stash: {s.stashSize ?? 0}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {/* ─ HSK Vocabulary Mastery ─ */}
      <div style={{ background: C.card, borderRadius: 8, padding: 14, border: `1px solid ${C.jade}22`, marginBottom: 12 }}>
        <div style={{ fontSize: 14, color: C.jade, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
          HSK VOCABULARY MASTERY
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(6,1fr)", gap: 8 }}>
          {[1, 2, 3, 4, 5, 6].map(lvl => {
            const total    = HSK_VOCAB_TOTAL[lvl];
            const mastered = hskMastered[lvl] || 0;
            const pct      = total ? Math.round((mastered / total) * 100) : 0;
            const lvlColor = [C.green, C.teal, C.blue, C.purple, C.orange, C.red][lvl - 1];
            return (
              <div key={lvl} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 13, color: lvlColor, fontWeight: 700, marginBottom: 4 }}>HSK {lvl}</div>
                <RadialProgress pct={pct} color={lvlColor} size={52} />
                <div style={{ fontSize: 13, color: C.dim, marginTop: 4 }}>{mastered}/{total}</div>
                <input type="number" min={0} max={total} value={mastered}
                  onChange={e => updateHsk(lvl, Number(e.target.value))}
                  style={{ width: "100%", marginTop: 4, background: C.card2, border: `1px solid ${C.border}`,
                    borderRadius: 3, color: lvlColor, fontFamily: "inherit", fontSize: 14,
                    padding: "2px 4px", textAlign: "center" }} />
              </div>
            );
          })}
        </div>
      </div>

      {/* ─ HanziFlow Dev Phases ─ */}
      <div style={{ background: C.card, borderRadius: 8, padding: 14, border: `1px solid ${C.border}` }}>
        <div style={{ fontSize: 14, color: C.dim, fontWeight: 700, marginBottom: 10, letterSpacing: 1 }}>
          HANZIFLOW APP — DEVELOPMENT PHASES
        </div>
        {HF_PHASES.map(ph => {
          const ms  = phases[ph.id] || 0;
          const pct = ph.milestones.length ? Math.round((ms / ph.milestones.length) * 100) : 0;
          return (
            <div key={ph.id} style={{ marginBottom: 14 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 5 }}>
                <span style={{ fontSize: 13, color: ph.color, fontWeight: 700 }}>{ph.label}</span>
                <span style={{ fontSize: 14, color: ph.color }}>{pct}%</span>
              </div>
              <MilestoneBar milestones={ph.milestones} current={ms} color={ph.color}
                onSet={v => updatePhase(ph.id, v)} />
              <div style={{ fontSize: 13, color: C.dim, marginTop: 3 }}>
                {ms > 0 ? ph.milestones[Math.min(ms - 1, ph.milestones.length - 1)] : "Not started"}
                &nbsp;·&nbsp; {ms}/{ph.milestones.length}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ── Storage ────────────────────────────────────────────────────────────────
// load() is kept for synchronous initial state; all saves go through saveUniverseProgress()
const KEY = "pm_universe_v1";
function load() { try { const r = localStorage.getItem(KEY); return r ? JSON.parse(r) : null; } catch { return null; } }

function getMonthKey() {
  const n = new Date();
  return `${n.getFullYear()}-${String(n.getMonth()+1).padStart(2,"0")}`;
}
function getWeekKey() {
  const n = new Date(), s = new Date(n.getFullYear(),0,1);
  return `${n.getFullYear()}-W${Math.ceil(((n-s)/86400000+s.getDay()+1)/7)}`;
}

function initProgress() {
  const p = {};
  PILLARS.forEach(pillar => {
    pillar.projects.forEach(proj => {
      p[proj.id] = { milestone: 0, notes: "", lastUpdated: "" };
    });
  });
  return p;
}

// ── Mini spark line component ──────────────────────────────────────────────
function SparkLine({ data, color, width = 120, height = 36 }) {
  if (!data || data.length < 2) return (
    <svg width={width} height={height}>
      <line x1={0} y1={height/2} x2={width} y2={height/2} stroke={C.dim} strokeWidth={1} strokeDasharray="3,3"/>
    </svg>
  );
  const max = Math.max(...data, 1);
  const pts = data.map((v, i) => {
    const x = (i / (data.length - 1)) * width;
    const y = height - (v / max) * (height - 6) - 3;
    return `${x},${y}`;
  }).join(" ");
  return (
    <svg width={width} height={height} style={{ overflow: "visible" }}>
      <polyline points={pts} fill="none" stroke={color} strokeWidth={1.5} strokeLinejoin="round" />
      {data.map((v, i) => {
        const x = (i / (data.length - 1)) * width;
        const y = height - (v / max) * (height - 6) - 3;
        return <circle key={i} cx={x} cy={y} r={i === data.length-1 ? 3 : 1.5}
          fill={i === data.length-1 ? color : C.bg} stroke={color} strokeWidth={1} />;
      })}
    </svg>
  );
}

// ── Radial progress ────────────────────────────────────────────────────────
function RadialProgress({ pct, color, size = 64, label }) {
  const r = (size - 8) / 2, circ = 2 * Math.PI * r;
  const dash = (pct / 100) * circ;
  return (
    <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 4 }}>
      <svg width={size} height={size} style={{ transform: "rotate(-90deg)" }}>
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={C.border} strokeWidth={5} />
        <circle cx={size/2} cy={size/2} r={r} fill="none" stroke={color} strokeWidth={5}
          strokeDasharray={`${dash} ${circ}`} strokeLinecap="round"
          style={{ transition: "stroke-dasharray 0.5s ease" }} />
      </svg>
      <div style={{ marginTop: -size - 4, height: size, display: "flex", alignItems: "center", justifyContent: "center" }}>
        <span style={{ fontSize: 13, fontWeight: 900, color, fontFamily: "'Courier New', monospace" }}>{pct}%</span>
      </div>
      {label && <div style={{ fontSize: 13, color: C.dim, letterSpacing: 1, textAlign: "center", maxWidth: size + 20 }}>{label}</div>}
    </div>
  );
}

// ── Milestone bar ──────────────────────────────────────────────────────────
function MilestoneBar({ milestones, current, color, onSet }) {
  return (
    <div style={{ display: "flex", gap: 3, alignItems: "center", flexWrap: "wrap" }}>
      {milestones.map((m, i) => {
        const done = i < current, active = i === current;
        return (
          <div key={i} onClick={() => onSet(i === current ? i - 1 : i + 1)}
            title={m}
            style={{
              height: 6, flex: 1, minWidth: 18, borderRadius: 3, cursor: "pointer",
              background: done ? color : active ? color + "88" : C.border,
              border: active ? `1px solid ${color}` : "none",
              transition: "all 0.2s",
            }} />
        );
      })}
    </div>
  );
}

// ── Project Card ───────────────────────────────────────────────────────────
function ProjectCard({ proj, pillarColor, progress, onUpdate, weekHistory }) {
  const [expanded, setExpanded] = useState(false);
  const prog = progress[proj.id] || { milestone: 0, notes: "" };
  const pct = prog.milestone === 0 ? 0 : Math.round((prog.milestone / proj.milestones.length) * 100);
  const currentLabel = proj.milestones[Math.min(prog.milestone, proj.milestones.length - 1)];

  return (
    <div style={{
      background: C.card, borderRadius: 8, border: `1px solid ${C.border}`,
      marginBottom: 6, overflow: "hidden",
      boxShadow: expanded ? `0 0 12px ${proj.color}22` : "none",
      transition: "box-shadow 0.3s",
    }}>
      <div onClick={() => setExpanded(e => !e)} style={{
        padding: "10px 14px", cursor: "pointer",
        display: "flex", alignItems: "center", gap: 10,
      }}>
        <div style={{ width: 8, height: 8, borderRadius: "50%", background: proj.color, flexShrink: 0 }} />
        <span style={{ flex: 1, fontSize: 13, color: C.white, fontWeight: 600 }}>{proj.label}</span>
        <SparkLine data={weekHistory} color={proj.color} width={60} height={20} />
        <span style={{ fontSize: 13, color: proj.color, minWidth: 32, textAlign: "right", fontWeight: 700 }}>{pct}%</span>
        <span style={{ fontSize: 13, color: C.dim, marginLeft: 4 }}>{expanded ? "▲" : "▼"}</span>
      </div>
      <div style={{ padding: "0 14px 4px", marginTop: -4 }}>
        <MilestoneBar milestones={proj.milestones} current={prog.milestone} color={proj.color}
          onSet={v => onUpdate(proj.id, { ...prog, milestone: Math.max(0, Math.min(v, proj.milestones.length)), lastUpdated: new Date().toISOString() })} />
      </div>
      {expanded && (
        <div style={{ padding: "10px 14px 14px", borderTop: `1px solid ${C.border}` }}>
          <div style={{ fontSize: 14, color: proj.color, marginBottom: 8, fontWeight: 700 }}>
            CURRENT: {currentLabel} &nbsp;·&nbsp; {prog.milestone}/{proj.milestones.length} milestones
          </div>
          <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 10 }}>
            {proj.milestones.map((m, i) => (
              <span key={i} onClick={() => onUpdate(proj.id, { ...prog, milestone: i + 1, lastUpdated: new Date().toISOString() })}
                style={{
                  fontSize: 14, padding: "3px 8px", borderRadius: 4, cursor: "pointer",
                  background: i < prog.milestone ? proj.color + "33" : C.card2,
                  color: i < prog.milestone ? proj.color : C.dim,
                  border: i === prog.milestone - 1 ? `1px solid ${proj.color}` : `1px solid ${C.border}`,
                  fontWeight: i < prog.milestone ? 700 : 400,
                }}>{m}</span>
            ))}
          </div>
          <div style={{ fontSize: 14, color: C.dim, marginBottom: 6, fontStyle: "italic" }}>{proj.note}</div>
          <textarea value={prog.notes || ""} placeholder="Notes, blockers, next actions..."
            onChange={e => onUpdate(proj.id, { ...prog, notes: e.target.value })}
            style={{ width: "100%", minHeight: 48, background: C.card2, border: `1px solid ${C.border}`,
              borderRadius: 5, color: C.white, fontFamily: "'Courier New', monospace", fontSize: 13,
              padding: 8, resize: "vertical", boxSizing: "border-box" }} />
        </div>
      )}
    </div>
  );
}

// ── Main Dashboard ─────────────────────────────────────────────────────────
export default function UniverseTracker() {
  const { user } = useAuthState();
  const [tab, setTab]           = useState("overview");
  const [progress, setProgress] = useState(() => { const s = load(); return s?.progress || initProgress(); });
  const [weekSnaps, setWeekSnaps] = useState(() => { const s = load(); return s?.weekSnaps || {}; });
  const [monthNotes, setMonthNotes] = useState(() => { const s = load(); return s?.monthNotes || {}; });
  const [activePillar, setActivePillar] = useState("album");
  const [monthNote, setMonthNote] = useState("");
  const weekKey  = getWeekKey();
  const monthKey = getMonthKey();

  // Dual-write: localStorage (via service) + Firestore when signed in
  useEffect(() => {
    saveUniverseProgress(user?.uid ?? null, { progress, weekSnaps, monthNotes });
  }, [progress, weekSnaps, monthNotes]); // eslint-disable-line react-hooks/exhaustive-deps

  // Merge from Firestore when user signs in (Firestore wins)
  useEffect(() => {
    if (!user) return;
    loadUniverseProgress(user.uid).then(data => {
      if (!data) return;
      if (data.progress)    setProgress(data.progress);
      if (data.weekSnaps)   setWeekSnaps(data.weekSnaps);
      if (data.monthNotes)  setMonthNotes(data.monthNotes);
    });
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  function updateProgress(id, val) {
    setProgress(p => ({ ...p, [id]: val }));
  }

  function snapshotWeek() {
    const snap = {};
    PILLARS.forEach(pi => {
      pi.projects.forEach(pr => {
        const prog = progress[pr.id] || { milestone: 0 };
        snap[pr.id] = Math.round((prog.milestone / pr.milestones.length) * 100);
      });
    });
    setWeekSnaps(p => ({ ...p, [weekKey]: snap }));
    firestoreSnapshotWeek(user?.uid ?? null, weekKey, snap);
    alert(`Week ${weekKey} snapshot saved!`);
  }

  function saveMonthNote() {
    setMonthNotes(p => ({ ...p, [monthKey]: monthNote }));
  }

  // Compute pillar-level pct
  function pillarPct(pillar) {
    let tot = 0, done = 0;
    pillar.projects.forEach(pr => {
      tot += pr.milestones.length;
      done += (progress[pr.id]?.milestone || 0);
    });
    return tot === 0 ? 0 : Math.round((done / tot) * 100);
  }

  // Overall universe pct
  function universePct() {
    let tot = 0, done = 0;
    PILLARS.forEach(pi => pi.projects.forEach(pr => {
      tot += pr.milestones.length;
      done += (progress[pr.id]?.milestone || 0);
    }));
    return tot === 0 ? 0 : Math.round((done / tot) * 100);
  }

  // Week history for a project
  function weekHistory(projId) {
    const keys = Object.keys(weekSnaps).sort();
    return keys.map(k => weekSnaps[k]?.[projId] || 0);
  }

  // Pillar week history (average)
  function pillarWeekHistory(pillar) {
    const keys = Object.keys(weekSnaps).sort();
    return keys.map(k => {
      const vals = pillar.projects.map(pr => weekSnaps[k]?.[pr.id] || 0);
      return vals.length ? Math.round(vals.reduce((a,b)=>a+b,0)/vals.length) : 0;
    });
  }

  const TAB = (id, lbl) => (
    <button key={id} onClick={() => setTab(id)} style={{
      padding: "8px 14px", fontSize: 13, fontWeight: 700, letterSpacing: 1,
      cursor: "pointer", border: "none", background: "transparent", fontFamily: "inherit",
      color: tab === id ? C.gold : C.dim,
      borderBottom: tab === id ? `2px solid ${C.gold}` : "2px solid transparent",
    }}>{lbl}</button>
  );

  const upct = universePct();

  return (
    <div style={{ background: C.bg, minHeight: "100vh", fontFamily: "'Courier New', monospace", color: C.white }}>

      {/* ── HEADER ── */}
      <div style={{ background: C.panel, borderBottom: `3px solid ${C.gold}`,
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, color: C.dim, letterSpacing: 3, marginBottom: 2 }}>PLUMBMONKEY MEDIA</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.gold, letterSpacing: 2 }}>GHOST CIRCUIT</div>
          <div style={{ fontSize: 14, color: C.teal, letterSpacing: 2 }}>UNIVERSE TRACKER</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 8 }}>
          <RadialProgress pct={upct} color={C.gold} size={60} />
          <div style={{ fontSize: 13, color: C.dim }}>{weekKey}</div>
          <AuthButton user={user} style={{ marginTop: 4 }} />
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.panel, paddingLeft: 8 }}>
        {TAB("overview","OVERVIEW")}
        {TAB("projects","PROJECTS")}
        {TAB("pipeline","PIPELINE")}
        {TAB("weekly","WEEKLY GRAPH")}
        {TAB("monthly","MONTHLY")}
        {TAB("hanziflow","汉字FLOW")}
        <button onClick={snapshotWeek} style={{
          marginLeft: "auto", marginRight: 14, padding: "5px 12px",
          fontSize: 13, fontWeight: 700, background: "transparent",
          border: `1px solid ${C.teal}`, color: C.teal,
          borderRadius: 4, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1,
        }}>📸 SNAPSHOT WEEK</button>
      </div>

      {/* ══ OVERVIEW ══════════════════════════════════════════════════════ */}
      {tab === "overview" && (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 14, color: C.dim, letterSpacing: 2, marginBottom: 12 }}>ALL PILLARS — CURRENT STATUS</div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20 }}>
            {PILLARS.map(pi => {
              const pct = pillarPct(pi);
              const hist = pillarWeekHistory(pi);
              return (
                <div key={pi.id} onClick={() => { setActivePillar(pi.id); setTab("projects"); }}
                  style={{ background: C.card, borderRadius: 10, padding: 14, cursor: "pointer",
                    border: `1px solid ${C.border}`, transition: "border 0.2s",
                    boxShadow: `0 0 0 0 ${pi.color}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.borderColor = pi.color}
                  onMouseLeave={e => e.currentTarget.style.borderColor = C.border}
                >
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div>
                      <div style={{ fontSize: 16 }}>{pi.icon}</div>
                      <div style={{ fontSize: 13, fontWeight: 700, color: pi.color, marginTop: 4, letterSpacing: 1 }}>{pi.label}</div>
                      <div style={{ fontSize: 13, color: C.dim, marginTop: 2 }}>{pi.phase}</div>
                    </div>
                    <RadialProgress pct={pct} color={pi.color} size={48} />
                  </div>
                  <div style={{ fontSize: 14, color: C.mid, marginBottom: 8, lineHeight: 1.5 }}>{pi.desc}</div>
                  <SparkLine data={hist} color={pi.color} width="100%" height={28} />
                  <div style={{ fontSize: 13, color: C.dim, marginTop: 6 }}>
                    {pi.projects.length} projects &nbsp;·&nbsp; click to expand
                  </div>
                </div>
              );
            })}
          </div>

          {/* Pipeline phase strip */}
          <div style={{ fontSize: 14, color: C.dim, letterSpacing: 2, marginBottom: 8 }}>RELEASE PIPELINE</div>
          <div style={{ display: "flex", gap: 0, borderRadius: 8, overflow: "hidden", border: `1px solid ${C.border}` }}>
            {PIPELINE_PHASES.map((ph, i) => (
              <div key={ph.id} style={{ flex: 1, padding: "10px 8px", background: C.card,
                borderRight: i < PIPELINE_PHASES.length-1 ? `1px solid ${C.border}` : "none",
                textAlign: "center" }}>
                <div style={{ fontSize: 13, fontWeight: 700, color: ph.color, letterSpacing: 1 }}>{ph.label}</div>
                <div style={{ fontSize: 13, color: C.dim, marginTop: 4, lineHeight: 1.4 }}>{ph.desc}</div>
                <div style={{ marginTop: 6, height: 3, borderRadius: 2, background: ph.color + "44" }}>
                  <div style={{ height: "100%", width: ph.id === "now" ? "30%" : ph.id === "ongoing" ? "10%" : "0%",
                    background: ph.color, borderRadius: 2, transition: "width 0.5s" }} />
                </div>
              </div>
            ))}
          </div>

          {/* Quick status — primary goals */}
          <div style={{ marginTop: 16, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
            <div style={{ background: C.card, borderRadius: 8, padding: 14, border: `1px solid ${C.gold}44` }}>
              <div style={{ fontSize: 14, color: C.gold, fontWeight: 700, marginBottom: 8 }}>🎵 PRIMARY — THE ALBUM</div>
              {PILLARS[0].projects.slice(0,2).map(pr => {
                const prog = progress[pr.id] || { milestone: 0 };
                const pct = Math.round((prog.milestone / pr.milestones.length) * 100);
                return (
                  <div key={pr.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, color: C.white }}>{pr.label}</span>
                      <span style={{ fontSize: 14, color: C.gold }}>{pct}%</span>
                    </div>
                    <div style={{ height: 3, background: C.border, borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: C.gold, borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 13, color: C.dim, marginTop: 2 }}>{pr.note}</div>
                  </div>
                );
              })}
            </div>
            <div style={{ background: C.card, borderRadius: 8, padding: 14, border: `1px solid ${C.teal}44` }}>
              <div style={{ fontSize: 14, color: C.teal, fontWeight: 700, marginBottom: 8 }}>⚙ SECONDARY — APPS TO MARKET</div>
              {PILLARS[1].projects.slice(0,3).map(pr => {
                const prog = progress[pr.id] || { milestone: 0 };
                const pct = Math.round((prog.milestone / pr.milestones.length) * 100);
                return (
                  <div key={pr.id} style={{ marginBottom: 8 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 3 }}>
                      <span style={{ fontSize: 13, color: C.white }}>{pr.label}</span>
                      <span style={{ fontSize: 14, color: C.teal }}>{pct}%</span>
                    </div>
                    <div style={{ height: 3, background: C.border, borderRadius: 2 }}>
                      <div style={{ height: "100%", width: `${pct}%`, background: C.teal, borderRadius: 2 }} />
                    </div>
                    <div style={{ fontSize: 13, color: C.dim, marginTop: 2 }}>{pr.note}</div>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* ══ PROJECTS ══════════════════════════════════════════════════════ */}
      {tab === "projects" && (
        <div style={{ padding: "14px 20px" }}>
          {/* Pillar selector */}
          <div style={{ display: "flex", gap: 6, marginBottom: 14, flexWrap: "wrap" }}>
            {PILLARS.map(pi => (
              <button key={pi.id} onClick={() => setActivePillar(pi.id)} style={{
                padding: "5px 12px", borderRadius: 5, cursor: "pointer", fontFamily: "inherit",
                background: activePillar === pi.id ? pi.color + "22" : C.card,
                border: `1px solid ${activePillar === pi.id ? pi.color : C.border}`,
                color: activePillar === pi.id ? pi.color : C.dim,
                fontSize: 14, fontWeight: 700, letterSpacing: 1,
              }}>{pi.icon} {pi.label}</button>
            ))}
          </div>

          {PILLARS.filter(pi => pi.id === activePillar).map(pi => (
            <div key={pi.id}>
              <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 12 }}>
                <div style={{ fontSize: 14, color: pi.color, fontWeight: 700, letterSpacing: 2 }}>{pi.label}</div>
                <div style={{ flex: 1, height: 1, background: C.border }} />
                <RadialProgress pct={pillarPct(pi)} color={pi.color} size={40} />
              </div>
              {pi.projects.map(pr => (
                <ProjectCard key={pr.id} proj={pr} pillarColor={pi.color}
                  progress={progress}
                  onUpdate={updateProgress}
                  weekHistory={weekHistory(pr.id)} />
              ))}
            </div>
          ))}
        </div>
      )}

      {/* ══ PIPELINE ══════════════════════════════════════════════════════ */}
      {tab === "pipeline" && (
        <div style={{ padding: "14px 20px" }}>
          <div style={{ fontSize: 14, color: C.dim, letterSpacing: 2, marginBottom: 14 }}>
            GHOST CIRCUIT CREATIVE UNIVERSE — RELEASE ORDER
          </div>
          {[
            { phase: "NOW — ACTIVE", color: C.gold,   items: [
              "Album — Song 1 final recording & mix",
              "Album — Song 2 writing & development",
              "QuickAlign app — Path 3 sprint (this week)",
              "GRID Mix app — Path 2 (follows Path 3)",
              "Lujac drummer rig — Rigify overlay ongoing",
              "Marketing — YouTube build in public, Patreon setup",
            ]},
            { phase: "SOON — PATH 1 + BAND", color: C.teal, items: [
              "Conductor VST — Blender UI design phase",
              "Full band cast — remaining 6 characters rigged",
              "All instruments modelled",
              "Rehearsal space scene — first full performance",
              "Singer lipsync system built",
              "RAD Casino — WebXR prototype",
            ]},
            { phase: "POST-ALBUM — COMIC", color: C.pink, items: [
              "Comic #1 script finalised",
              "Comic assets — Grease Pencil + 3D composite art",
              "Comic Book Forge app — powers the production",
              "Music videos for album tracks",
              "Performance stage scenes — iterate through 5 levels",
            ]},
            { phase: "POST-COMIC — ANIMATED SERIES", color: C.purple, items: [
              "Series bible & Season 1 scripts",
              "3D sets & VFX palette complete",
              "Full band animated performance sequences",
              "Comic → Animation asset port",
              "Drum machine evolved to full DAW/GNAW",
            ]},
            { phase: "POST-SERIES — VIDEO GAME", color: C.blue, items: [
              "Game design document",
              "Engine & tech stack selected",
              "Animation → Game asset pipeline",
              "Game prototype & alpha",
              "Comic → Game universe continuity",
            ]},
            { phase: "ALWAYS ON — MARKETING", color: C.orange, items: [
              "YouTube — all work documented on camera",
              "Patreon — early access, builds, templates",
              "Gumroad — product ladder climbs with each launch",
              "Reddit — community presence per product",
              "Plumbmonkey brand identity refined continuously",
            ]},
          ].map((ph, i) => (
            <div key={i} style={{ marginBottom: 16 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                <div style={{ width: 10, height: 10, borderRadius: "50%", background: ph.color, flexShrink: 0 }} />
                <div style={{ fontSize: 13, fontWeight: 700, color: ph.color, letterSpacing: 1 }}>{ph.phase}</div>
                <div style={{ flex: 1, height: 1, background: ph.color + "33" }} />
              </div>
              <div style={{ background: C.card, borderRadius: 8, padding: "10px 14px",
                border: `1px solid ${ph.color}22`, marginLeft: 20 }}>
                {ph.items.map((item, j) => (
                  <div key={j} style={{ display: "flex", alignItems: "center", gap: 8, padding: "4px 0",
                    borderBottom: j < ph.items.length-1 ? `1px solid ${C.border}` : "none" }}>
                    <div style={{ width: 5, height: 5, borderRadius: "50%", background: ph.color + "88", flexShrink: 0 }} />
                    <span style={{ fontSize: 13, color: C.white }}>{item}</span>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ══ WEEKLY GRAPH ══════════════════════════════════════════════════ */}
      {tab === "weekly" && (
        <div style={{ padding: "14px 20px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: C.dim, letterSpacing: 2 }}>WEEKLY PROGRESS — ALL PILLARS</div>
            <div style={{ fontSize: 14, color: C.teal }}>
              {Object.keys(weekSnaps).length} weeks tracked
            </div>
          </div>

          {Object.keys(weekSnaps).length === 0 ? (
            <div style={{ background: C.card, borderRadius: 8, padding: 32, textAlign: "center",
              border: `1px dashed ${C.border}` }}>
              <div style={{ fontSize: 24, marginBottom: 8 }}>📸</div>
              <div style={{ fontSize: 14, color: C.mid, marginBottom: 6 }}>No weekly snapshots yet</div>
              <div style={{ fontSize: 13, color: C.dim }}>
                Click "SNAPSHOT WEEK" at the top right at the end of each week<br/>
                to start tracking your progress over time.
              </div>
            </div>
          ) : (
            <>
              {PILLARS.map(pi => {
                const hist = pillarWeekHistory(pi);
                const weeks = Object.keys(weekSnaps).sort();
                const current = pillarPct(pi);
                return (
                  <div key={pi.id} style={{ background: C.card, borderRadius: 8, padding: "12px 14px",
                    border: `1px solid ${C.border}`, marginBottom: 10 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                      <div style={{ fontSize: 13, fontWeight: 700, color: pi.color }}>
                        {pi.icon} {pi.label}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                        <SparkLine data={[...hist, current]} color={pi.color} width={140} height={32} />
                        <span style={{ fontSize: 13, fontWeight: 900, color: pi.color }}>{current}%</span>
                      </div>
                    </div>
                    {/* Per-project mini bars */}
                    <div style={{ display: "flex", flexDirection: "column", gap: 5 }}>
                      {pi.projects.map(pr => {
                        const prog = progress[pr.id] || { milestone: 0 };
                        const pct = Math.round((prog.milestone / pr.milestones.length) * 100);
                        const prHist = weekHistory(pr.id);
                        return (
                          <div key={pr.id} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <span style={{ fontSize: 14, color: C.mid, minWidth: 160, overflow: "hidden",
                              textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{pr.label}</span>
                            <div style={{ flex: 1, height: 4, background: C.border, borderRadius: 2 }}>
                              <div style={{ height: "100%", width: `${pct}%`, background: pr.color,
                                borderRadius: 2, transition: "width 0.3s" }} />
                            </div>
                            <SparkLine data={[...prHist, pct]} color={pr.color} width={50} height={16} />
                            <span style={{ fontSize: 14, color: pr.color, minWidth: 28, textAlign: "right" }}>{pct}%</span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </>
          )}
        </div>
      )}

      {/* ══ MONTHLY ═══════════════════════════════════════════════════════ */}
      {tab === "monthly" && (
        <div style={{ padding: "14px 20px" }}>
          <div style={{ fontSize: 14, color: C.dim, letterSpacing: 2, marginBottom: 14 }}>MONTHLY ASSESSMENT — {monthKey}</div>

          {/* Current month snapshot */}
          <div style={{ background: C.card, borderRadius: 10, padding: 16,
            border: `1px solid ${C.gold}44`, marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: C.gold, fontWeight: 700, marginBottom: 12 }}>CURRENT STATE — ALL PILLARS</div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 16 }}>
              {PILLARS.map(pi => {
                const pct = pillarPct(pi);
                return (
                  <div key={pi.id} style={{ textAlign: "center" }}>
                    <RadialProgress pct={pct} color={pi.color} size={56} label={pi.label.split("—")[0].trim()} />
                  </div>
                );
              })}
            </div>
          </div>

          {/* Monthly note */}
          <div style={{ fontSize: 14, color: C.dim, letterSpacing: 1, marginBottom: 6 }}>
            MONTHLY ASSESSMENT NOTES — {monthKey}
          </div>
          <textarea
            value={monthNotes[monthKey] || monthNote}
            onChange={e => setMonthNote(e.target.value)}
            placeholder={`What did we accomplish this month?\nWhat's blocked?\nWhat pivots do we need?\nWhat's the focus for next month?`}
            style={{ width: "100%", minHeight: 100, background: C.card2, border: `1px solid ${C.border}`,
              borderRadius: 6, color: C.white, fontFamily: "inherit", fontSize: 13,
              padding: 12, resize: "vertical", boxSizing: "border-box", marginBottom: 8 }} />
          <button onClick={saveMonthNote} style={{
            padding: "7px 18px", background: "transparent", border: `1px solid ${C.gold}`,
            color: C.gold, fontFamily: "inherit", fontSize: 14, fontWeight: 700,
            letterSpacing: 1, borderRadius: 4, cursor: "pointer", marginBottom: 20,
          }}>SAVE ASSESSMENT</button>

          {/* Past months */}
          {Object.keys(monthNotes).length > 0 && (
            <>
              <div style={{ fontSize: 14, color: C.dim, letterSpacing: 1, marginBottom: 8 }}>PAST ASSESSMENTS</div>
              {Object.entries(monthNotes).reverse().map(([mk, note]) => (
                <div key={mk} style={{ background: C.card, borderRadius: 8, padding: 12,
                  border: `1px solid ${C.border}`, marginBottom: 8 }}>
                  <div style={{ fontSize: 14, color: C.teal, fontWeight: 700, marginBottom: 6 }}>{mk}</div>
                  <div style={{ fontSize: 13, color: C.mid, lineHeight: 1.7, whiteSpace: "pre-wrap" }}>{note}</div>
                </div>
              ))}
            </>
          )}
        </div>
      )}

      {/* ══ HANZIFLOW ════════════════════════════════════════════════════ */}
      {tab === "hanziflow" && <HanziFlowPanel />}

      <div style={{ padding: "7px 20px", borderTop: `1px solid ${C.border}`, marginTop: 6,
        fontSize: 7, color: "#1E1E32", display: "flex", justifyContent: "space-between" }}>
        <span>GHOST CIRCUIT UNIVERSE TRACKER v1.0 — PLUMBMONKEY MEDIA</span>
        <span>Album → Comic → Series → Game</span>
      </div>
    </div>
  );
}
