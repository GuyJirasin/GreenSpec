import {readFileSync, existsSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {fileURLToPath} from 'node:url';
import {resolve, dirname} from 'node:path';
const here=dirname(fileURLToPath(import.meta.url));
const root=resolve(here,'..');
const baseline=JSON.parse(readFileSync(resolve(here,'original-files.sha256.json'),'utf8').replace(/^\uFEFF/,''));
const changed=[];
for(const row of baseline){
 const path=resolve(root,row.Path);
 if(!existsSync(path)){changed.push(`${row.Path}: missing`);continue;}
 const hash=createHash('sha256').update(readFileSync(path)).digest('hex').toUpperCase();
 if(hash!==row.Hash) changed.push(`${row.Path}: changed`);
}
if(existsSync(resolve(root,'demo'))) changed.push('demo/: should have been removed');
if(changed.length){ console.error(changed.join('\n'));process.exitCode=1; }
else console.log(`PASS: ${baseline.length} original files unchanged; demo/ removed.`);
