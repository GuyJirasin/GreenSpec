import test from 'node:test';
import assert from 'node:assert/strict';
import {createDemoRound,updateDemoReview,finalizeDemo,demoKey} from '../frontend/src/demo-state.mjs';
import {impactSummary} from '../frontend/src/analysis-display.mjs';
test('demo is clearly identified, independent of upload content, and totals respect Option B',()=>{
 const r=createDemoRound({id:'p'},['real-upload']);
 assert.equal(r.generation_mode,'demo');assert.deepEqual(r.documentIds,['real-upload']);
 assert.equal(r.recs[0].payload.sources[0].demo,true);
 const s=impactSummary(r.recs,[r.recs[0]],()=>r.options.find(o=>o.recommendation_id===r.recs[0].id&&o.option_key==='B').payload);
 assert.equal(s.baselineCarbon.value,2500);assert.equal(s.baselineCost.value,50000000);assert.equal(s.carbon.value,315);assert.equal(s.proposedCarbon,2185);
 assert.notEqual(demoKey('u1','p'),demoKey('u2','p'));assert.notEqual(demoKey('u','p1'),demoKey('u','p2'));
});
test('review all, at least one approval, editing re-review and immutable final snapshots',()=>{
 let r=createDemoRound({id:'p'});
 assert.throws(()=>finalizeDemo(r),/Review every item/);
 for(const review of r.reviews)r=updateDemoReview(r,review.id,{decision:'REJECTED',locked:true});
 assert.throws(()=>finalizeDemo(r),/Approve at least one/);
 const id=r.reviews[0].id;r=updateDemoReview(r,id,{locked:false});
 r=updateDemoReview(r,id,{selected_option:'B',draft_wording:'ข้อความที่ผู้ใช้แก้',decision:'UNREVIEWED',locked:false});
 assert.throws(()=>finalizeDemo(r),/Review every item/);
 r=updateDemoReview(r,id,{decision:'APPROVED',locked:true});
 assert.throws(()=>updateDemoReview(r,id,{draft_wording:'แก้'}),/Unlock/);
 const final=finalizeDemo(r);assert.equal(final.final.snapshot.reviews[0].draft_wording,'ข้อความที่ผู้ใช้แก้');assert.equal(final.final.snapshot.reviews[0].selected_option,'B');
 assert.throws(()=>updateDemoReview(final,id,{locked:false}),/cannot be changed/);
 r.reviews[0].draft_wording='changed';assert.equal(final.final.snapshot.reviews[0].draft_wording,'ข้อความที่ผู้ใช้แก้');
});
