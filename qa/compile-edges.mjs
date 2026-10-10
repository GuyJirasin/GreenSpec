import {createRequire} from 'node:module';
import {resolve,dirname} from 'node:path';
import {fileURLToPath} from 'node:url';
const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
const require=createRequire(resolve(root,'frontend/package.json'));
const {build}=require('esbuild');
for(const name of ['analyze','document','revision']){
 await build({entryPoints:[resolve(root,`backend/supabase/functions/${name}/index.ts`)],bundle:true,platform:'neutral',format:'esm',external:['npm:*'],write:false,logLevel:'warning'});
 console.log(`PASS: ${name} Edge Function TypeScript syntax and local module graph (runtime not executed)`);
}
