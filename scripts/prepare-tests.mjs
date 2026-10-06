import { existsSync, writeFileSync } from 'node:fs';
if(!existsSync('src/revision.mjs'))writeFileSync('src/revision.mjs',"export const revision = 'development';\n");
