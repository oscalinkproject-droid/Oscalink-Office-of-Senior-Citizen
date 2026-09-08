-- Drop both overloads to eliminate ambiguity
DROP FUNCTION IF EXISTS public.book_appointment(
  p_senior_id UUID,
  p_service_type TEXT,
  p_appointment_date DATE,
  p_hour INT,
  p_notes TEXT,
  p_location TEXT
);

DROP FUNCTION IF EXISTS public.book_appointment(
  p_senior_id UUID,
  p_service_type TEXT,
  p_appointment_date DATE,
  p_hour INT,
  p_assistance_type TEXT,
  p_notes TEXT,
  p_location TEXT
);

-- Single consolidated function with ALL params AND Active senior check
CREATE OR REPLACE FUNCTION public.book_appointment(
  p_senior_id UUID,
  p_service_type TEXT,
  p_appointment_date DATE,
  p_hour INT,
  p_assistance_type TEXT DEFAULT NULL,
  p_notes TEXT DEFAULT NULL,
  p_location TEXT DEFAULT NULL
) RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = ''
AS $$
DECLARE
  v_status TEXT;
  v_minute INT;
  v_appointment_date TIMESTAMPTZ;
  v_count INT;
  v_existing INT;
  v_senior_name TEXT;
  v_email TEXT;
BEGIN
  PERFORM pg_advisory_xact_lock(
    hashtext('senior_appointment_' || p_senior_id::text || '_' || p_appointment_date::text)
  );

  SELECT status INTO v_status
  FROM public.seniors
  WHERE id = p_senior_id;

  IF v_status IS NULL THEN
    RETURN jsonb_build_object('success', false, 'error', 'Senior record not found.');
  END IF;

  IF v_status != 'Active' THEN
    RETURN jsonb_build_object('success', false, 'error', 'Only verified Active seniors can book appointments. Current status: ' || v_status || '.');
  END IF;

  SELECT COUNT(*) INTO v_existing
  FROM public.appointments
  WHERE senior_id = p_senior_id
    AND (appointment_date AT TIME ZONE 'Asia/Manila')::date = p_appointment_date
    AND status NOT IN ('Cancelled', 'Failed');

  IF v_existing > 0 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This senior already has an appointment on this date.');
  END IF;

  SELECT COUNT(*) INTO v_count
  FROM public.appointments
  WHERE (appointment_date AT TIME ZONE 'Asia/Manila')::date = p_appointment_date
    AND EXTRACT(HOUR FROM appointment_date AT TIME ZONE 'Asia/Manila') = p_hour
    AND status NOT IN ('Cancelled', 'Failed');

  IF v_count >= 10 THEN
    RETURN jsonb_build_object('success', false, 'error', 'This hour is fully booked (max 10).');
  END IF;

  v_minute := v_count * 6;
  v_appointment_date := (p_appointment_date::timestamp + (p_hour || ' hours')::interval + (v_minute || ' minutes')::interval) AT TIME ZONE 'Asia/Manila';

  BEGIN
    INSERT INTO public.appointments (senior_id, service_type, assistance_type, appointment_date, status, notes, location)
    VALUES (p_senior_id, p_service_type, p_assistance_type, v_appointment_date, 'Scheduled', p_notes, p_location);
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('success', false, 'error', 'This senior already has an appointment on this date.');
  END;

  SELECT full_name, email INTO v_senior_name, v_email
  FROM public.seniors WHERE id = p_senior_id;

  RETURN jsonb_build_object(
    'success', true,
    'appointment_date', v_appointment_date,
    'senior_name', v_senior_name,
    'email', v_email
  );
END;
$$;
