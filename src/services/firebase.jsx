/**
 * src/services/firebase.jsx
 * ─────────────────────────────────────────────────────────────────────────────
 * Shared Firebase service for Plumbmonkey Media monorepo.
 * Imported by: conductor_scheduler.jsx, universe_tracker.jsx, energy_coach.jsx
 *
 * Fill in FIREBASE_CONFIG from:
 *   Firebase Console → Project Settings → Web App → SDK config
 * Leave projectId as "" to run every app in LOCAL-ONLY mode (no errors).
 * ─────────────────────────────────────────────────────────────────────────────
 */

import { initializeApp, getApps } from "firebase/app";
import { getAnalytics } from "firebase/analytics";
import {
  getAuth,
  GoogleAuthProvider,
  signInWithPopup,
  signOut as _signOut,
  onAuthStateChanged,
} from "firebase/auth";
import {
  getFirestore,
  doc,
  getDoc,
  setDoc,
} from "firebase/firestore";
import { useState, useEffect } from "react";

// ── Firebase Config ───────────────────────────────────────────────────────────
const FIREBASE_CONFIG = {
  apiKey:            "AIzaSyC1YfUgoyxg5RxI8bCHpKLB2GzIa61mBag",
  authDomain:        "plumbmonkey-second-brain.firebaseapp.com",
  projectId:         "plumbmonkey-second-brain",
  storageBucket:     "plumbmonkey-second-brain.firebasestorage.app",
  messagingSenderId: "986051137315",
  appId:             "1:986051137315:web:664cd39959479ba8fd8696",
  measurementId:     "G-1CPTM6PH39",
};

// ── Initialise (once, idempotent) ─────────────────────────────────────────────
let _auth = null;
let _db   = null;

if (FIREBASE_CONFIG.projectId) {
  try {
    const app = getApps().length ? getApps()[0] : initializeApp(FIREBASE_CONFIG);
    _auth = getAuth(app);
    _db   = getFirestore(app);
    // Analytics only runs in browser environments (not SSR/Node)
    if (typeof window !== "undefined" && FIREBASE_CONFIG.measurementId) {
      getAnalytics(app);
    }
  } catch (e) {
    console.warn("[firebase.jsx] Init failed:", e.message);
  }
}

export const firebaseReady = !!_db;

// ── Auth ──────────────────────────────────────────────────────────────────────

/** Opens the Google OAuth popup. Returns the signed-in User or null. */
export async function signInWithGoogle() {
  if (!_auth) return null;
  try {
    const result = await signInWithPopup(_auth, new GoogleAuthProvider());
    return result.user;
  } catch { return null; }
}

/** Signs the current user out. Fails silently. */
export async function signOut() {
  if (!_auth) return;
  try { await _signOut(_auth); } catch {}
}

/**
 * React hook — returns { user, loading }.
 * user is null when not signed in or Firebase is unavailable.
 */
export function useAuthState() {
  const [user,    setUser]    = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!_auth) { setLoading(false); return; }
    const unsub = onAuthStateChanged(_auth, u => {
      setUser(u ?? null);
      setLoading(false);
    });
    return unsub;
  }, []);

  return { user, loading };
}

// ── SyncBadge ─────────────────────────────────────────────────────────────────
/**
 * status: "live" | "local" | "syncing" | "error"
 * style:  optional additional inline style object
 */
export function SyncBadge({ status = "local", style: extra = {} }) {
  const map = {
    live:    { label: "● FIREBASE LIVE",  color: "#4CAF6E" },
    local:   { label: "● LOCAL ONLY",     color: "#E07B3A" },
    syncing: { label: "◌ SYNCING…",       color: "#2ECFCF" },
    error:   { label: "● FIREBASE ERROR", color: "#CF4C4C" },
  };
  const { label, color } = map[status] ?? map.local;
  return (
    <div style={{
      display: "inline-block",
      fontSize: 9, padding: "3px 10px", borderRadius: 10,
      letterSpacing: 1, border: `1px solid ${color}`, color,
      ...extra,
    }}>
      {label}
    </div>
  );
}

/** Minimal Google sign-in / sign-out button, style-neutral. */
export function AuthButton({ user, style: extra = {} }) {
  const base = {
    fontSize: 9, padding: "3px 10px", borderRadius: 10, letterSpacing: 1,
    border: "1px solid #44445A", color: "#EEEEF8", background: "transparent",
    cursor: "pointer", fontFamily: "'Courier New', monospace",
    ...extra,
  };
  if (user) {
    return (
      <button style={base} onClick={signOut} title={user.email}>
        {user.displayName?.split(" ")[0] ?? "User"} · SIGN OUT
      </button>
    );
  }
  return (
    <button style={{ ...base, color: "#4A9FE8", borderColor: "#4A9FE8" }} onClick={signInWithGoogle}>
      ⟳ SIGN IN WITH GOOGLE
    </button>
  );
}

