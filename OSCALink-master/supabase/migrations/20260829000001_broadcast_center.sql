-- OSCALink — Broadcast Center
-- Turns the ad-hoc "Notifications" module into a broadcast management panel:
-- create / schedule / edit / send-now / delete announcements delivered to the
-- senior mobile app, tagged by category (general, priority, barangay, id_collection).

-- ---------------------------------------------------------------------------
-- 1. Broadcast master records
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  title text NOT NULL,
  message text NOT NULL,
  type text NOT NULL DEFAULT 'info',
  category text NOT NULL DEFAULT 'general',
  target text NOT NULL DEFAULT 'all',
  target_barangay text,
  target_senior_id uuid,
  recipient_count integer NOT NULL DEFAULT 0,
  created_by uuid,
  send_at timestamptz,
  status text NOT NULL DEFAULT 'sent',
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT broadcasts_type_check CHECK (type = ANY (ARRAY['info','success','warning']::text[])),
  CONSTRAINT broadcasts_category_check CHECK (category = ANY (ARRAY['general','priority','barangay','id_collection']::text[])),
  CONSTRAINT broadcasts_target_check CHECK (target = ANY (ARRAY['all','pensioners','non_pensioners','barangay','barangay_presidents','senior']::text[])),
  CONSTRAINT broadcasts_status_check CHECK (status = ANY (ARRAY['sent','scheduled','cancelled']::text[])),
  CONSTRAINT broadcasts_created_by_fkey FOREIGN KEY (created_by) REFERENCES auth.users (id) ON DELETE SET NULL
);

-- ---------------------------------------------------------------------------
-- 2. Delivery metadata on recipient notification rows
--    - broadcast_id : groups all recipient rows of one broadcast (cascade via FK)
--    - send_at      : future timestamp = scheduled (hidden from mobile until due)
--    - category     : broadcast tag surfaced in the app UI
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS broadcast_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS send_at timestamptz;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category text;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_broadcast_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_broadcast_id_fkey
  FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notifications_broadcast_id_idx ON public.notifications (broadcast_id);
CREATE INDEX IF NOT EXISTS notifications_send_at_idx ON public.notifications (send_at);

-- ---------------------------------------------------------------------------
-- 3. RLS — only OSCA roles may manage broadcast master records
-- ---------------------------------------------------------------------------
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_role_valid text := '(''super_admin'',''admin'',''osca_head'',''osca_staff'')';
BEGIN
  EXECUTE format('
    DROP POLICY IF EXISTS broadcasts_select_osca ON public.broadcasts;
    CREATE POLICY broadcasts_select_osca ON public.broadcasts
      FOR SELECT TO authenticated
      USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN %s)', v_role_valid);

  EXECUTE format('
    DROP POLICY IF EXISTS broadcasts_insert_osca ON public.broadcasts;
    CREATE POLICY broadcasts_insert_osca ON public.broadcasts
      FOR INSERT TO authenticated
      WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN %s)', v_role_valid);

  EXECUTE format('
    DROP POLICY IF EXISTS broadcasts_update_osca ON public.broadcasts;
    CREATE POLICY broadcasts_update_osca ON public.broadcasts
      FOR UPDATE TO authenticated
      USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN %s)', v_role_valid);

  EXECUTE format('
    DROP POLICY IF EXISTS broadcasts_delete_osca ON public.broadcasts;
    CREATE POLICY broadcasts_delete_osca ON public.broadcasts
      FOR DELETE TO authenticated
      USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN %s)', v_role_valid);
END $$;

GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;

-- Refresh the PostgREST schema cache so public.broadcasts is recognized by the
-- API immediately. Fixes: "Could not find the table 'public.broadcasts' in the
-- schema cache".
NOTIFY pgrst, 'reload schema';