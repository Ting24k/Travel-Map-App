import {execFileSync} from 'node:child_process';
import fs from 'node:fs';
const name='little-world-security-'+process.pid;
const sql=['tests/security/bootstrap.sql',...fs.readdirSync('supabase/migrations').sort().map(f=>'supabase/migrations/'+f),'tests/security/authorization.sql'].map(f=>fs.readFileSync(f,'utf8')).join('\n');
try{
 execFileSync('docker',['run','--rm','-d','--name',name,'-e','POSTGRES_HOST_AUTH_METHOD=trust','postgres:17-alpine'],{stdio:'pipe'});
 let ready=false;for(let i=0;i<30;i++){try{execFileSync('docker',['exec',name,'pg_isready','-U','postgres'],{stdio:'pipe'});ready=true;break}catch{await new Promise(r=>setTimeout(r,500))}}
 if(!ready)throw Error('PostgreSQL did not start');
 const output=execFileSync('docker',['exec','-i',name,'psql','-X','-v','ON_ERROR_STOP=1','-U','postgres'],{input:sql,stdio:['pipe','pipe','pipe']});
 console.log(output.toString().trim().split('\n').slice(-5).join('\n'));
 console.log('Production SQL migrations and authorization assertions passed on PostgreSQL 17.');
}catch(e){console.error('Security tests did not pass. Docker and postgres:17-alpine are required. No production database is used.');if(e.stderr){const detail=e.stderr.toString().trim();console.error(detail);if(process.env.GITHUB_ACTIONS)console.error('::error::'+detail.replace(/%/g,'%25').replace(/\r/g,'%0D').replace(/\n/g,'%0A'));}process.exitCode=1}
finally{try{execFileSync('docker',['rm','-f',name],{stdio:'pipe'})}catch{/* absent if launch failed */}}
