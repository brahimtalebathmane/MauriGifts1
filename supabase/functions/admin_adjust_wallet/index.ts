import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, X-Client-Info, Apikey',
};

Deno.serve(async (req: Request) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabase = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
    );

    const { token, user_id, amount, operation } = await req.json();

    if (!token || !user_id || amount === undefined || !operation) {
      return new Response(
        JSON.stringify({ error: 'Missing required fields' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: authUser } = await supabase
      .from('users')
      .select('id, role')
      .eq('session_token', token)
      .maybeSingle();

    if (!authUser || authUser.role !== 'admin') {
      return new Response(
        JSON.stringify({ error: 'Unauthorized' }),
        { status: 403, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: targetUser } = await supabase
      .from('users')
      .select('wallet_balance, is_wallet_active')
      .eq('id', user_id)
      .maybeSingle();

    if (!targetUser) {
      return new Response(
        JSON.stringify({ error: 'User not found' }),
        { status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (!targetUser.is_wallet_active) {
      return new Response(
        JSON.stringify({ error: 'Wallet is not active' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: settings } = await supabase
      .from('settings')
      .select('value')
      .eq('key', 'wallet_global_limits')
      .maybeSingle();

    const limits = settings?.value || { max_balance: 5000 };
    const currentBalance = parseFloat(targetUser.wallet_balance.toString());
    const adjustAmount = parseFloat(amount.toString());

    let newBalance: number;
    if (operation === 'add') {
      newBalance = currentBalance + adjustAmount;
    } else if (operation === 'subtract') {
      newBalance = currentBalance - adjustAmount;
    } else {
      return new Response(
        JSON.stringify({ error: 'Invalid operation' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newBalance < 0) {
      return new Response(
        JSON.stringify({ error: 'Insufficient balance' }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (newBalance > limits.max_balance) {
      return new Response(
        JSON.stringify({ error: `Balance cannot exceed ${limits.max_balance} MRU` }),
        { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: updatedUser, error: updateError } = await supabase
      .from('users')
      .update({ wallet_balance: newBalance })
      .eq('id', user_id)
      .select('id, name, phone_number, role, is_wallet_active, wallet_balance, created_at, updated_at')
      .single();

    if (updateError) {
      return new Response(
        JSON.stringify({ error: updateError.message }),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    return new Response(
      JSON.stringify({ user: updatedUser }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({ error: error.message }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
