# Assistant Frontend Guide

This guide explains how to use the Dental Clinic web app as an Assistant.

## Sign In

1. Open the clinic web app.
2. Choose **Assistant**.
3. Enter your phone number and password.
4. Select **Sign in**.

If you are already signed in, the app opens your Assistant home page automatically. If your session ends, sign in again from the Assistant page.

## Main Menu

After signing in, the top menu shows:

- **Home**: clinic overview for the doctors assigned to you.
- **Patients**: patient search, patient details, appointments, and visit history.
- **Appointments**: appointment list filtered by day, doctor, and status.
- **Install**: install the app on your device if the browser supports it.
- **Log out**: end your session.

Assistants can view assigned patients, appointments, queues, and visit history. By default, assistants cannot register patients, create appointments, check patients in, start visits, edit clinical records, complete visits, reschedule or cancel appointments, or record payments.

## Home: Clinic Overview

The Assistant home page is called **Clinic overview**.

Use it to:

- See **Waiting for doctor**: checked-in patients waiting for the doctor.
- See **In visit**: visits currently in progress.
- See **Today's appointments**.
- Filter by doctor if you assist more than one doctor.
- Select **Refresh** to reload the queue manually.

The page also refreshes automatically about every 30 seconds.

If you see a message saying you are not assigned to any doctor, ask an administrator to assign you to doctors in Django Admin.

## View Appointments

Open **Appointments** to see appointments for a selected day.

You can filter by:

- Date.
- Doctor, if you assist more than one doctor.
- Status: Scheduled, Waiting for doctor, In visit, Completed, or Cancelled.

Each appointment row shows the patient, doctor when relevant, appointment status, and whether it is a follow-up.

Select:

- The patient name to open the patient record.
- **Details** to open the appointment details page.
- **View visit** to open the linked visit when one exists.

## Appointment Details

The appointment details page shows:

- Patient name and phone.
- Doctor.
- Scheduled date and time.
- Checked-in time when available.
- Notes.
- Follow-up link when the appointment is a follow-up.
- Visit link when a visit exists.

By default, assistants view appointment information only. Check-in, start visit, reschedule, cancel, and payment actions are not available to assistant accounts.

## Find a Patient

1. Open **Patients**.
2. Search by patient name or phone number.
3. If you assist more than one doctor, use the doctor filter.
4. Select the patient name to open the patient record.

The patient list only includes patients within your assigned doctors.

## Patient Record

On the patient page you can see:

- Patient phone, address, minor/guardian information, and assigned doctors.
- Appointment history.
- Dental chart from previous visits.
- Visit history and clinical notes.

Select **Details** on an appointment to open the appointment record.

Select **Open** or **Continue visit** in visit history to review a visit. If the visit is active, it may show as being recorded by the doctor.

## View Dental Charts

Assistants can view dental charts in patient history and visit history.

On a dental chart:

- Use **Permanent teeth** and **Primary teeth** to switch chart types.
- Marked teeth show the recorded chart actions.
- The legend shows each action name and color.
- The chart is read-only for assistants by default.

## View Visit History

Open a patient record and go to **Visit history**.

You can review:

- Visit notes.
- Diagnosis.
- Treatment.
- Procedures.
- Dental chart actions.
- Medications.
- Follow-ups.

Completed visits are shown as part of the patient history. Active visits can be opened for review, but only the owning doctor can change them.

## Working With Assigned Doctors

Assistant access is based on doctor assignment.

- If assigned to one doctor, the app shows that doctor's patients and appointments.
- If assigned to multiple doctors, filters appear so you can choose one doctor or **All my doctors**.
- If assigned to no doctors, you will not see patients or queue information until an administrator updates your account.

## Important Limits

- Assistants only see patients, appointments, and visits for their assigned doctors.
- Assistants can view clinical history but do not edit clinical records by default.
- Assistants do not check patients in or start visits by default.
- Assistants do not create, reschedule, or cancel appointments by default.
- Assistants do not see or record payments by default.
