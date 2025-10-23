import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { z } from "npm:zod@3.22.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const VerifyOTPSchema = z.object({
  phone: z.string().min(11).max(15),
  otp: z.string().regex(/^\d{4,6}$/, "OTP must be 4-6 digits"),
});

type VerifyOTPInput = z.infer<typeof VerifyOTPSchema>;

interface OTPRecord {
  id: string;
  phone_number: string;
  code: string;
  expires_at: string;
  verified: boolean;
}

interface User {
  id: string;
  name: string;
  phone_number: string;
  pin: string;
  role: string;
}

function generateSessionToken(): string {
  const array = new Uint8Array(32);
  crypto.getRandomValues(array);
  return Array.from(array, byte => byte.toString(16).padStart(2, '0')).join('');
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

    const validationResult = VerifyOTPSchema.safeParse(body);
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

    const { phone, otp }: VerifyOTPInput = validationResult.data;

    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

    const phoneNumber = phone.length === 11 ? phone.slice(-8) : phone;

    const otpResponse = await fetch(
      `${supabaseUrl}/rest/v1/otp_codes?phone_number=eq.${phoneNumber}&code=eq.${otp}&verified=eq.false&select=*`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!otpResponse.ok) {
      console.error("Failed to query OTP");
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

    const otpRecords: OTPRecord[] = await otpResponse.json();

    if (otpRecords.length === 0) {
      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "❌ الرمز غير صالح أو منتهي الصلاحية." 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const otpRecord = otpRecords[0];
    const expiresAt = new Date(otpRecord.expires_at);
    const now = new Date();

    if (expiresAt < now) {
      await fetch(
        `${supabaseUrl}/rest/v1/otp_codes?id=eq.${otpRecord.id}`,
        {
          method: "DELETE",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
          },
        }
      );

      return new Response(
        JSON.stringify({ 
          success: false, 
          message: "❌ الرمز غير صالح أو منتهي الصلاحية." 
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await fetch(
      `${supabaseUrl}/rest/v1/otp_codes?id=eq.${otpRecord.id}`,
      {
        method: "DELETE",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
        },
      }
    );

    const userResponse = await fetch(
      `${supabaseUrl}/rest/v1/users?phone_number=eq.${phoneNumber}&select=*`,
      {
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
        },
      }
    );

    if (!userResponse.ok) {
      console.error("Failed to query user");
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

    const users: User[] = await userResponse.json();
    let userId: string;

    if (users.length === 0) {
      const createUserResponse = await fetch(
        `${supabaseUrl}/rest/v1/users`,
        {
          method: "POST",
          headers: {
            "apikey": supabaseKey,
            "Authorization": `Bearer ${supabaseKey}`,
            "Content-Type": "application/json",
            "Prefer": "return=representation",
          },
          body: JSON.stringify({
            name: `User ${phoneNumber}`,
            phone_number: phoneNumber,
            pin: "0000",
            role: "user",
          }),
        }
      );

      if (!createUserResponse.ok) {
        const errorText = await createUserResponse.text();
        console.error("Failed to create user:", errorText);
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

      const newUsers: User[] = await createUserResponse.json();
      userId = newUsers[0].id;
    } else {
      userId = users[0].id;
    }

    const sessionToken = generateSessionToken();
    const sessionTTLDays = parseInt(Deno.env.get("SESSION_TTL_DAYS") || "30");
    const sessionExpiresAt = new Date(Date.now() + sessionTTLDays * 24 * 60 * 60 * 1000).toISOString();

    const createSessionResponse = await fetch(
      `${supabaseUrl}/rest/v1/sessions`,
      {
        method: "POST",
        headers: {
          "apikey": supabaseKey,
          "Authorization": `Bearer ${supabaseKey}`,
          "Content-Type": "application/json",
          "Prefer": "return=representation",
        },
        body: JSON.stringify({
          token: sessionToken,
          user_id: userId,
          expires_at: sessionExpiresAt,
        }),
      }
    );

    if (!createSessionResponse.ok) {
      const errorText = await createSessionResponse.text();
      console.error("Failed to create session:", errorText);
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

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: "✅ تم التحقق بنجاح وتفعيل الجلسة.",
        token: sessionToken,
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
