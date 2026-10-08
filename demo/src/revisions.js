import { recommendations, sampleDocuments } from './data.js';
import { aggregateImpact, optionImpact } from './model.js';

export const STORAGE_KEY = 'greenspec-feature1-v2';
export function initialState() {
  return { project: { name: 'Riverside Office — Phase 1', type: 'Office', location: 'Bangkok, Thailand', area: 24000, description: 'Sample office material optimization' }, documents: sampleDocuments.map(d => ({ ...d })), ready: true, scenario: 'success', priority: 'Balanced', weight: 50, candidates: structuredClone(recommendations), selections: {}, locks: {}, decisions: {}, reasons: {}, reviews: {}, drafts: {}, feedback: {}, iterationFeedback: '', revision: 1, history: [], pendingIteration: false, finalized: false, documentGenerated: false, submitted: false, noRecommendations: false };
}
export function restoreState() {
  try {
    const saved = JSON.parse(localStorage.getItem(STORAGE_KEY));
    if (saved?.version === 2 && saved.state?.candidates && saved.state?.history && saved.state?.project) return { ...initialState(), ...saved.state, documents: saved.state.documents.map(d => ({ ...d, status: 'Ready' })) };
  } catch { /* Invalid browser data starts a fresh demo. */ }
  return initialState();
}
export function reviewSummary(state) {
  const items = state.noRecommendations ? [] : state.candidates;
  const approved = items.filter(r => state.selections[r.id]);
  const rejected = items.filter(r => !state.selections[r.id] && state.decisions[r.id] === 'Rejected');
  const unresolved = items.filter(r => !state.selections[r.id] && state.decisions[r.id] !== 'Rejected');
  return { approved, rejected, unresolved, impact: aggregateImpact(state.selections, items) };
}
export function revisionSnapshot(state) {
  return structuredClone({ number: state.revision, timestamp: new Date().toISOString(), project: state.project, documents: state.documents, recommendations: state.candidates, selections: state.selections, locks: state.locks, decisions: state.decisions, feedback: state.feedback, reasons: state.reasons, reviews: state.reviews, drafts: state.drafts, iterationFeedback: state.iterationFeedback, noRecommendations: state.noRecommendations, impact: reviewSummary(state).impact, finalized: state.finalized, documentGenerated: state.documentGenerated });
}
export function archiveRevision(state) {
  return [...state.history.filter(r => r.number !== state.revision), revisionSnapshot(state)];
}
// Deterministic mock regeneration preserves traceability and leaves locked items untouched.
// Feedback chooses a sample alternative; no uploaded text or AI is processed.
export function regenerate(state) {
  const candidates = state.candidates.map(r => {
    if (state.locks[r.id]) return r;
    const feedback = [state.iterationFeedback, state.feedback[r.id]?.note, state.feedback[r.id]?.reason, state.reasons[r.id]?.reason, state.reasons[r.id]?.note].filter(Boolean).join(' · ');
    const costFocused = /cost|expensive|ราค|ต้นทุน|2%/i.test(feedback);
    const cost = costFocused;
    return { ...r, generation: state.revision + 1, a: cost ? r.a : r.b, b: cost ? r.b : r.a,
      cut: cost ? r.cut : r.cut * 1.1, save: cost ? Math.max(r.save, 0) : -r.cost * .02,
      adjustment: feedback || 'Explore another sample alternative',
      check: !cost && r.check === 'Pass' ? 'Review' : r.check,
      risk: !cost && r.risk === 'Low' ? 'Medium' : r.risk,
      status: r.check === 'Fail' ? 'High Risk' : !cost || r.check === 'Review' ? 'Needs Review' : 'Recommended',
      why: `${r.why} · Mock revision ${state.revision + 1}: ${cost ? 'prioritize cost and retain engineering requirements' : 'explore lower-carbon material; human verification required'}` };
  });
  const keep = obj => Object.fromEntries(Object.entries(obj).filter(([id]) => state.locks[id]));
  return { ...state, history: archiveRevision(state), revision: state.revision + 1, candidates, selections: keep(state.selections), locks: { ...state.locks }, decisions: keep(state.decisions), reviews: keep(state.reviews), drafts: keep(state.drafts), ready: false, pendingIteration: true, finalized: false, documentGenerated: false, submitted: false };
}
export function approvedChangeSet(state) {
  return reviewSummary(state).approved.map(r => ({ id: r.id, material: r.mat, title: r.title, original: r.old, replacement: state.drafts[r.id] ?? r[state.selections[r.id].toLowerCase()], option: state.selections[r.id], reason: r.why, source: r.source, impact: optionImpact(r, state.selections[r.id]), engineering: r.perf, compliance: r.check, humanReviewAcknowledged: !!state.reviews[r.id] }));
}
