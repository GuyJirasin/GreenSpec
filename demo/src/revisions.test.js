import { describe, it, expect, vi } from 'vitest';
import { initialState, restoreState, reviewSummary, regenerate, revisionSnapshot, archiveRevision, approvedChangeSet } from './revisions.js';
describe('revision lifecycle', () => {
  it('migrates existing rejections to locks and preserves explicit unlocks after reload', () => {
    const state = { ...initialState(), decisions: {1:'Rejected'}, locks: {1:false}, reasons: {1:{reason:'Material unavailable',note:'Supplier not available'}} };
    let saved = { version: 2, state };
    vi.stubGlobal('localStorage', {getItem: () => JSON.stringify(saved)});
    try {
      expect(restoreState().locks[1]).toBe(true);
      expect(restoreState().reasons[1]).toEqual(state.reasons[1]);
      saved = {version:3,state};
      expect(restoreState().locks[1]).toBe(false);
    } finally { vi.unstubAllGlobals(); }
  });
  it('preserves locks, feedback, original references and independent snapshots', () => {
    const s = { ...initialState(), selections: {1:'B'}, locks: {1:true,2:true}, decisions: {1:'Accepted',2:'Rejected'}, reviews: {1:true}, drafts: {1:'Edited concrete'}, feedback: {3:{note:'Keep structural requirements unchanged'}}, reasons: {2:{reason:'Too expensive',note:'Avoid scarce suppliers'}}, iterationFeedback:'Reduce cost' };
    const next = regenerate(s);
    expect(next.revision).toBe(2);
    expect(next.candidates[0]).toEqual(s.candidates[0]);
    expect(next.selections).toEqual(s.selections);
    expect(next.drafts).toEqual(s.drafts);
    expect(next.candidates[1].adjustment).toContain('Avoid scarce suppliers');
    expect(next.candidates[1].generation).toBe(2);
    expect(next.locks[2]).toBeUndefined();
    expect(next.decisions[2]).toBeUndefined();
    expect(next.candidates[2].adjustment).toContain('Keep structural requirements unchanged');
    expect(next.candidates.every((r,i)=>r.old===s.candidates[i].old&&r.source===s.candidates[i].source)).toBe(true);
    next.candidates[1].a='Edit';
    expect(next.history[0].recommendations[1].a).toBe(s.candidates[1].a);
    expect(next.history[0].decisions[2]).toBe('Rejected');
  });
  it('regenerates explicitly unlocked approvals without double counting impact', () => {
    const next=regenerate({...initialState(),selections:{1:'A',2:'A'},locks:{1:true,2:false},decisions:{1:'Accepted',2:'Accepted'}});
    expect(next.selections).toEqual({1:'A'});
    expect(reviewSummary(next).impact).toEqual({carbon:252,savings:750000});
    expect(next.candidates[1].generation).toBe(2);
  });
  it('preserves final change sets without document generation, including additional cost', () => {
    const s={...initialState(),finalized:true,documentGenerated:false,selections:{1:'B'},locks:{1:true}};
    const snap=revisionSnapshot(s);
    expect(snap.finalized).toBe(true);
    expect(snap.documentGenerated).toBe(false);
    expect(approvedChangeSet(s)[0]).toMatchObject({original:s.candidates[0].old,replacement:s.candidates[0].b,source:s.candidates[0].source,impact:{carbon:315,savings:-250000}});
    expect(archiveRevision({...s,history:[snap]})).toHaveLength(1);
    expect(reviewSummary({...initialState(),noRecommendations:true}).unresolved).toHaveLength(0);
  });
  it('separates decisions and recalculates regenerated estimates', () => {
    const s={...initialState(),selections:{1:'A'},decisions:{2:'Rejected',3:'Adjustment Requested'}};
    const result=reviewSummary(s);
    expect(result.approved).toHaveLength(1);expect(result.rejected).toHaveLength(1);expect(result.unresolved).toHaveLength(2);
    const next=regenerate({...s,iterationFeedback:'Prefer carbon savings'});next.selections={1:'A'};
    expect(reviewSummary(next).impact.carbon).toBeCloseTo(277.2);
    expect(reviewSummary(next).impact.savings).toBe(-250000);
  });
});
