// Legacy example rows remain in storage/history but cannot become live project results.
export function liveData(data) {
 const out={...data};
 const runs=(data.analysis_runs||[]).filter(r=>r.mode==='live'||r.result?.generation_mode==='live');
 const runIds=new Set(runs.map(r=>r.id));
 const recs=(data.recommendations||[]).filter(r=>runIds.has(r.run_id));
 const recIds=new Set(recs.map(r=>r.id));
 const sets=(data.decision_sets||[]).filter(s=>s.summary_snapshot?.generation_mode==='live');
 const setIds=new Set(sets.map(s=>s.id));
 const versions=(data.document_versions||[]).filter(v=>!v.fixture_id&&v.provenance!=='fixture');
 const hiddenDocs=new Set((data.document_versions||[]).filter(v=>v.fixture_id||v.provenance==='fixture').map(v=>v.document_id));
 const currentIds=new Set(versions.map(v=>v.id));
 out.analysis_runs=runs;out.recommendations=recs;
 out.reviews=(data.reviews||[]).filter(r=>recIds.has(r.recommendation_id));
 out.recommendation_options=(data.recommendation_options||[]).filter(r=>recIds.has(r.recommendation_id));
 out.decision_sets=sets;out.decision_items=(data.decision_items||[]).filter(i=>setIds.has(i.decision_set_id));
 out.document_versions=versions;
 out.documents=(data.documents||[]).filter(d=>!hiddenDocs.has(d.id)||currentIds.has(d.current_version_id));
 out.document_revisions=(data.document_revisions||[]).filter(r=>r.mode==='live'||setIds.has(r.decision_set_id));
 out.packages=(data.packages||[]).filter(p=>p.snapshot?.generation_mode==='live');
 const packageIds=new Set(out.packages.map(p=>p.id));
 for(const table of ['tasks','milestones','procurements','implementation_entries','issues','evidence_files','verifications','actual_results']) {
  if(data[table])out[table]=data[table].filter(r=>packageIds.has(r.package_id)&&(table!=='actual_results'||r.provenance==='recorded'));
 }
 return out;
}
