// Original application tables only; Neon manages its own authentication schema.
export const statements = [
`SELECT pg_advisory_xact_lock(913807216)`,
`CREATE TABLE IF NOT EXISTS public.treasure_allowances (
 identity_key text PRIMARY KEY,
 used integer NOT NULL DEFAULT 0 CHECK (used BETWEEN 0 AND 5),
 upload_window timestamptz NOT NULL DEFAULT now(), uploads integer NOT NULL DEFAULT 0,
 updated_at timestamptz NOT NULL DEFAULT now()
)`,
`CREATE TABLE IF NOT EXISTS public.treasure_free_jobs (
 identity_key text NOT NULL REFERENCES public.treasure_allowances(identity_key),
 request_id uuid NOT NULL, user_id text NOT NULL, path text NOT NULL,
 state text NOT NULL DEFAULT 'pending' CHECK (state IN ('pending','active','complete','failed')),
 charged boolean NOT NULL DEFAULT true, provider_id text,
 created_at timestamptz NOT NULL DEFAULT now(),
 PRIMARY KEY (identity_key, request_id)
)`,
`ALTER TABLE public.treasure_allowances ENABLE ROW LEVEL SECURITY`,
`ALTER TABLE public.treasure_free_jobs ENABLE ROW LEVEL SECURITY`,
`REVOKE ALL ON public.treasure_allowances, public.treasure_free_jobs FROM PUBLIC`,
`CREATE OR REPLACE FUNCTION public.treasure_reserve(p_key text,p_request uuid,p_user text,p_path text)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
 DECLARE v_job public.treasure_free_jobs; v_used integer;
 BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key,0));
  INSERT INTO public.treasure_allowances(identity_key) VALUES(p_key) ON CONFLICT DO NOTHING;
  SELECT used INTO v_used FROM public.treasure_allowances WHERE identity_key=p_key FOR UPDATE;
  SELECT * INTO v_job FROM public.treasure_free_jobs WHERE identity_key=p_key AND request_id=p_request;
  IF FOUND THEN
   IF v_job.user_id<>p_user OR v_job.path<>p_path THEN RAISE EXCEPTION 'Request identity mismatch'; END IF;
   RETURN jsonb_build_object('outcome','existing','state',v_job.state,'provider_id',v_job.provider_id,'used',v_used,'remaining',5-v_used);
  END IF;
  IF v_used>=5 THEN RETURN jsonb_build_object('outcome','exhausted','used',v_used,'remaining',0); END IF;
  UPDATE public.treasure_allowances SET used=used+1,updated_at=now() WHERE identity_key=p_key RETURNING used INTO v_used;
  INSERT INTO public.treasure_free_jobs(identity_key,request_id,user_id,path) VALUES(p_key,p_request,p_user,p_path);
  RETURN jsonb_build_object('outcome','new','used',v_used,'remaining',5-v_used);
 END $$`,
`CREATE OR REPLACE FUNCTION public.treasure_finish(p_key text,p_request uuid,p_state text,p_provider text DEFAULT NULL)
 RETURNS jsonb LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
 DECLARE v_job public.treasure_free_jobs; v_used integer;
 BEGIN
  IF p_state NOT IN ('active','failed','complete') THEN RAISE EXCEPTION 'Invalid job state'; END IF;
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key,0));
  SELECT * INTO v_job FROM public.treasure_free_jobs WHERE identity_key=p_key AND request_id=p_request FOR UPDATE;
  IF NOT FOUND THEN RAISE EXCEPTION 'Unknown request'; END IF;
  IF v_job.state='complete' OR v_job.state='failed' THEN
   SELECT used INTO v_used FROM public.treasure_allowances WHERE identity_key=p_key;
   RETURN jsonb_build_object('used',v_used,'remaining',5-v_used);
  END IF;
  IF p_state='failed' AND v_job.charged THEN
   UPDATE public.treasure_allowances SET used=used-1,updated_at=now() WHERE identity_key=p_key;
  END IF;
  UPDATE public.treasure_free_jobs SET state=p_state,charged=CASE WHEN p_state='failed' THEN false ELSE charged END,
   provider_id=COALESCE(p_provider,provider_id) WHERE identity_key=p_key AND request_id=p_request;
  SELECT used INTO v_used FROM public.treasure_allowances WHERE identity_key=p_key;
  RETURN jsonb_build_object('used',v_used,'remaining',5-v_used);
 END $$`,
`CREATE OR REPLACE FUNCTION public.treasure_upload_check(p_key text)
 RETURNS boolean LANGUAGE plpgsql SECURITY INVOKER SET search_path = '' AS $$
 DECLARE v_row public.treasure_allowances;
 BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_key,0));
  INSERT INTO public.treasure_allowances(identity_key) VALUES(p_key) ON CONFLICT DO NOTHING;
  SELECT * INTO v_row FROM public.treasure_allowances WHERE identity_key=p_key FOR UPDATE;
  IF v_row.used>=5 THEN RETURN false; END IF;
  IF v_row.upload_window<now()-interval '1 minute' THEN
   UPDATE public.treasure_allowances SET upload_window=now(),uploads=1 WHERE identity_key=p_key;
   RETURN true;
  END IF;
  IF v_row.uploads>=20 THEN RETURN false; END IF;
  UPDATE public.treasure_allowances SET uploads=uploads+1 WHERE identity_key=p_key;
  RETURN true;
 END $$`,
`REVOKE EXECUTE ON FUNCTION public.treasure_reserve(text,uuid,text,text),public.treasure_finish(text,uuid,text,text),public.treasure_upload_check(text) FROM PUBLIC`
];
