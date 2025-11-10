import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, GET, OPTIONS',
};

interface DiagnosticResult {
  status: 'ok' | 'error';
  can_read: boolean;
  can_write: boolean;
  message: string;
  details?: {
    connection?: string;
    read_test?: string;
    write_test?: string;
    cleanup?: string;
  };
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { headers: corsHeaders });
  }

  const result: DiagnosticResult = {
    status: 'error',
    can_read: false,
    can_write: false,
    message: '',
    details: {},
  };

  try {
    // Step 1: Test connection
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');

    if (!supabaseUrl || !supabaseKey) {
      result.message = 'Missing environment variables (SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY)';
      result.details!.connection = 'Environment variables not set';
      return new Response(
        JSON.stringify(result),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false }
    });

    result.details!.connection = 'Client created successfully';

    // Step 2: Test READ access
    try {
      const { data: users, error: readError } = await supabase
        .from('users')
        .select('id')
        .limit(1);

      if (readError) {
        result.message = `Read test failed: ${readError.message}`;
        result.details!.read_test = readError.message;
        return new Response(
          JSON.stringify(result),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result.can_read = true;
      result.details!.read_test = `Successfully read from users table (found ${users?.length || 0} rows)`;
    } catch (error) {
      result.message = `Read test exception: ${error.message}`;
      result.details!.read_test = error.message;
      return new Response(
        JSON.stringify(result),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Step 3: Ensure connection_test table exists
    try {
      const { error: createTableError } = await supabase.rpc('exec_sql', {
        sql: `
          CREATE TABLE IF NOT EXISTS connection_test (
            id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
            test_data text,
            created_at timestamptz DEFAULT now()
          );
        `
      });

      // If exec_sql function doesn't exist, create table directly using raw query
      if (createTableError) {
        // Try direct table creation
        const { error: directCreateError } = await supabase
          .from('connection_test')
          .select('id')
          .limit(0);

        // If table doesn't exist, we need to create it another way
        // For now, we'll use a workaround by attempting an insert
      }
    } catch (error) {
      // Table creation might fail, but we'll try insert anyway
      result.details!.write_test = 'Table check: will attempt insert';
    }

    // Step 4: Test WRITE access
    const testId = crypto.randomUUID();
    const testData = `diagnostic-test-${Date.now()}`;

    try {
      const { data: insertData, error: insertError } = await supabase
        .from('connection_test')
        .insert({
          id: testId,
          test_data: testData,
        })
        .select()
        .single();

      if (insertError) {
        result.message = `Write test failed: ${insertError.message}`;
        result.details!.write_test = insertError.message;
        return new Response(
          JSON.stringify(result),
          { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
        );
      }

      result.can_write = true;
      result.details!.write_test = `Successfully inserted test row with id: ${testId}`;

      // Step 5: Cleanup - Delete the test row
      try {
        const { error: deleteError } = await supabase
          .from('connection_test')
          .delete()
          .eq('id', testId);

        if (deleteError) {
          result.details!.cleanup = `Warning: Could not delete test row: ${deleteError.message}`;
        } else {
          result.details!.cleanup = `Successfully deleted test row with id: ${testId}`;
        }
      } catch (cleanupError) {
        result.details!.cleanup = `Cleanup exception: ${cleanupError.message}`;
      }

      // Success!
      result.status = 'ok';
      result.message = 'Supabase connection verified successfully';

      return new Response(
        JSON.stringify(result),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );

    } catch (error) {
      result.message = `Write test exception: ${error.message}`;
      result.details!.write_test = error.message;
      return new Response(
        JSON.stringify(result),
        { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

  } catch (error) {
    result.message = `Unexpected error: ${error.message}`;
    return new Response(
      JSON.stringify(result),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});