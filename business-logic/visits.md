# Visits

A visit records the clinical interaction.

Doctor can record:
- Visit notes/description
- Diagnosis
- Tooth/procedure information
- Treatment
- Medication where applicable
- Follow-up visits

## Dental chart

Each visit has a dental chart of the patient's teeth (FDI notation:
permanent 11–48, primary 51–85).

- The doctor handling an active visit selects a tooth and marks one or more
  dental actions on it (for example caries, filling, root canal, crown,
  extraction, implant, scaling), with optional notes.
- The same action can be marked only once per tooth in a visit. A marked
  action can be removed while the visit is active.
- Every action type has a color. Marked teeth take the color of their
  action (several actions split the tooth into color bands), and the chart
  shows a legend.
- Dental action types and their colors are clinical catalog data managed in
  Django Admin. Inactive types stay in history but cannot be selected.
- While charting, the doctor can add a new dental action (name and color).
  It is marked on the selected tooth at once and becomes available to
  everyone in the doctor's clinic. Names must not repeat an existing action.
- The patient page shows the dental chart of the patient's charted visits,
  one visit at a time.
- Each visit has its own chart. Actions recorded in one visit do not appear
  on the chart of any other visit.
- Staff who can view the visit see its chart read-only. Completed visits keep
  their chart in the patient's history.
- A marked tooth counts as a recorded session outcome.

The doctor completes the visit after recording the session outcome.

Completed visits remain in patient history.
