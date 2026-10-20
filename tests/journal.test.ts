import {it,expect} from 'vitest';
import {emptyData,setStatus,isVisited} from '../src/services/travel';
import {placeById} from '../src/data/catalog';
import {validateEntry} from '../src/collaboration/model';
import {parseBackup,serializeBackup} from '../src/services/backup';
import type {TravelEntry} from '../src/collaboration/types';
const make=():TravelEntry=>({id:crypto.randomUUID(),user_id:'local',place_id:'country:FRA',start_date:'2025-01-01',end_date:'2025-01-10',cities:['Paris'],note:'A memory',deleted:false,revision:0,created_at:new Date().toISOString(),updated_at:new Date().toISOString()});
it('validates optional dates, real calendar dates, cities and note limits',()=>{const e=make();expect(validateEntry(e)).toBe(e);expect(validateEntry({...e,start_date:null,end_date:null})).toBeTruthy();for(const patch of [{start_date:'2025-02-30'},{end_date:'2024-01-01'},{cities:['a'.repeat(81)]},{cities:Array(31).fill('Paris')},{note:'a'.repeat(4001)}])expect(()=>validateEntry({...e,...patch})).toThrow()});
it('preserves multiple private entries through status changes and v2 backup round trip',()=>{let d=emptyData();const a={...make(),user_id:d.profile.id},b={...make(),user_id:d.profile.id};d={...setStatus(d,placeById.get('country:FRA')!,'lived'),entries:[a,b]};expect(isVisited(d,'country:FRA')).toBe(true);d=setStatus(d,placeById.get('country:FRA')!,'wishlist');expect(isVisited(d,'country:FRA')).toBe(false);expect(d.entries).toHaveLength(2);expect(parseBackup(serializeBackup(d))).toEqual(d)});
