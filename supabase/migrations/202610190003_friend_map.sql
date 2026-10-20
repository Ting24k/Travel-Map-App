begin;
-- Share only the public display name, default map color, and place records.
-- Private preferences, email and all journal entries remain unavailable.
create function public.friend_map(p_friend uuid) returns jsonb language plpgsql stable security definer set search_path='' as $$
declare result jsonb;
begin
 if auth.uid() is null or not public.is_connected(p_friend) then raise exception 'Accepted connection required' using errcode='42501';end if;
 select jsonb_build_object('id',p.id,'display_name',p.display_name,'default_color',p.preferences->>'defaultVisitedColor',
 'records',coalesce((select jsonb_agg(to_jsonb(r)) from public.place_records r where r.user_id=p_friend),'[]'::jsonb)) into result
 from public.profiles p where p.id=p_friend;
 return result;
end $$;
revoke execute on function public.friend_map(uuid) from public,anon;
grant execute on function public.friend_map(uuid) to authenticated;
commit;
