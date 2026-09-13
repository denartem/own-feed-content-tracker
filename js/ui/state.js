import { applyTournamentOp, applyStructureOp, applyOpsToText } from '../core/ops.js';

export const tournamentPath = (id) => `tournaments/${id}.json`;
export const passportPath = (id) => `content-types/${id}.md`;

const TOURNAMENT_RE = /^tournaments\/(.+)\.json$/;
const PASSPORT_RE = /^content-types\/(.+)\.md$/;

export function createAppState() {
  const listeners = new Set();
  const state = { structure: null, docs: {}, passports: {}, syncState: 'saved', notice: null, mode: 'github' };
  let sync = null;
  const notify = () => listeners.forEach((fn) => fn(state));
  const enqueue = (path, op) => sync?.enqueue(path, op);

  function setFileView(path, text) {
    const t = path.match(TOURNAMENT_RE);
    const p = path.match(PASSPORT_RE);
    if (path === 'structure.json') {
      if (text != null) state.structure = JSON.parse(text);
    } else if (t) {
      if (text != null) state.docs[t[1]] = JSON.parse(text);
      else delete state.docs[t[1]];
    } else if (p) {
      state.passports[p[1]] = text;
    }
  }

  return {
    state,
    notify,
    load({ structure, docs, passports = {} }) {
      state.structure = structure;
      state.docs = docs;
      state.passports = passports;
      notify();
    },
    attachSync(s) {
      sync = s;
    },
    subscribe(fn) {
      listeners.add(fn);
      return () => listeners.delete(fn);
    },
    setSyncState(value) {
      state.syncState = value;
      notify();
    },
    setNotice(text) {
      state.notice = text;
      notify();
    },
    tournament: (id) => state.structure?.tournaments.find((t) => t.id === id) ?? null,
    contentType: (id) => state.structure?.contentTypes.find((c) => c.id === id) ?? null,
    dispatchTournament(id, op) {
      state.docs[id] = applyTournamentOp(state.docs[id], op).doc;
      enqueue(tournamentPath(id), op);
      notify();
    },
    dispatchStructure(op) {
      state.structure = applyStructureOp(state.structure, op).doc;
      enqueue('structure.json', op);
      notify();
    },
    dispatchFile(path, op) {
      setFileView(path, op.type === 'deleteFile' ? null : op.to);
      enqueue(path, op);
      notify();
    },
    applySaved(path, text, pendingOps = []) {
      setFileView(path, applyOpsToText(path, text, pendingOps).text);
      notify();
    },
  };
}
