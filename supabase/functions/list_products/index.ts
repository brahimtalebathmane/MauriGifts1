import { createClient } from 'npm:@supabase/supabase-js@2';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'GET, OPTIONS',
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

    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name
        )
      `)
      .eq('active', true)
      .order('created_at', { ascending: false })
      .order('price_mru');

    if (error) throw error;

    // Group products by category name and ID for proper linking
    const groupedProducts = products.reduce((acc: any, product: any) => {
      const categoryName = product.categories?.name || 'uncategorized';
      const categoryId = product.categories?.id || 'uncategorized';
      
      // Group by both name and ID for backward compatibility
      if (!acc[categoryName]) {
        acc[categoryName] = [];
      }
      if (!acc[categoryId]) {
        acc[categoryId] = [];
      }
      
      acc[categoryName].push(product);
      if (categoryId !== categoryName) {
        acc[categoryId].push(product);
      }
      
      return acc;
    }, {});

    return new Response(
      JSON.stringify({ products: groupedProducts }),
      { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('List products error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في جلب المنتجات' }),
      { status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});