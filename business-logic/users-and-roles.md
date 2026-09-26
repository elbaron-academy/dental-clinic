# Users and Roles

## Doctor
Can access assigned patient records and manage clinical visit information.
Can register new patients. A patient registered by a doctor is assigned to that doctor.
(Product owner decision, 2026-09-26, CR-021.)
Can book appointments for their own patients. The appointment is with that doctor.
Check-in, queue changes and payments stay with the receptionist.
(Product owner decision, 2026-09-27, CR-022.)

## Assistant
Can access patients/doctors permitted by their assignment.

## Receptionist
Manages patient registration, appointments/check-in, queue state, and payment recording according to permissions.

Access must be scoped to the clinic and permitted doctors.
