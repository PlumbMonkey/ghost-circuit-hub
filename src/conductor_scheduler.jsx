import { useState, useEffect } from "react";
import {
  useAuthState,
  saveSchedulerWeek,
  loadSchedulerWeek,
  SyncBadge,
  AuthButton,
} from "./services/firebase";

const GOLD   = "#E8C060";
const TEAL   = "#45DEDE";
const BG     = "#0D0D0D";
const CARD   = "#1A1A1A";
const CARD2  = "#232323";
const DIM    = "#AAAAAA";
const WHITE  = "#FFFFFF";
const GREEN  = "#5DD88A";
const RED    = "#F06A6A";
const ORANGE = "#F09850";
const PURPLE = "#C0AAFF";

const DAILY_TASKS = [
  { id: "walk",    label: "Morning Walk",                    time: "20–40 min", tag: "BODY",    color: GREEN },
  { id: "chinese", label: "Chinese Language Lesson",         time: "20–30 min", tag: "MORNING", color: TEAL },
  { id: "fcc",     label: "FreeCodeCamp JS — 1 lesson",      time: "30–45 min", tag: "MORNING", color: TEAL },
  { id: "arch",    label: "Blender Architecture — 1 lesson", time: "30–45 min", tag: "MORNING", color: TEAL },
  { id: "build",   label: "App Coding Build Session",        time: "2–3 hrs",   tag: "BUILD",   color: GOLD },
  { id: "physics", label: "Blender Physics — 1 lesson",      time: "30–45 min", tag: "ARVO",    color: PURPLE },
  { id: "gp",      label: "Grease Pencil — 1 lesson",        time: "30–45 min", tag: "ARVO",    color: PURPLE },
];

const WEEKLY_TASKS = [
  { id: "music",   label: "Music Session",                  time: "2–3 hrs",   color: GREEN,  freq: "1×/week" },
  { id: "gaming",  label: "Gaming Video Night",             time: "1–2 hrs",   color: GREEN,  freq: "1×/week" },
  { id: "drawing", label: "Drawing / 3D Creation Video",    time: "1–2 hrs",   color: GREEN,  freq: "1×/week" },
  { id: "editing", label: "Video Editing + Thumbnails",     time: "30–60 min", color: GREEN,  freq: "1×/week" },
  { id: "guitar",  label: "Guitar Repair Session",          time: "30–60 min", color: ORANGE, freq: "1×/week" },
  { id: "menu",    label: "Menu Plan + Grocery List",       time: "20–30 min", color: ORANGE, freq: "Weekly" },
  { id: "cook",    label: "Batch Cook / Prep Session",      time: "1–2 hrs",   color: ORANGE, freq: "1–2×/wk" },
  { id: "review",  label: "Weekly Review + Next Week Plan", time: "20–30 min", color: RED,    freq: "Fri/Sat" },
];

const MEAL_SCHEDULE = {
  Mon: { meals: 3, times: ["8:00 AM", "1:00 PM", "6:30 PM"] },
  Tue: { meals: 2, times: ["9:00 AM", "5:30 PM"] },
  Wed: { meals: 3, times: ["8:00 AM", "1:00 PM", "6:30 PM"] },
  Thu: { meals: 2, times: ["9:00 AM", "5:30 PM"] },
  Fri: { meals: 3, times: ["8:00 AM", "1:00 PM", "6:30 PM"] },
  Sat: { meals: 2, times: ["9:00 AM", "5:30 PM"] },
};

const DAYS        = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const REFORMAT_DAYS = ["Mon", "Tue"];

const VIDEO_SCHEDULE = [
  { day: "Monday",    video: "Music session premiere",       short: "—",                     note: "Afternoon" },
  { day: "Tuesday",   video: "No upload",                    short: "—",                     note: "" },
  { day: "Wednesday", video: "Music session premiere",       short: "Short: Monday's video", note: "Afternoon" },
  { day: "Thursday",  video: "No upload",                    short: "Short: Wed's video",    note: "Short only" },
  { day: "Friday",    video: "Gaming + Music session",       short: "—",                     note: "Two videos" },
  { day: "Saturday",  video: "Music session premiere",       short: "—",                     note: "Afternoon" },
  { day: "Sunday",    video: "Drawing/3D + Music session",   short: "—",                     note: "Two videos" },
];

