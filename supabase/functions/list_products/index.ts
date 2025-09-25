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

    // Group products by category name and ID for backward compatibility
    const groupedProducts = products.reduce((acc: any, product: any) => {
      // Use category name as primary key for grouping
      const categoryName = product.categories?.name;
      const categoryId = product.categories?.id;
      
      if (categoryName) {
        // Group by category name (primary)
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(product);
        
        // Also group by category ID for compatibility
        if (categoryId && categoryId !== categoryName) {
          if (!acc[categoryId]) {
            acc[categoryId] = [];
          }
          acc[categoryId].push(product);
        }
      } else {
        // Handle products without category (fallback)
        if (!acc['uncategorized']) {
          acc['uncategorized'] = [];
        }
        acc['uncategorized'].push(product);
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