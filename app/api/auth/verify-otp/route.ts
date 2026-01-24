import { NextResponse } from "next/server";
import { verifyOtp } from "@/lib/otp-store";
import { signJwt, createTokenCookie } from "@/lib/auth";
import { isAllowedAdmin } from "@/lib/telegram";

interface RequestBody {
  telegramId: number;
  otp: string;
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { telegramId, otp } = body;

    if (!telegramId || typeof telegramId !== "number") {
      return NextResponse.json(
        { error: "telegramId is required" },
        { status: 400 }
      );
    }

    if (!otp || typeof otp !== "string") {
      return NextResponse.json(
        { error: "otp is required" },
        { status: 400 }
      );
    }

    // Double-check admin authorization
    if (!isAllowedAdmin(telegramId)) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Verify OTP
    const isValid = verifyOtp(telegramId, otp);

    if (!isValid) {
      return NextResponse.json(
        { error: "Invalid or expired OTP" },
        { status: 401 }
      );
    }

    // Generate JWT
    const token = await signJwt(telegramId);

    // Create response with cookie
    const response = NextResponse.json({
      success: true,
      message: "Authentication successful",
    });

    response.headers.set("Set-Cookie", createTokenCookie(token));

    return response;
  } catch (error) {
    console.error("verify-otp error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
