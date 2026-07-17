name: Orbit Tasks Reminder Cron

on:
  schedule:
    # Runs every 4 hours (at minute 0 of every 4th hour)
    - cron: '0 */4 * * *'
  workflow_dispatch:
    # Allows manually running from the Actions tab

jobs:
  send-reminders:
    runs-on: ubuntu-latest

    steps:
      - name: Trigger Email Notification API
        run: |
          curl -X POST "${{ secrets.APP_URL }}/api/tasks/send-reminders" \
            -H "Authorization: Bearer ${{ secrets.CRON_SECRET }}" \
            -H "Content-Type: application/json"
