import type {CloudGateway} from './types';
import {AccountCache} from './cache';
// One runner per account in a tab. Cross-tab duplicates are safe via server receipts/CAS.
export class SyncEngine {
 private running?:Promise<void>;
 constructor(private cache:AccountCache,private gateway:CloudGateway,private userId:string){}
 run(){if(this.running)return this.running;this.running=this.perform().finally(()=>{this.running=undefined});return this.running}
 private async perform(){
  // Push durable work first; no local deletion before a confirmed receipt.
  let budget=1000;
  while(budget-->0){const next=(await this.cache.pending(this.userId)).find(p=>!('conflict' in p));if(!next)break;const result=await this.gateway.apply(next);await this.cache.settle(next,result)}
  const snapshot=await this.gateway.snapshot();if(snapshot.profile.id!==this.userId||snapshot.records.some(r=>r.user_id!==this.userId)||snapshot.entries.some(r=>r.user_id!==this.userId))throw Error('Account changed during synchronization');await this.cache.acceptSnapshot(this.userId,snapshot);
 }
}
