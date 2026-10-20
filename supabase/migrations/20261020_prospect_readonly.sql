-- Prospect access: explicitly verified Discord Prospect may READ only org-shared data.
-- Existing full-member write policies remain unchanged.
ALTER TABLE public.sdas_memberships DROP CONSTRAINT sdas_memberships_role_check;
ALTER TABLE public.sdas_memberships ADD CONSTRAINT sdas_memberships_role_check CHECK (role IN ('member','officer','admin','prospect'));
ALTER TABLE public.sdas_memberships DROP CONSTRAINT discord_rank_valid;
ALTER TABLE public.sdas_memberships ADD CONSTRAINT discord_rank_valid CHECK (discord_rank IS NULL OR discord_rank IN ('super_admin','board_member','patch','prospect','restricted','unverified'));
ALTER TABLE public.sdas_role_config ADD COLUMN IF NOT EXISTS prospect_role_id text;
ALTER TABLE public.sdas_role_config ADD CONSTRAINT prospect_role_shape CHECK (prospect_role_id IS NULL OR prospect_role_id ~ '^[0-9]{15,22}$');
UPDATE public.sdas_role_config SET prospect_role_id='1519150078546411530', updated_at=now() WHERE singleton=true;
CREATE OR REPLACE FUNCTION public.is_sdas_prospect(p_user uuid DEFAULT auth.uid())
RETURNS boolean LANGUAGE sql STABLE SECURITY INVOKER SET search_path=''
AS $$
  SELECT p_user IS NOT NULL AND p_user=(SELECT auth.uid())
    AND EXISTS (
      SELECT 1 FROM public.sdas_memberships m
      WHERE m.user_id=p_user AND m.role='prospect' AND m.discord_rank='prospect'
      AND m.last_role_checked_at>now()-interval '12 hours'
    );
$$;
REVOKE ALL ON FUNCTION public.is_sdas_prospect(uuid) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_sdas_prospect(uuid) TO authenticated;
CREATE POLICY "prospects read shared ships" ON public.fleet_ships FOR SELECT TO authenticated
 USING ((SELECT public.is_sdas_prospect()) AND org_visible);
CREATE POLICY "prospects read shared pilots" ON public.pilot_profiles FOR SELECT TO authenticated
 USING ((SELECT public.is_sdas_prospect()) AND (SELECT public.sdas_pilot_is_verified(pilot_profiles.user_id)));
CREATE POLICY "prospects read shared loadouts" ON public.ship_loadouts FOR SELECT TO authenticated
 USING ((SELECT public.is_sdas_prospect()) AND EXISTS (
   SELECT 1 FROM public.fleet_ships s WHERE s.id=ship_loadouts.ship_id AND s.org_visible AND s.show_loadout
 ));
CREATE POLICY "prospects read shared photos" ON public.ship_photos FOR SELECT TO authenticated
 USING ((SELECT public.is_sdas_prospect()) AND EXISTS (
   SELECT 1 FROM public.fleet_ships s WHERE s.id=ship_photos.ship_id AND s.org_visible
 ));
CREATE POLICY "prospects read shared photo objects" ON storage.objects FOR SELECT TO authenticated
 USING (bucket_id='fleet-photos' AND (SELECT public.is_sdas_prospect()) AND EXISTS (
   SELECT 1 FROM public.ship_photos p JOIN public.fleet_ships s ON s.id=p.ship_id
   WHERE p.object_path=objects.name AND s.org_visible
 ));
-- Existing Member/Officer/Admin access now also requires an authoritative
-- Discord role check. Old transitional "member" rows cannot bypass Prospect.
CREATE OR REPLACE FUNCTION public.is_sdas_member(p_user uuid DEFAULT auth.uid())
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
 AS $
   SELECT p_user IS NOT NULL AND p_user=(SELECT auth.uid())
   AND EXISTS(
     SELECT 1 FROM public.sdas_memberships m
     WHERE m.user_id=p_user
       AND ((m.role='admin' AND m.discord_rank='super_admin')
         OR (m.role='officer' AND m.discord_rank='board_member')
         OR (m.role='member' AND m.discord_rank='patch'))
       AND m.last_role_checked_at>now()-interval '12 hours'
   );
 $;
CREATE OR REPLACE FUNCTION public.can_admin_sdas(p_user uuid DEFAULT auth.uid())
 RETURNS boolean LANGUAGE sql STABLE SECURITY DEFINER SET search_path=''
 AS $
   SELECT p_user IS NOT NULL AND p_user=(SELECT auth.uid())
   AND EXISTS(
     SELECT 1 FROM public.sdas_memberships m
     WHERE m.user_id=p_user AND m.role='admin'
       AND m.discord_rank='super_admin'
       AND m.last_role_checked_at>now()-interval '12 hours'
   );
 $;
UPDATE public.sdas_role_config SET enforce_roles=true,updated_at=now() WHERE singleton=true;

-- Prospects cannot update their own pilot profile (or write fleet data).
DROP POLICY IF EXISTS "pilot profile update own" ON public.pilot_profiles;
CREATE POLICY "pilot profile update own" ON public.pilot_profiles FOR UPDATE TO authenticated
 USING (user_id=(SELECT auth.uid()) AND (SELECT public.is_sdas_member()))
 WITH CHECK (user_id=(SELECT auth.uid()) AND (SELECT public.is_sdas_member()));