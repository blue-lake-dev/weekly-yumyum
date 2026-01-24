// In-memory OTP store with expiry
// For small admin teams (3 people), this is sufficient
// For larger scale, use Redis or database with TTL

interface OtpEntry {
  otp: string;
  telegramId: number;
  expiresAt: number;
}

// Store: telegramId -> OTP entry
const otpStore = new Map<number, OtpEntry>();

const OTP_EXPIRY_MS = 5 * 60 * 1000; // 5 minutes

/**
 * Store an OTP for a Telegram ID
 */
export function storeOtp(telegramId: number, otp: string): void {
  // Clean up expired entries
  cleanupExpired();

  otpStore.set(telegramId, {
    otp,
    telegramId,
    expiresAt: Date.now() + OTP_EXPIRY_MS,
  });
}

/**
 * Verify an OTP for a Telegram ID
 * Returns true if valid, false otherwise
 * OTP is consumed (deleted) after verification
 */
export function verifyOtp(telegramId: number, otp: string): boolean {
  const entry = otpStore.get(telegramId);

  if (!entry) {
    return false;
  }

  // Check expiry
  if (Date.now() > entry.expiresAt) {
    otpStore.delete(telegramId);
    return false;
  }

  // Check OTP match
  if (entry.otp !== otp) {
    return false;
  }

  // Consume OTP
  otpStore.delete(telegramId);
  return true;
}

/**
 * Clean up expired OTPs
 */
function cleanupExpired(): void {
  const now = Date.now();
  for (const [telegramId, entry] of otpStore) {
    if (now > entry.expiresAt) {
      otpStore.delete(telegramId);
    }
  }
}
