-- OSCALink Revisions — Wave 7b: PII encryption at rest
-- Encrypts sensitive government identification numbers (PhilHealth, SSS, GSIS, TIN, PVAO)
-- using pgcrypto. Plaintext is removed on write; decryption is restricted to OSCA roles.

CREATE EXTENSION IF NOT EXISTS pgcrypto WITH SCHEMA extensions;

-- Private key store (schema is NOT exposed to PostgREST).
CREATE SCHEMA IF NOT EXISTS internal;
CREATE TABLE IF NOT EXISTS internal.app_config (
  id int PRIMARY KEY DEFAULT 1 CHECK (id = 1),
  pii_key text NOT NULL
);
INSERT INTO internal.app_config (id, pii_key)
SELECT 1, extensions.gen_random_uuid()::text || extensions.gen_random_uuid()::text
WHERE NOT EXISTS (SELECT 1 FROM internal.app_config WHERE id = 1);

ALTER TABLE public.seniors
  ADD COLUMN IF NOT EXISTS enc_philhealth_no bytea,
  ADD COLUMN IF NOT EXISTS enc_sss_no bytea,
  ADD COLUMN IF NOT EXISTS enc_gsis_no bytea,
  ADD COLUMN IF NOT EXISTS enc_tin bytea,
  ADD COLUMN IF NOT EXISTS enc_pvao_no bytea;

-- Encrypt on write and clear plaintext.
CREATE OR REPLACE FUNCTION public.encrypt_senior_pii()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, internal
AS $$
DECLARE
  k text;
BEGIN
  SELECT pii_key INTO k FROM internal.app_config WHERE id = 1;
  IF k IS NULL THEN
    RETURN NEW;
  END IF;

  IF NEW.philhealth_no IS NOT NULL THEN
    NEW.enc_philhealth_no := extensions.pgp_sym_encrypt(NEW.philhealth_no, k);
    NEW.philhealth_no := NULL;
  END IF;
  IF NEW.sss_no IS NOT NULL THEN
    NEW.enc_sss_no := extensions.pgp_sym_encrypt(NEW.sss_no, k);
    NEW.sss_no := NULL;
  END IF;
  IF NEW.gsis_no IS NOT NULL THEN
    NEW.enc_gsis_no := extensions.pgp_sym_encrypt(NEW.gsis_no, k);
    NEW.gsis_no := NULL;
  END IF;
  IF NEW.tin IS NOT NULL THEN
    NEW.enc_tin := extensions.pgp_sym_encrypt(NEW.tin, k);
    NEW.tin := NULL;
  END IF;
  IF NEW.pvao_no IS NOT NULL THEN
    NEW.enc_pvao_no := extensions.pgp_sym_encrypt(NEW.pvao_no, k);
    NEW.pvao_no := NULL;
  END IF;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_encrypt_senior_pii ON public.seniors;
CREATE TRIGGER trg_encrypt_senior_pii
BEFORE INSERT OR UPDATE OF philhealth_no, sss_no, gsis_no, tin, pvao_no ON public.seniors
FOR EACH ROW EXECUTE FUNCTION public.encrypt_senior_pii();

-- Decrypt a single senior's PII (OSCA roles only).
CREATE OR REPLACE FUNCTION public.decrypt_senior_pii(p_senior_id uuid)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, internal
AS $$
DECLARE
  k text;
  r jsonb;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','osca_head','osca_staff')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT pii_key INTO k FROM internal.app_config WHERE id = 1;

  SELECT jsonb_build_object(
    'philhealth_no', CASE WHEN s.enc_philhealth_no IS NULL THEN NULL ELSE extensions.pgp_sym_decrypt(s.enc_philhealth_no, k)::text END,
    'sss_no',        CASE WHEN s.enc_sss_no IS NULL        THEN NULL ELSE extensions.pgp_sym_decrypt(s.enc_sss_no, k)::text END,
    'gsis_no',       CASE WHEN s.enc_gsis_no IS NULL       THEN NULL ELSE extensions.pgp_sym_decrypt(s.enc_gsis_no, k)::text END,
    'tin',           CASE WHEN s.enc_tin IS NULL           THEN NULL ELSE extensions.pgp_sym_decrypt(s.enc_tin, k)::text END,
    'pvao_no',       CASE WHEN s.enc_pvao_no IS NULL       THEN NULL ELSE extensions.pgp_sym_decrypt(s.enc_pvao_no, k)::text END
  ) INTO r
  FROM public.seniors s
  WHERE s.id = p_senior_id;

  RETURN r;
END;
$$;

-- Batch decrypt for exports (OSCA roles only).
CREATE OR REPLACE FUNCTION public.decrypt_senior_pii_batch(p_ids uuid[])
RETURNS TABLE(senior_id uuid, philhealth_no text, sss_no text, gsis_no text, tin text, pvao_no text)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public, extensions, internal
AS $$
DECLARE
  k text;
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM public.profiles p
    WHERE p.id = auth.uid() AND p.role IN ('super_admin','admin','osca_head','osca_staff')
  ) THEN
    RAISE EXCEPTION 'FORBIDDEN';
  END IF;

  SELECT pii_key INTO k FROM internal.app_config WHERE id = 1;

  RETURN QUERY SELECT
    s.id,
    CASE WHEN s.enc_philhealth_no IS NULL THEN NULL ELSE extensions.pgp_sym_decrypt(s.enc_philhealth_no, k)::text END,
    CASE WHEN s.enc_sss_no IS NULL        THEN NULL ELSE extensions.pgp_sym_decrypt(s.enc_sss_no, k)::text END,
    CASE WHEN s.enc_gsis_no IS NULL       THEN NULL ELSE extensions.pgp_sym_decrypt(s.enc_gsis_no, k)::text END,
    CASE WHEN s.enc_tin IS NULL           THEN NULL ELSE extensions.pgp_sym_decrypt(s.enc_tin, k)::text END,
    CASE WHEN s.enc_pvao_no IS NULL       THEN NULL ELSE extensions.pgp_sym_decrypt(s.enc_pvao_no, k)::text END
  FROM public.seniors s
  WHERE s.id = ANY(p_ids);
END;
$$;

REVOKE EXECUTE ON FUNCTION public.decrypt_senior_pii(uuid) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrypt_senior_pii(uuid) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.decrypt_senior_pii_batch(uuid[]) FROM PUBLIC, anon;
GRANT EXECUTE ON FUNCTION public.decrypt_senior_pii_batch(uuid[]) TO authenticated;
REVOKE EXECUTE ON FUNCTION public.encrypt_senior_pii() FROM PUBLIC, anon, authenticated;
