-- OSCALink — Fix "Could not find the table 'public.broadcasts' in the schema cache"
-- This migration is idempotent: safe to run multiple times.
-- It (re)creates the table, reconciles missing columns, applies RLS, and
-- reloads the PostgREST schema cache so the API recognizes it immediately.
--
-- Column map to the app code:
--   notification_type -> type, target_audience -> target,
--   scheduled_at -> send_at, is_scheduled -> status = 'scheduled'
--   (matches frontend: web/src/app/actions/notifications.ts)

-- ---------------------------------------------------------------------------
-- 1. Create the table (if missing) with full schema
-- ---------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.broadcasts (
  id              uuid        PRIMARY KEY DEFAULT gen_random_uuid(),
  title           text        NOT NULL,
  message         text        NOT NULL,
  type            text        NOT NULL DEFAULT 'info',
  category        text        NOT NULL DEFAULT 'general',
  target          text        NOT NULL DEFAULT 'all',
  target_barangay text,
  target_senior_id uuid,
  recipient_count integer     NOT NULL DEFAULT 0,
  created_by      uuid        REFERENCES auth.users (id) ON DELETE SET NULL,
  send_at         timestamptz,
  status          text        NOT NULL DEFAULT 'sent',
  created_at      timestamptz NOT NULL DEFAULT now(),
  updated_at      timestamptz NOT NULL DEFAULT now(),

  CONSTRAINT broadcasts_type_check     CHECK (type     IN ('info','success','warning')),
  CONSTRAINT broadcasts_category_check CHECK (category IN ('general','priority','barangay','id_collection')),
  CONSTRAINT broadcasts_target_check   CHECK (target   IN ('all','pensioners','non_pensioners','barangay','barangay_presidents','senior')),
  CONSTRAINT broadcasts_status_check   CHECK (status   IN ('sent','scheduled','cancelled'))
);

-- ---------------------------------------------------------------------------
-- 2. Reconcile missing columns (for a partially-created table)
-- ---------------------------------------------------------------------------
DO $$
BEGIN
  IF to_regclass('public.broadcasts') IS NOT NULL THEN
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS title           text;
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS message         text;
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS type            text        NOT NULL DEFAULT 'info';
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS category        text        NOT NULL DEFAULT 'general';
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS target          text        NOT NULL DEFAULT 'all';
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS target_barangay text;
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS target_senior_id uuid;
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS recipient_count integer     NOT NULL DEFAULT 0;
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS created_by      uuid;
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS send_at         timestamptz;
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS status          text        NOT NULL DEFAULT 'sent';
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS created_at      timestamptz NOT NULL DEFAULT now();
    ALTER TABLE public.broadcasts ADD COLUMN IF NOT EXISTS updated_at      timestamptz NOT NULL DEFAULT now();
  END IF;
END $$;

-- ---------------------------------------------------------------------------
-- 3. Delivery metadata columns on public.notifications (broadcast recipients)
-- ---------------------------------------------------------------------------
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS broadcast_id uuid;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS send_at      timestamptz;
ALTER TABLE public.notifications ADD COLUMN IF NOT EXISTS category     text;

ALTER TABLE public.notifications DROP CONSTRAINT IF EXISTS notifications_broadcast_id_fkey;
ALTER TABLE public.notifications
  ADD CONSTRAINT notifications_broadcast_id_fkey
  FOREIGN KEY (broadcast_id) REFERENCES public.broadcasts (id) ON DELETE CASCADE;

CREATE INDEX IF NOT EXISTS notifications_broadcast_id_idx ON public.notifications (broadcast_id);
CREATE INDEX IF NOT EXISTS notifications_send_at_idx      ON public.notifications (send_at);

-- ---------------------------------------------------------------------------
-- 4. RLS — only OSCA roles may manage broadcast records
-- ---------------------------------------------------------------------------
ALTER TABLE public.broadcasts ENABLE ROW LEVEL SECURITY;

DO $$
DECLARE
  v_roles text := '(''super_admin'',''admin'',''osca_head'',''osca_staff'')';
BEGIN
  -- SELECT
  DROP POLICY IF EXISTS broadcasts_select_osca ON public.broadcasts;
  EXECUTE format('
    CREATE POLICY broadcasts_select_osca ON public.broadcasts
      FOR SELECT TO authenticated
      USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN %s)', v_roles);

  -- INSERT
  DROP POLICY IF EXISTS broadcasts_insert_osca ON public.broadcasts;
  EXECUTE format('
    CREATE POLICY broadcasts_insert_osca ON public.broadcasts
      FOR INSERT TO authenticated
      WITH CHECK ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN %s)', v_roles);

  -- UPDATE
  DROP POLICY IF EXISTS broadcasts_update_osca ON public.broadcasts;
  EXECUTE format('
    CREATE POLICY broadcasts_update_osca ON public.broadcasts
      FOR UPDATE TO authenticated
      USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN %s)', v_roles);

  -- DELETE
  DROP POLICY IF EXISTS broadcasts_delete_osca ON public.broadcasts;
  EXECUTE format('
    CREATE POLICY broadcasts_delete_osca ON public.broadcasts
      FOR DELETE TO authenticated
      USING ((SELECT role FROM public.profiles WHERE id = auth.uid()) IN %s)', v_roles);
END $$;

-- ---------------------------------------------------------------------------
-- 5. Grants
-- ---------------------------------------------------------------------------
GRANT SELECT, INSERT, UPDATE, DELETE ON public.broadcasts TO authenticated;

-- ---------------------------------------------------------------------------
-- 6. Reload PostgREST schema cache
--    This fixes: "Could not find the table 'public.broadcasts' in the schema cache"
-- ---------------------------------------------------------------------------
NOTIFY pgrst, 'reload schema';

-- ---------------------------------------------------------------------------
-- 7. Verification (run manually to confirm)
-- ---------------------------------------------------------------------------
-- SELECT
--   (to_regclass('public.broadcasts') IS NOT NULL) AS table_exists,
--   (SELECT count(*) FROM information_schema.columns
--      WHERE table_schema = 'public' AND table_name = 'broadcasts') AS column_count,
--   (SELECT string_agg(policyname, ', ' ORDER BY policyname) FROM pg_policies
--      WHERE schemaname = 'public' AND tablename = 'broadcasts') AS policies;
