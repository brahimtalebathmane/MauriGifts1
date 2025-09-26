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
      .not('category_id', 'is', null)
      .order('categories(name)')
      .order('price_mru');

    if (error) throw error;

    // Group products by category name and ID for maximum compatibility
    const groupedProducts = products.reduce((acc: any, product: any) => {
      const category = product.categories;
      
      if (category && category.name && category.id) {
        // Group by category name (primary)
        const categoryName = category.name;
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(product);
        
        // Also group by category ID (secondary for compatibility)
        const categoryId = category.id;
        if (categoryId) {
          if (!acc[categoryId]) {
            acc[categoryId] = [];
          }
          acc[categoryId].push(product);
        }
      } else {
        // This should not happen after migration, but handle gracefully
        console.error('Product without category found after migration:', product.id, product.name);
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