const DEFAULT_MENU = {
  Mon: { meal1: "Oats + fruit + coffee",   meal2: "Chicken + rice + veg",   meal3: "Stir fry or soup" },
  Tue: { meal1: "Eggs + toast + coffee",   meal2: "Leftovers or quick meal" },
  Wed: { meal1: "Smoothie + granola",      meal2: "Salad + protein",        meal3: "Pasta or stew" },
  Thu: { meal1: "Oats + coffee",           meal2: "Sandwich + fruit" },
  Fri: { meal1: "Eggs + toast",            meal2: "Rice bowl",              meal3: "Treat meal / takeout" },
  Sat: { meal1: "Brunch — eggs + veg",     meal2: "Light dinner" },
};

// ── Storage helpers (read-only, for initial state) ────────────────────────────
// Saves are handled entirely by the shared Firebase service.
const LS_KEY = "conductor_scheduler_v2";
function _lsLoad() {
  try { const r = localStorage.getItem(LS_KEY); return r ? JSON.parse(r) : null; } catch { return null; }
}

function getWeekKey() {
  const now = new Date(), soy = new Date(now.getFullYear(), 0, 1);
  const wk = Math.ceil(((now - soy) / 86400000 + soy.getDay() + 1) / 7);
  return `${now.getFullYear()}-W${wk}`;
}

function initWeek(reformat = false) {
  const c = {};
  DAYS.forEach(d => {
    c[d] = {};
    DAILY_TASKS.forEach(t => { c[d][t.id] = reformat && REFORMAT_DAYS.includes(d) ? "skip" : false; });
  });
  WEEKLY_TASKS.forEach(t => { c["weekly_" + t.id] = false; });
  return c;
}

// ── Presentational sub-components ────────────────────────────────────────────
function Tag({ label, color }) {
  return (
    <span style={{ fontSize: 12, fontWeight: 700, letterSpacing: 0.8, color,
      border: `1px solid ${color}`, padding: "2px 7px", borderRadius: 3,
      marginRight: 8, flexShrink: 0 }}>{label}</span>
  );
}

