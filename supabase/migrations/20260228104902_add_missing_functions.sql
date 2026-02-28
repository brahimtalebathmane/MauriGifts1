-- Drop existing functions if they exist
DROP FUNCTION IF EXISTS public.signup(text, text, text);
DROP FUNCTION IF EXISTS public.login(text, text);
DROP FUNCTION IF EXISTS public.get_user_by_token(text);
DROP FUNCTION IF EXISTS public.list_products();
DROP FUNCTION IF EXISTS public.list_categories();
DROP FUNCTION IF EXISTS public.create_order(text, uuid, text, text);
DROP FUNCTION IF EXISTS public.get_my_orders(text);
DROP FUNCTION IF EXISTS public.admin_list_users(text);
DROP FUNCTION IF EXISTS public.admin_list_orders(text, text);
DROP FUNCTION IF EXISTS public.admin_approve_order(text, uuid, text);
DROP FUNCTION IF EXISTS public.admin_reject_order(text, uuid, text);
DROP FUNCTION IF EXISTS public.get_notifications(text, boolean);
DROP FUNCTION IF EXISTS public.change_pin(text, text, text);
DROP FUNCTION IF EXISTS public.list_payment_methods();

-- Signup function
CREATE OR REPLACE FUNCTION public.signup(
  p_name text,
  p_phone_number text,
  p_pin text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_token text;
  v_user json;
BEGIN
  IF LENGTH(p_phone_number) != 8 THEN
    RETURN json_build_object('error', 'رقم الهاتف يجب أن يكون 8 أرقام');
  END IF;

  IF LENGTH(p_pin) != 4 THEN
    RETURN json_build_object('error', 'الرمز يجب أن يكون 4 أرقام');
  END IF;

  IF EXISTS (SELECT 1 FROM users WHERE phone_number = p_phone_number) THEN
    RETURN json_build_object('error', 'رقم الهاتف مسجل مسبقاً');
  END IF;

  INSERT INTO users (name, phone_number, pin)
  VALUES (p_name, p_phone_number, p_pin)
  RETURNING id INTO v_user_id;

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO sessions (token, user_id)
  VALUES (v_token, v_user_id);

  SELECT json_build_object(
    'id', id,
    'name', name,
    'phone_number', phone_number,
    'role', role
  ) INTO v_user
  FROM users WHERE id = v_user_id;

  RETURN json_build_object(
    'user', v_user,
    'token', v_token
  );
END;
$$;

-- Login function
CREATE OR REPLACE FUNCTION public.login(
  p_phone_number text,
  p_pin text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_token text;
  v_user json;
BEGIN
  SELECT id INTO v_user_id
  FROM users
  WHERE phone_number = p_phone_number AND pin = p_pin;

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'رقم الهاتف أو الرمز غير صحيح');
  END IF;

  v_token := encode(gen_random_bytes(32), 'hex');

  INSERT INTO sessions (token, user_id)
  VALUES (v_token, v_user_id);

  SELECT json_build_object(
    'id', id,
    'name', name,
    'phone_number', phone_number,
    'role', role
  ) INTO v_user
  FROM users WHERE id = v_user_id;

  RETURN json_build_object(
    'user', v_user,
    'token', v_token
  );
END;
$$;

-- Get user by token
CREATE OR REPLACE FUNCTION public.get_user_by_token(
  p_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user json;
BEGIN
  SELECT json_build_object(
    'id', u.id,
    'name', u.name,
    'phone_number', u.phone_number,
    'role', u.role
  ) INTO v_user
  FROM users u
  INNER JOIN sessions s ON s.user_id = u.id
  WHERE s.token = p_token AND s.expires_at > now();

  IF v_user IS NULL THEN
    RETURN json_build_object('error', 'جلسة غير صالحة أو منتهية');
  END IF;

  RETURN json_build_object('user', v_user);
END;
$$;

-- List products
CREATE OR REPLACE FUNCTION public.list_products()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_products json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', p.id,
      'name', p.name,
      'sku', p.sku,
      'price_mru', p.price_mru,
      'meta', p.meta,
      'category_id', p.category_id,
      'categories', json_build_object(
        'id', c.id,
        'name', c.name,
        'image_url', c.image_url
      )
    )
  ) INTO v_products
  FROM products p
  INNER JOIN categories c ON c.id = p.category_id
  WHERE p.active = true
  ORDER BY c.name, p.price_mru;

  RETURN json_build_object('products', COALESCE(v_products, '[]'::json));
END;
$$;

-- List categories
CREATE OR REPLACE FUNCTION public.list_categories()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_categories json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name,
      'image_url', image_url
    )
  ) INTO v_categories
  FROM categories
  ORDER BY name;

  RETURN json_build_object('categories', COALESCE(v_categories, '[]'::json));
END;
$$;

