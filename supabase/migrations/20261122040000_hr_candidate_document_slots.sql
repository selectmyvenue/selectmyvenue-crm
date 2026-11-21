-- Add simple named candidate-document slots to the existing private HR document register.
-- Existing HR document rows, files, RLS policies and the customer CRM schema are unchanged.
alter table public.hr_documents
  drop constraint if exists hr_documents_document_type_check;

alter table public.hr_documents
  add constraint hr_documents_document_type_check
  check (document_type = any (array[
    'offer_letter',
    'engagement_letter',
    'appointment_letter',
    'commission_policy',
    'nda',
    'joining_form',
    'experience_letter',
    'relieving_letter',
    'warning_letter',
    'other',
    'probation_extension',
    'confirmation_letter',
    'salary_revision',
    'promotion_letter',
    'transfer_letter',
    'resignation_acceptance',
    'termination_letter',
    'performance_improvement_plan',
    'aadhaar_front',
    'aadhaar_back',
    'pan_card',
    'candidate_photo',
    'resume',
    'residence_proof'
  ]::text[]));
