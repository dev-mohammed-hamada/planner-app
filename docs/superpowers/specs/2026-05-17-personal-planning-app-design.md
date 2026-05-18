# Personal Planning App Design

Date: 2026-05-17

## Purpose

Build a private personal planning system that supports a paper-plus-automation workflow. The app should reduce anxiety caused by relying on memory by providing a reliable external memory, while preserving the user's existing weekly notebook ritual.

The product should feel like a calm digital version of the user's notebook spread, not a complex productivity platform.

## Chosen Approach

Use a hosted web app with a Telegram bot and database.

This approach is preferred because:

- The system stays available from the user's phone even when their computer is off.
- Telegram provides low-friction capture and reminder delivery.
- The web app can mirror the user's paper notebook layout.
- A backend and database allow future multi-user support without redesigning the core model.

## Core Experience

The main web screen is a classic 8-section weekly spread:

- Saturday
- Sunday
- Monday
- Tuesday
- Wednesday
- Thursday
- Friday
- Weekly Notes

The week starts on Saturday. Each day section contains:

- Morning
- Afternoon
- Evening
- Unsorted

The visual direction is "Quiet Productivity": clean, calm, and modern, with a few warm accents. It should feel gentle enough for daily anxiety-sensitive use while staying functional and uncluttered.

## Product Areas

### Weekly Spread

The primary screen. It shows the current Saturday-to-Friday week plus Weekly Notes. Users can review, edit, move, complete, and delete items.

### Inbox

Stores captures that have no clear date, such as "buy printer ink".

### Future Notes

Stores vague future items, such as "renew passport next month". The system should not force follow-up questions for vague dates.

### Telegram Link

A settings area lets a user link their Telegram chat to their web account using a one-time code.

### Reminder Settings

Default reminders:

- Daily evening planning reminder at 10:00 PM.
- Daily morning check-in reminder at 9:00 AM.
- Friday night weekly reset reminder at 10:15 PM.

Users should be able to adjust these settings later.

### Account And Login

The first version is useful for one user but designed for multiple users. Each account owns its own planner items, settings, reminder schedules, and Telegram link.

## Telegram Workflows

### Linking

1. User signs in to the web app.
2. The app shows a one-time code.
3. User sends the code to the Telegram bot.
4. The backend links the Telegram chat ID to the user's account.
5. Future Telegram messages and reminders are associated with that user.

If an unlinked user messages the bot, the bot explains how to link an account.

### Capture

Users can message the bot naturally. Examples:

- "Tomorrow morning submit report"
- "Tuesday 4pm dentist"
- "Renew passport next month"
- "Buy printer ink"

Placement rules:

- Clear date and clear block: save into that day's Morning, Afternoon, or Evening block.
- Clear date and time: save as an appointment and infer the likely block.
- Clear date only: save into that day's Unsorted area.
- Vague future date: save into Future Notes.
- No date: save into Inbox.

The system should never drop a capture. If parsing is unclear, store the original message safely and place it in Inbox, Future Notes, or Unsorted.

### Daily Evening Planning

At 10:00 PM, the bot reminds the user to plan tomorrow. The message includes tomorrow's captured items so the user can copy, adjust, or review them in the notebook and app.

Suggested tone:

"Plan tomorrow in your notebook: appointments, tasks, morning, afternoon, evening, and anything to prepare before sleep."

### Morning Check-In

At 9:00 AM, the bot reminds the user to open today's notebook section and start with the day's plan.

Suggested tone:

"Open today's notebook section. Check appointments, choose the first thing for the morning, and start gently."

### Friday Weekly Reset

On Friday night, the bot reminds the user to prepare the next weekly spread. The message includes known items for the upcoming Saturday-to-Friday week, plus unresolved Inbox and Future Notes that may need review.

The default time is 10:15 PM, shortly after the normal 10:00 PM evening planning reminder.

Suggested tone:

"Weekly reset: prepare your 8-section spread for Saturday through Friday. Review upcoming appointments, unfinished tasks, Inbox, and Future Notes."

