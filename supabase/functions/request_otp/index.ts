import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const RequestOTPSchema = z.object({
  phone: z.string().min(11).max(15),
});

type RequestOTPInput = z.infer<typeof RequestOTPSchema>;

function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString();
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    if (req.method !== "POST") {
      return new Response(
        JSON.stringify({ success: false, message: "Method not allowed" }),
        {
          status: 405,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const body = await req.json();

    const validationResult = RequestOTPSchema.safeParse(body);
    if (!validationResult.success) {
      return new Response(
        JSON.stringify({
          success: false,
          message: "البيانات المدخلة غير صحيحة"
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { phone }: RequestOTPInput = validationResult.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const phoneNumber = phone.replace(/\D/g, '').slice(-8);

    const formattedWhatsAppPhone = `+222${phoneNumber}`;

    const otpCode = generateOTP();
    const otpTTLMinutes = parseInt(Deno.env.get("OTP_TTL_MINUTES") || "5");
    const expiresAt = new Date(Date.now() + otpTTLMinutes * 60 * 1000).toISOString();

    const deleteOldOTPResponse = await fetch(
      `${supabaseUrl}/rest/v1/otp_codes?phone_number=eq.${phoneNumber}`,
      {
        method: "DELETE",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    );

    if (!deleteOldOTPResponse.ok) {
      console.error("Failed to delete old OTP codes");
    }

    const createOTPResponse = await fetch(
      `${supabaseUrl}/rest/v1/otp_codes`,
      {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          phone_number: phoneNumber,
          code: otpCode,
          expires_at: expiresAt,
          verified: false,
        }),
      }
    );

    if (!createOTPResponse.ok) {
      const errorText = await createOTPResponse.text();
      console.error("Failed to create OTP:", errorText);
      return new Response(
        JSON.stringify({
          success: false,
          message: "حدث خطأ غير متوقع، حاول لاحقاً."
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let whatsappSent = false;
    let whatsappError = null;

    try {
      const whatsappPayload = {
        to: `whatsapp:${formattedWhatsAppPhone}`,
        message: `Your MauriGifts verification code is ${otpCode}`,
      };

      const whatsappResponse = await fetch(
        `${supabaseUrl}/functions/v1/send_whatsapp_test`,
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(whatsappPayload),
        }
      );

      if (whatsappResponse.ok) {
        const whatsappData = await whatsappResponse.json();
        whatsappSent = whatsappData.status === "success";
      } else {
        const errorData = await whatsappResponse.json();
        whatsappError = errorData.message || "Failed to send WhatsApp message";
        console.error("WhatsApp send failed:", whatsappError);
      }
    } catch (error) {
      whatsappError = error instanceof Error ? error.message : "Unknown error";
      console.error("WhatsApp send error:", whatsappError);
    }

    return new Response(
      JSON.stringify({
        success: true,
        message: whatsappSent
          ? "✅ تم إرسال رمز التحقق بنجاح عبر واتساب."
          : "⚠️ تم إنشاء رمز التحقق ولكن فشل إرساله عبر واتساب.",
        otp_stored: true,
        whatsapp_sent: whatsappSent,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        message: "حدث خطأ غير متوقع، حاول لاحقاً."
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});