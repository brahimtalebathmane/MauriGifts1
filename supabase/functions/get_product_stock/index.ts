import { createClient } from 'npm:@supabase/supabase-js@2';
import { z } from 'npm:zod@3';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const stockQuerySchema = z.object({
  product_id: z.string().uuid().optional(),
  category_id: z.string().uuid().optional(),
});

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
    const { product_id, category_id } = stockQuerySchema.parse(body);

    if (product_id) {
      const { count, error } = await supabase
        .from('product_codes')
        .select('*', { count: 'exact', head: true })
        .eq('product_id', product_id)
        .eq('is_sold', false);

      if (error) throw error;

      return new Response(
        JSON.stringify({ product_id, stock_count: count || 0 }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    if (category_id) {
      const { data: products, error: productsError } = await supabase
        .from('products')
        .select('id, name, sku')
        .eq('category_id', category_id)
        .eq('active', true);

      if (productsError) throw productsError;

      const stockData = await Promise.all(
        products.map(async (product) => {
          const { count } = await supabase
            .from('product_codes')
            .select('*', { count: 'exact', head: true })
            .eq('product_id', product.id)
            .eq('is_sold', false);

          return {
            product_id: product.id,
            product_name: product.name,
            sku: product.sku,
            stock_count: count || 0,
          };
        })
      );

      return new Response(
        JSON.stringify({ category_id, products: stockData }),
        { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
      );
    }

    const { data: allProducts, error: allProductsError } = await supabase
      .from('products')
      .select('id, name, sku, category_id')
      .eq('active', true);

    if (allProductsError) throw allProductsError;

    const allStockData = await Promise.all(
      allProducts.map(async (product) => {
        const { count } = await supabase
          .from('product_codes')
          .select('*', { count: 'exact', head: true })
          .eq('product_id', product.id)
          .eq('is_sold', false);

        return {
          product_id: product.id,
          product_name: product.name,
          sku: product.sku,
          category_id: product.category_id,
          stock_count: count || 0,
        };
      })
    );

    return new Response(
      JSON.stringify({ products: allStockData }),
      { status: 200, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );

  } catch (error) {
    console.error('Stock query error:', error);
    return new Response(
      JSON.stringify({ error: error.message || 'خطأ في الاستعلام عن المخزون' }),
      { status: 400, headers: { ...corsHeaders, 'Content-Type': 'application/json' } }
    );
  }
});
