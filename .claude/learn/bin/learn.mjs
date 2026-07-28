#!/usr/bin/env node
// Spaced-repetition tracker for the /learn tutor mode. Anki's SM-2, for programming concepts.
// State lives in concepts.jsonl (rewritten on change); history in log.jsonl (append-only).

import { readFileSync, writeFileSync, appendFileSync, existsSync, mkdirSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const DIR = join(dirname(fileURLToPath(import.meta.url)), '..');
const CONCEPTS = join(DIR, 'concepts.jsonl');
const LOG = join(DIR, 'log.jsonl');

const DAY = 86400000;
const EASE_MIN = 1.3, EASE_MAX = 3.0, EASE_START = 2.5;

const now = () => new Date();
const iso = (d) => d.toISOString();
const day = (d) => iso(d).slice(0, 10);
const addDays = (d, n) => new Date(d.getTime() + Math.round(n * DAY));
const daysBetween = (a, b) => Math.floor((new Date(b) - new Date(a)) / DAY);

function load() {
  if (!existsSync(CONCEPTS)) return [];
  return readFileSync(CONCEPTS, 'utf8').split('\n').filter(Boolean).map((l) => JSON.parse(l));
}
function save(list) {
  mkdirSync(DIR, { recursive: true });
  list.sort((a, b) => a.id.localeCompare(b.id));
  writeFileSync(CONCEPTS, list.map((c) => JSON.stringify(c)).join('\n') + '\n');
}
function logEvent(event) {
  mkdirSync(DIR, { recursive: true });
  appendFileSync(LOG, JSON.stringify({ at: iso(now()), ...event }) + '\n');
}

// --- argument parsing -------------------------------------------------------
const argv = process.argv.slice(2);
const cmd = argv[0];
const positional = [];
const flags = {};
for (let i = 1; i < argv.length; i++) {
  if (argv[i].startsWith('--')) flags[argv[i].slice(2)] = argv[++i] ?? true;
  else positional.push(argv[i]);
}

// --- scheduling -------------------------------------------------------------
const GRADES = { again: 0, hard: 1, good: 2, easy: 3 };

function schedule(c, grade) {
  const t = now();
  let { interval = 0, ease = EASE_START, reps = 0, lapses = 0 } = c;

  if (grade === 'again') {
    interval = 0; ease -= 0.20; lapses += 1; reps = 0;
  } else if (grade === 'hard') {
    interval = Math.max(1, interval * 1.2); ease -= 0.15; reps += 1;
  } else if (grade === 'good') {
    interval = reps === 0 ? 1 : reps === 1 ? 3 : interval * ease; reps += 1;
  } else if (grade === 'easy') {
    interval = reps === 0 ? 3 : interval * ease * 1.3; ease += 0.15; reps += 1;
  }

  ease = Math.min(EASE_MAX, Math.max(EASE_MIN, ease));
  interval = Math.min(365, Math.round(interval * 10) / 10);

  const status = grade === 'again' ? 'shaky'
    : lapses > 0 && reps < 3 ? 'shaky'
    : reps >= 3 ? 'known'
    : 'learning';

  return {
    ...c, interval, ease: Math.round(ease * 100) / 100, reps, lapses, status,
    lastReviewed: iso(t),
    due: iso(addDays(t, Math.max(interval, grade === 'again' ? 0 : 1))),
  };
}

function overdue(c, ref = now()) {
  return daysBetween(c.due, ref);
}

// --- rendering --------------------------------------------------------------
function line(c, ref) {
  const od = overdue(c, ref);
  const when = od > 0 ? `${od}d overdue` : od === 0 ? 'due today' : `in ${-od}d`;
  const bar = { new: '·', shaky: '!', learning: '~', known: '=' }[c.status] ?? '?';
  return `${bar} ${c.id.padEnd(34)} ${c.status.padEnd(9)} ${when.padEnd(12)} ${c.topic}`;
}

function report(list, ref) {
  if (!list.length) return '(none)';
  return list.map((c) => line(c, ref)).join('\n');
}

// --- commands ---------------------------------------------------------------
const list = load();
const byId = (id) => list.find((c) => c.id === id);

switch (cmd) {
  case 'add': {
    const id = positional[0];
    if (!id) exit('usage: learn.mjs add <id> --topic "..." [--note "..."] [--source path] [--grade good]');
    if (byId(id)) exit(`concept "${id}" already exists — use grade or edit`);
    const t = now();
    let c = {
      id,
      topic: flags.topic || id,
      tags: (flags.tags || id.split('.')[0]).split(',').filter(Boolean),
      source: flags.source || null,
      note: flags.note || '',
      created: iso(t),
      lastReviewed: null,
      due: iso(addDays(t, 1)),
      interval: 0, ease: EASE_START, reps: 0, lapses: 0,
      status: 'new',
    };
    if (flags.grade) {
      if (!(flags.grade in GRADES)) exit(`grade must be one of: ${Object.keys(GRADES).join(', ')}`);
      c = schedule(c, flags.grade);
    }
    list.push(c); save(list);
    logEvent({ event: 'add', id, grade: flags.grade || null, note: flags.note || '' });
    console.log(`added  ${line(c, now())}`);
    break;
  }

  case 'grade': {
    const [id, grade] = positional;
    if (!id || !(grade in GRADES)) exit(`usage: learn.mjs grade <id> <${Object.keys(GRADES).join('|')}> [--note "..."]`);
    const c = byId(id);
    if (!c) exit(`unknown concept "${id}" — add it first`);
    const before = { interval: c.interval, status: c.status };
    const updated = schedule(c, grade);
    if (flags.note) updated.note = flags.note;
    list[list.indexOf(c)] = updated;
    save(list);
    logEvent({ event: 'grade', id, grade, note: flags.note || '', from: before, to: { interval: updated.interval, status: updated.status } });
    console.log(`${grade.padEnd(5)} ${line(updated, now())}`);
    break;
  }

  case 'due': {
    const ref = now();
    const limit = Number(flags.limit || 6);
    const due = list.filter((c) => overdue(c, ref) >= 0)
      .sort((a, b) => overdue(b, ref) - overdue(a, ref) || a.ease - b.ease);
    console.log(`# due ${day(ref)} — ${due.length} of ${list.length} concepts\n`);
    console.log(report(due.slice(0, limit), ref));
    if (due.length > limit) console.log(`\n… and ${due.length - limit} more (--limit to see)`);
    break;
  }

  case 'stale': {
    // Longest since last touched, regardless of schedule. "What haven't I seen in ages?"
    const ref = now();
    const limit = Number(flags.limit || 8);
    const sorted = [...list].sort((a, b) => new Date(a.lastReviewed || a.created) - new Date(b.lastReviewed || b.created));
    console.log(`# least recently touched\n`);
    console.log(sorted.slice(0, limit).map((c) => {
      const d = daysBetween(c.lastReviewed || c.created, ref);
      return `${String(d).padStart(3)}d ago  ${c.id.padEnd(34)} ${c.status.padEnd(9)} ${c.topic}`;
    }).join('\n'));
    break;
  }

  case 'list': {
    const ref = now();
    let out = list;
    if (flags.status) out = out.filter((c) => c.status === flags.status);
    if (flags.tag) out = out.filter((c) => c.tags.includes(flags.tag));
    console.log(report(out, ref));
    break;
  }

  case 'show': {
    const c = byId(positional[0]);
    if (!c) exit(`unknown concept "${positional[0]}"`);
    console.log(JSON.stringify(c, null, 2));
    break;
  }

  case 'stats': {
    const ref = now();
    const by = (s) => list.filter((c) => c.status === s).length;
    const due = list.filter((c) => overdue(c, ref) >= 0).length;
    const lapsed = list.filter((c) => c.lapses > 0);
    console.log(`concepts   ${list.length}`);
    console.log(`  new      ${by('new')}`);
    console.log(`  shaky    ${by('shaky')}`);
    console.log(`  learning ${by('learning')}`);
    console.log(`  known    ${by('known')}`);
    console.log(`due today  ${due}`);
    console.log(`weak spots ${lapsed.sort((a, b) => b.lapses - a.lapses).slice(0, 5).map((c) => `${c.id}(${c.lapses})`).join(' ') || '—'}`);
    break;
  }

  case 'note': {
    // Free-form session note, e.g. what was taught, homework given.
    const text = positional.join(' ');
    if (!text) exit('usage: learn.mjs note "text"');
    logEvent({ event: 'note', text });
    console.log('logged');
    break;
  }

  default:
    console.log(`learn.mjs — spaced repetition for programming concepts

  due    [--limit N]              what to review right now
  stale  [--limit N]              least recently touched, ignoring schedule
  list   [--status S] [--tag T]   everything, filtered
  show   <id>                     full record
  stats                           counts and weak spots
  add    <id> --topic "..." [--note "..."] [--source f] [--grade g]
  grade  <id> <again|hard|good|easy> [--note "..."]
  note   "text"                   append a free-form entry to log.jsonl

grades:  again = got it wrong   hard = right but struggled
         good  = right          easy = instant, no thought`);
}

function exit(msg) { console.error(msg); process.exit(1); }
