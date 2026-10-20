-- Supabase Postgres. No service-role credential is used by the frontend.
begin;
create table public.place_catalog (id text primary key, type text not null check(type in ('country','china_province')));
create function public.valid_preferences(p jsonb) returns boolean language sql immutable set search_path='' as $$
 select coalesce(jsonb_typeof(p)='object' and p->>'language' in ('en','zh') and p->>'defaultMap' in ('world','china') and p->>'theme'='light' and (p->>'defaultVisitedColor') ~ '^#[0-9a-fA-F]{6}$',false)
$$;
create table public.profiles (
 id uuid primary key references auth.users(id) on delete cascade,
 display_name text not null check(length(btrim(display_name)) between 1 and 100),
 preferences jsonb not null default '{"language":"en","defaultMap":"world","defaultVisitedColor":"#88a48b","theme":"light"}' check(public.valid_preferences(preferences)),
 revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.place_records (
 user_id uuid not null references public.profiles(id) on delete cascade,
 place_id text not null references public.place_catalog(id),
 status text not null check(status in ('unvisited','wishlist','visited','lived')),
 custom_color text check(custom_color ~ '^#[0-9a-fA-F]{6}$'),
 revision bigint not null default 1 check(revision>0), updated_at timestamptz not null default now(),
 primary key(user_id,place_id)
);
create function public.valid_cities(c text[]) returns boolean language sql immutable set search_path='' as $$
 select cardinality(c)<=30 and not exists(select 1 from unnest(c) x where x is null or length(btrim(x)) not between 1 and 80)
$$;
create table public.travel_entries (
 id uuid primary key, user_id uuid not null references public.profiles(id) on delete cascade,
 place_id text not null references public.place_catalog(id), start_date date, end_date date,
 cities text[] not null default '{}' check(public.valid_cities(cities)),
 note text not null default '' check(length(note)<=4000), deleted boolean not null default false,
 revision bigint not null default 1 check(revision>0),
 created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
 check(end_date is null or start_date is null or end_date>=start_date),
 check(start_date is null or start_date between date '0001-01-01' and date '9999-12-31'),
 check(end_date is null or end_date between date '0001-01-01' and date '9999-12-31')
);
create index travel_entries_user on public.travel_entries(user_id);
create table public.connections (
 id uuid primary key default gen_random_uuid(), user_a uuid not null references public.profiles(id) on delete cascade,
 user_b uuid not null references public.profiles(id) on delete cascade,
 status text not null check(status in ('accepted','disconnected')),
 created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
 check(user_a<user_b),unique(user_a,user_b)
);
create table public.invitations (
 id uuid primary key default gen_random_uuid(), created_by uuid not null references public.profiles(id) on delete cascade,
 token_hash text not null unique, expires_at timestamptz not null default(now()+interval '7 days'),
 status text not null default 'pending' check(status in ('pending','accepted','declined','revoked')),
 accepted_by uuid references public.profiles(id) on delete set null, created_at timestamptz not null default now()
);
create index invitations_creator on public.invitations(created_by);
create table public.operation_receipts (
 user_id uuid not null references public.profiles(id) on delete cascade,id uuid not null,
 request jsonb not null,result jsonb not null,created_at timestamptz not null default now(),primary key(user_id,id)
);

create function public.is_connected(p_owner uuid) returns boolean language sql stable security definer set search_path='' as $$
 select auth.uid() is not null and exists(select 1 from public.connections c where c.status='accepted' and
 ((c.user_a=auth.uid() and c.user_b=p_owner) or(c.user_b=auth.uid() and c.user_a=p_owner)))
$$;

alter table public.place_catalog enable row level security;
alter table public.profiles enable row level security;
alter table public.place_records enable row level security;
alter table public.travel_entries enable row level security;
alter table public.connections enable row level security;
alter table public.invitations enable row level security;
alter table public.operation_receipts enable row level security;
create policy catalog_read on public.place_catalog for select to anon,authenticated using(true);
create policy own_profile on public.profiles for select to authenticated using(id=auth.uid());
create policy shared_places on public.place_records for select to authenticated using(user_id=auth.uid() or public.is_connected(user_id));
create policy private_journal on public.travel_entries for select to authenticated using(user_id=auth.uid());
create policy own_connections on public.connections for select to authenticated using(user_a=auth.uid() or user_b=auth.uid());
-- No direct invitation/receipt access or direct mutation policies. Only narrow RPCs below.
revoke all on public.profiles,public.place_records,public.travel_entries,public.connections,public.invitations,public.operation_receipts,public.place_catalog from anon,authenticated;
grant select on public.place_catalog to anon,authenticated;
grant select on public.profiles,public.place_records,public.travel_entries,public.connections to authenticated;

create function public.ensure_profile(p_name text default 'Traveler') returns public.profiles language plpgsql security definer set search_path='' as $$
declare r public.profiles; u uuid:=auth.uid();
begin
 if u is null then raise exception 'Authentication required' using errcode='42501';end if;
 insert into public.profiles(id,display_name) values(u,p_name) on conflict(id) do nothing;
 select * into r from public.profiles where id=u;return r;
end $$;

-- CAS + idempotency for place records, journal tombstones, and profile/preferences.
create function public.apply_operation(p_operation_id uuid,p_kind text,p_entity_id text,p_base_revision bigint,p_payload jsonb)
 returns jsonb language plpgsql security definer set search_path='' as $$
declare u uuid:=auth.uid(); req jsonb; prior public.operation_receipts; current_row jsonb; result_row jsonb; result jsonb; rev bigint;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_base_revision<0 or p_kind not in ('place','journal','profile') or jsonb_typeof(p_payload)<>'object' then raise exception 'Invalid operation';end if;
 req:=jsonb_build_object('kind',p_kind,'entity',p_entity_id,'base',p_base_revision,'payload',p_payload);
 perform pg_advisory_xact_lock(hashtextextended(u::text,0));
 select * into prior from public.operation_receipts where user_id=u and id=p_operation_id;
 if found then
  if prior.request<>req then raise exception 'Operation ID reused with different payload';end if;
  return prior.result;
 end if;
 if p_kind='place' then
  select to_jsonb(r),r.revision into current_row,rev from public.place_records r where user_id=u and place_id=p_entity_id for update;
 elsif p_kind='journal' then
  select to_jsonb(r),r.revision into current_row,rev from public.travel_entries r where id=p_entity_id::uuid and user_id=u for update;
 else
  if p_entity_id<>u::text then raise exception 'Profile owner mismatch' using errcode='42501';end if;
  select to_jsonb(r),r.revision into current_row,rev from public.profiles r where id=u for update;
 end if;
 if coalesce(rev,0)<>p_base_revision then result:=jsonb_build_object('ok',false,'current',current_row);
 else
  if p_kind='place' then
   insert into public.place_records(user_id,place_id,status,custom_color,revision)
    values(u,p_entity_id,p_payload->>'status',p_payload->>'custom_color',coalesce(rev,0)+1)
    on conflict(user_id,place_id) do update set status=excluded.status,custom_color=excluded.custom_color,revision=excluded.revision,updated_at=clock_timestamp()
    returning to_jsonb(place_records.*) into result_row;
  elsif p_kind='journal' then
   -- An existing ID owned by someone else cannot be modified or reassigned.
   insert into public.travel_entries(id,user_id,place_id,start_date,end_date,cities,note,deleted,revision)
    values(p_entity_id::uuid,u,p_payload->>'place_id',nullif(p_payload->>'start_date','')::date,nullif(p_payload->>'end_date','')::date,
    array(select jsonb_array_elements_text(p_payload->'cities')),p_payload->>'note',coalesce((p_payload->>'deleted')::boolean,false),coalesce(rev,0)+1)
    on conflict(id) do update set place_id=excluded.place_id,start_date=excluded.start_date,end_date=excluded.end_date,cities=excluded.cities,note=excluded.note,deleted=excluded.deleted,revision=excluded.revision,updated_at=clock_timestamp()
    where travel_entries.user_id=u returning to_jsonb(travel_entries.*) into result_row;
   if result_row is null then raise exception 'Entry owner mismatch' using errcode='42501';end if;
  else
   update public.profiles set display_name=p_payload->>'display_name',preferences=p_payload->'preferences',revision=revision+1,updated_at=clock_timestamp() where id=u returning to_jsonb(profiles.*) into result_row;
   if result_row is null then raise exception 'Profile missing';end if;
  end if;
  result:=jsonb_build_object('ok',true,'row',result_row);
 end if;
 insert into public.operation_receipts(user_id,id,request,result) values(u,p_operation_id,req,result);
 return result;
end $$;

create function public.list_friends() returns table(id uuid,display_name text,connection_id uuid) language sql stable security definer set search_path='' as $$
 select p.id,p.display_name,c.id from public.connections c join public.profiles p on p.id=case when c.user_a=auth.uid() then c.user_b else c.user_a end
 where c.status='accepted' and (c.user_a=auth.uid() or c.user_b=auth.uid())
$$;
create function public.list_invitations() returns table(id uuid,expires_at timestamptz,status text) language sql stable security definer set search_path='' as $$
 select i.id,i.expires_at,case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end from public.invitations i where created_by=auth.uid() order by created_at desc limit 100
$$;
create function public.create_invitation() returns jsonb language plpgsql security definer set search_path='' as $$
declare token text; r public.invitations;u uuid:=auth.uid();
begin
 if u is null then raise exception 'Authentication required' using errcode='42501';end if;
 perform pg_advisory_xact_lock(hashtextextended(u::text,1));
 if (select count(*) from public.invitations where created_by=u and status='pending' and expires_at>now())>=10 then raise exception 'Revoke an invitation before creating another';end if;
 token:=replace(gen_random_uuid()::text||gen_random_uuid()::text,'-','');
 insert into public.invitations(created_by,token_hash) values(u,encode(sha256(convert_to(token,'UTF8')),'hex')) returning * into r;
 return jsonb_build_object('id',r.id,'token',token,'expires_at',r.expires_at);
end $$;
create function public.preview_invitation(p_token text) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare r public.invitations;n text;
begin
 if auth.uid() is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation';end if;
 select * into r from public.invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex');
 if not found or r.status<>'pending' or r.expires_at<=now() or r.created_by=auth.uid() then raise exception 'Invitation unavailable, expired or already used';end if;
 select display_name into n from public.profiles where id=r.created_by;
 return jsonb_build_object('display_name',n,'expires_at',r.expires_at);
end $$;
create function public.respond_invitation(p_token text,p_accept boolean) returns uuid language plpgsql security definer set search_path='' as $$
declare r public.invitations;u uuid:=auth.uid();cid uuid;
begin
 if u is null then raise exception 'Authentication required' using errcode='42501';end if;
 if p_token !~ '^[a-f0-9]{64}$' then raise exception 'Invalid invitation';end if;
 select * into r from public.invitations where token_hash=encode(sha256(convert_to(p_token,'UTF8')),'hex') for update;
 if not found or r.status<>'pending' or r.expires_at<=now() or r.created_by=u then raise exception 'Invitation unavailable, expired or already used';end if;
 if not exists(select 1 from public.profiles where id=u) then raise exception 'Create your profile first';end if;
 if p_accept then
  insert into public.connections(user_a,user_b,status) values(least(u,r.created_by),greatest(u,r.created_by),'accepted')
   on conflict(user_a,user_b) do update set status='accepted',updated_at=clock_timestamp() returning id into cid;
 end if;
 update public.invitations set status=case when p_accept then 'accepted' else 'declined' end,accepted_by=u where id=r.id;
 return cid;
end $$;
create function public.revoke_invitation(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.invitations set status='revoked' where id=p_id and created_by=auth.uid() and status='pending';
 if not found then raise exception 'Invitation unavailable' using errcode='42501';end if;
end $$;
create function public.disconnect_friend(p_id uuid) returns void language plpgsql security definer set search_path='' as $$
begin
 update public.connections set status='disconnected',updated_at=clock_timestamp() where id=p_id and (user_a=auth.uid() or user_b=auth.uid()) and status='accepted';
 if not found then raise exception 'Connection unavailable' using errcode='42501';end if;
end $$;
-- PostgreSQL defaults EXECUTE to PUBLIC: explicitly revoke it for every app function.
revoke execute on function public.valid_preferences(jsonb),public.valid_cities(text[]),public.is_connected(uuid),public.ensure_profile(text),public.apply_operation(uuid,text,text,bigint,jsonb),public.list_friends(),public.list_invitations(),public.create_invitation(),public.preview_invitation(text),public.respond_invitation(text,boolean),public.revoke_invitation(uuid),public.disconnect_friend(uuid) from public,anon;
grant execute on function public.is_connected(uuid),public.ensure_profile(text),public.apply_operation(uuid,text,text,bigint,jsonb),public.list_friends(),public.list_invitations(),public.create_invitation(),public.preview_invitation(text),public.respond_invitation(text,boolean),public.revoke_invitation(uuid),public.disconnect_friend(uuid) to authenticated;
commit;
