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

    console.log('Loading categories with product counts...');

    // Get all categories with their active product counts
    const { data: categories, error } = await supabase
      .from('categories')
      .select(`
        id,
        name,
        image_url,
        created_at,
        products!inner (
          id
        )
      `)
      .eq('products.active', true)
      .order('created_at');

    if (error) {
      console.error('Database error loading categories:', error);
      throw error;
    }

    // Also get categories without products to show them in the list
    const { data: allCategories, error: allCategoriesError } = await supabase
      .from('categories')
      .select('id, name, image_url, created_at')
      .order('created_at');

    if (allCategoriesError) {
      console.error('Error loading all categories:', allCategoriesError);
      throw allCategoriesError;
    }

    // Transform to include product count and ensure all categories are included
    const categoriesWithCount = allCategories.map(category => {
      const categoryWithProducts = categories?.find(c => c.id === category.id);
      const productCount = categoryWithProducts?.products?.length || 0;
      
      return {
        id: category.id,
        name: category.name,
        image_url: category.image_url,
        created_at: category.created_at,
        product_count: productCount
      };
    });

    console.log(`Successfully loaded ${categoriesWithCount.length} categories from database`);
    
    // Log category details
    categoriesWithCount.forEach(category => {
      console.log(`Category "${category.name}": ${category.product_count} products`);
    });

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