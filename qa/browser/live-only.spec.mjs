import {test,expect} from '@playwright/test';
import {fixture,id} from './fixture.mjs';
test('a READY uploaded document enables only live analysis, without a sample selection',async({page})=>{
 const f=await fixture(page,{run:true});f.tables.analysis_runs=[];f.tables.recommendations=[];f.tables.reviews=[];f.tables.recommendation_options=[];
 let request;await page.route('http://127.0.0.1:54321/functions/v1/analyze',async route=>{request=route.request().postDataJSON();await route.fulfill({status:503,json:{code:'AI_NOT_CONFIGURED',message:'Live AI is not configured.'}});});
 await page.goto(`/#workspace?project=${id}&tab=documents`);
 await expect(page.getByRole('button',{name:'Use sample documents'})).toHaveCount(0);
 await expect(page.getByText('Scenario',{exact:true})).toHaveCount(0);
 const analyze=page.getByRole('button',{name:'Analyze project',exact:true});await expect(analyze).toBeEnabled();await analyze.click();
 await expect(page.getByRole('alert')).toContainText('Live AI is not configured');
 expect(request.generation_mode).toBe('live');expect(request.scenario).toBe('live');expect(request.document_version_ids).toEqual([f.tables.document_versions[0].id]);
 expect(f.tables.analysis_runs).toEqual([]);expect(f.errors).toEqual([]);
});
test('historical example runs and sources are hidden instead of promoted to real analysis',async({page})=>{
 const f=await fixture(page,{run:true});f.tables.analysis_runs[0].mode='simulated';f.tables.analysis_runs[0].result.generation_mode='simulated';f.tables.document_versions[0].fixture_id='office-spec';f.tables.document_versions[0].provenance='fixture';
 await page.goto(`/#workspace?project=${id}&tab=documents`);
 await expect(page.getByRole('heading',{name:'No documents yet',exact:true})).toBeVisible();await expect(page.getByRole('button',{name:'Analyze project',exact:true})).toBeDisabled();
 await page.goto(`/#workspace?project=${id}&tab=review&stage=recommendations`);await expect(page.locator('.recommendation')).toHaveCount(0);expect(f.errors).toEqual([]);
});
