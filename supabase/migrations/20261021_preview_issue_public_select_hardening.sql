-- Preview board: anonymous attribution must not expose the submitter's auth UUID.
-- The UUID is retained privately so insert RLS can validate the authenticated owner.
REVOKE SELECT ON public.preview_sdas_issues FROM anon, authenticated;
GRANT SELECT (id,issue_code,title,issue_url,display_name,is_anonymous,created_at)
 ON public.preview_sdas_issues TO anon, authenticated;
