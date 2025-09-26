import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

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

    // Get all categories with product count
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        *,
        products!inner (
          id
        )
      `)
      .order('created_at');

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    // Transform to include product count and clean structure
    const categoriesWithCount = categories.map(category => ({
      id: category.id,
      name: category.name,
      image_url: category.image_url,
      created_at: category.created_at,
      product_count: category.products?.length || 0
    }));

    console.log(`Loaded ${categoriesWithCount.length} categories from database`);

    return new Response(
      JSON.stringify({ categories: categoriesWithCount }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('List categories error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في جلب الفئات' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});