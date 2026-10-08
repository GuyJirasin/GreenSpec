import { useState } from 'react';
import { Title, Kpis, Button, Badge, Actions, Field, Table, Empty } from './components.jsx';
import { money, carbon } from './model.js';
import { reviewSummary, approvedChangeSet } from './revisions.js';

export function FeedbackForm({ iteration = false, previous, onSubmit, onCancel }) {
  const [reason, setReason] = useState(previous?.reason || 'Too expensive');
  const [note, setNote] = useState(previous?.note || '');
  return <form onSubmit={e => { e.preventDefault(); if (note.trim()) onSubmit({ reason, note: note.trim() }); }}>
    {!iteration && <Field label="Adjustment reason"><select value={reason} onChange={e => setReason(e.target.value)}>{['Too expensive','Supplier availability is poor','Keep structural requirements unchanged','Other'].map(x => <option key={x}>{x}</option>)}</select></Field>}
    <div className="my-5"><Field label={iteration ? 'Revision feedback *' : 'Item feedback *'}><textarea required maxLength={2000} rows={4} value={note} onChange={e => setNote(e.target.value)} placeholder={iteration ? 'Reduce cost; avoid hard-to-source materials; retain structural requirements…' : 'Describe the adjustment you need…'}/></Field></div>
    {iteration && <div className="note">Approved changes remain locked. Only unlocked, rejected or unresolved items are regenerated. Item feedback and reject reasons are included. This is a simulated revision, not an AI analysis.</div>}
    <Actions><Button type="button" onClick={onCancel}>Cancel</Button><Button primary disabled={!note.trim()} type="submit">{iteration ? 'Regenerate revision' : 'Save feedback'}</Button></Actions>
  </form>;
}
function Changes({ state, final = false }) {
  const result = reviewSummary(state);
  return <section className="card"><h2 className="mb-4">{final ? 'Preserved approved change set' : 'Review decisions'}</h2>{(state.noRecommendations ? [] : state.candidates).map(r => <div className="border-b border-border py-4" key={r.id}>
    <div className="flex flex-wrap justify-between gap-3"><b>{r.title}</b><Badge tone={state.decisions[r.id] === 'Rejected' ? 'bad' : result.unresolved.includes(r) ? 'warn' : 'good'}>{state.selections[r.id] ? `Approved · Option ${state.selections[r.id]}${state.locks[r.id] ? ' · Locked' : ''}` : state.decisions[r.id] || 'Unresolved'}</Badge></div>
    <p className="mt-2 text-xs text-forest">{r.source}</p>
    {state.selections[r.id] && <><p><b>Original:</b> {r.old}</p><p><b>Approved replacement:</b> {state.drafts[r.id] ?? r[state.selections[r.id].toLowerCase()]}</p><p><b>Reason:</b> {r.why}</p><p className="text-xs text-muted">{carbon(approvedChangeSet(state).find(c => c.id === r.id).impact.carbon)} reduction · {money(Math.abs(approvedChangeSet(state).find(c => c.id === r.id).impact.savings))} {approvedChangeSet(state).find(c => c.id === r.id).impact.savings >= 0 ? 'saving' : 'additional cost'}</p></>}
    {state.reasons[r.id] && <p className="text-muted">Reject reason: {state.reasons[r.id].reason} · {state.reasons[r.id].note}</p>}
    {state.feedback[r.id] && <p className="text-muted">Feedback: {state.feedback[r.id].reason} · {state.feedback[r.id].note}</p>}
  </div>)}</section>;
}
export function RevisionSummary({ state, onAccept, onIterate, go }) {
  const [ack, setAck] = useState(false);
  const { approved, rejected, unresolved, impact } = reviewSummary(state);
  return <><Title title="Revision summary" subtitle={`Revision ${state.revision} / Are you satisfied with this revised specification?`}/><Kpis items={[
    ['Approved', approved.length, 'Locked decisions are preserved'], ['Rejected', rejected.length, 'Reasons retained'], ['Unresolved', unresolved.length, 'May intentionally remain unchanged'], ['Estimated CO₂ reduction', carbon(impact.carbon), `${(impact.carbon / 2500 * 100).toFixed(1)}% of project baseline`],
  ]}/><section className="card mb-5"><h2>{impact.savings >= 0 ? 'Estimated cost savings' : 'Estimated additional spending'}: {money(Math.abs(impact.savings))}</h2><p>{(Math.abs(impact.savings) / 50000000 * 100).toFixed(2)}% of baseline material cost. Estimates require human verification.</p></section><Changes state={state}/>
    <section className="card mt-5"><h2 className="mb-4">Decision checkpoint</h2><label className="flex items-start gap-3 text-sm leading-7"><input type="checkbox" className="mt-2" checked={ack} onChange={e => setAck(e.target.checked)}/>I reviewed the approved changes{unresolved.length ? ` and intentionally leave ${unresolved.length} unresolved item(s) unchanged` : ''}. Engineering approval is still required.</label><Actions><Button onClick={() => go('recommendations')}>Continue reviewing</Button><Button onClick={onIterate}>Request Another Revision</Button><Button primary disabled={!ack || state.finalized} onClick={onAccept}>{state.finalized ? 'Revision accepted' : 'Accept Revision'}</Button></Actions></section></>;
}
export function DocumentChoice({ state, onFinalize }) {
  return <><Title title="Revision accepted" subtitle={`Revision ${state.revision} / Choose whether to generate a document`}/><div className="note mb-5">The approved change set is preserved either way. The demo can generate a text specification from sample excerpts; it does not modify your uploaded source files.</div><div className="grid gap-5 xl:grid-cols-2"><section className="card"><h2>Generate Revised Document</h2><p className="my-5">Create a sample .txt specification containing the approved changes and their source references.</p><Button primary onClick={() => onFinalize(true)}>Generate & finish</Button></section><section className="card"><h2>Do Not Generate Document</h2><p className="my-5">Keep the approved change set and manually edit your source documents later.</p><Button onClick={() => onFinalize(false)}>Finish without document</Button></section></div></>;
}
export function FinalSuccess({ state, onDownload, onSave, go }) {
  const { approved, impact } = reviewSummary(state);
  return <><Title title="Revision completed" subtitle={`Final revision ${state.revision} / Approved change set preserved`}/><Kpis items={[
    ['Total CO₂ reduced', carbon(impact.carbon), 'Estimated material impact'], ['CO₂ reduction', `${(impact.carbon / 2500 * 100).toFixed(1)}%`, 'Baseline: 2,500 tCO₂e'], [impact.savings >= 0 ? 'Cost savings' : 'Additional cost', money(Math.abs(impact.savings)), `${(Math.abs(impact.savings) / 50000000 * 100).toFixed(2)}% of baseline`], ['Accepted material changes', approved.length, `Final revision ${state.revision}`],
  ]}/><div className="note mb-5">{state.documentGenerated ? 'Sample revised text specification generated.' : 'No revised document generated. Your approved change set is still preserved.'} All impacts are estimates; sample compliance labels are not verified facts.</div><Changes state={state} final/><Actions>{state.documentGenerated && <Button onClick={onDownload}>Download revised document</Button>}<Button onClick={onSave}>Download approved change set (.json)</Button><Button onClick={() => go('finalSummary')}>View final summary</Button><Button onClick={() => go('home')}>Return to project dashboard</Button></Actions><section className="card mt-5"><h2>Continue managing this project in GREEN SPEC Project Management</h2><p className="my-4">View the project handoff and approved changes in this local demo.</p><Button primary onClick={() => go('management')}>Go to Project Management</Button></section></>;
}
export function RevisionHistory({ state }) {
  const [number, setNumber] = useState(null);
  const snapshot = state.history.find(r => r.number === number);
  return <><Title title="Revision history" subtitle="Preserved recommendations, decisions, feedback and estimated impact"/>{state.history.length ? <><section className="card"><Table><thead><tr><th>Revision</th><th>Feedback</th><th>Estimated impact</th><th/></tr></thead><tbody>{state.history.map(r => <tr key={r.number}><td>Revision {r.number}<p className="text-xs text-muted">{r.finalized ? 'Finalized' : 'Previous review'}</p></td><td>{r.iterationFeedback || 'Initial analysis'}</td><td>{carbon(r.impact.carbon)} reduction<p>{money(Math.abs(r.impact.savings))} {r.impact.savings >= 0 ? 'saving' : 'additional cost'}</p></td><td><Button onClick={() => setNumber(r.number)}>View revision {r.number}</Button></td></tr>)}</tbody></Table></section>{snapshot && <div className="mt-5"><h2 className="mb-4">Revision {snapshot.number} · Read-only snapshot</h2><Changes state={{ ...snapshot, candidates: snapshot.recommendations }}/></div>}</> : <Empty title="No archived revisions yet">History is created when you request another revision or finalize this one.</Empty>}</>;
}
