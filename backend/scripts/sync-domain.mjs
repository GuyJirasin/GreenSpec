import { readdir,readFile,writeFile,mkdir } from 'node:fs/promises';
import { dirname,resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createHash } from 'node:crypto';
const backend=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const source=resolve(backend,'../shared');
const destination=resolve(backend,'supabase/functions/_shared/domain');
await mkdir(destination,{recursive:true});
const checksums={};
for(const name of (await readdir(source)).filter(f=>f.endsWith('.mjs')&&!f.endsWith('.test.mjs')).sort()){
 const bytes=await readFile(resolve(source,name));
 await writeFile(resolve(destination,name),bytes);
 checksums[name]=createHash('sha256').update(bytes).digest('hex');
}
await writeFile(resolve(destination,'checksums.json'),JSON.stringify(checksums,null,2)+'\n');
console.log('Synchronized canonical shared domain into the Edge function mount.');

