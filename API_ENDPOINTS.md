# MauriPlay API Endpoints Reference

Base URL: `https://[your-supabase-url].supabase.co/functions/v1/`

---

## 🔓 Public Endpoints (No Auth Required)

### List Active Platforms
```
POST /list_platforms
```

**Request Body:** `{}`

**Response:**
```json
{
  "platforms": [
    {
      "id": "uuid",
      "name": "PUBG Mobile",
      "logo_url": "https://...",
      "website_url": "https://pubgmobile.com",
      "tutorial_video_url": "https://youtube.com/...",
      "active": true,
      "created_at": "2026-03-06T..."
    }
  ]
}
```

---

### Get Product Stock
```
POST /get_product_stock
```

**Request Body (Single Product):**
```json
{
  "product_id": "uuid-of-product"
}
```

**Request Body (Category Products):**
```json
{
  "category_id": "uuid-of-category"
}
```

**Request Body (All Products):**
```json
{}
```

**Response (Single Product):**
```json
{
  "product_id": "uuid",
  "stock_count": 15
}
```

**Response (Category):**
```json
{
  "category_id": "uuid",
  "products": [
    {
      "product_id": "uuid",
      "product_name": "60 UC",
      "sku": "PUBG-60UC",
      "stock_count": 15
    }
  ]
}
```

---

## 🔐 User Endpoints (Require Auth Token)

### Create Order (with Instant Delivery)
```
POST /create_order
```

**Request Body:**
```json
{
  "token": "user_session_token",
  "product_id": "uuid-of-product",
  "payment_method": "wallet",
  "payment_number": "wallet_payment"
}
```

**Success Response (Wallet Payment):**
```json
{
  "order_id": "uuid",
  "delivery_code": "XXXX-XXXX-XXXX-XXXX",
  "status": "completed",
  "instant_delivery": true
}
```

**Success Response (Manual Payment):**
```json
{
  "order_id": "uuid",
  "status": "under_review"
}
```

**Error Response:**
```json
{
  "error": "رصيد المحفظة غير كافٍ"
}
```

---

### Get Order Details
```
POST /get_order_details
```

**Request Body:**
```json
{
  "token": "user_session_token",
  "order_id": "uuid-of-order"
}
```

**Response:**
```json
{
  "order": {
    "id": "uuid",
    "user_id": "uuid",
    "product_id": "uuid",
    "status": "completed",
    "payment_method": "wallet",
    "delivery_code": "XXXX-XXXX-XXXX-XXXX",
    "created_at": "2026-03-06T...",
    "products": {
      "id": "uuid",
      "name": "60 UC PUBG Mobile",
      "price_mru": 100,
      "categories": {
        "id": "uuid",
        "name": "PUBG Mobile",
        "platform_id": "uuid",
        "platforms": {
          "id": "uuid",
          "name": "PUBG Mobile",
          "logo_url": "https://...",
          "website_url": "https://pubgmobile.com",
          "tutorial_video_url": "https://youtube.com/..."
        }
      }
    }
  }
}
```

---

## 👨‍💼 Admin Endpoints (Require Admin Token)

### Manage Platforms
```
POST /admin_manage_platforms
```

**Create Platform:**
```json
{
  "token": "admin_session_token",
  "action": "create",
  "name": "PUBG Mobile",
  "logo_url": "https://example.com/pubg.png",
  "website_url": "https://pubgmobile.com",
  "tutorial_video_url": "https://youtube.com/watch?v=...",
  "active": true
}
```

**Update Platform:**
```json
{
  "token": "admin_session_token",
  "action": "update",
  "platform_id": "uuid-of-platform",
  "name": "PUBG Mobile Updated",
  "active": false
}
```

**Delete Platform:**
```json
{
  "token": "admin_session_token",
  "action": "delete",
  "platform_id": "uuid-of-platform"
}
```

**List All Platforms (Admin View):**
```json
{
  "token": "admin_session_token",
  "action": "list"
}
```

**Response:**
```json
{
  "platform": {
    "id": "uuid",
    "name": "PUBG Mobile",
    "logo_url": "...",
    "website_url": "...",
    "tutorial_video_url": "...",
    "active": true,
    "created_at": "...",
    "updated_at": "..."
  }
}
```

---

### Bulk Upload Product Codes
```
POST /admin_bulk_upload_codes
```

**Request Body:**
```json
{
  "token": "admin_session_token",
  "product_id": "uuid-of-product",
  "codes": [
    "AAAA-BBBB-CCCC-DDDD",
    "EEEE-FFFF-GGGG-HHHH",
    "IIII-JJJJ-KKKK-LLLL"
  ]
}
```

**Response:**
```json
{
  "success": true,
  "codes_added": 3,
  "duplicates_removed": 0
}
```

---

## 📊 Status Codes

| Code | Meaning |
|------|---------|
| 200 | Success |
| 201 | Created |
| 400 | Bad Request / Validation Error |
| 401 | Unauthorized |
| 404 | Not Found |

---

## 🔑 Authentication

All authenticated endpoints require a session token obtained from:
- `POST /login` (for users)
- `POST /signup` (for new users)

Include the token in the request body:
```json
{
  "token": "your_session_token_here",
  ...
}
```

---

## ⚠️ Error Codes

| Error Message | Meaning |
|---------------|---------|
| "جلسة غير صالحة" | Invalid or expired session |
| "غير مصرح لك" | Unauthorized (not admin) |
| "المحفظة غير مفعلة" | Wallet not activated |
| "رصيد المحفظة غير كافٍ" | Insufficient wallet balance |
| "المنتج غير متوفر" | Product not found or inactive |
| "المنتج غير متوفر في المخزون" | Out of stock |
| "خطأ في تخصيص الكود" | Code assignment failed |

---

## 🧪 Testing with cURL

### Get Platforms
```bash
curl -X POST \
  https://[your-project].supabase.co/functions/v1/list_platforms \
  -H 'Content-Type: application/json' \
  -d '{}'
```

### Check Stock
```bash
curl -X POST \
  https://[your-project].supabase.co/functions/v1/get_product_stock \
  -H 'Content-Type: application/json' \
  -d '{"product_id": "your-product-uuid"}'
```

### Create Order
```bash
curl -X POST \
  https://[your-project].supabase.co/functions/v1/create_order \
  -H 'Content-Type: application/json' \
  -d '{
    "token": "your-session-token",
    "product_id": "product-uuid",
    "payment_method": "wallet",
    "payment_number": "wallet_payment"
  }'
```

---

## 📝 Notes

1. **CORS:** All endpoints support CORS with `Access-Control-Allow-Origin: *`
2. **Content-Type:** Always use `application/json`
3. **Session Expiry:** Tokens expire after 30 days
4. **Rate Limiting:** Not currently implemented (consider adding)
5. **Webhook Support:** Not currently implemented (consider for notifications)

---

**Last Updated:** March 6, 2026
