import { serve } from '@hono/node-server';
import { app } from './server.mjs';
try { process.loadEnvFile(); } catch(error) { if(error.code!=='ENOENT') throw error; }
serve({fetch:app.fetch,hostname:'127.0.0.1',port:Number(process.env.PORT || 3001)},info=>console.log(`GreenSpec API listening on http://127.0.0.1:${info.port}`));
