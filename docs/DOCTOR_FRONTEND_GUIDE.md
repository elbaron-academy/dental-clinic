# Doctor Frontend Guide

This guide explains how to use the Dental Clinic web app as a Doctor.

## Sign In

1. Open the clinic web app.
2. Choose **Doctor**.
3. Enter your phone number and password.
4. Select **Sign in**.

If you are already signed in, the app opens your Doctor home page automatically. If your session ends, sign in again from the Doctor page.

## Main Menu

After signing in, the top menu shows:

- **Home**: your daily queue, active visits, and today's appointments.
- **Patients**: patient search, patient details, appointments, and visit history.
- **Appointments**: appointment list filtered by day, doctor, and status.
- **Install**: install the app on your device if the browser supports it.
- **Log out**: end your session.

## Home: My Day

The Doctor home page is called **My day**.

Use it to:

- See **My queue**: patients who are checked in and waiting.
- See **My active visits**: visits currently in progress.
- See **Today's appointments**.
- Select a doctor filter if your account has access to more than one doctor.
- Select **Refresh** to reload the queue manually.

The page also refreshes automatically about every 30 seconds.

## Register a New Patient

Doctors can register new patients.

1. From **Home** or **Patients**, select **Register patient**.
2. Enter the patient's **Full name** and **Phone number**.
3. Add **Address** if available.
4. If the patient is a minor, select **Patient is a minor** and enter guardian details.
5. If asked, choose the doctor.
6. Select **Register patient**.

After saving, the app opens the patient record.

## Find a Patient

1. Open **Patients**.
2. Search by patient name or phone number.
3. If you can see more than one doctor, use the doctor filter.
4. Select the patient name to open the patient record.

On the patient page you can see:

- Patient phone, address, minor/guardian information, and assigned doctors.
- Appointment history.
- Dental chart from previous visits.
- Visit history and clinical notes.

## Create an Appointment

Doctors can create appointments for their own patients.

From a patient record:

1. Select **New appointment**.
2. Confirm or search for the patient.
3. Choose the doctor if needed.
4. Choose the date and time.
5. Add notes if needed.
6. Select **Create appointment**.

From the appointments page:

1. Open **Appointments**.
2. Select **New appointment**.
3. Search for the patient by name or phone.
4. Choose doctor, date, time, and optional notes.
5. Select **Create appointment**.

## View Appointments

Open **Appointments** to see appointments for a selected day.

You can filter by:

- Date.
- Doctor, if you have access to more than one doctor.
- Status: Scheduled, Waiting for doctor, In visit, Completed, or Cancelled.

Select **Details** on any appointment to open its full record.

By default, doctors do not check in, reschedule, cancel, or record payments. These are receptionist actions.

## Start a Visit

A visit can be started after the patient is checked in by reception.

1. Open **Home**.
2. In **My queue**, find the checked-in patient.
3. Select **Start visit**.

The app opens the visit page. If it does not open automatically, select **Open visit**.

## Record a Visit

Only the owning doctor can edit an active visit.

On the visit page, you can record:

- **Visit notes**: complaint, findings, and session details.
- **Diagnosis**.
- **Treatment**.
- **Dental chart**.
- **Tooth / procedures**.
- **Medications**.
- **Follow-up visits**.

Select **Save notes** after changing notes, diagnosis, or treatment.

## Use the Dental Chart

1. Open the active visit.
2. In **Dental chart**, choose **Permanent teeth** or **Primary teeth**.
3. Select a tooth.
4. Select an action chip to mark that action on the tooth.
5. Add optional **Action notes** before selecting an action if needed.
6. Select an already-applied action again to remove it.
7. Select **Done** when finished with that tooth.

If the needed chart action is missing, select **+ New action**, enter the name and color, then add it to the tooth.

Marked teeth appear in the chart and in the tooth action list. You can remove an action from the list using **Remove**.

## Add Procedures

1. In the active visit, go to **Tooth / procedures**.
2. Choose a procedure, or leave it as **Other** and describe it in notes.
3. Enter the tooth number if relevant.
4. Add procedure notes if needed.
5. Select **Add procedure**.

Recorded procedures can be removed while the visit is active.

## Add Medications

1. In the active visit, go to **Medications**.
2. Select a medication.
3. Enter quantity, for example `21 capsules` or `1 tablet 3x daily`.
4. Enter duration, for example `7 days`.
5. Select **Add medication**.

Recorded medications can be removed while the visit is active.

## Book a Follow-up

1. In the active visit, go to **Follow-up visits**.
2. Choose follow-up date and time.
3. Add optional notes.
4. Select **Book follow-up**.

The follow-up appears as an appointment linked to the current visit.

## Complete a Visit

Complete the visit only when the clinical record is finished.

1. Review notes, diagnosis, treatment, chart, procedures, medications, and follow-ups.
2. Select **Complete visit**.
3. Confirm the action.

After completion, the visit becomes read-only and stays in the patient's history.

## Read Visit History

Open the patient record and go to **Visit history**.

You can open previous visits to review:

- Notes, diagnosis, and treatment.
- Procedures.
- Dental chart actions.
- Medications.
- Follow-ups.

Completed visits are read-only.

## Important Limits

- Doctors only see patients, appointments, and visits within their permitted scope.
- Doctors can edit only their own active visits.
- Completed visits cannot be changed from the frontend.
- Check-in, appointment rescheduling, appointment cancellation, and payments are receptionist actions by default.
