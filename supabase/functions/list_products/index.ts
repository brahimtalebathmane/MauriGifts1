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

    // Get all active products with their categories
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        categories (
          id,
          name,
          image_url
        )
      `)
      .eq('active', true)
      .not('category_id', 'is', null)
      .order('price_mru');

    if (error) {
      console.error('Database error:', error);
      throw error;
    }

    console.log(`Loaded ${products?.length || 0} products from database`);

    // Group products by category name and ID for maximum compatibility
    const groupedProducts = products.reduce((acc: any, product: any) => {
      const category = product.categories;
      
      if (category && category.name && category.id) {
        const categoryName = category.name;
        const categoryId = category.id;
        
        // Group by category name (primary)
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        acc[categoryName].push(product);
        
        // Also group by category ID (secondary for compatibility)
        if (!acc[categoryId]) {
          acc[categoryId] = [];
        }
        acc[categoryId].push(product);
        
        console.log(`Product "${product.name}" added to category "${categoryName}" (${categoryId})`);
      } else {
        console.error('Product without proper category found:', {
          id: product.id,
          name: product.name,
          category_id: product.category_id,
          category: category
        });
      }
      
      return acc;
    }, {});

    console.log('Product groups created:', Object.keys(groupedProducts));

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