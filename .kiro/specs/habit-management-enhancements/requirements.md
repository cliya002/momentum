# Requirements Document

## Introduction

This document specifies nine enhancements to **Momentum**, an offline-first habit tracker delivered as a static Progressive Web App (`index.html`, `app.js`, `styles.css`, `sw.js`, `version.js`). All application data lives in the browser's `localStorage`, with optional multi-device sync through a GitHub Gist and optional background Web Push delivered by a Cloudflare Worker (in `worker/`).

The enhancements span three themes: habit lifecycle management (archive/pause, trash with undo-delete, streak freeze), insights (adherence trend chart, per-habit detail view), onboarding and data portability (first-run onboarding, full backup and restore), and notification/preference controls (per-habit custom reminder message, 12h/24h time preference).

Every enhancement MUST preserve the existing constraints: offline-first, `localStorage`-based persistence, no new frameworks, and full compatibility with the existing sync model (id-keyed merge with `updatedAt` last-write-wins and `deletions.habits` tombstones) and background push pipeline (`buildPushSchedule` → Cloudflare Worker). Any new persisted data MUST be normalized in `normalizeState` and merged in `mergeStates`.

## Glossary

- **Momentum**: The habit tracker Progressive Web App described in this document.
- **App**: The client-side application logic running in the browser (`app.js`), including rendering, persistence, and scheduling. Used as the responsible system for client-only behavior.
- **Sync_Engine**: The component of the App responsible for reading, normalizing (`normalizeState`), and merging (`mergeStates`) state between the local device and the GitHub Gist.
- **Push_Scheduler**: The component of the App that builds the background push schedule (`buildPushSchedule`) and transmits it to the Cloudflare Worker.
- **Push_Worker**: The Cloudflare Worker in `worker/` that delivers scheduled Web Push notifications.
- **Habit**: A tracked item with fields including `id`, `name`, `icon`, `color`, `category`, `type` (`check` or `count`), `target`, `unit`, `increment`, `time`, `dayTimes`, `reminderTime`, `days`, `nightPrevDay`, `noPush`, `order`, `createdAt`, and `updatedAt`.
- **State**: The full persisted data object, including `habits`, `completions`, `completionsUpdatedAt`, `measurements`, `journal`, `goal`, `workSchedule`, `categories`, `devices`, `fasting`, and `deletions`.
- **Today_View**: The App screen listing the Habits scheduled for the current day.
- **Habits_Tab**: The App screen used to view and manage the full list of Habits.
- **Report_Tab**: The App screen presenting insights, including the existing 5-week adherence heatmap.
- **Adherence**: The percentage of scheduled Habit occurrences that are completed over a given period, as computed by `weekAdherencePct` and related functions.
- **Streak**: The count of consecutive scheduled days a Habit has been completed, as computed by `currentStreak`.
- **Archived_Habit**: A Habit marked as archived (paused), excluded from Today_View, reminders, push, and Adherence, while retaining its history.
- **Trash**: A holding area for deleted Habits that remain recoverable for a retention period before permanent removal.
- **Retention_Period**: The fixed duration of 7 days that a deleted Habit remains in Trash before automatic permanent removal.
- **Streak_Freeze**: A user-designated day on which a planned miss for a Habit is treated as neutral in Streak calculation (skipped, not broken).
- **Tombstone**: A deletion marker in `deletions.habits`, keyed by Habit `id` with a deletion timestamp, used by the Sync_Engine to propagate deletions.
- **Backup_File**: A single JSON file containing a complete export of the App's State.
- **Time_Format_Preference**: A display setting selecting either 12-hour or 24-hour clock formatting for times shown across the App.
- **Starter_Template**: A predefined set of Habits offered during onboarding.

## Requirements

### Requirement 1: Archive / Pause a Habit

**User Story:** As a habit tracker user, I want to archive (pause) a habit without deleting its history, so that I can temporarily stop tracking it while keeping my past data and the option to resume later.

