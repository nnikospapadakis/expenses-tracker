import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Tiny zero-dependency JSON data store. Single-user, low volume — the whole
// dataset lives in one file and is kept in memory, persisted on each write.
// No native binaries, so it installs and runs anywhere Node does (incl. cPanel).
//
// To move to a real database later, swap this module for one exposing the same
// `db` collections + `save()` — the routes don't know how it's stored.

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const DATA_FILE = process.env.DATA_FILE
  ? path.resolve(process.env.DATA_FILE)
  : path.resolve(__dirname, "../data/data.json");

const EMPTY = {
  seq: {},
  users: [],
  income: [],
  subscriptions: [],
  expenses: [],
  netWorthSnapshots: [],
};

function load() {
  try {
    const parsed = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    return { ...structuredClone(EMPTY), ...parsed, seq: { ...parsed.seq } };
  } catch {
    return structuredClone(EMPTY);
  }
}

export const db = load();

// One-time migration: older data had no owner. Assign any orphan records to the
// first user so existing data stays visible after the multi-user upgrade.
function migrateOwnership(data) {
  const firstUserId = data.users[0]?.id;
  if (!firstUserId) return false;
  let changed = false;
  for (const coll of ["income", "subscriptions", "expenses", "netWorthSnapshots"]) {
    for (const rec of data[coll]) {
      if (rec.userId == null) {
        rec.userId = firstUserId;
        changed = true;
      }
    }
  }
  return changed;
}
if (migrateOwnership(db)) save();

// Tag any pre-existing (password) account as a "local" provider so the record
// shape is consistent once Google accounts (provider: "google") show up.
function backfillProvider(data) {
  let changed = false;
  for (const u of data.users) {
    if (!u.provider) {
      u.provider = "local";
      changed = true;
    }
  }
  return changed;
}

// Config-driven account linking. Set LINK_ACCOUNTS in the environment to attach
// an email to an existing account, so signing in with that Google email connects
// to your pre-existing data instead of creating a fresh empty account. Format:
//   LINK_ACCOUNTS="you@gmail.com:nikos, partner@gmail.com:maria"
// It only fills a missing email, so it's safe to leave set; remove it after the
// first successful Google sign-in if you prefer.
function applyLinkAccounts(data) {
  const raw = process.env.LINK_ACCOUNTS;
  if (!raw) return false;
  let changed = false;
  for (const pair of raw.split(",")) {
    const [email, username] = pair.split(":").map((s) => (s || "").trim());
    if (!email || !username) continue;
    const user = data.users.find((u) => u.username === username);
    if (user && !user.email) {
      user.email = email.toLowerCase();
      changed = true;
    }
  }
  return changed;
}
// Evaluate both (no short-circuit) so one running doesn't skip the other.
const _providerChanged = backfillProvider(db);
const _linkChanged = applyLinkAccounts(db);
if (_providerChanged || _linkChanged) save();

// Atomic write: temp file + rename, so an interrupted write can't corrupt data.
export function save() {
  fs.mkdirSync(path.dirname(DATA_FILE), { recursive: true });
  const tmp = `${DATA_FILE}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(db, null, 2));
  fs.renameSync(tmp, DATA_FILE);
}

// Auto-incrementing id per collection.
export function nextId(name) {
  db.seq[name] = (db.seq[name] || 0) + 1;
  return db.seq[name];
}

// Find an item by numeric id in a collection array.
export function byId(list, id) {
  return list.find((x) => x.id === Number(id));
}
