# Plan: Three-Issue Fixes (Dropdown, Appointment, DB Function)

## Issue 1: Status Dropdown Cleanup

### Files to change
| File | Line(s) | Change |
|------|---------|--------|
| `web/src/lib/constants.ts` | 15 | `SENIOR_STATUSES` → `['Active', 'Deceased', 'Transferred']` |
| `web/src/app/actions/seniors.ts` | 105 | `status: 'Pending'` → `status: 'Active'` |
| `web/src/app/barangay/register/page.tsx` | 119 | `status: 'Pending Barangay'` → `status: 'Active'` |
| `web/src/lib/validation.ts` | 48 | `status: z.string().default('Pending')` → `status: z.string().default('Active')` |

### What this does
- The dropdown in `registration-modal.tsx:675` automatically reflects the constant
- New registrations start at `Active` (bypasses the multi-stage approval pipeline)
- `verifySenior` pipeline remains intact for existing legacy records

---

## Issue 2: Appointment Validation Race Condition

### File to change
`supabase/migrations/20260529030000_appointment_atomic_slot_assignment.sql`

### Changes
1. **Line 22-24:** Change advisory lock key from per-(date, hour) to per-(senior_id, date):
   ```sql
   -- Before:
   PERFORM pg_advisory_xact_lock(
     hashtext('appointment_slot_' || p_appointment_date::text || '_' || p_hour::text)
   );
   -- After:
   PERFORM pg_advisory_xact_lock(
     hashtext('senior_appointment_' || p_senior_id::text || '_' || p_appointment_date::text)
   );
   ```

2. **Wrap INSERT in exception block** (lines 49-50) to catch unique_violation gracefully:
   ```sql
   BEGIN
     INSERT INTO public.appointments (...) VALUES (...);
   EXCEPTION WHEN unique_violation THEN
     RETURN jsonb_build_object('success', false, 'error', 'This senior already has an appointment on this date.');
   END;
   ```

### After migration, apply it to the database

---

## Issue 3: PostgreSQL Function Overloading Error

### Root cause
Two overloads of `register_senior_resident` exist in the database:
1. 10-param version (from `20260524000003_secure_auth_rpcs.sql`) — no `p_middle_name`
2. 11-param version (created outside migrations) — with `p_middle_name TEXT`, no DEFAULT

Mobile app (`Auth.tsx:377`) calls this with 10 named params during Step 2 "Socio-Economic Info" → PostgREST can't resolve overload.

### Fix
Create a new Supabase migration that:
1. Drops both overloads explicitly by their parameter types
2. Creates a single unified function with `p_middle_name TEXT DEFAULT NULL`
3. Includes `auth_user_id` in return type (from the `20260525000006` version)
4. Handles `middle_name` in the INSERT

### Migration SQL
```sql
-- Drop both overloads
DROP FUNCTION IF EXISTS register_senior_resident(text,text,text,text,text,text,text,text,boolean,text);
DROP FUNCTION IF EXISTS register_senior_resident(text,text,text,text,text,text,text,text,boolean,text,text);

-- Recreate unified version
CREATE OR REPLACE FUNCTION register_senior_resident(
  p_full_name TEXT,
  p_birthdate TEXT,
  p_sex TEXT,
  p_barangay TEXT,
  p_contact_number TEXT,
  p_address TEXT,
  p_place_of_birth TEXT DEFAULT NULL,
  p_occupation TEXT DEFAULT NULL,
  p_has_other_pension BOOLEAN DEFAULT FALSE,
  p_pension_source TEXT DEFAULT NULL,
  p_middle_name TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  registration_id TEXT,
  birthdate TEXT,
  full_name TEXT,
  auth_user_id UUID
)
LANGUAGE plpgsql SECURITY DEFINER SET search_path = public
AS $$
DECLARE
  v_reg_id TEXT;
  v_new_id UUID;
  v_random INT;
  v_birthdate_clean TEXT;
  v_auth_result JSONB;
  v_auth_user_id UUID;
BEGIN
  v_birthdate_clean := TRIM(p_birthdate);
  IF v_birthdate_clean LIKE '%T%' THEN
    v_birthdate_clean := split_part(v_birthdate_clean, 'T', 1);
  END IF;

  v_random := floor(1000 + random() * 9000)::INT;
  v_reg_id := 'OSC-' || to_char(now(), 'YYYYMMDD') || '-' || v_random::TEXT;

  INSERT INTO seniors (
    full_name, registration_id, birthdate, sex, barangay,
    contact_number, address, place_of_birth, status,
    occupation, has_other_pension, pension_source, middle_name
  ) VALUES (
    TRIM(p_full_name), v_reg_id, v_birthdate_clean::DATE,
    p_sex, p_barangay, p_contact_number, p_address,
    p_place_of_birth, 'Pending', p_occupation,
    p_has_other_pension, p_pension_source, p_middle_name
  )
  RETURNING seniors.id, seniors.registration_id, seniors.birthdate, seniors.full_name
  INTO v_new_id, v_reg_id, v_birthdate_clean, p_full_name;

  INSERT INTO id_inventory (senior_id, id_status, booklet_status)
  VALUES (v_new_id, 'Pending', 'Pending');

  BEGIN
    v_auth_result := create_senior_auth_user(
      v_reg_id, v_birthdate_clean, TRIM(p_full_name), v_new_id
    );
    v_auth_user_id := (v_auth_result->>'user_id')::UUID;
  EXCEPTION WHEN OTHERS THEN
    v_auth_user_id := NULL;
  END;

  RETURN QUERY
  SELECT v_new_id, v_reg_id, v_birthdate_clean, p_full_name, v_auth_user_id;
END;
$$;
```

### Then apply migration to database

---

## Verification Steps
1. Run `npm run lint` in `web/`
2. Run `npm run build` or `npm run typecheck` in `web/`
3. Verify migration applies cleanly via Supabase
4. Test mobile app registration flow
