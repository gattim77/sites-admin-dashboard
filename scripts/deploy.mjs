import { execFileSync } from 'node:child_process';
import { revision } from '../src/revision.mjs';
if(process.env.CF_PAGES !== '1' && !process.env.CI && !process.env.WORKERS_CI) throw new Error('Deploy through Cloudflare Workers Builds from GitHub');
const head=execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim();
if(revision!==head)throw new Error('Built revision differs from checked-out commit');
execFileSync('npx',['wrangler','deploy','--keep-vars','--tag',head],{stdio:'inherit'});
