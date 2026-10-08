import { describe, it, expect } from 'vitest';
import { initialState, reviewSummary, regenerate, revisionSnapshot, archiveRevision, approvedChangeSet } from './revisions.js';
describe('revision lifecycle', () => {
  it('preserves locks, feedback, original references and independent snapshots', () => {
    const s = { ...initialState(), selections: {1:'B'}, locks: {1:true}, decisions: {1:'Accepted',2:'Rejected'}, reviews: {1:true}, drafts: {1:'Edited concrete'}, feedback: {3:{note:'Keep structural requirements unchanged'}}, reasons: {2:{reason:'Too expensive',note:'Avoid scarce suppliers'}}, iterationFeedback:'Reduce cost' };
    const next = regenerate(s);
    expect(next.revision).toBe(2);
    expect(next.candidates[0]).toEqual(s.candidates[0]);
    expect(next.selections).toEqual(s.selections);
    expect(next.drafts).toEqual(s.drafts);
    expect(next.candidates[1].adjustment).toContain('Avoid scarce suppliers');
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