-- Create order
CREATE OR REPLACE FUNCTION public.create_order(
  p_token text,
  p_product_id uuid,
  p_payment_method text,
  p_payment_number text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_order_id uuid;
BEGIN
  SELECT user_id INTO v_user_id
  FROM sessions
  WHERE token = p_token AND expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'جلسة غير صالحة');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM products WHERE id = p_product_id AND active = true) THEN
    RETURN json_build_object('error', 'المنتج غير متوفر');
  END IF;

  INSERT INTO orders (user_id, product_id, payment_method, payment_number, status)
  VALUES (v_user_id, p_product_id, p_payment_method::payment_method, p_payment_number, 'awaiting_payment'::order_status)
  RETURNING id INTO v_order_id;

  RETURN json_build_object('order_id', v_order_id);
END;
$$;

-- Get my orders
CREATE OR REPLACE FUNCTION public.get_my_orders(
  p_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_orders json;
BEGIN
  SELECT user_id INTO v_user_id
  FROM sessions
  WHERE token = p_token AND expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'جلسة غير صالحة');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', o.id,
      'status', o.status,
      'payment_method', o.payment_method,
      'payment_number', o.payment_number,
      'delivery_code', o.delivery_code,
      'admin_note', o.admin_note,
      'created_at', o.created_at,
      'products', json_build_object(
        'id', p.id,
        'name', p.name,
        'price_mru', p.price_mru,
        'meta', p.meta,
        'categories', json_build_object(
          'id', c.id,
          'name', c.name
        )
      )
    ) ORDER BY o.created_at DESC
  ) INTO v_orders
  FROM orders o
  INNER JOIN products p ON p.id = o.product_id
  INNER JOIN categories c ON c.id = p.category_id
  WHERE o.user_id = v_user_id;

  RETURN json_build_object('orders', COALESCE(v_orders, '[]'::json));
END;
$$;

-- Admin list users
CREATE OR REPLACE FUNCTION public.admin_list_users(
  p_token text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_users json;
BEGIN
  SELECT s.user_id, u.role = 'admin' INTO v_user_id, v_is_admin
  FROM sessions s
  INNER JOIN users u ON u.id = s.user_id
  WHERE s.token = p_token AND s.expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'جلسة غير صالحة');
  END IF;

  IF NOT v_is_admin THEN
    RETURN json_build_object('error', 'غير مصرح لك');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', u.id,
      'name', u.name,
      'phone_number', u.phone_number,
      'role', u.role,
      'created_at', u.created_at,
      'order_count', COALESCE(
        (SELECT COUNT(*) FROM orders WHERE user_id = u.id), 0
      )
    ) ORDER BY u.created_at DESC
  ) INTO v_users
  FROM users u;

  RETURN json_build_object('users', COALESCE(v_users, '[]'::json));
END;
$$;

-- Admin list orders
CREATE OR REPLACE FUNCTION public.admin_list_orders(
  p_token text,
  p_status text DEFAULT NULL
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_orders json;
BEGIN
  SELECT s.user_id, u.role = 'admin' INTO v_user_id, v_is_admin
  FROM sessions s
  INNER JOIN users u ON u.id = s.user_id
  WHERE s.token = p_token AND s.expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'جلسة غير صالحة');
  END IF;

  IF NOT v_is_admin THEN
    RETURN json_build_object('error', 'غير مصرح لك');
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', o.id,
      'status', o.status,
      'payment_method', o.payment_method,
      'payment_number', o.payment_number,
      'receipt_path', o.receipt_path,
      'delivery_code', o.delivery_code,
      'admin_note', o.admin_note,
      'created_at', o.created_at,
      'products', json_build_object(
        'id', p.id,
        'name', p.name,
        'price_mru', p.price_mru,
        'categories', json_build_object(
          'id', c.id,
          'name', c.name
        )
      ),
      'users', json_build_object(
        'id', u.id,
        'name', u.name,
        'phone_number', u.phone_number
      )
    ) ORDER BY o.created_at DESC
  ) INTO v_orders
  FROM orders o
  INNER JOIN products p ON p.id = o.product_id
  INNER JOIN categories c ON c.id = p.category_id
  INNER JOIN users u ON u.id = o.user_id
  WHERE (p_status IS NULL OR o.status::text = p_status);

  RETURN json_build_object('orders', COALESCE(v_orders, '[]'::json));
END;
$$;

-- Admin approve order
CREATE OR REPLACE FUNCTION public.admin_approve_order(
  p_token text,
  p_order_id uuid,
  p_delivery_code text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_order_user_id uuid;
  v_product_name text;
BEGIN
  SELECT s.user_id, u.role = 'admin' INTO v_user_id, v_is_admin
  FROM sessions s
  INNER JOIN users u ON u.id = s.user_id
  WHERE s.token = p_token AND s.expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'جلسة غير صالحة');
  END IF;

  IF NOT v_is_admin THEN
    RETURN json_build_object('error', 'غير مصرح لك');
  END IF;

  SELECT o.user_id, p.name INTO v_order_user_id, v_product_name
  FROM orders o
  INNER JOIN products p ON p.id = o.product_id
  WHERE o.id = p_order_id;

  IF v_order_user_id IS NULL THEN
    RETURN json_build_object('error', 'الطلب غير موجود');
  END IF;

  UPDATE orders
  SET status = 'completed'::order_status,
      delivery_code = p_delivery_code
  WHERE id = p_order_id;

  INSERT INTO notifications (user_id, title, body, payload)
  VALUES (
    v_order_user_id,
    'تم تأكيد طلبك',
    'تم تأكيد طلبك وإرسال كود الشحن',
    json_build_object('order_id', p_order_id, 'delivery_code', p_delivery_code)
  );

  INSERT INTO audit_logs (actor_id, action, target_type, target_id)
  VALUES (v_user_id, 'approve_order', 'order', p_order_id);

  RETURN json_build_object('success', true);