#### Acceptance Criteria

1. WHEN a user archives a Habit, THE App SHALL set an archived indicator on that Habit and SHALL update the Habit's `updatedAt` timestamp.
2. WHILE a Habit is an Archived_Habit, THE App SHALL exclude that Habit from the Today_View.
3. WHILE a Habit is an Archived_Habit, THE App SHALL exclude that Habit from Adherence calculations.
4. WHILE a Habit is an Archived_Habit, THE Push_Scheduler SHALL exclude that Habit from the background push schedule.
5. WHILE a Habit is an Archived_Habit, THE App SHALL exclude that Habit from local reminders.
6. WHILE a Habit is an Archived_Habit, THE App SHALL retain that Habit's completion history in the State.
7. WHEN a user unarchives an Archived_Habit, THE App SHALL clear the archived indicator, SHALL update the Habit's `updatedAt` timestamp, and SHALL include the Habit in the Today_View for its scheduled days.
8. THE Habits_Tab SHALL provide a filter that displays Archived_Habits separately from active Habits.
9. WHILE viewing an Archived_Habit in the Habits_Tab, THE App SHALL provide controls to unarchive the Habit and to delete the Habit.
10. THE Sync_Engine SHALL normalize the archived indicator in `normalizeState` and SHALL preserve the archived indicator through `mergeStates` using the existing `updatedAt` last-write-wins rule.

### Requirement 2: Trash / Undo-Delete

**User Story:** As a habit tracker user, I want deleted habits to move to a recoverable trash for a limited time, so that I can restore a habit I removed by mistake before it is permanently gone.

#### Acceptance Criteria

1. WHEN a user deletes a Habit, THE App SHALL move that Habit to the Trash and SHALL record the deletion timestamp.
2. WHILE a Habit is in the Trash, THE App SHALL exclude that Habit from the Today_View, Adherence calculations, local reminders, and the background push schedule.
3. WHILE a Habit is in the Trash, THE App SHALL retain that Habit's definition and completion history so that a restore reproduces the Habit and its history.
4. THE App SHALL provide a Trash view that lists each trashed Habit together with its remaining time before permanent removal.
5. WHEN a user restores a Habit from the Trash, THE App SHALL return that Habit to the active Habit list, SHALL remove the corresponding entry from the Trash, and SHALL update the Habit's `updatedAt` timestamp.
6. WHEN a user permanently deletes a Habit from the Trash, THE App SHALL remove that Habit from the State and SHALL write a Tombstone to `deletions.habits` keyed by the Habit `id` with the deletion timestamp.
7. WHEN the App loads and a trashed Habit has been in the Trash for at least the Retention_Period, THE App SHALL permanently delete that Habit and SHALL write a Tombstone to `deletions.habits` for that Habit `id`.
8. WHEN a user restores a Habit whose `id` has an existing Tombstone in `deletions.habits`, THE App SHALL update the restored Habit's `updatedAt` to a value greater than the Tombstone timestamp so that the Sync_Engine treats the Habit as surviving.
9. THE Sync_Engine SHALL normalize Trash entries in `normalizeState` and SHALL merge Trash entries in `mergeStates` such that the most recent state of each trashed Habit `id` is retained.
10. IF a Habit exists in the Trash on one device and has a Tombstone with a later timestamp from another device, THEN the Sync_Engine SHALL treat that Habit as permanently deleted.

### Requirement 3: Streak Freeze (Grace Day)

**User Story:** As a habit tracker user, I want to mark a rest day or sick day as a streak freeze, so that a planned miss does not break my streak.

#### Acceptance Criteria

