// JWT authentication helpers
// Uses Web Crypto API (available in Edge runtime)

const JWT_EXPIRY_DAYS = 7;

interface JwtPayload {
  telegramId: number;
  exp: number;
  iat: number;
}

/**
 * Encode base64url (URL-safe base64)
 */
function base64urlEncode(data: Uint8Array | string): string {
  const str = typeof data === "string" ? data : new TextDecoder().decode(data);
  return btoa(str).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

/**
 * Decode base64url
 */
function base64urlDecode(str: string): string {
  const padded = str + "=".repeat((4 - (str.length % 4)) % 4);
  return atob(padded.replace(/-/g, "+").replace(/_/g, "/"));
}

/**
 * Get signing key from secret
 */
async function getSigningKey(): Promise<CryptoKey> {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    throw new Error("JWT_SECRET not set");
  }

  const encoder = new TextEncoder();
  return crypto.subtle.importKey(
    "raw",
    encoder.encode(secret),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign", "verify"]
  );
}

/**
 * Sign a JWT token
 */
export async function signJwt(telegramId: number): Promise<string> {
  const key = await getSigningKey();
  const now = Math.floor(Date.now() / 1000);

  const header = { alg: "HS256", typ: "JWT" };
  const payload: JwtPayload = {
    telegramId,
    iat: now,
    exp: now + JWT_EXPIRY_DAYS * 24 * 60 * 60,
  };

  const headerB64 = base64urlEncode(JSON.stringify(header));
  const payloadB64 = base64urlEncode(JSON.stringify(payload));
  const message = `${headerB64}.${payloadB64}`;

  const encoder = new TextEncoder();
  const signature = await crypto.subtle.sign(
    "HMAC",
    key,
    encoder.encode(message)
  );

  const signatureB64 = base64urlEncode(
    String.fromCharCode(...new Uint8Array(signature))
  );

  return `${message}.${signatureB64}`;
}

/**
 * Verify and decode a JWT token
 */
export async function verifyJwt(
  token: string
): Promise<{ valid: boolean; payload?: JwtPayload; error?: string }> {
  try {
    const parts = token.split(".");
    if (parts.length !== 3) {
      return { valid: false, error: "Invalid token format" };
    }

    const [headerB64, payloadB64, signatureB64] = parts;
    const key = await getSigningKey();

    // Verify signature
    const message = `${headerB64}.${payloadB64}`;
    const encoder = new TextEncoder();
    const signature = Uint8Array.from(
      base64urlDecode(signatureB64),
      (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify(
      "HMAC",
      key,
      signature,
      encoder.encode(message)
    );

    if (!valid) {
      return { valid: false, error: "Invalid signature" };
    }

    // Decode payload
    const payload: JwtPayload = JSON.parse(base64urlDecode(payloadB64));

    // Check expiry
    const now = Math.floor(Date.now() / 1000);
    if (payload.exp < now) {
      return { valid: false, error: "Token expired" };
    }

    return { valid: true, payload };
  } catch (error) {
    console.error("verifyJwt error:", error);
    return {
      valid: false,
      error: error instanceof Error ? error.message : "Unknown error",
    };
  }
}

/**
 * Extract JWT from Authorization header or cookie
 */
export function extractToken(request: Request): string | null {
  // Check Authorization header first
  const authHeader = request.headers.get("authorization");
  if (authHeader?.startsWith("Bearer ")) {
    return authHeader.slice(7);
  }

  // Check cookie
  const cookies = request.headers.get("cookie");
  if (cookies) {
    const match = cookies.match(/admin_token=([^;]+)/);
    if (match) {
      return match[1];
    }
  }

  return null;
}

/**
 * Create Set-Cookie header for JWT
 */
export function createTokenCookie(token: string): string {
  const maxAge = JWT_EXPIRY_DAYS * 24 * 60 * 60;
  return `admin_token=${token}; Path=/; HttpOnly; SameSite=Strict; Max-Age=${maxAge}`;
}

/**
 * Create Set-Cookie header to clear token
 */
export function clearTokenCookie(): string {
  return "admin_token=; Path=/; HttpOnly; SameSite=Strict; Max-Age=0";
}