function CheckRow({ task, checked, onToggle, skipped }) {
  const off = checked === "skip" || skipped;
  return (
    <div onClick={!off ? onToggle : undefined} style={{
      display: "flex", alignItems: "center", gap: 10, padding: "12px 14px",
      cursor: off ? "default" : "pointer",
      background: off ? "rgba(80,80,80,0.05)" : checked === true ? "rgba(76,175,110,0.07)" : "transparent",
      opacity: off ? 0.4 : 1, borderBottom: `1px solid #2C2C2C`, transition: "all 0.15s",
    }}>
      <div style={{ width: 22, height: 22, borderRadius: 5, flexShrink: 0,
        border: off ? `2px solid ${DIM}` : checked === true ? `2px solid ${GREEN}` : `2px solid ${DIM}`,
        background: off ? "#333333" : checked === true ? GREEN : "transparent",
        display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.15s" }}>
        {off && <span style={{ color: DIM, fontSize: 12 }}>—</span>}
        {!off && checked === true && <span style={{ color: "#000", fontSize: 14, fontWeight: 900 }}>✓</span>}
      </div>
      <Tag label={task.tag || task.freq} color={task.color} />
      <span style={{ flex: 1, fontSize: 16, color: off ? DIM : checked === true ? DIM : WHITE,
        textDecoration: !off && checked === true ? "line-through" : "none", transition: "all 0.15s" }}>
        {task.label}
      </span>
      <span style={{ fontSize: 14, color: DIM, flexShrink: 0 }}>{task.time}</span>
    </div>
  );
}

function Bar({ value, max, color }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
      <div style={{ flex: 1, height: 8, background: "#2C2C2C", borderRadius: 4, overflow: "hidden" }}>
        <div style={{ width: `${pct}%`, height: "100%", background: pct === 100 ? GREEN : color,
          borderRadius: 4, transition: "width 0.3s" }} />
      </div>
      <span style={{ fontSize: 13, color: DIM, minWidth: 32, textAlign: "right" }}>{pct}%</span>
    </div>
  );
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function ConductorScheduler() {
  const { user } = useAuthState();
  const [syncStatus, setSyncStatus] = useState("local");

  const todayJS  = new Date().getDay();
  const todayIdx = todayJS === 0 ? 5 : Math.min(todayJS - 1, 5);

  const [activeDay,   setActiveDay]   = useState(DAYS[todayIdx]);
  const [tab,         setTab]         = useState("checklist");
  const [weekKey,     setWeekKey]     = useState(getWeekKey());
  const [isReformat,  setIsReformat]  = useState(true);
  const [notes,       setNotes]       = useState("");
  const [menu,        setMenu]        = useState(DEFAULT_MENU);

  const [checks, setChecks] = useState(() => {
    const s = _lsLoad();
    return s && s.weekKey === getWeekKey() ? s.checks : initWeek(true);
  });
  const [history, setHistory] = useState(() => {
    const s = _lsLoad(); return s?.history || {};
  });

  // ── Dual-write on every state change ────────────────────────────────────────
  useEffect(() => {
    const data = { checks, history, notes, menu, isReformat };
    setSyncStatus(user ? "syncing" : "local");
    saveSchedulerWeek(user?.uid ?? null, weekKey, data)
      .then(() => { if (user) setSyncStatus("live"); })
      .catch(() => { if (user) setSyncStatus("error"); });
  }, [checks, history, weekKey, notes, menu, isReformat]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Merge from Firestore when user signs in ──────────────────────────────────
  useEffect(() => {
    if (!user) { setSyncStatus("local"); return; }
    setSyncStatus("syncing");
    loadSchedulerWeek(user.uid, weekKey).then(data => {
      if (!data) { setSyncStatus("live"); return; }
      if (data.checks)              setChecks(data.checks);
      if (data.history)             setHistory(data.history);
      if (data.notes !== undefined) setNotes(data.notes);
      if (data.menu)                setMenu(data.menu);
      if (data.isReformat !== undefined) setIsReformat(data.isReformat);
      setSyncStatus("live");
    }).catch(() => setSyncStatus("error"));
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Actions ──────────────────────────────────────────────────────────────────
  const toggle    = (d, id) => {
    if (checks[d]?.[id] === "skip") return;
    setChecks(p => ({ ...p, [d]: { ...p[d], [id]: !p[d][id] } }));
  };
  const togWeekly = id => setChecks(p => ({ ...p, ["weekly_" + id]: !p["weekly_" + id] }));
  const editMenu  = (d, k, v) => setMenu(p => ({ ...p, [d]: { ...p[d], [k]: v } }));

  function archive() {
    let tot = 0, don = 0;
    DAYS.forEach(d => DAILY_TASKS.forEach(t => {
      const v = checks[d]?.[t.id]; if (v !== "skip") { tot++; if (v) don++; }
    }));
    WEEKLY_TASKS.forEach(t => { tot++; if (checks["weekly_" + t.id]) don++; });
    setHistory(p => ({ ...p, [weekKey]: { done: don, total: tot, pct: Math.round(don / tot * 100) } }));
    setChecks(initWeek(false));
    setWeekKey(getWeekKey());
    setIsReformat(false);
    setNotes("");
  }

  // ── Derived stats ─────────────────────────────────────────────────────────
  const countDay = d => ({
    done:   DAILY_TASKS.filter(t => checks[d]?.[t.id] === true).length,
    active: DAILY_TASKS.filter(t => checks[d]?.[t.id] !== "skip").length,
  });
  const { done: dDone, active: dActive } = countDay(activeDay);
  const wklyDone = WEEKLY_TASKS.filter(t => checks["weekly_" + t.id]).length;
  let wTot = 0, wDon = 0;
  DAYS.forEach(d => { const c = countDay(d); wTot += c.active; wDon += c.done; });
  wTot += WEEKLY_TASKS.length; wDon += wklyDone;

  const offDay = isReformat && REFORMAT_DAYS.includes(activeDay);

  const T = (id, lbl) => (
    <button key={id} onClick={() => setTab(id)} style={{
      padding: "10px 16px", fontSize: 14, fontWeight: 700, letterSpacing: 1,
      cursor: "pointer", border: "none", background: "transparent", fontFamily: "inherit",
      color: tab === id ? GOLD : DIM,
      borderBottom: tab === id ? `2px solid ${GOLD}` : "2px solid transparent",
    }}>{lbl}</button>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: BG, minHeight: "100vh", fontFamily: "'Courier New', monospace", color: WHITE }}>

      {/* ── HEADER ── */}
      <div style={{ background: CARD, borderBottom: `3px solid ${GOLD}`, padding: "16px 22px",
        display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 26, fontWeight: 900, color: GOLD, letterSpacing: 3 }}>CONDUCTOR</div>
          <div style={{ fontSize: 12, color: DIM, letterSpacing: 2, marginTop: 2 }}>
            PLUMBMONKEY MEDIA — PRODUCTION TRACKER
          </div>
        </div>
        <div style={{ textAlign: "right", display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 5 }}>
          {isReformat && (
            <div style={{ fontSize: 12, color: ORANGE, fontWeight: 700,
              border: `1px solid ${ORANGE}`, padding: "3px 10px", borderRadius: 4 }}>
              ⚠ HDD REFORMAT WEEK — MON/TUE OFFLINE
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SyncBadge status={syncStatus} />
            <span style={{ fontSize: 12, color: DIM }}>{weekKey}</span>
          </div>
          <div style={{ fontSize: 15, color: GREEN, fontWeight: 700 }}>{wDon}/{wTot} tasks</div>
          <AuthButton user={user} style={{ marginTop: 2 }} />
        </div>
      </div>

      {/* ── WEEK PROGRESS BAR ── */}
      <div style={{ padding: "12px 22px", background: CARD2, borderBottom: "1px solid #2C2C2C" }}>
        <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
          <span style={{ fontSize: 12, color: DIM, letterSpacing: 1 }}>WEEK PROGRESS</span>
          <span style={{ fontSize: 12, color: GOLD }}>{Math.round(wDon / wTot * 100)}%</span>
        </div>
        <Bar value={wDon} max={wTot} color={GOLD} />
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", borderBottom: "1px solid #1E1E1E", background: CARD, paddingLeft: 8 }}>
        {T("checklist", "DAILY")}{T("weekly", "WEEKLY")}{T("meals", "MEALS")}
        {T("videos", "VIDEOS")}{T("stats", "STATS")}
        <button onClick={archive} style={{ marginLeft: "auto", marginRight: 12, padding: "8px 14px",
          fontSize: 12, fontWeight: 700, background: "transparent", border: `1px solid ${DIM}`,
          color: DIM, borderRadius: 4, cursor: "pointer", fontFamily: "inherit", letterSpacing: 1 }}>
          ARCHIVE + NEW WEEK
        </button>
      </div>

      {/* ── DAILY ── */}
      {tab === "checklist" && (
        <div style={{ padding: "14px 18px" }}>
          <div style={{ display: "flex", gap: 5, marginBottom: 14 }}>
            {DAYS.map(d => {
              const { done, active } = countDay(d);
              const isAct = d === activeDay;
              const isOff = isReformat && REFORMAT_DAYS.includes(d);
              return (
                <button key={d} onClick={() => setActiveDay(d)} style={{
                  flex: 1, padding: "9px 3px", borderRadius: 6, cursor: "pointer", fontFamily: "inherit",
                  background: isAct ? GOLD : isOff ? "#150E00" : CARD2,
                  border: isAct ? `1px solid ${GOLD}` : isOff ? `1px solid ${ORANGE}55` : "1px solid #333333",
                  color: isAct ? "#000" : isOff ? ORANGE : done === active && active > 0 ? GREEN : WHITE,
                  fontWeight: 700, fontSize: 13, letterSpacing: 1,
                }}>
                  <div>{d}</div>
                  <div style={{ fontSize: 12, marginTop: 3, color: isAct ? "#222" : isOff ? ORANGE : DIM }}>
                    {isOff ? "OFF" : `${done}/${active}`}
                  </div>
                </button>
              );
            })}
          </div>

          {offDay ? (
            <div style={{ background: "#120C00", border: `1px solid ${ORANGE}55`,
              borderRadius: 8, padding: "16px 18px", marginBottom: 14 }}>
              <div style={{ fontSize: 18, color: ORANGE, fontWeight: 700, marginBottom: 8 }}>
                🔧 HDD REFORMAT DAY — {activeDay}
              </div>
              <div style={{ fontSize: 15, color: DIM, lineHeight: 1.8 }}>
                Blocked for fresh install sprint. Tasks skipped, not counted against stats.<br />
                Suggested use of this time:
              </div>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 10 }}>
                {["Back up all files", "Document project states", "Guitar repair", "Rest & recharge",
                  "Sketch ideas on paper", "Plan the sprint"].map(s => (
                  <span key={s} style={{ fontSize: 13, color: ORANGE,
                    border: `1px solid ${ORANGE}55`, padding: "4px 11px", borderRadius: 4 }}>{s}</span>
                ))}
              </div>
            </div>
          ) : (
            <div style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: DIM }}>{activeDay} PROGRESS</span>
                <span style={{ fontSize: 12, color: TEAL }}>{dDone}/{dActive}</span>
              </div>
              <Bar value={dDone} max={dActive} color={TEAL} />
            </div>
          )}

          <div style={{ background: CARD, borderRadius: 8, overflow: "hidden",
            border: "1px solid #2C2C2C", marginBottom: 12 }}>
            {DAILY_TASKS.map(t => (
              <CheckRow key={t.id} task={t} checked={checks[activeDay]?.[t.id]}
                skipped={offDay} onToggle={() => toggle(activeDay, t.id)} />
            ))}
          </div>

          {!offDay && MEAL_SCHEDULE[activeDay] && (
            <div style={{ background: "#110A00", border: `1px solid ${ORANGE}44`,
              borderRadius: 8, padding: "14px 18px", marginBottom: 12 }}>
              <div style={{ fontSize: 12, color: ORANGE, fontWeight: 700, letterSpacing: 1, marginBottom: 9 }}>
                🍽 MEAL REMINDERS — {MEAL_SCHEDULE[activeDay].meals}× TODAY
              </div>
              {MEAL_SCHEDULE[activeDay].times.map((t, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10,
                  marginBottom: i < MEAL_SCHEDULE[activeDay].times.length - 1 ? 6 : 0 }}>
                  <span style={{ fontSize: 14, color: ORANGE, minWidth: 72 }}>{t}</span>
                  <span style={{ fontSize: 16, color: DIM }}>
                    {menu[activeDay]?.[`meal${i + 1}`] || "—"}
                  </span>
                </div>
              ))}
            </div>
          )}

          <div style={{ fontSize: 12, color: DIM, letterSpacing: 1, marginBottom: 7 }}>DAILY NOTES</div>
          <textarea value={notes} onChange={e => setNotes(e.target.value)}
            placeholder="Blockers, wins, what to adjust tomorrow..."
            style={{ width: "100%", minHeight: 80, background: CARD2, border: "1px solid #333333",
              borderRadius: 6, color: WHITE, fontFamily: "inherit", fontSize: 15,
              padding: 12, resize: "vertical", boxSizing: "border-box" }} />
        </div>
      )}

      {/* ── WEEKLY ── */}
      {tab === "weekly" && (
        <div style={{ padding: "14px 18px" }}>
          <div style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
              <span style={{ fontSize: 12, color: DIM }}>WEEKLY TASKS</span>
              <span style={{ fontSize: 12, color: GREEN }}>{wklyDone}/{WEEKLY_TASKS.length}</span>
            </div>
            <Bar value={wklyDone} max={WEEKLY_TASKS.length} color={GREEN} />
          </div>
          <div style={{ background: CARD, borderRadius: 8, overflow: "hidden",
            border: "1px solid #2C2C2C", marginBottom: 16 }}>
            {WEEKLY_TASKS.map(t => (
              <CheckRow key={t.id} task={{ ...t, tag: t.freq }}
                checked={checks["weekly_" + t.id]} onToggle={() => togWeekly(t.id)} />
            ))}
          </div>
          <div style={{ background: "#0D0800", border: `1px solid ${ORANGE}44`,
            borderRadius: 8, padding: "14px 18px", marginBottom: 16 }}>
            <div style={{ fontSize: 13, color: ORANGE, fontWeight: 700, marginBottom: 6 }}>🎸 GUITAR REPAIR</div>
            <div style={{ fontSize: 15, color: DIM, lineHeight: 1.7 }}>
              One session per week. Can fold into the Drawing/3D evening or stand alone.<br />
              Log what was done in Daily Notes to build a repair history over time.
            </div>
          </div>
          <div style={{ fontSize: 12, color: DIM, letterSpacing: 1, marginBottom: 9 }}>ACTIVE COURSES</div>
          <div style={{ background: CARD, borderRadius: 8, overflow: "hidden", border: "1px solid #2C2C2C" }}>
            {[
              { label: "Blender Architecture Course",        pct: 32,   color: GOLD },
              { label: "Blender Grease Pencil Course",       pct: 0,    color: TEAL },
              { label: "Blender Simulations/Physics Course", pct: 5,    color: PURPLE },
              { label: "FreeCodeCamp JavaScript",            pct: null, color: TEAL },
              { label: "Chinese Language",                   pct: null, color: TEAL },
            ].map((c, i) => (
              <div key={i} style={{ padding: "12px 16px", borderBottom: "1px solid #2C2C2C",
                display: "flex", alignItems: "center", gap: 12 }}>
                <span style={{ flex: 1, fontSize: 15, color: WHITE }}>{c.label}</span>
                {c.pct !== null
                  ? <div style={{ width: 110 }}>
                      <div style={{ fontSize: 12, color: c.color, textAlign: "right", marginBottom: 3 }}>{c.pct}%</div>
                      <Bar value={c.pct} max={100} color={c.color} />
                    </div>
                  : <span style={{ fontSize: 13, color: DIM }}>Ongoing</span>
                }
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── MEALS ── */}
      {tab === "meals" && (
        <div style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 12, color: DIM, letterSpacing: 1, marginBottom: 6 }}>WEEKLY MEAL PLAN</div>
          <div style={{ fontSize: 14, color: DIM, marginBottom: 14, lineHeight: 1.7 }}>
            3-meal days: Mon / Wed / Fri &nbsp;·&nbsp; 2-meal days: Tue / Thu / Sat<br />
            Edit any field. Resets when you archive the week.
          </div>
          {DAYS.map(d => {
            const sched = MEAL_SCHEDULE[d];
            const isOff = isReformat && REFORMAT_DAYS.includes(d);
            return (
              <div key={d} style={{ marginBottom: 14, opacity: isOff ? 0.3 : 1 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span style={{ fontSize: 15, fontWeight: 700, color: GOLD, minWidth: 36 }}>{d}</span>
                  <span style={{ fontSize: 12, color: isOff ? ORANGE : DIM }}>
                    {isOff ? "OFFLINE" : `${sched.meals} meals`}
                  </span>
                  <div style={{ flex: 1, height: 1, background: "#1E1E1E" }} />
                </div>
                {!isOff && sched.times.map((time, i) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 5 }}>
                    <span style={{ fontSize: 14, color: ORANGE, minWidth: 72 }}>{time}</span>
                    <input value={menu[d]?.[`meal${i + 1}`] || ""}
                      onChange={e => editMenu(d, `meal${i + 1}`, e.target.value)}
                      style={{ flex: 1, background: CARD2, border: "1px solid #333333", borderRadius: 4,
                        color: WHITE, fontSize: 15, padding: "6px 10px", fontFamily: "inherit" }} />
                  </div>
                ))}
              </div>
            );
          })}
          <div style={{ background: "#090D09", border: `1px solid ${GREEN}33`,
            borderRadius: 8, padding: "14px 18px" }}>
            <div style={{ fontSize: 13, color: GREEN, fontWeight: 700, marginBottom: 6 }}>🛍 PREP NOTES</div>
            <div style={{ fontSize: 15, color: DIM, lineHeight: 1.7 }}>
              Plan the menu on Friday or Saturday (logged under Weekly Tasks).<br />
              Batch cook 1–2× per week. Repeat meals are fine — reduce decision fatigue.<br />
              Keep staples stocked: eggs, rice, oats, a protein, frozen veg.
            </div>
          </div>
        </div>
      )}

      {/* ── VIDEOS ── */}
      {tab === "videos" && (
        <div style={{ padding: "14px 18px" }}>
          <div style={{ fontSize: 12, color: DIM, letterSpacing: 1, marginBottom: 12 }}>WEEKLY RELEASE CALENDAR</div>
          <div style={{ background: CARD, borderRadius: 8, overflow: "hidden",
            border: "1px solid #2C2C2C", marginBottom: 14 }}>
            {VIDEO_SCHEDULE.map((row, i) => (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 70px",
                padding: "12px 14px", borderBottom: "1px solid #2C2C2C", gap: 10,
                background: i % 2 === 0 ? CARD : CARD2 }}>
                <span style={{ fontSize: 15, fontWeight: 700, color: GOLD }}>{row.day}</span>
                <div>
                  <div style={{ fontSize: 11, color: DIM, marginBottom: 3 }}>VIDEO</div>
                  <div style={{ fontSize: 14, color: row.video === "No upload" ? DIM : WHITE }}>{row.video}</div>
                </div>
                <div>
                  <div style={{ fontSize: 11, color: DIM, marginBottom: 3 }}>SHORT</div>
                  <div style={{ fontSize: 14, color: row.short === "—" ? DIM : TEAL }}>{row.short}</div>
                </div>
                <span style={{ fontSize: 12, color: DIM, textAlign: "right" }}>{row.note}</span>
              </div>
            ))}
          </div>
          <div style={{ padding: 16, background: CARD2, borderRadius: 8, border: "1px solid #333333" }}>
            <div style={{ fontSize: 13, color: GOLD, fontWeight: 700, marginBottom: 6 }}>EDITING WORKFLOW</div>
            <div style={{ fontSize: 15, color: DIM, lineHeight: 1.7 }}>
              All videos: cut → title card → end card. Light edit only.<br />
              Thumbnails in the Drawing/3D session each week.<br />
              Shorts repurposed from previous session video.
            </div>
          </div>
        </div>
      )}

      {/* ── STATS ── */}
      {tab === "stats" && (
        <div style={{ padding: "14px 18px" }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 8, marginBottom: 12 }}>
            {[
              { l: "WEEK",         v: wDon,     t: wTot,                 color: GOLD },
              { l: "DAILY TASKS",  v: DAYS.reduce((a, d) => a + countDay(d).done, 0),
                                    t: DAYS.reduce((a, d) => a + countDay(d).active, 0), color: TEAL },
              { l: "WEEKLY TASKS", v: wklyDone, t: WEEKLY_TASKS.length,  color: GREEN },
            ].map((s, i) => (
              <div key={i} style={{ background: CARD, borderRadius: 8, padding: 16, border: "1px solid #2C2C2C" }}>
                <div style={{ fontSize: 12, color: DIM, marginBottom: 6 }}>{s.l}</div>
                <div style={{ fontSize: 30, fontWeight: 900, color: s.color }}>{s.v}</div>
                <div style={{ fontSize: 12, color: DIM, marginBottom: 7 }}>of {s.t}</div>
                <Bar value={s.v} max={s.t} color={s.color} />
              </div>
            ))}
          </div>

          <div style={{ fontSize: 12, color: DIM, letterSpacing: 1, marginBottom: 8 }}>DAILY BREAKDOWN</div>
          <div style={{ background: CARD, borderRadius: 8, overflow: "hidden",
            border: "1px solid #2C2C2C", marginBottom: 14 }}>
            {DAYS.map((d, i) => {
              const { done, active } = countDay(d);
              const isOff = isReformat && REFORMAT_DAYS.includes(d);
              return (
                <div key={d} style={{ display: "flex", alignItems: "center", gap: 10,
                  padding: "12px 14px", borderBottom: "1px solid #2C2C2C",
                  background: i % 2 === 0 ? CARD : CARD2 }}>
                  <span style={{ width: 36, fontSize: 15, fontWeight: 700, color: isOff ? ORANGE : GOLD }}>{d}</span>
                  {isOff
                    ? <span style={{ flex: 1, fontSize: 13, color: ORANGE }}>REFORMAT — OFFLINE</span>
                    : <>
                        <div style={{ flex: 1 }}>
                          <Bar value={done} max={active} color={done === active && active > 0 ? GREEN : TEAL} />
                        </div>
                        <span style={{ fontSize: 13, color: done === active && active > 0 ? GREEN : DIM,
                          minWidth: 36, textAlign: "right" }}>{done}/{active}</span>
                      </>
                  }
                </div>
              );
            })}
          </div>

          <div style={{ fontSize: 12, color: DIM, letterSpacing: 1, marginBottom: 8 }}>BUILD PATHS</div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6, marginBottom: 14 }}>
            {[
              { l: "PATH 3 — QuickAlign", s: "SPRINT START", c: GREEN },
              { l: "PATH 2 — GRID Mix",   s: "PENDING",      c: DIM },
              { l: "PATH 1 — Conductor",  s: "PENDING",      c: DIM },
            ].map((p, i) => (
              <div key={i} style={{ padding: "12px 16px", borderRadius: 6,
                border: `1px solid ${p.c}44`, background: CARD,
                display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                <span style={{ fontSize: 15, color: WHITE }}>{p.l}</span>
                <span style={{ fontSize: 12, color: p.c, fontWeight: 700 }}>{p.s}</span>
              </div>
            ))}
          </div>

          {Object.keys(history).length > 0 && (
            <>
              <div style={{ fontSize: 12, color: DIM, letterSpacing: 1, marginBottom: 8 }}>ARCHIVED WEEKS</div>
              <div style={{ background: CARD, borderRadius: 8, overflow: "hidden", border: "1px solid #2C2C2C" }}>
                {Object.entries(history).reverse().map(([wk, data]) => (
                  <div key={wk} style={{ display: "flex", alignItems: "center", gap: 10,
                    padding: "12px 14px", borderBottom: "1px solid #2C2C2C" }}>
                    <span style={{ fontSize: 14, color: TEAL, minWidth: 80 }}>{wk}</span>
                    <div style={{ flex: 1 }}><Bar value={data.done} max={data.total} color={GOLD} /></div>
                    <span style={{ fontSize: 14, color: data.pct >= 80 ? GREEN : GOLD,
                      minWidth: 36, textAlign: "right" }}>{data.pct}%</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      )}

      <div style={{ padding: "10px 22px", borderTop: "1px solid #2C2C2C", marginTop: 8,
        fontSize: 11, color: "#666666", display: "flex", justifyContent: "space-between" }}>
        <span>CONDUCTOR SCHEDULER v2.0 — PLUMBMONKEY MEDIA</span>
        <span>Sunday = REST DAY</span>
      </div>
    </div>
  );
}