1. WHEN a user marks a specific day as a Streak_Freeze for a Habit, THE App SHALL persist that freeze keyed by Habit `id` and date and SHALL record a freeze update timestamp.
2. WHEN a user marks a specific day as a global Streak_Freeze, THE App SHALL persist that freeze keyed by date so that it applies to all Habits scheduled on that day.
3. WHILE a scheduled day is a Streak_Freeze for a Habit and that day is not completed, THE App SHALL treat that day as neutral in Streak calculation by skipping the day rather than ending the Streak.
4. WHEN a scheduled day is a Streak_Freeze for a Habit, THE App SHALL exclude that day from that Habit's Adherence denominator.
5. WHEN a user removes a Streak_Freeze from a day, THE App SHALL persist the removal, SHALL record a freeze update timestamp, and SHALL recompute the affected Streak using the standard rule.
6. THE App SHALL visually distinguish a Streak_Freeze day from completed, missed, and off days in the Habit history display.
7. THE Sync_Engine SHALL normalize Streak_Freeze data in `normalizeState` and SHALL merge Streak_Freeze data in `mergeStates` using an update timestamp so that the most recent freeze state per date wins.
8. WHEN a Streak_Freeze day is also completed, THE App SHALL count that day as completed in Streak calculation.

### Requirement 4: Adherence Trend Chart

**User Story:** As a habit tracker user, I want to see a line chart of my adherence over time, so that I can understand whether my consistency is improving or declining beyond the current 5-week heatmap.

#### Acceptance Criteria

1. THE Report_Tab SHALL display an adherence trend chart as a line chart in addition to the existing 5-week heatmap.
2. THE adherence trend chart SHALL plot weekly Adherence values over time using the existing Adherence calculation.
3. WHERE monthly aggregation is selected, THE Report_Tab SHALL plot monthly Adherence values over time.
4. WHEN a week or month has no scheduled Habit occurrences, THE App SHALL render that period as having no data rather than as zero Adherence.
5. THE adherence trend chart SHALL exclude Archived_Habits and trashed Habits from its Adherence values.
6. WHEN Streak_Freeze days exist within a plotted period, THE App SHALL exclude those days from the Adherence denominator for that period.
7. THE App SHALL render the adherence trend chart using only client-side rendering without introducing a new framework.

### Requirement 5: Per-Habit Detail View

**User Story:** As a habit tracker user, I want to tap a habit to open a detailed view, so that I can review that habit's streak history, completion rate, and best and worst weekdays.

#### Acceptance Criteria

1. WHEN a user selects a Habit from the Habits_Tab, THE App SHALL open a detail view for that Habit.
2. THE Habit detail view SHALL display the current Streak and the longest recorded Streak for the Habit.
3. THE Habit detail view SHALL display the Habit's completion rate as the percentage of scheduled occurrences completed over the Habit's tracked history.
4. THE Habit detail view SHALL display the weekday with the highest completion rate and the weekday with the lowest completion rate for the Habit.
5. WHEN a Habit has no scheduled occurrences in its history, THE App SHALL display the detail view with an indication that insufficient data exists rather than computing a rate.
6. WHEN computing completion rate and weekday statistics, THE App SHALL exclude Streak_Freeze days from the denominator.
7. THE Habit detail view SHALL be reachable for an Archived_Habit so that a user can review a paused Habit's history.

### Requirement 6: First-Run Onboarding

**User Story:** As a brand-new user with no habits, I want a quick guided setup, so that I can start with useful habits instead of facing an empty screen.

#### Acceptance Criteria

1. WHEN the App loads and the State contains no Habits and no trashed Habits, THE App SHALL present a first-run onboarding flow.
2. THE onboarding flow SHALL offer at least one Starter_Template that the user can select to create a predefined set of Habits.
3. WHEN a user selects a Starter_Template, THE App SHALL create the corresponding Habits in the State with normalized fields and current `createdAt` and `updatedAt` timestamps.
4. THE onboarding flow SHALL offer an optional default reminder time that the user can set.
5. WHEN a user sets a default reminder time during onboarding, THE App SHALL apply that reminder time to the Habits created from the selected Starter_Template.
6. WHEN a user chooses to skip the onboarding flow, THE App SHALL close the flow and SHALL display the standard empty Today_View.
7. WHEN a user completes or skips the onboarding flow, THE App SHALL record that first-run onboarding has been presented so that the flow is not shown again on subsequent loads.
8. IF the State already contains at least one Habit or one trashed Habit, THEN THE App SHALL NOT present the first-run onboarding flow.

