import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';
import { crypto } from 'https://deno.land/std/crypto/mod.ts';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const signupSchema = z.object({
  name: z.string().min(1).max(100),
  phone_number: z.string().length(8).regex(/^\d{8}$/),
  pin: z.string().length(4).regex(/^\d{4}$/),
});

async function createSession(supabase: any, userId: string) {
  const token = Array.from(crypto.getRandomValues(new Uint8Array(32)))
    .map(b => b.toString(16).padStart(2, '0'))
    .join('');
  
  const expiresAt = new Date();
  expiresAt.setDate(expiresAt.getDate() + 30);
  
  const { error } = await supabase
    .from('sessions')
    .insert({
      token,
      user_id: userId,
      expires_at: expiresAt.toISOString(),
    });
  
  if (error) throw error;
  return token;
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '',
      { auth: { persistSession: false } }
    );

    const body = await req.json();
    const { name, phone_number, pin } = signupSchema.parse(body);

    // Check if phone number already exists
    const { data: existingUser } = await supabase
      .from('users')
      .select('id')
      .eq('phone_number', phone_number)
      .single();

    if (existingUser) {
      return new Response(
        JSON.stringify({ error: 'رقم الهاتف مستخدم بالفعل' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Create user
    const { data: user, error: userError } = await supabase
      .from('users')
      .insert({ name, phone_number, pin })
      .select()
      .single();

    if (userError) throw userError;

    // Create session
    const token = await createSession(supabase, user.id);

    // Remove PIN from response
    const { pin: _, ...userResponse } = user;

    return new Response(
      JSON.stringify({ user: userResponse, token }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Signup error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في إنشاء الحساب' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});