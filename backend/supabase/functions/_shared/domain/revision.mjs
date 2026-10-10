import {DomainError} from './domain.mjs';
const decode=x=>x.replace(/&lt;/g,'<').replace(/&gt;/g,'>').replace(/&quot;/g,'"').replace(/&apos;/g,"'").replace(/&amp;/g,'&');
const escape=x=>x.replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;');
// JSZip is passed by the adapter, so this helper works in browsers, Deno and Node.
// Only fixture DOCX plans accepted by revisionPlan should reach this function.
export async function reviseDocx(sourceBytes,plan,JSZip){
 const zip=await JSZip.loadAsync(sourceBytes);const part=zip.file('word/document.xml');
 if(!part)throw new DomainError('OUTPUT_INVALID','DOCX main document part is missing.');
 const original=await part.async('string');let index=0;const applied=[];const unapplied=[...(plan.unapplied??[])];
 const byIndex=new Map();for(const change of plan.changes??[]){if(byIndex.has(change.paragraph_index))throw new DomainError('OUTPUT_INVALID','Two changes target the same paragraph.');byIndex.set(change.paragraph_index,change);}
 const xml=original.replace(/<w:p\b[^>]*>[\s\S]*?<\/w:p>/g,paragraph=>{
  index++;const change=byIndex.get(index);if(!change)return paragraph;
  const text=[...paragraph.matchAll(/<w:t\b[^>]*>([\s\S]*?)<\/w:t>/g)].map(m=>decode(m[1])).join('');
  if(text!==change.before){unapplied.push({recommendation_id:change.recommendation_id,reason:'Paragraph no longer equals the approved exact source text.'});return paragraph;}
  let first=true;const updated=paragraph.replace(/<w:t\b([^>]*)>[\s\S]*?<\/w:t>/g,(_,attributes)=>{const value=first?escape(change.after):'';first=false;return `<w:t${attributes}>${value}</w:t>`;});
  if(first){unapplied.push({recommendation_id:change.recommendation_id,reason:'Mapped paragraph has no replaceable text run.'});return paragraph;}
  applied.push(change);return updated;
 });
 for(const [paragraph_index,change] of byIndex)if(paragraph_index>index)unapplied.push({recommendation_id:change.recommendation_id,reason:'Mapped source paragraph does not exist.'});
 zip.file('word/document.xml',xml);
 const bytes=await zip.generateAsync({type:'uint8array',compression:'DEFLATE'});
 return {bytes,changes:applied,unapplied,status:unapplied.length?'PARTIAL':'READY_FOR_REVIEW',generation_mode:'simulated'};
}
