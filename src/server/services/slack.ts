import dotenv from "dotenv";
dotenv.config();

export async function sendSlackMessage(text: string, attachments?: any[]): Promise<boolean> {
  const url = process.env.SLACK_WEBHOOK_URL;
  if (!url || url.trim() === "") {
    console.log(`[SlackService] [No Webhook Set - Log]: ${text}`, attachments ? JSON.stringify(attachments) : "");
    return false;
  }

  try {
    const payload = {
      text,
      ...(attachments ? { attachments } : {}),
    };

    const res = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify(payload),
    });

    if (!res.ok) {
      console.error(`[SlackService] Failed to send message. HTTP ${res.status}: ${await res.text()}`);
      return false;
    }

    console.log("[SlackService] Message sent successfully to Slack!");
    return true;
  } catch (err: any) {
    console.error("[SlackService] Connection error sending to Slack:", err.message || err);
    return false;
  }
}
