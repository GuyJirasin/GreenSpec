import {test} from 'node:test';
import assert from 'node:assert/strict';
import {totalByScope,impactSummary} from './analysis-display.mjs';
const r=(scope,impacts)=>({payload:{work_scope_key:scope,impacts}});
test('missing values stay unknown and repeated scopes count once',()=>{
 const rows=[r('a',{carbon:10}),r('a',{carbon:10}),r('b',{carbon:null})];
 assert.deepEqual(totalByScope(rows,'carbon'),{value:10,known:1,total:2,complete:false});
 assert.equal(totalByScope([r('a',{carbon:null})],'carbon').value,null);
 assert.equal(totalByScope([],'carbon').value,0);
});
test('selected Option B is used, and increases are not shown as savings',()=>{
 const rows=[r('a',{baseline_carbon_tco2e:100,baseline_cost_thb:1000})];
 const option=()=>({work_scope_key:'a',impacts:{carbon_reduction_tco2e:30,cost_saving_thb:-50}});
 const s=impactSummary(rows,rows,option);
 assert.equal(s.proposedCarbon,70);assert.equal(s.proposedCost,1050);assert.equal(s.cost.value,-50);
});
test('unknown estimates and overlapping selected scopes cannot produce a proposed total',()=>{
 const rows=[r('a',{baseline_carbon_tco2e:100,baseline_cost_thb:null,carbon_reduction_tco2e:20,cost_saving_thb:null})];
 assert.equal(impactSummary(rows,rows,r=>r.payload).proposedCost,null);
 assert.equal(impactSummary(rows,[...rows,...rows],r=>r.payload).proposedCarbon,null);
});
