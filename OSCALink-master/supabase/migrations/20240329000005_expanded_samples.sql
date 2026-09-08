-- Insert expanded sample data for Assistance Kanban
INSERT INTO public.assistance_requests (full_name, title, description, priority, status, category, beneficiary_email)
VALUES 
  ('Luzviminda Cruz', 'Dialysis Support', 'Weekly dialysis treatment subsidy for Q1.', 'URGENT', 'Pending', 'Medical Support', 'luz.cruz@example.com'),
  ('Antonio Reyes', 'Burial Grant', 'Emergency financial assistance for immediate family.', 'URGENT', 'Approved', 'Burial Assistance', 'antonio.r@example.com'),
  ('Corazon Santos', 'Hearing Aid Kit', 'Battery replacement and maintenance for digital devices.', 'ROUTINE', 'Released', 'Assistive Devices', 'cora.santos@example.com'),
  ('Ricardo Gomez', 'Hypertension Meds', 'Maintenance medication batch delivery for Sector 4A.', 'VALIDATED', 'Approved', 'Medical Support', 'ric.gomez@example.com'),
  ('Erlinda Tan', 'Cash Subsidy S4', 'Monthly financial support for indigent seniors.', 'LOGISTICS', 'Pending', 'Financial Aid', 'erlinda.tan@example.com');