// ── Internal Firestore helpers ────────────────────────────────────────────────
async function fsGet(segments) {
  if (!_db) return null;
  try {
    const snap = await getDoc(doc(_db, ...segments));
    return snap.exists() ? snap.data() : null;
  } catch { return null; }
}

async function fsSet(segments, data) {
  if (!_db) return;
  try { await setDoc(doc(_db, ...segments), data, { merge: true }); } catch {}
}

// ── Conductor Scheduler ───────────────────────────────────────────────────────
// localStorage format (backward-compatible with conductor_scheduler_v2):
//   { weekKey, checks, history, notes, menu, isReformatWeek }
const LS_SCHED = "conductor_scheduler_v2";

function lsGetSched() {
  try { const r = localStorage.getItem(LS_SCHED); return r ? JSON.parse(r) : null; } catch { return null; }
}
function lsSetSched(data) {
  try { localStorage.setItem(LS_SCHED, JSON.stringify(data)); } catch {}
}

/**
 * Dual-write: localStorage immediately, Firestore async (fire-and-forget).
 * data = { checks, history, notes, menu, isReformatWeek }
 */
export async function saveSchedulerWeek(uid, weekKey, data) {
  lsSetSched({ weekKey, ...data });
  if (!uid) return;
  await fsSet(["users", uid, "scheduler", weekKey], data);
}

/**
 * Load the given weekKey. Firestore wins on conflict.
 * Returns { checks, history, notes, menu, isReformatWeek } or null.
 */
export async function loadSchedulerWeek(uid, weekKey) {
  const local = lsGetSched();
  const localWeek = (local?.weekKey === weekKey) ? local : null;
  if (!uid) return localWeek;

  const remote = await fsGet(["users", uid, "scheduler", weekKey]);
  if (remote) {
    lsSetSched({ weekKey, ...remote }); // keep local cache warm
    return remote;
  }
  return localWeek;
}

// ── Universe Tracker ──────────────────────────────────────────────────────────
// localStorage format (backward-compatible with pm_universe_v1):
//   { progress, weekSnaps, monthNotes }
const LS_UNIVERSE = "pm_universe_v1";

function lsGetUniverse() {
  try { const r = localStorage.getItem(LS_UNIVERSE); return r ? JSON.parse(r) : null; } catch { return null; }
}
function lsSetUniverse(data) {
  try { localStorage.setItem(LS_UNIVERSE, JSON.stringify(data)); } catch {}
}

/**
 * data = { progress, weekSnaps, monthNotes }
 * Dual-write: localStorage immediately, Firestore async.
 */
export async function saveUniverseProgress(uid, data) {
  lsSetUniverse(data);
  if (!uid) return;
  await fsSet(["users", uid, "universe", "progress"], data);
}

/**
 * Returns { progress, weekSnaps, monthNotes } or null.
 * Firestore wins on conflict; result written back to localStorage.
 */
export async function loadUniverseProgress(uid) {
  const local = lsGetUniverse();
  if (!uid) return local;

  const remote = await fsGet(["users", uid, "universe", "progress"]);
  if (remote) {
    lsSetUniverse(remote);
    return remote;
  }
  return local;
}

/**
 * Saves a point-in-time snapshot of milestone percentages for a given weekKey.
 * Merges into the existing universe/progress document.
 */
export async function snapshotWeek(uid, weekKey, progressSnapshot) {
  const local  = lsGetUniverse() ?? {};
  const merged = { ...local, weekSnaps: { ...(local.weekSnaps ?? {}), [weekKey]: progressSnapshot } };
  lsSetUniverse(merged);
  if (!uid) return;
  await fsSet(
    ["users", uid, "universe", "progress"],
    { weekSnaps: { [weekKey]: progressSnapshot } },
  );
}

// ── Energy Coach ──────────────────────────────────────────────────────────────
// localStorage format: one key per date — "pm_energy_YYYY-MM-DD"
const LS_ENERGY_PFX = "pm_energy_";

function lsGetEnergy(dateKey) {
  try { const r = localStorage.getItem(LS_ENERGY_PFX + dateKey); return r ? JSON.parse(r) : null; } catch { return null; }
}
function lsSetEnergy(dateKey, data) {
  try { localStorage.setItem(LS_ENERGY_PFX + dateKey, JSON.stringify(data)); } catch {}
}

/**
 * data = whatever EnergyCoach writes (energy, sleep, mood, exercise, notes…)
 * Dual-write: localStorage immediately, Firestore async.
 */
export async function saveEnergyDay(uid, dateKey, data) {
  lsSetEnergy(dateKey, data);
  if (!uid) return;
  await fsSet(["users", uid, "energy", dateKey], data);
}

/**
 * Returns the day's data object or null.
 * Firestore wins; result written back to localStorage.
 */
export async function loadEnergyDay(uid, dateKey) {
  const local = lsGetEnergy(dateKey);
  if (!uid) return local;

  const remote = await fsGet(["users", uid, "energy", dateKey]);
  if (remote) {
    lsSetEnergy(dateKey, remote);
    return remote;
  }
  return local;
}
