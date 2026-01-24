// Telegram Bot API helper for OTP authentication

const TELEGRAM_API = "https://api.telegram.org/bot";

interface TelegramResponse {
  ok: boolean;
  result?: unknown;
  description?: string;
}

/**
 * Send a message to a Telegram user by chat ID
 */
export async function sendTelegramMessage(
  chatId: number | string,
  text: string
): Promise<{ success: boolean; error?: string }> {
  const token = process.env.TELEGRAM_BOT_TOKEN;

  if (!token) {
    return { success: false, error: "TELEGRAM_BOT_TOKEN not set" };
  }

  try {
    const response = await fetch(`${TELEGRAM_API}${token}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: chatId,
        text,
        parse_mode: "HTML",
      }),
    });

    const data: TelegramResponse = await response.json();

    if (!data.ok) {
      return { success: false, error: data.description || "Failed to send message" };
    }

    return { success: true };
  } catch (error) {
    console.error("sendTelegramMessage error:", error);
    return {
      success: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Send OTP code to admin via Telegram
 */
export async function sendOtpCode(
  chatId: number | string,
  otp: string
): Promise<{ success: boolean; error?: string }> {
  const message = `🔐 <b>YUMYUM Admin Login</b>\n\nYour OTP code: <code>${otp}</code>\n\nThis code expires in 5 minutes.`;
  return sendTelegramMessage(chatId, message);
}

/**
 * Generate a 6-digit OTP code
 */
export function generateOtp(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

/**
 * Get allowed admin Telegram IDs from env
 * Format: ADMIN_TELEGRAM_IDS=123456789,987654321
 */
export function getAllowedAdminIds(): number[] {
  const ids = process.env.ADMIN_TELEGRAM_IDS || "";
  return ids
    .split(",")
    .map((id) => parseInt(id.trim(), 10))
    .filter((id) => !isNaN(id));
}

/**
 * Check if a Telegram ID is an allowed admin
 */
export function isAllowedAdmin(telegramId: number): boolean {
  const allowedIds = getAllowedAdminIds();
  return allowedIds.includes(telegramId);
}
