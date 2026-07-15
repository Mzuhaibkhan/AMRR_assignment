import os
import httpx
from datetime import datetime, timezone, timedelta
from database import SessionLocal
import models

def compose_email_html(email, items):
    rows_html = ""
    for item in items:
        badge_color = "#ef4444" if item["urgency"] == "overdue" else "#f97316"
        type_badge = '<span style="background-color: #475569; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Subtask</span>' if item["is_subtask"] else '<span style="background-color: #3b82f6; color: white; padding: 2px 6px; border-radius: 4px; font-size: 11px;">Task</span>'
        
        formatted_deadline = item["deadline"].strftime("%b %d, %Y at %I:%M %p UTC")
        
        rows_html += f"""
        <tr style="border-bottom: 1px solid #e2e8f0;">
            <td style="padding: 12px; font-size: 14px;">{type_badge}</td>
            <td style="padding: 12px; font-size: 14px; font-weight: bold; color: #1e293b;">{item['title']}<br/><span style="font-size: 12px; font-weight: normal; color: #64748b;">{item['description']}</span></td>
            <td style="padding: 12px; font-size: 14px; color: #475569;">{item['status']}</td>
            <td style="padding: 12px; font-size: 14px; color: #475569;">{formatted_deadline}</td>
            <td style="padding: 12px;"><span style="background-color: {badge_color}; color: white; padding: 4px 8px; border-radius: 9999px; font-size: 12px; font-weight: bold;">{item['status_label']}</span></td>
        </tr>
        """
        
    app_url = os.environ.get("APP_URL", "http://localhost:8000")
    return f"""
    <!DOCTYPE html>
    <html>
    <head>
        <meta charset="utf-8">
        <title>Orbit Tasks Reminder</title>
    </head>
    <body style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f8fafc; padding: 20px; margin: 0;">
        <div style="max-width: 600px; margin: 0 auto; background: white; border-radius: 12px; border: 1px solid #e2e8f0; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0,0,0,0.1);">
            <div style="background: linear-gradient(135deg, #4f46e5, #06b6d4); padding: 30px; text-align: center; color: white;">
                <h1 style="margin: 0; font-size: 24px; font-weight: 800; letter-spacing: -0.025em;">Orbit Tasks</h1>
                <p style="margin: 5px 0 0 0; opacity: 0.9; font-size: 14px;">Task Deadline & Status Digest</p>
            </div>
            <div style="padding: 30px;">
                <p style="font-size: 16px; color: #334155; margin-top: 0;">Hello,</p>
                <p style="font-size: 14px; color: #475569; line-height: 1.5;">Here is a summary of your pending tasks and subtasks that are overdue or approaching their deadline in the next 24 hours.</p>
                
                <table style="width: 100%; border-collapse: collapse; margin: 20px 0; text-align: left;">
                    <thead>
                        <tr style="background-color: #f1f5f9; border-bottom: 2px solid #cbd5e1;">
                            <th style="padding: 10px; font-size: 12px; color: #475569; text-transform: uppercase;">Type</th>
                            <th style="padding: 10px; font-size: 12px; color: #475569; text-transform: uppercase;">Title</th>
                            <th style="padding: 10px; font-size: 12px; color: #475569; text-transform: uppercase;">Status</th>
                            <th style="padding: 10px; font-size: 12px; color: #475569; text-transform: uppercase;">Deadline</th>
                            <th style="padding: 10px; font-size: 12px; color: #475569; text-transform: uppercase;">Urgency</th>
                        </tr>
                    </thead>
                    <tbody>
                        {rows_html}
                    </tbody>
                </table>
                
                <div style="text-align: center; margin-top: 30px;">
                    <a href="{app_url}" style="background-color: #4f46e5; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; font-weight: bold; font-size: 14px; display: inline-block;">Open Orbit Tasks</a>
                </div>
            </div>
            <div style="background-color: #f8fafc; border-top: 1px solid #e2e8f0; padding: 20px; text-align: center; font-size: 12px; color: #64748b;">
                This is an automated notification from your Orbit Tasks planner.
            </div>
        </div>
    </body>
    </html>
    """

