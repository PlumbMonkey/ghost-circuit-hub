/**
 * src/energy_coach.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * EnergyCoach — daily energy / habit tracking for Plumbmonkey Media.
 * Target: coach.plumbmonkey.online
 *
 * Data shape per day (key = YYYY-MM-DD):
 *   { energy, sleep, mood, exercise, water, notes, savedAt }
 *   energy   0–10  overall energy level
 *   sleep    0–10  sleep quality
 *   mood     0–10  mood rating
 *   exercise boolean  did any exercise today?
 *   water    0–8   glasses of water
 *   notes    string free text
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { useState, useEffect } from "react";
import {
  useAuthState,
  saveEnergyDay,
  loadEnergyDay,
  SyncBadge,
  AuthButton,
} from "./services/firebase";

// ── Palette ───────────────────────────────────────────────────────────────────
const C = {
  bg:     "#080810",
  panel:  "#0E0E1A",
  card:   "#131324",
  card2:  "#1A1A2E",
  border: "#2A2A44",
  white:  "#F4F4FF",
  dim:    "#8C8CB0",
  mid:    "#B0B0D0",
  gold:   "#E8C060",
  teal:   "#2ECFCF",
  green:  "#4CAF6E",
  orange: "#E07B3A",
  red:    "#CF4C4C",
  blue:   "#4A9FE8",
  purple: "#9A7AEE",
};

const DAYS_BACK = 14; // how many days to show in history

// ── Helpers ───────────────────────────────────────────────────────────────────
function todayKey() {
  return new Date().toISOString().slice(0, 10);
}

function recentDays(n) {
  const days = [];
  for (let i = 0; i < n; i++) {
    const d = new Date();
    d.setDate(d.getDate() - i);
    days.push(d.toISOString().slice(0, 10));
  }
  return days;
}

function colorForScore(v) {
  if (v >= 8) return C.green;
  if (v >= 5) return C.teal;
  if (v >= 3) return C.orange;
  return C.red;
}

// ── Slider ────────────────────────────────────────────────────────────────────
function ScoreSlider({ label, value, onChange, color }) {
  return (
    <div style={{ marginBottom: 12 }}>
      <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 4 }}>
        <span style={{ fontSize: 13, color: C.dim, letterSpacing: 1 }}>{label}</span>
        <span style={{ fontSize: 16, fontWeight: 900, color, minWidth: 24, textAlign: "right" }}>{value}</span>
      </div>
      <input type="range" min={0} max={10} value={value}
        onChange={e => onChange(Number(e.target.value))}
        style={{ width: "100%", accentColor: color, cursor: "pointer" }} />
      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, color: C.dim, marginTop: 2 }}>
        <span>0</span><span>5</span><span>10</span>
      </div>
    </div>
  );
}

// ── MiniBar ───────────────────────────────────────────────────────────────────
function MiniBar({ value, max = 10, color }) {
  const pct = max === 0 ? 0 : Math.round((value / max) * 100);
  return (
    <div style={{ height: 4, background: C.border, borderRadius: 2, overflow: "hidden", flex: 1 }}>
      <div style={{ width: `${pct}%`, height: "100%", background: color, borderRadius: 2 }} />
    </div>
  );
}

// ── SparkDots ─────────────────────────────────────────────────────────────────
function SparkDots({ values, color }) {
  const max = 10;
  return (
    <svg width={values.length * 12} height={28} style={{ overflow: "visible" }}>
      {values.map((v, i) => {
        const x = i * 12 + 4;
        const y = 24 - Math.round((v / max) * 20);
        return <circle key={i} cx={x} cy={y} r={i === values.length - 1 ? 4 : 2.5}
          fill={i === values.length - 1 ? color : C.border} stroke={color}
          strokeWidth={i === values.length - 1 ? 1.5 : 0} />;
      })}
      {values.length > 1 && (
        <polyline
          points={values.map((v, i) => `${i * 12 + 4},${24 - Math.round((v / max) * 20)}`).join(" ")}
          fill="none" stroke={color} strokeWidth={1} opacity={0.4} />
      )}
    </svg>
  );
}

// ── Default day state ─────────────────────────────────────────────────────────
function emptyDay() {
  return { energy: 5, sleep: 5, mood: 5, exercise: false, water: 4, notes: "" };
}

// ── Main Component ────────────────────────────────────────────────────────────
export default function EnergyCoach() {
  const { user } = useAuthState();
  const [syncStatus, setSyncStatus] = useState("local");
  const [tab,        setTab]        = useState("today");
  const [dateKey,    setDateKey]    = useState(todayKey());

  // Today's entry
  const [energy,   setEnergy]   = useState(5);
  const [sleep,    setSleep]    = useState(5);
  const [mood,     setMood]     = useState(5);
  const [exercise, setExercise] = useState(false);
  const [water,    setWater]    = useState(4);
  const [notes,    setNotes]    = useState("");

  // History: { [dateKey]: { energy, sleep, mood, exercise, water, notes } }
  const [history, setHistory] = useState({});

  // ── Load today from Firestore/localStorage when date or user changes ──────
  useEffect(() => {
    setSyncStatus(user ? "syncing" : "local");
    loadEnergyDay(user?.uid ?? null, dateKey).then(data => {
      if (data) {
        setEnergy(data.energy   ?? 5);
        setSleep(data.sleep     ?? 5);
        setMood(data.mood       ?? 5);
        setExercise(data.exercise ?? false);
        setWater(data.water     ?? 4);
        setNotes(data.notes     ?? "");
      } else {
        const d = emptyDay();
        setEnergy(d.energy); setSleep(d.sleep); setMood(d.mood);
        setExercise(d.exercise); setWater(d.water); setNotes(d.notes);
      }
      setSyncStatus(user ? "live" : "local");
    }).catch(() => setSyncStatus("error"));
  }, [dateKey, user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Load recent history ───────────────────────────────────────────────────
  useEffect(() => {
    const days = recentDays(DAYS_BACK);
    const loaded = {};
    Promise.all(
      days.map(dk =>
        loadEnergyDay(user?.uid ?? null, dk).then(data => {
          if (data) loaded[dk] = data;
        }).catch(() => {})
      )
    ).then(() => setHistory(loaded));
  }, [user?.uid]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Auto-save 800 ms after any slider/field change ────────────────────────
  useEffect(() => {
    const data = { energy, sleep, mood, exercise, water, notes, savedAt: new Date().toISOString() };
    const timer = setTimeout(() => {
      setSyncStatus(user ? "syncing" : "local");
      saveEnergyDay(user?.uid ?? null, dateKey, data)
        .then(() => {
          setSyncStatus(user ? "live" : "local");
          setHistory(h => ({ ...h, [dateKey]: data }));
        })
        .catch(() => setSyncStatus("error"));
    }, 800);
    return () => clearTimeout(timer);
  }, [energy, sleep, mood, exercise, water, notes]); // eslint-disable-line react-hooks/exhaustive-deps

  // ── Derived ──────────────────────────────────────────────────────────────
  const avgOf = key => {
    const vals = Object.values(history).map(d => d[key] ?? 0).filter(v => typeof v === "number");
    return vals.length ? Math.round(vals.reduce((a, b) => a + b, 0) / vals.length * 10) / 10 : 0;
  };
  const exerciseDays = Object.values(history).filter(d => d.exercise).length;
  const recentKeys   = recentDays(DAYS_BACK).reverse(); // oldest first

  const TAB = (id, lbl) => (
    <button key={id} onClick={() => setTab(id)} style={{
      padding: "8px 14px", fontSize: 13, fontWeight: 700, letterSpacing: 1,
      cursor: "pointer", border: "none", background: "transparent", fontFamily: "inherit",
      color: tab === id ? C.gold : C.dim,
      borderBottom: tab === id ? `2px solid ${C.gold}` : "2px solid transparent",
    }}>{lbl}</button>
  );

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div style={{ background: C.bg, minHeight: "100vh",
      fontFamily: "'Courier New', monospace", color: C.white }}>

      {/* ── HEADER ── */}
      <div style={{ background: C.panel, borderBottom: `3px solid ${C.teal}`,
        padding: "14px 20px", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div>
          <div style={{ fontSize: 14, color: C.dim, letterSpacing: 3, marginBottom: 2 }}>PLUMBMONKEY MEDIA</div>
          <div style={{ fontSize: 22, fontWeight: 900, color: C.teal, letterSpacing: 2 }}>ENERGY COACH</div>
          <div style={{ fontSize: 14, color: C.mid, letterSpacing: 2 }}>DAILY HABIT + ENERGY TRACKER</div>
        </div>
        <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 6 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
            <SyncBadge status={syncStatus} />
          </div>
          <div style={{ fontSize: 14, color: C.dim }}>{dateKey}</div>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ textAlign: "center" }}>
              <div style={{ fontSize: 28, fontWeight: 900, color: colorForScore(energy), lineHeight: 1 }}>{energy}</div>
              <div style={{ fontSize: 7, color: C.dim, letterSpacing: 1 }}>ENERGY</div>
            </div>
          </div>
          <AuthButton user={user} style={{ marginTop: 2 }} />
        </div>
      </div>

      {/* ── TABS ── */}
      <div style={{ display: "flex", borderBottom: `1px solid ${C.border}`, background: C.panel, paddingLeft: 8 }}>
        {TAB("today",   "TODAY")}
        {TAB("history", "HISTORY")}
        {TAB("trends",  "TRENDS")}
      </div>

      {/* ══ TODAY ══════════════════════════════════════════════════════════ */}
      {tab === "today" && (
        <div style={{ padding: "16px 20px" }}>

          {/* Date picker */}
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <span style={{ fontSize: 14, color: C.dim, letterSpacing: 2 }}>DATE</span>
            <input type="date" value={dateKey} onChange={e => setDateKey(e.target.value)}
              style={{ background: C.card2, border: `1px solid ${C.border}`, borderRadius: 4,
                color: C.white, fontFamily: "inherit", fontSize: 13, padding: "4px 8px" }} />
            <button onClick={() => setDateKey(todayKey())}
              style={{ fontSize: 14, padding: "4px 10px", borderRadius: 4, cursor: "pointer",
                background: "transparent", border: `1px solid ${C.teal}`, color: C.teal,
                fontFamily: "inherit", letterSpacing: 1 }}>
              TODAY
            </button>
          </div>

          {/* Sliders */}
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12, marginBottom: 12 }}>
            <div style={{ background: C.card, borderRadius: 10, padding: "14px 16px",
              border: `1px solid ${C.border}` }}>
              <ScoreSlider label="ENERGY LEVEL"  value={energy}  onChange={setEnergy}  color={colorForScore(energy)} />
              <ScoreSlider label="SLEEP QUALITY" value={sleep}   onChange={setSleep}   color={colorForScore(sleep)} />
              <ScoreSlider label="MOOD"          value={mood}    onChange={setMood}    color={colorForScore(mood)} />
            </div>

            <div style={{ background: C.card, borderRadius: 10, padding: "14px 16px",
              border: `1px solid ${C.border}` }}>
              {/* Exercise toggle */}
              <div style={{ marginBottom: 16 }}>
                <div style={{ fontSize: 13, color: C.dim, letterSpacing: 1, marginBottom: 8 }}>EXERCISE TODAY</div>
                <button onClick={() => setExercise(p => !p)} style={{
                  width: "100%", padding: "12px", borderRadius: 8, cursor: "pointer",
                  background: exercise ? `${C.green}22` : C.card2,
                  border: `2px solid ${exercise ? C.green : C.border}`,
                  color: exercise ? C.green : C.dim,
                  fontSize: 14, fontWeight: 900, fontFamily: "inherit", letterSpacing: 2,
                  transition: "all 0.2s",
                }}>
                  {exercise ? "✓ DONE" : "— NOT YET"}
                </button>
              </div>

              {/* Water intake */}
              <div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                  <span style={{ fontSize: 13, color: C.dim, letterSpacing: 1 }}>WATER GLASSES</span>
                  <span style={{ fontSize: 16, fontWeight: 900, color: C.blue }}>{water}</span>
                </div>
                <div style={{ display: "flex", gap: 4 }}>
                  {Array.from({ length: 8 }, (_, i) => (
                    <button key={i} onClick={() => setWater(i + 1)} style={{
                      flex: 1, aspectRatio: "1", borderRadius: 4, cursor: "pointer",
                      background: i < water ? `${C.blue}44` : C.card2,
                      border: `1px solid ${i < water ? C.blue : C.border}`,
                      color: i < water ? C.blue : C.dim, fontSize: 14, fontFamily: "inherit",
                    }}>💧</button>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div style={{ background: C.card, borderRadius: 10, padding: "14px 16px",
            border: `1px solid ${C.border}`, marginBottom: 12 }}>
            <div style={{ fontSize: 14, color: C.dim, letterSpacing: 2, marginBottom: 8 }}>NOTES</div>
            <textarea value={notes} onChange={e => setNotes(e.target.value)}
              placeholder="What's affecting your energy today? Wins, blockers, reflections..."
              style={{ width: "100%", minHeight: 80, background: C.card2,
                border: `1px solid ${C.border}`, borderRadius: 6, color: C.white,
                fontFamily: "inherit", fontSize: 13, padding: "8px 10px",
                resize: "vertical", boxSizing: "border-box" }} />
          </div>

          {/* Summary pills */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 8 }}>
            {[
              { label: "ENERGY", val: energy,   color: colorForScore(energy) },
              { label: "SLEEP",  val: sleep,    color: colorForScore(sleep)  },
              { label: "MOOD",   val: mood,     color: colorForScore(mood)   },
              { label: "WATER",  val: `${water}/8`, color: C.blue },
            ].map(s => (
              <div key={s.label} style={{ background: C.card2, borderRadius: 8,
                padding: "10px 12px", textAlign: "center", border: `1px solid ${s.color}33` }}>
                <div style={{ fontSize: 13, color: C.dim, letterSpacing: 1 }}>{s.label}</div>
                <div style={{ fontSize: 22, fontWeight: 900, color: s.color, lineHeight: 1.2 }}>{s.val}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ══ HISTORY ═══════════════════════════════════════════════════════ */}
      {tab === "history" && (
        <div style={{ padding: "16px 20px" }}>
          <div style={{ fontSize: 14, color: C.dim, letterSpacing: 2, marginBottom: 12 }}>
            LAST {DAYS_BACK} DAYS
          </div>
          <div style={{ background: C.card, borderRadius: 10, overflow: "hidden",
            border: `1px solid ${C.border}` }}>
            {recentKeys.map((dk, i) => {
              const d = history[dk];
              const isToday = dk === todayKey();
              return (
                <div key={dk} onClick={() => { setDateKey(dk); setTab("today"); }}
                  style={{ display: "grid", gridTemplateColumns: "90px 1fr 1fr 1fr 40px 50px",
                    alignItems: "center", gap: 8,
                    padding: "10px 14px", borderBottom: "1px solid #1A1A2E",
                    background: isToday ? `${C.teal}0A` : i % 2 === 0 ? C.card : C.card2,
                    cursor: "pointer" }}>
                  <span style={{ fontSize: 13, color: isToday ? C.teal : C.mid, fontWeight: isToday ? 700 : 400 }}>
                    {isToday ? "TODAY" : dk.slice(5)}
                  </span>
                  {d ? (
                    <>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 13, color: C.dim, width: 30 }}>NRG</span>
                        <MiniBar value={d.energy} color={colorForScore(d.energy)} />
                        <span style={{ fontSize: 13, color: colorForScore(d.energy), minWidth: 16, textAlign: "right" }}>{d.energy}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 13, color: C.dim, width: 30 }}>ZZZ</span>
                        <MiniBar value={d.sleep} color={colorForScore(d.sleep)} />
                        <span style={{ fontSize: 13, color: colorForScore(d.sleep), minWidth: 16, textAlign: "right" }}>{d.sleep}</span>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 4 }}>
                        <span style={{ fontSize: 13, color: C.dim, width: 30 }}>MOD</span>
                        <MiniBar value={d.mood} color={colorForScore(d.mood)} />
                        <span style={{ fontSize: 13, color: colorForScore(d.mood), minWidth: 16, textAlign: "right" }}>{d.mood}</span>
                      </div>
                      <span style={{ fontSize: 14, textAlign: "center" }}>{d.exercise ? "✓" : "·"}</span>
                      <span style={{ fontSize: 13, color: C.blue, textAlign: "right" }}>{d.water ?? 0}💧</span>
                    </>
                  ) : (
                    <span style={{ fontSize: 13, color: C.dim, gridColumn: "2 / -1" }}>— no entry —</span>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* ══ TRENDS ═══════════════════════════════════════════════════════ */}
      {tab === "trends" && (
        <div style={{ padding: "16px 20px" }}>

          {/* Average cards */}
          <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 10, marginBottom: 16 }}>
            {[
              { label: "AVG ENERGY", val: avgOf("energy"), color: colorForScore(avgOf("energy")) },
              { label: "AVG SLEEP",  val: avgOf("sleep"),  color: colorForScore(avgOf("sleep"))  },
              { label: "AVG MOOD",   val: avgOf("mood"),   color: colorForScore(avgOf("mood"))   },
            ].map(s => (
              <div key={s.label} style={{ background: C.card, borderRadius: 10, padding: 14,
                textAlign: "center", border: `1px solid ${s.color}33` }}>
                <div style={{ fontSize: 13, color: C.dim, letterSpacing: 1, marginBottom: 4 }}>{s.label}</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: s.color }}>{s.val}</div>
                <div style={{ fontSize: 13, color: C.dim }}>last {DAYS_BACK} days</div>
              </div>
            ))}
          </div>

          {/* Exercise streak */}
          <div style={{ background: C.card, borderRadius: 10, padding: "14px 16px",
            border: `1px solid ${C.green}33`, marginBottom: 12 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <div style={{ fontSize: 14, color: C.dim, letterSpacing: 2, marginBottom: 4 }}>EXERCISE DAYS</div>
                <div style={{ fontSize: 28, fontWeight: 900, color: C.green }}>{exerciseDays}</div>
                <div style={{ fontSize: 14, color: C.dim }}>of last {DAYS_BACK} days logged</div>
              </div>
              <div style={{ display: "flex", gap: 4, flexWrap: "wrap", maxWidth: 180, justifyContent: "flex-end" }}>
                {recentKeys.map(dk => {
                  const d = history[dk];
                  return (
                    <div key={dk} style={{
                      width: 16, height: 16, borderRadius: 3,
                      background: d?.exercise ? C.green : C.border,
                    }} title={dk} />
                  );
                })}
              </div>
            </div>
          </div>

          {/* Sparkline charts */}
          {[
            { label: "ENERGY", key: "energy", color: C.teal },
            { label: "SLEEP",  key: "sleep",  color: C.purple },
            { label: "MOOD",   key: "mood",   color: C.gold },
          ].map(({ label, key, color }) => {
            const vals = recentKeys.map(dk => history[dk]?.[key] ?? 0);
            return (
              <div key={key} style={{ background: C.card, borderRadius: 10, padding: "12px 16px",
                border: `1px solid ${C.border}`, marginBottom: 8,
                display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <div>
                  <div style={{ fontSize: 14, color: C.dim, letterSpacing: 2 }}>{label} TREND</div>
                  <div style={{ fontSize: 22, fontWeight: 900, color, marginTop: 2 }}>{avgOf(key)}</div>
                  <div style={{ fontSize: 13, color: C.dim }}>avg</div>
                </div>
                <SparkDots values={vals} color={color} />
              </div>
            );
          })}
        </div>
      )}

      {/* ── FOOTER ── */}
      <div style={{ padding: "10px 20px", borderTop: `1px solid ${C.border}`, marginTop: 8,
        fontSize: 14, color: C.dim, display: "flex", justifyContent: "space-between",
        letterSpacing: 1 }}>
        <span>ENERGY COACH — PLUMBMONKEY MEDIA</span>
        <span>coach.plumbmonkey.online</span>
      </div>
    </div>
  );
}
