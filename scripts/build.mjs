import { execFileSync } from 'node:child_process';
import { writeFileSync } from 'node:fs';
const commit = execFileSync('git', ['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if (execFileSync('git',['status','--porcelain'],{encoding:'utf8'}).trim()) throw new Error('Build requires a clean committed checkout');
writeFileSync('src/revision.mjs',`export const revision = ${JSON.stringify(commit)};\n`);