### Requirement 7: Full Backup and Restore

**User Story:** As a habit tracker user, I want to export all my data to a file and import it back, so that I can safeguard and move my data independently of Gist sync.

#### Acceptance Criteria

1. WHEN a user requests a backup, THE App SHALL export the complete State to a single downloadable Backup_File in JSON format.
2. THE Backup_File SHALL include a schema version identifier so that imports can validate compatibility.
3. WHEN a user imports a valid Backup_File, THE App SHALL restore the State from the Backup_File through `normalizeState` and SHALL persist the restored State to `localStorage`.
4. IF an imported file is not valid JSON or does not contain a recognized State structure, THEN THE App SHALL reject the import and SHALL display a descriptive error without modifying the existing State.
5. WHEN a user imports a valid Backup_File, THE App SHALL present the choice to replace the current State or to merge the imported State with the current State using `mergeStates`.
6. THE backup and restore feature SHALL operate independently of the GitHub Gist sync configuration.
7. FOR ALL valid States, exporting a Backup_File and then importing that Backup_File in replace mode SHALL reproduce an equivalent normalized State (round-trip property).
8. WHEN the time since the last recorded backup reaches a defined interval, THE App SHALL display a non-blocking reminder suggesting that the user back up their data.
9. WHEN a user completes a backup, THE App SHALL record the backup timestamp so that the backup reminder interval resets.

### Requirement 8: Per-Habit Custom Reminder Message

**User Story:** As a habit tracker user, I want to write a custom reminder message for a habit, so that my reminders and push notifications show text I chose instead of the default.

#### Acceptance Criteria

1. WHERE a Habit has a user-authored custom reminder message, THE App SHALL use that message as the notification body for that Habit's local reminders instead of the default body.
2. WHERE a Habit has a user-authored custom reminder message, THE Push_Scheduler SHALL use that message as the notification body for that Habit in the background push schedule instead of the default body.
3. WHEN a user saves a custom reminder message for a Habit, THE App SHALL persist the message on the Habit, SHALL update the Habit's `updatedAt` timestamp, and SHALL rebuild the background push schedule.
4. WHEN a user clears a custom reminder message for a Habit, THE App SHALL revert that Habit's reminders and push notifications to the default body.
5. THE App SHALL limit the custom reminder message to a defined maximum length and SHALL truncate any longer input to that length during normalization.
6. WHEN multiple Habits share a reminder time and at least one has a custom reminder message, THE Push_Scheduler SHALL preserve each Habit's custom message within the grouped notification content.
7. THE Sync_Engine SHALL normalize the custom reminder message in `normalizeState` and SHALL preserve it through `mergeStates` using the existing `updatedAt` last-write-wins rule.

### Requirement 9: 12h/24h Time Preference

**User Story:** As a habit tracker user, I want to choose whether times display in 12-hour or 24-hour format, so that times across the app match my preference.

#### Acceptance Criteria

1. THE App SHALL provide a Time_Format_Preference setting with a 12-hour option and a 24-hour option.
2. WHILE the Time_Format_Preference is set to 12-hour, THE App SHALL display all user-facing times using 12-hour formatting with an AM/PM indicator.
3. WHILE the Time_Format_Preference is set to 24-hour, THE App SHALL display all user-facing times using 24-hour formatting.
4. WHEN a user changes the Time_Format_Preference, THE App SHALL apply the new format to subsequently rendered times without requiring a reload.
5. THE App SHALL persist the Time_Format_Preference in `localStorage`.
6. WHERE no Time_Format_Preference has been set, THE App SHALL default to a defined format for time display.
7. THE Time_Format_Preference SHALL affect display formatting only and SHALL NOT change stored time values, which remain in 24-hour `HH:MM` form.
