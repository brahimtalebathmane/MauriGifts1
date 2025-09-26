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

    console.log('Loading products with categories...');

    // Get all active products with their categories
    const { data: products, error } = await supabase
      .from('products')
      .select(`
        *,
        categories!inner (
          id,
          name,
          image_url
        )
      `)
      .eq('active', true)
      .order('categories(name)')
      .order('price_mru');

    if (error) {
      console.error('Database error loading products:', error);
      throw error;
    }

    console.log(`Successfully loaded ${products?.length || 0} products from database`);

    if (!products || products.length === 0) {
      console.log('No products found in database');
      return new Response(
        JSON.stringify({ products: {} }),
        { headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    // Group products by category name for the frontend
    const groupedProducts = products.reduce((acc: any, product: any) => {
      const category = product.categories;
      
      if (category && category.name) {
        const categoryName = category.name;
        
        if (!acc[categoryName]) {
          acc[categoryName] = [];
        }
        
        acc[categoryName].push({
          ...product,
          categories: category // Ensure category data is included
        });
        
        console.log(`Added product "${product.name}" to category "${categoryName}"`);
      } else {
        console.error('Product found without proper category:', {
          id: product.id,
          name: product.name,
          category_id: product.category_id
        });
      }
      
      return acc;
    }, {});

    const categoryNames = Object.keys(groupedProducts);
    console.log(`Created ${categoryNames.length} product groups:`, categoryNames);
    
    // Log product counts per category
    categoryNames.forEach(categoryName => {
      const count = groupedProducts[categoryName].length;
      console.log(`Category "${categoryName}": ${count} products`);
    });

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