def send_email_via_resend(to_email, subject, html_content):
    keys_str = os.environ.get("RESEND_API_KEYS", "")
    api_keys = [k.strip() for k in keys_str.split(",") if k.strip()]
    
    if not api_keys and os.environ.get("RESEND_API_KEY"):
        api_keys = [os.environ.get("RESEND_API_KEY")]
        
    if not api_keys:
        print("Warning: No Resend API keys found in environment variables (RESEND_API_KEYS or RESEND_API_KEY).")
        return False

    sender = os.environ.get("EMAIL_FROM", "Orbit Tasks <onboarding@resend.dev>")

    for index, key in enumerate(api_keys):
        masked_key = f"...{key[-6:]}" if len(key) > 6 else "invalid-key"
        print(f"Attempting to send email using Resend key index {index} ({masked_key})...")
        try:
            response = httpx.post(
                "https://api.resend.com/emails",
                headers={
                    "Authorization": f"Bearer {key}",
                    "Content-Type": "application/json"
                },
                json={
                    "from": sender,
                    "to": [to_email],
                    "subject": subject,
                    "html": html_content
                },
                timeout=15.0
            )
            
            if response.status_code in (200, 201):
                print(f"Successfully sent email using key index {index}.")
                return True
            
            print(f"Key index {index} failed with status code {response.status_code}. Response: {response.text}")
            
            if response.status_code in (422, 429) or "limit" in response.text.lower() or "quota" in response.text.lower():
                print(f"Resend free tier or rate limit exceeded for key index {index}. Falling back to next key...")
                continue
            else:
                print(f"Error occurred with key index {index}. Falling back to next key...")
                continue

        except Exception as e:
            print(f"Exception raised while sending via key index {index}: {e}. Falling back to next key...")
            continue
            
    print("Error: All Resend API keys were exhausted or failed to send.")
    return False

def send_deadline_reminders():
    db = SessionLocal()
    try:
        now = datetime.now(timezone.utc)
        print(f"Running deadline reminders script. Current UTC time: {now}")
        
        # Query all non-completed tasks that have a deadline and ownership
        cursor = db.tasks.find({
            "status": {"$ne": "Completed"},
            "deadline": {"$ne": None},
            "user_email": {"$ne": None}
        })
        tasks = list(cursor)

        user_tasks = {}
        for task in tasks:
            deadline = task.get("deadline")
            if isinstance(deadline, str):
                try:
                    if "T" in deadline:
                        deadline = datetime.fromisoformat(deadline.replace("Z", "+00:00"))
                    else:
                        deadline = datetime.strptime(deadline, "%Y-%m-%d %H:%M:%S.%f")
                except Exception as e:
                    print(f"Failed to parse deadline string '{deadline}' for task ID {task.get('_id')}: {e}")
                    continue
            
            if deadline.tzinfo is None:
                deadline = deadline.replace(tzinfo=timezone.utc)
                
            status_label = ""
            urgency = ""
            
            if deadline < now:
                status_label = "Overdue"
                urgency = "overdue"
            elif deadline <= now + timedelta(hours=24):
                status_label = "Due soon (within 24 hours)"
                urgency = "approaching"
            else:
                # Task is pending but deadline is more than 24 hours in the future
                continue

            user_email = task.get("user_email")
            if user_email not in user_tasks:
                user_tasks[user_email] = []
            
            status_val = task.get("status")
            user_tasks[user_email].append({
                "title": task.get("title"),
                "description": task.get("description") or "No description",
                "deadline": deadline,
                "status": status_val.value if hasattr(status_val, 'value') else str(status_val),
                "status_label": status_label,
                "urgency": urgency,
                "is_subtask": task.get("parent_id") is not None
            })

        if not user_tasks:
            print("No pending or overdue tasks found matching email reminder conditions.")
            return

        for email, items in user_tasks.items():
            # Check user preference before sending
            settings = db.user_settings.find_one({"email": email})
            if settings and not settings.get("wants_reminders", True):
                print(f"Skipping digest email for {email} (user disabled email reminders).")
                continue
                
            print(f"Preparing digest email for {email} containing {len(items)} tasks...")
            subject = "⏰ [Orbit Tasks] Pending Tasks & Approaching Deadlines Reminder"
            html = compose_email_html(email, items)
            
            success = send_email_via_resend(email, subject, html)
            if success:
                print(f"Successfully sent reminders to {email}")
            else:
                print(f"Failed to send reminders to {email}")

    finally:
        # MongoDB connection is managed automatically, no session close is needed here
        pass

if __name__ == "__main__":
    send_deadline_reminders()
