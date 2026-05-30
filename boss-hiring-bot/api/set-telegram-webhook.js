const TOKEN = process.env.TELEGRAM_BOT_TOKEN;
const PUBLIC_URL = process.env.BOT_PUBLIC_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL;

export default async function handler(request, response) {
  if (!TOKEN) {
    response.status(500).json({ ok: false, error: "Missing TELEGRAM_BOT_TOKEN" });
    return;
  }

  if (!PUBLIC_URL) {
    response.status(500).json({ ok: false, error: "Missing BOT_PUBLIC_URL" });
    return;
  }

  const baseUrl = PUBLIC_URL.startsWith("http") ? PUBLIC_URL : `https://${PUBLIC_URL}`;
  const webhookUrl = `${baseUrl.replace(/\/$/, "")}/api/telegram`;
  const telegramResponse = await fetch(`https://api.telegram.org/bot${TOKEN}/setWebhook`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      url: webhookUrl,
      allowed_updates: ["message", "callback_query"],
    }),
  });

  const webhookJson = await telegramResponse.json();
  const commandsJson = await setCommands();
  response.status(200).json({ ...webhookJson, webhookUrl, commands: commandsJson });
}

async function setCommands() {
  const commands = [
    { command: "start", description: "Open Boss Hiring service entrance" },
    { command: "menu", description: "Choose service menu" },
    { command: "language", description: "Choose language" },
    { command: "job", description: "Candidate service" },
    { command: "hire", description: "Employer hiring service" },
    { command: "boss_show", description: "About Boss Show" },
    { command: "templates", description: "Download templates" },
    { command: "website", description: "Visit official website" },
    { command: "contact", description: "Contact support" },
  ];

  const response = await fetch(`https://api.telegram.org/bot${TOKEN}/setMyCommands`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ commands }),
  });
  return response.json();
}