END;
$$;

-- Admin reject order
CREATE OR REPLACE FUNCTION public.admin_reject_order(
  p_token text,
  p_order_id uuid,
  p_reason text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_is_admin boolean;
  v_order_user_id uuid;
BEGIN
  SELECT s.user_id, u.role = 'admin' INTO v_user_id, v_is_admin
  FROM sessions s
  INNER JOIN users u ON u.id = s.user_id
  WHERE s.token = p_token AND s.expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'جلسة غير صالحة');
  END IF;

  IF NOT v_is_admin THEN
    RETURN json_build_object('error', 'غير مصرح لك');
  END IF;

  SELECT user_id INTO v_order_user_id
  FROM orders
  WHERE id = p_order_id;

  IF v_order_user_id IS NULL THEN
    RETURN json_build_object('error', 'الطلب غير موجود');
  END IF;

  UPDATE orders
  SET status = 'rejected'::order_status,
      admin_note = p_reason
  WHERE id = p_order_id;

  INSERT INTO notifications (user_id, title, body, payload)
  VALUES (
    v_order_user_id,
    'تم رفض طلبك',
    p_reason,
    json_build_object('order_id', p_order_id)
  );

  INSERT INTO audit_logs (actor_id, action, target_type, target_id)
  VALUES (v_user_id, 'reject_order', 'order', p_order_id);

  RETURN json_build_object('success', true);
END;
$$;

-- Get notifications
CREATE OR REPLACE FUNCTION public.get_notifications(
  p_token text,
  p_mark_seen boolean DEFAULT false
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
  v_notifications json;
BEGIN
  SELECT user_id INTO v_user_id
  FROM sessions
  WHERE token = p_token AND expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'جلسة غير صالحة');
  END IF;

  IF p_mark_seen THEN
    UPDATE notifications
    SET seen = true
    WHERE user_id = v_user_id AND seen = false;
  END IF;

  SELECT json_agg(
    json_build_object(
      'id', id,
      'title', title,
      'body', body,
      'payload', payload,
      'seen', seen,
      'created_at', created_at
    ) ORDER BY created_at DESC
  ) INTO v_notifications
  FROM notifications
  WHERE user_id = v_user_id;

  RETURN json_build_object('notifications', COALESCE(v_notifications, '[]'::json));
END;
$$;

-- Change PIN
CREATE OR REPLACE FUNCTION public.change_pin(
  p_token text,
  p_current_pin text,
  p_new_pin text
)
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_user_id uuid;
BEGIN
  IF LENGTH(p_new_pin) != 4 THEN
    RETURN json_build_object('error', 'الرمز الجديد يجب أن يكون 4 أرقام');
  END IF;

  SELECT user_id INTO v_user_id
  FROM sessions
  WHERE token = p_token AND expires_at > now();

  IF v_user_id IS NULL THEN
    RETURN json_build_object('error', 'جلسة غير صالحة');
  END IF;

  IF NOT EXISTS (SELECT 1 FROM users WHERE id = v_user_id AND pin = p_current_pin) THEN
    RETURN json_build_object('error', 'الرمز الحالي غير صحيح');
  END IF;

  UPDATE users
  SET pin = p_new_pin
  WHERE id = v_user_id;

  RETURN json_build_object('success', true);
END;
$$;

-- List payment methods
CREATE OR REPLACE FUNCTION public.list_payment_methods()
RETURNS json
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  v_payment_methods json;
BEGIN
  SELECT json_agg(
    json_build_object(
      'id', id,
      'name', name,
      'logo_url', logo_url,
      'status', status
    )
  ) INTO v_payment_methods
  FROM payment_methods
  WHERE status = 'active'
  ORDER BY name;

  RETURN json_build_object('payment_methods', COALESCE(v_payment_methods, '[]'::json));
END;
$$;

-- Grant execute permissions
GRANT EXECUTE ON FUNCTION public.signup(text, text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.login(text, text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_user_by_token(text) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_products() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.list_categories() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.create_order(text, uuid, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_orders(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_users(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_list_orders(text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_approve_order(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.admin_reject_order(text, uuid, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_notifications(text, boolean) TO authenticated;
GRANT EXECUTE ON FUNCTION public.change_pin(text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.list_payment_methods() TO anon, authenticated;