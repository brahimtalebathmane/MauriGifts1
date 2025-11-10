const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

interface RequestBody {
  to: string;
  message: string;
}

interface TwilioResponse {
  status: string;
  sid?: string;
  to?: string;
  message?: string;
  timestamp?: string;
  error_message?: string;
}

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (req.method !== 'POST') {
    return new Response(
      JSON.stringify({ status: 'error', message: 'Method not allowed' }),
      {
        status: 405,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }

  try {
    const body: RequestBody = await req.json();

    if (!body.to || !body.message) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Missing required fields: "to" and "message"',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Validate recipient number format
    if (!body.to.includes('+')) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Invalid recipient format. Use format: whatsapp:+<country_code><number>',
        }),
        {
          status: 400,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Get Twilio credentials from environment
    const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
    const twilioAuthToken = Deno.env.get('TWILIO_AUTH_TOKEN');
    const twilioApiUrl = Deno.env.get('TWILIO_API_URL');
    const twilioWhatsappNumber = Deno.env.get('TWILIO_WHATSAPP_NUMBER');

    if (!twilioAccountSid || !twilioAuthToken || !twilioApiUrl || !twilioWhatsappNumber) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: 'Missing Twilio environment variables',
        }),
        {
          status: 500,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Create Basic Authentication header
    const credentials = `${twilioAccountSid}:${twilioAuthToken}`;
    const encodedCredentials = btoa(credentials);

    // Prepare form data for Twilio API
    const formData = new URLSearchParams();
    formData.append('From', twilioWhatsappNumber);
    formData.append('To', body.to);
    formData.append('Body', body.message);

    // Make request to Twilio API
    const twilioResponse = await fetch(twilioApiUrl, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${encodedCredentials}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formData.toString(),
    });

    const responseData = await twilioResponse.json();

    if (!twilioResponse.ok) {
      return new Response(
        JSON.stringify({
          status: 'error',
          message: responseData.message || 'Twilio API error',
          error_message: responseData.message || JSON.stringify(responseData),
        }),
        {
          status: twilioResponse.status,
          headers: { ...corsHeaders, 'Content-Type': 'application/json' },
        }
      );
    }

    // Success response
    const result: TwilioResponse = {
      status: 'success',
      sid: responseData.sid,
      to: responseData.to,
      message: body.message,
      timestamp: new Date().toISOString(),
    };

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    });

  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error';

    return new Response(
      JSON.stringify({
        status: 'error',
        message: 'Failed to process request',
        error_message: errorMessage,
      }),
      {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      }
    );
  }
});