import type {TravelData} from '../types';
import {recordsFromData} from './model';
import {colorFor} from '../services/travel';
import {serializeBackup} from '../services/backup';
import {AccountCache} from './cache';
export async function migrationFingerprint(data:TravelData){const bytes=new TextEncoder().encode(serializeBackup(data));const hash=await crypto.subtle.digest('SHA-256',bytes);return [...new Uint8Array(hash)].map(b=>b.toString(16).padStart(2,'0')).join('')}
export function migrationPreview(source:TravelData,target:TravelData){const records=recordsFromData(source),existing=new Set(recordsFromData(target).map(r=>r.place_id));return {records,conflicts:records.filter(r=>existing.has(r.place_id)),newRecords:records.filter(r=>!existing.has(r.place_id))}}
export async function queueMigration(cache:AccountCache,source:TravelData,target:TravelData,replaceExisting:boolean){
 const fingerprint=await migrationFingerprint(source),userId=target.profile.id;
 if(await cache.migrations.get([userId,fingerprint]))throw Error('This backup was already imported');
 const preview=migrationPreview(source,target);
 const entries=await Promise.all((source.entries||[]).filter(e=>!e.deleted).map(async entry=>{
  const bytes=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(`${userId}:${entry.id}`)));bytes[6]=(bytes[6]&15)|64;bytes[8]=(bytes[8]&63)|128;const h=[...bytes.slice(0,16)].map(b=>b.toString(16).padStart(2,'0')).join('');
  return {entry,id:`${h.slice(0,8)}-${h.slice(8,12)}-${h.slice(12,16)}-${h.slice(16,20)}-${h.slice(20)}`};
 }));
 await cache.transaction('rw',cache.rows,cache.outbox,cache.migrations,async()=>{
  if(await cache.migrations.get([userId,fingerprint]))throw Error('This backup was already imported');
  for(const r of replaceExisting?preview.records:preview.newRecords)await cache.queue(userId,'place',r.place_id,{status:r.status,custom_color:r.custom_color||(r.status!=="unvisited"?colorFor(source,r.place_id):null)});
  for(const {entry,id} of entries)if(!target.entries?.some(e=>e.id===id))await cache.queue(userId,'journal',id,{place_id:entry.place_id,start_date:entry.start_date,end_date:entry.end_date,cities:entry.cities,note:entry.note,deleted:false});
  await cache.migrations.put({userId,fingerprint,completedAt:'queued'});
 });return fingerprint;
}
