"""Send a daily retargeting-candidate report from BigQuery by Gmail SMTP."""

import csv
import html
import io
import os
import smtplib
import ssl
from email.message import EmailMessage
from pathlib import Path

import functions_framework
from google.cloud import bigquery


PROJECT_ID = os.environ.get("GOOGLE_CLOUD_PROJECT", "pawait-data-hub")
PREDICTIONS_VIEW = os.environ.get(
    "PREDICTIONS_VIEW", f"{PROJECT_ID}.cloud_mastery.predictions"
)
THRESHOLD = float(os.environ.get("RETARGETING_THRESHOLD", "0.151"))
MAX_RECORDS = int(os.environ.get("MAX_RECORDS", "500"))
SMTP_HOST = os.environ.get("SMTP_HOST", "smtp.gmail.com")
SMTP_PORT = int(os.environ.get("SMTP_PORT", "465"))
SMTP_USERNAME = os.environ["SMTP_USERNAME"]
SMTP_PASSWORD = os.environ["SMTP_PASSWORD"]
MARKETING_ADMIN_EMAIL = os.environ["MARKETING_ADMIN_EMAIL"]

# Uses the themed template currently in this workspace by default.
TEMPLATE_FILE = os.environ.get("EMAIL_TEMPLATE_FILE", "retargeting-candidates-template.html")


def fetch_candidates():
    """Fetch high-propensity sessions, ranked by positive-class probability."""
    query = f"""
      WITH scored AS (
        SELECT
          unique_session_id,
          latest_ecommerce_progress,
          bounces,
          time_on_site,
          pageviews,
          source,
          medium,
          channelGrouping,
          deviceCategory,
          country,
          (
            SELECT prob
            FROM UNNEST(predicted_will_buy_on_return_visit_probs)
            WHERE CAST(label AS STRING) = '1'
          ) AS return_purchase_probability
        FROM `{PREDICTIONS_VIEW}`
      )
      SELECT *
      FROM scored
      WHERE return_purchase_probability >= @threshold
      ORDER BY return_purchase_probability DESC
      LIMIT @max_records
    """
    job_config = bigquery.QueryJobConfig(
        query_parameters=[
            bigquery.ScalarQueryParameter("threshold", "FLOAT64", THRESHOLD),
            bigquery.ScalarQueryParameter("max_records", "INT64", MAX_RECORDS),
        ]
    )

    client = bigquery.Client(project=PROJECT_ID)
    return [dict(row) for row in client.query(query, job_config=job_config).result()]


def _to_float(value, default=0.0):
    try:
        if value is None:
            return default
        return float(value)
    except (TypeError, ValueError):
        return default


def probability_pill_style(probability):
    """Return inline style string for probability pill badge."""
    if probability >= 0.80:
        # High
        return (
            "display:inline-block; padding:4px 8px; border-radius:999px; "
            "font-size:11px; font-weight:700; border:1px solid #BBF7D0; "
            "color:#166534; background:#ECFDF3;"
        )
    if probability >= 0.60:
        # Medium
        return (
            "display:inline-block; padding:4px 8px; border-radius:999px; "
            "font-size:11px; font-weight:700; border:1px solid #FDE68A; "
            "color:#92400E; background:#FFFBEB;"
        )
    # Low
    return (
        "display:inline-block; padding:4px 8px; border-radius:999px; "
        "font-size:11px; font-weight:700; border:1px solid #FECACA; "
        "color:#991B1B; background:#FEF2F2;"
    )


def build_message(rows):
    """Build a multipart email with styled HTML + CSV attachment."""
    columns = [
        "unique_session_id",
        "return_purchase_probability",
        "latest_ecommerce_progress",
        "pageviews",
        "time_on_site",
        "bounces",
        "source",
        "medium",
        "channelGrouping",
        "deviceCategory",
        "country",
    ]

    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=columns, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(rows)

    table_rows = "".join(
        "<tr>"
        f"<td style='padding:10px; border-bottom:1px solid #E2E8F0; font-family:monospace; font-size:12px;'>{html.escape(str(row.get('unique_session_id', '')))}</td>"
        f"<td style='padding:10px; border-bottom:1px solid #E2E8F0;'><span style='{probability_pill_style(_to_float(row.get('return_purchase_probability', 0)))}'>{_to_float(row.get('return_purchase_probability', 0)):.1%}</span></td>"
        f"<td style='padding:10px; border-bottom:1px solid #E2E8F0;'>{html.escape(str(row.get('pageviews', '')))}</td>"
        f"<td style='padding:10px; border-bottom:1px solid #E2E8F0;'>{html.escape(str(row.get('source', '')))}</td>"
        f"<td style='padding:10px; border-bottom:1px solid #E2E8F0;'>{html.escape(str(row.get('country', '')))}</td>"
        "</tr>"
        for row in rows[:25]
    ) or (
        "<tr><td colspan='5' style='padding:12px; color:#64748B;'>"
        "No candidates met the threshold."
        "</td></tr>"
    )

    message = EmailMessage()
    message["From"] = SMTP_USERNAME
    message["To"] = MARKETING_ADMIN_EMAIL
    message["Subject"] = f"Retargeting candidates: {len(rows)} sessions at >= {THRESHOLD:.1%}"
    message.set_content(
        f"{len(rows)} retargeting candidates met the {THRESHOLD:.1%} threshold. "
        "Open the attached CSV for the ranked audience."
    )

    template_path = Path(__file__).with_name(TEMPLATE_FILE)
    template = template_path.read_text("utf-8")
    email_html = (
        template.replace("{{candidate_count}}", str(len(rows)))
        .replace("{{threshold}}", f"{THRESHOLD:.1%}")
        .replace("{{candidate_rows}}", table_rows)
    )

    message.add_alternative(email_html, subtype="html")
    message.add_attachment(
        output.getvalue().encode("utf-8"),
        maintype="text",
        subtype="csv",
        filename="retargeting_candidates.csv",
    )
    return message


def send_email(message):
    """Send message via SMTP over SSL."""
    context = ssl.create_default_context()
    with smtplib.SMTP_SSL(SMTP_HOST, SMTP_PORT, context=context) as smtp:
        smtp.login(SMTP_USERNAME, SMTP_PASSWORD)
        smtp.send_message(message)


@functions_framework.http
def send_retargeting_report(request):
    """HTTP entry point. Intended to be invoked by an authenticated scheduler job."""
    rows = fetch_candidates()
    send_email(build_message(rows))
    return {"status": "sent", "candidate_count": len(rows)}, 200
