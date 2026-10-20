create function public.test_assert(ok boolean,label text) returns void language plpgsql as $$begin if ok is distinct from true then raise exception 'ASSERTION FAILED: %',label;end if;end$$;
create function public.test_denied(q text,code text) returns void language plpgsql as $$
declare failed boolean:=false; state text;
begin
 begin execute q;exception when others then get stacked diagnostics state=returned_sqlstate; if state<>code then raise exception 'Wrong error: expected %, received % for %',code,state,q;end if;failed:=true;end;
 if not failed then raise exception 'Unauthorized operation unexpectedly succeeded: %',q;end if;
end$$;
set role authenticated;
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select public.ensure_profile('Alice');
select public.apply_operation('10000000-0000-4000-8000-000000000001','place','country:FRA',0,'{"status":"visited","custom_color":"#123456"}');
select public.test_assert((select count(*)=1 from public.place_records),'owner can read record');
select public.test_assert((public.apply_operation('10000000-0000-4000-8000-000000000001','place','country:FRA',0,'{"status":"visited","custom_color":"#123456"}')->'row'->>'revision')='1','idempotent retry');
select public.test_assert((public.apply_operation('10000000-0000-4000-8000-000000000002','place','country:FRA',0,'{"status":"wishlist","custom_color":null}')->>'ok')='false','stale write rejected');
select public.test_assert((select status='visited' from public.place_records where place_id='country:FRA'),'conflict did not overwrite');
select public.test_denied($q$select public.apply_operation('10000000-0000-4000-8000-000000000090','place','country:FRA',null,'{"status":"wishlist","custom_color":null}')$q$,'22023');
select public.test_denied($q$select public.apply_operation('10000000-0000-4000-8000-000000000091',null,'country:FRA',1,'{"status":"wishlist","custom_color":null}')$q$,'22023');
select public.test_denied($q$select public.apply_operation('10000000-0000-4000-8000-000000000092','place',null,1,'{"status":"wishlist","custom_color":null}')$q$,'22023');
select public.test_denied($q$select public.apply_operation('10000000-0000-4000-8000-000000000093','place','country:FRA',1,null)$q$,'22023');
select public.test_denied($q$select public.apply_operation(null,'place','country:FRA',1,'{"status":"wishlist","custom_color":null}')$q$,'22023');
select public.test_assert((select status='visited' from public.place_records where place_id='country:FRA'),'malformed operations cannot bypass revision checks');
select public.test_denied($q$select public.apply_operation('10000000-0000-4000-8000-000000000003','place','country:FRA',1,'{"status":"oops","custom_color":null}')$q$,'23514');
select public.test_denied($q$select public.apply_operation('10000000-0000-4000-8000-000000000004','place','country:FRA',1,'{"status":"visited","custom_color":"red"}')$q$,'23514');
select public.test_denied($q$select public.apply_operation('10000000-0000-4000-8000-000000000005','place','made-up',0,'{"status":"visited","custom_color":null}')$q$,'23503');
select public.apply_operation('10000000-0000-4000-8000-000000000006','journal','20000000-0000-4000-8000-000000000001',0,'{"place_id":"country:FRA","start_date":"2025-01-01","end_date":"2025-01-05","cities":["Paris"],"note":"Private note","deleted":false}');
select public.apply_operation('10000000-0000-4000-8000-000000000007','journal','20000000-0000-4000-8000-000000000002',0,'{"place_id":"country:FRA","start_date":null,"end_date":null,"cities":[],"note":"Another trip","deleted":false}');
select public.test_assert((select count(*)=2 from public.travel_entries),'multiple trips per place');
select public.test_denied($q$select public.apply_operation('10000000-0000-4000-8000-000000000008','journal','20000000-0000-4000-8000-000000000003',0,'{"place_id":"country:FRA","start_date":"2025-02-02","end_date":"2025-01-01","cities":[],"note":"","deleted":false}')$q$,'23514');
select public.apply_operation('10000000-0000-4000-8000-000000000011','journal','20000000-0000-4000-8000-000000000002',1,'{"place_id":"country:FRA","start_date":null,"end_date":null,"cities":[],"note":"Another trip","deleted":true}');
select public.test_assert((public.apply_operation('10000000-0000-4000-8000-000000000012','journal','20000000-0000-4000-8000-000000000002',1,'{"place_id":"country:FRA","start_date":null,"end_date":null,"cities":[],"note":"Stale edit","deleted":false}')->>'ok')='false','stale edit cannot resurrect a deleted trip');
select public.create_invitation()->>'token' as decline_token \gset
select public.create_invitation()->>'token' as token \gset
select public.create_invitation()->>'token' as expired \gset
select public.create_invitation()->>'token' as revoked \gset
select id as revoke_id from jsonb_to_record(public.create_invitation()) as x(id uuid,token text,expires_at timestamptz) \gset
select public.test_denied('select * from public.invitations','42501');
select public.test_denied(format('select public.respond_invitation(%L,true)',:'token'),'P0001');
reset role;
update public.invitations set expires_at=now()-interval '1 second' where token_hash=encode(sha256(convert_to(:'expired','UTF8')),'hex');
update public.invitations set status='revoked' where token_hash=encode(sha256(convert_to(:'revoked','UTF8')),'hex');
set role authenticated;
set request.jwt.claim.sub='bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb';
select public.ensure_profile('Bob');
select public.test_assert((select count(*)=0 from public.place_records),'unrelated B cannot read A before connection');
select public.test_assert((select count(*)=0 from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'private profile hidden');
select public.test_assert((select count(*)=0 from public.travel_entries),'private journal hidden');
select public.test_denied($q$select public.friend_map('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$,'42501');
select public.test_denied($q$insert into public.connections(user_a,user_b,status) values('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa','bbbbbbbb-bbbb-4bbb-8bbb-bbbbbbbbbbbb','accepted')$q$,'42501');
select public.test_denied(format('select public.respond_invitation(%L,true)',:'expired'),'P0001');
select public.test_denied(format('select public.respond_invitation(%L,true)',:'revoked'),'P0001');
select public.test_assert((public.preview_invitation(:'token')->>'display_name')='Alice','preview scoped to token');
select public.respond_invitation(:'decline_token',false);
select public.test_denied(format('select public.respond_invitation(%L,true)',:'decline_token'),'P0001');
select public.respond_invitation(:'token',true) as connection_id \gset
select public.test_assert((select count(*)=1 from public.place_records),'accepted friend can read place record');
select public.test_assert((public.friend_map('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')->'records'->0->>'status')='visited','shared map projection works');
select public.test_assert(not (public.friend_map('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') ? 'entries'),'shared map has no journal');
select public.test_assert(not (public.friend_map('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa') ? 'preferences'),'private preferences omitted');
select public.test_assert((select count(*)=0 from public.travel_entries),'accepted friend cannot read journals');
select public.test_assert((select count(*)=0 from public.profiles where id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'),'friend cannot read private preferences');
select public.test_assert((select display_name='Alice' from public.list_friends()),'only necessary friend profile exposed');
select public.test_denied(format('select public.respond_invitation(%L,true)',:'token'),'P0001');
select public.test_denied($q$update public.place_records set status='lived' where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$q$,'42501');
select public.test_denied($q$delete from public.place_records where user_id='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa'$q$,'42501');
select public.test_denied($q$select public.apply_operation('10000000-0000-4000-8000-000000000009','profile','aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa',1,'{"display_name":"Imposter"}')$q$,'42501');
select public.test_denied($q$select public.apply_operation('10000000-0000-4000-8000-000000000010','journal','20000000-0000-4000-8000-000000000001',0,'{"place_id":"country:FRA","start_date":null,"end_date":null,"cities":[],"note":"Forged","deleted":false}')$q$,'42501');
select public.disconnect_friend(:'connection_id');
select public.test_assert((select count(*)=0 from public.place_records),'disconnect revokes access immediately');
select public.test_denied($q$select public.friend_map('aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa')$q$,'42501');
select public.test_assert((select count(*)=0 from public.list_friends()),'disconnected friend is not listed');
set request.jwt.claim.sub='cccccccc-cccc-4ccc-8ccc-cccccccccccc';
select public.ensure_profile('Charlie');
select public.test_assert((select count(*)=0 from public.place_records),'unrelated third user has no access');
select public.test_denied(format('select public.disconnect_friend(%L)',:'connection_id'),'42501');
select public.test_denied(format('select public.revoke_invitation(%L)',:'revoke_id'),'42501');
set request.jwt.claim.sub='aaaaaaaa-aaaa-4aaa-8aaa-aaaaaaaaaaaa';
select public.test_assert((select count(*)=2 from public.travel_entries),'private entries remain after disconnect');
select public.revoke_invitation(:'revoke_id');
reset role;
set role anon;
set request.jwt.claim.sub='';
select public.test_denied('select * from public.place_records','42501');
select public.test_denied('select public.create_invitation()','42501');
select public.test_denied('select public.ensure_profile()','42501');
reset role;
select 'All production-schema authorization assertions passed.' as result;
