-- Production SDAS Issue Council: independent of preview data and Fleet Manager.
CREATE TABLE IF NOT EXISTS public.sdas_issues (
 id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
 issue_code text NOT NULL UNIQUE CHECK (issue_code ~ '^STARC-[0-9]{1,10}$'),
 title text NOT NULL CHECK (char_length(trim(title)) BETWEEN 8 AND 160),
 issue_url text NOT NULL CHECK (issue_url = 'https://issue-council.robertsspaceindustries.com/projects/STAR-CITIZEN/issues/' || issue_code),
 submitted_by uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
 display_name text NOT NULL DEFAULT 'Anonymous' CHECK (char_length(display_name) BETWEEN 1 AND 60),
 is_anonymous boolean NOT NULL DEFAULT true,
 created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.sdas_issues ENABLE ROW LEVEL SECURITY;
-- Do not expose submitter account identifiers, even on anonymous submissions.
REVOKE ALL ON public.sdas_issues FROM anon,authenticated;
GRANT SELECT (id,issue_code,title,issue_url,display_name,is_anonymous,created_at) ON public.sdas_issues TO anon,authenticated;
GRANT INSERT,DELETE ON public.sdas_issues TO authenticated;
CREATE POLICY "sdas issues public read" ON public.sdas_issues FOR SELECT TO anon,authenticated USING (true);
CREATE POLICY "sdas verified member insert" ON public.sdas_issues FOR INSERT TO authenticated WITH CHECK (
 (SELECT auth.uid())=submitted_by AND (SELECT public.is_sdas_member())
 AND ((is_anonymous AND display_name='Anonymous') OR (NOT is_anonymous AND display_name<>'Anonymous'))
 AND issue_url='https://issue-council.robertsspaceindustries.com/projects/STAR-CITIZEN/issues/'||issue_code
);
CREATE POLICY "sdas superadmin moderate issues" ON public.sdas_issues FOR DELETE TO authenticated USING ((SELECT public.can_admin_sdas()));
CREATE INDEX IF NOT EXISTS sdas_issues_newest ON public.sdas_issues(created_at DESC);
