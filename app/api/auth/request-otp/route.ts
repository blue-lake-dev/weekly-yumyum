import { NextResponse } from "next/server";
import { generateOtp, sendOtpCode, isAllowedAdmin } from "@/lib/telegram";
import { storeOtp } from "@/lib/otp-store";

interface RequestBody {
  telegramId: number;
}

export async function POST(request: Request) {
  try {
    const body: RequestBody = await request.json();
    const { telegramId } = body;

    if (!telegramId || typeof telegramId !== "number") {
      return NextResponse.json(
        { error: "telegramId is required" },
        { status: 400 }
      );
    }

    // Check if user is allowed admin
    if (!isAllowedAdmin(telegramId)) {
      return NextResponse.json(
        { error: "Not authorized" },
        { status: 403 }
      );
    }

    // Generate and store OTP
    const otp = generateOtp();
    storeOtp(telegramId, otp);

    // Send OTP via Telegram
    const result = await sendOtpCode(telegramId, otp);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error || "Failed to send OTP" },
        { status: 500 }
      );
    }

    return NextResponse.json({
      success: true,
      message: "OTP sent to Telegram",
    });
  } catch (error) {
    console.error("request-otp error:", error);
    return NextResponse.json(
      { error: "Failed to process request" },
      { status: 500 }
    );
  }
}