## Data Model

### User

Stores account identity and preferences.

Fields:

- id
- email or auth provider identifier
- timezone
- week_start_day, default Saturday
- reminder settings
- created_at
- updated_at

### Telegram Link

Stores the connection between a web account and Telegram chat.

Fields:

- id
- user_id
- telegram_chat_id
- telegram_user_id
- link_status
- one_time_code_hash
- code_expires_at
- linked_at
- created_at
- updated_at

### Planner Item

Stores tasks, appointments, inbox items, and future notes.

Fields:

- id
- user_id
- title
- original_text
- item_type: task, appointment, note
- date
- time
- block: morning, afternoon, evening, unsorted, none
- bucket: weekly_spread, inbox, future_notes
- status: active, completed, deleted
- source: web, telegram
- created_at
- updated_at

### Weekly Note

Stores notes attached to a Saturday-to-Friday week.

Fields:

- id
- user_id
- week_start_date
- content
- created_at
- updated_at

### Reminder Definition

Stores configured reminder schedules.

Fields:

- id
- user_id
- reminder_type: evening_planning, morning_check_in, weekly_reset
- local_time
- day_of_week
- enabled
- created_at
- updated_at

### Reminder Delivery Log

Stores reminder send attempts.

Fields:

- id
- reminder_definition_id
- user_id
- scheduled_for
- sent_at
- status: sent, failed, skipped
- failure_reason
- telegram_message_id

## Error Handling

The system should fail gently and preserve trust.

- If natural language parsing is unclear, save the raw capture instead of rejecting it.
- If Telegram delivery fails, log the failure and retry when appropriate.
- If a reminder job runs late, send only if the reminder is still useful; otherwise skip and log it.
- If a Telegram message arrives before account linking, explain the linking process.
- If a date is clear but the day block is unclear, save to that day's Unsorted area.
- If the date is vague, save to Future Notes.
- If no date is present, save to Inbox.

The core rule is: never lose a capture.

## Testing Scope

Version one should verify the parts that affect trust:

- User account creation and sign-in.
- Telegram linking with a one-time code.
- Unlinked Telegram user guidance.
- Telegram captures saved with original text.
- Clear captures placed correctly by date, time, and block.
- Ambiguous captures saved to Inbox, Future Notes, or Unsorted.
- Weekly spread starts on Saturday.
- Daily evening reminder uses the user's timezone.
- Daily morning reminder uses the user's timezone.
- Friday weekly reset uses the user's timezone.
- Reminder delivery failures are logged.
- Reminder jobs do not send duplicate messages.
- Web app shows the same items captured from Telegram.
- Users can edit, move, complete, and delete planner items.

## Version One Scope

Included:

- Hosted web app.
- Backend API.
- Database.
- User accounts.
- Telegram account linking.
- Natural-language capture with safe fallback.
- Weekly spread view.
- Inbox.
- Future Notes.
- Default reminder schedules.
- Basic reminder settings.
- Multi-user-ready data ownership.

Excluded from version one:

- Native mobile apps.
- WhatsApp integration.
- Calendar sync.
- Collaboration.
- Analytics.
- Project management features.
- AI-generated planning advice beyond capture parsing.
- Recurring task automation beyond the three planning reminders.
- Separate appointment-specific alarms beyond the daily and weekly planning summaries.

## Rollout

Begin with a private version for the original user.

1. Build the web app, backend, and database.
2. Add account creation and Telegram linking.
3. Add Telegram capture and parsing.
4. Add the weekly spread, Inbox, and Future Notes.
5. Add reminder jobs.
6. Use the system alongside the paper notebook for one week.
7. Adjust message wording, placement rules, and workflow based on real use.

After the private trial, decide whether to add deeper natural language parsing, recurring tasks, calendar sync, or broader account onboarding.

## Open Decisions For Implementation Planning

- Hosting provider.
- Web framework.
- Database provider.
- Authentication provider.
- Telegram bot runtime and job scheduler.
