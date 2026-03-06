# MauriPlay - Full Automation System Guide

## 🎯 System Overview

MauriPlay has been transformed into a **fully automated digital marketplace** where users can purchase digital gift cards and game top-ups with instant delivery when paying via Wallet.

---

## 📊 Database Architecture

### New Tables

#### 1. **platforms**
Platform providers (e.g., PUBG Mobile, iTunes, PlayStation)
- `id` - UUID primary key
- `name` - Platform name
- `logo_url` - Platform logo image URL
- `website_url` - Official website
- `tutorial_video_url` - YouTube/video tutorial URL
- `active` - Visibility status (boolean)
- `created_at`, `updated_at` - Timestamps

#### 2. **product_codes** (Inventory System)
Digital code inventory for instant delivery
- `id` - UUID primary key
- `product_id` - Foreign key to products
- `code_value` - The actual gift card/game code (encrypted)
- `is_sold` - Boolean flag (false = available, true = sold)
- `order_id` - Linked order when sold (nullable)
- `created_at` - Creation timestamp
- `sold_at` - Timestamp when sold

#### 3. **categories** (Updated)
- Added `platform_id` - Foreign key to platforms table
- Hierarchical structure: Platform → Category → Product

---

## 🔧 Edge Functions (APIs)

### Admin Functions

#### `admin_manage_platforms`
**Purpose:** CRUD operations for platforms
**Actions:**
- `create` - Create new platform
- `update` - Update existing platform
- `delete` - Remove platform
- `list` - List all platforms (admin view)

**Example Request:**
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

#### `admin_bulk_upload_codes`
**Purpose:** Upload multiple product codes at once
**Features:**
- Accepts array of codes (one per line)
- Removes duplicates automatically
- Shows count of codes added

**Example Request:**
```json
{
  "token": "admin_session_token",
  "product_id": "uuid-of-product",
  "codes": [
    "XXXX-XXXX-XXXX-XXXX",
    "YYYY-YYYY-YYYY-YYYY",
    "ZZZZ-ZZZZ-ZZZZ-ZZZZ"
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

### Public Functions

#### `list_platforms`
**Purpose:** Get all active platforms for public browsing
**Method:** GET or POST
**No authentication required**

**Response:**
```json
{
  "platforms": [
    {
      "id": "uuid",
      "name": "PUBG Mobile",
      "logo_url": "...",
      "website_url": "...",
      "tutorial_video_url": "...",
      "active": true
    }
  ]
}
```

#### `get_product_stock`
**Purpose:** Check real-time inventory stock
**Supports:**
- Single product stock query
- Category-level stock query
- All products stock query

**Example Request (Single Product):**
```json
{
  "product_id": "uuid-of-product"
}
```

**Response:**
```json
{
  "product_id": "uuid",
  "stock_count": 15
}
```

**Example Request (Category):**
```json
{
  "category_id": "uuid-of-category"
}
```

**Response:**
```json
{
  "category_id": "uuid",
  "products": [
    {
      "product_id": "uuid",
      "product_name": "60 UC",
      "sku": "PUBG-60UC",
      "stock_count": 15
    },
    {
      "product_id": "uuid",
      "product_name": "300 UC",
      "sku": "PUBG-300UC",
      "stock_count": 0
    }
  ]
}
```

#### `get_order_details`
**Purpose:** Get complete order details including delivery code
**Authentication:** Required (user session)

**Request:**
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
    "status": "completed",
    "payment_method": "wallet",
    "delivery_code": "XXXX-XXXX-XXXX-XXXX",
    "products": {
      "id": "uuid",
      "name": "60 UC PUBG Mobile",
      "price_mru": 100,
      "categories": {
        "name": "PUBG Mobile",
        "platforms": {
          "name": "PUBG Mobile",
          "logo_url": "...",
          "website_url": "https://pubgmobile.com",
          "tutorial_video_url": "https://youtube.com/..."
        }
      }
    }
  }
}
```

### Core Purchase Function

#### `create_order` (Updated)
**Purpose:** Create order with automatic code assignment for wallet payments

**Wallet Payment Flow:**
1. Validates user has active wallet
2. Checks wallet balance ≥ product price
3. Verifies product has available stock (is_sold = false)
4. Creates order with status 'pending'
5. **Automatically assigns one code from inventory**
6. Marks code as sold (is_sold = true, order_id = order.id)
7. Updates order status to 'completed'
8. Returns order_id AND delivery_code immediately

**Manual Payment Flow:**
1. Creates order with status 'under_review'
2. Waits for admin approval
3. Admin manually assigns code later

**Request:**
```json
{
  "token": "user_session_token",
  "product_id": "uuid-of-product",
  "payment_method": "wallet",
  "payment_number": "wallet_payment"
}
```

**Wallet Payment Response:**
```json
{
  "order_id": "uuid",
  "delivery_code": "XXXX-XXXX-XXXX-XXXX",
  "status": "completed",
  "instant_delivery": true
}
```

**Manual Payment Response:**
```json
{
  "order_id": "uuid",
  "status": "under_review"
}
```

---

## 🔒 Security Features

### Concurrency Protection
The code assignment uses database-level constraints:
1. SELECT code WHERE is_sold = false LIMIT 1
2. UPDATE code SET is_sold = true WHERE id = X AND is_sold = false
3. If step 2 affects 0 rows, another user grabbed it first → retry

### Row Level Security (RLS)
- **platforms:** Public can read active platforms, admins can modify
- **product_codes:** Admin-only access (codes are sensitive)
- All operations validated through session tokens

### Data Integrity
- Foreign key constraints prevent orphaned records
- CASCADE delete on platform → categories → products
- SET NULL on order deletion (preserves code history)

---

## 🎨 User Experience Flow

### Browsing (Hierarchical Navigation)
```
Platforms (Icons Grid)
    ↓
Categories (List per Platform)
    ↓
Products (List per Category)
    ↓
Product Details (with stock indicator)
```

### Purchase Journey

#### Wallet Payment (Instant Delivery):
1. User selects product
2. System checks stock > 0
3. User pays with wallet
4. **Instant Success Screen:**
   - Shows delivery code in highlighted box
   - "Copy to Clipboard" button
   - "Visit Platform" button (opens website_url)
   - "How to Use" video player (tutorial_video_url)
   - Order confirmation details

#### Manual Payment:
1. User selects product
2. Uploads receipt + enters payment info
3. Order goes to "under_review"
4. Admin approves and assigns code manually
5. User receives notification with code

### Stock Display
- **In Stock:** Green badge with count (e.g., "15 متوفر")
- **Out of Stock:** Red badge "نفذ المخزون" + disabled purchase button
- Real-time updates via `get_product_stock` API

---

## 🎯 Admin Dashboard Features

### Platform Management
- Create/Edit/Delete platforms
- Upload platform logos
- Set tutorial video URLs
- Toggle active/inactive status

### Inventory Management
- **Bulk Upload:** Paste multiple codes (one per line)
- **Stock Dashboard:** See all products with stock counts
- **Low Stock Alerts:** Highlight products with stock < 5
- **Code History:** Track which codes were sold to which orders

### Smart Features
- Auto-disable products with 0 stock
- Real-time stock counts on product list
- Audit logs for all code uploads and assignments

---

## 📱 Frontend Integration Points

### API Service Methods Needed

```typescript
// Platform APIs
getPlatforms(): Promise<{ platforms: Platform[] }>

// Stock APIs
getProductStock(productId: string): Promise<{ stock_count: number }>
getCategoryStock(categoryId: string): Promise<{ products: StockItem[] }>

// Order APIs
createOrder(productId: string, paymentMethod: string): Promise<{
  order_id: string,
  delivery_code?: string,
  status: string,
  instant_delivery?: boolean
}>

getOrderDetails(orderId: string): Promise<{ order: OrderDetails }>

// Admin APIs
managePlatforms(action: 'create'|'update'|'delete'|'list', data: any)
bulkUploadCodes(productId: string, codes: string[])
```

### State Management Updates
```typescript
interface Product {
  // ... existing fields
  stock_count?: number; // Add this
}

interface Platform {
  id: string;
  name: string;
  logo_url: string;
  website_url: string;
  tutorial_video_url: string;
  active: boolean;
}

interface OrderDetails {
  // ... existing fields
  delivery_code?: string;
  products: {
    categories: {
      platforms: Platform;
    }
  }
}
```

### UI Components Needed

#### Success Screen (Post-Purchase)
```tsx
<SuccessScreen>
  <CongratsHeader />
  <DeliveryCodeBox code={deliveryCode} />
  <CopyButton />
  <PlatformButton url={platform.website_url} />
  <TutorialVideo url={platform.tutorial_video_url} />
  <OrderSummary />
</SuccessScreen>
```

#### Product Card (with Stock)
```tsx
<ProductCard>
  <ProductImage />
  <ProductName />
  <ProductPrice />
  {stock > 0 ? (
    <StockBadge count={stock} />
  ) : (
    <OutOfStockBadge />
  )}
  <PurchaseButton disabled={stock === 0} />
</ProductCard>
```

#### Admin Bulk Upload
```tsx
<BulkUploadForm>
  <ProductSelector />
  <TextArea
    placeholder="أدخل الأكواد (كل كود في سطر منفصل)"
    rows={10}
  />
  <UploadButton />
  <ResultsSummary />
</BulkUploadForm>
```

---

## ✅ Error Handling

### User-Friendly Arabic Messages
- "المحفظة غير مفعلة" - Wallet not active
- "رصيد المحفظة غير كافٍ" - Insufficient balance
- "المنتج غير متوفر في المخزون" - Out of stock
- "خطأ في تخصيص الكود" - Code assignment error

### Automatic Rollback
If code assignment fails:
1. Order status set to 'rejected'
2. Admin note added with error message
3. No wallet balance deducted (handled by trigger)
4. User receives clear error message

---

## 🚀 Production Readiness Checklist

✅ Database schema created and secured
✅ All Edge Functions deployed and active
✅ Row Level Security (RLS) enabled on all tables
✅ Foreign key constraints in place
✅ Audit logging for all critical operations
✅ Concurrency protection for code assignment
✅ Stock validation before purchase
✅ Wallet balance validation
✅ Automatic code delivery for wallet payments
✅ Manual order flow preserved for traditional payments

---

## 🔄 Next Steps for Frontend Implementation

1. **Create Platform Browsing UI**
   - Platform icons grid on home screen
   - Category list per platform
   - Products list with stock badges

2. **Update Purchase Flow**
   - Add stock validation before payment
   - Implement instant success screen for wallet payments
   - Show delivery code with copy button
   - Embed tutorial video player

3. **Admin Dashboard Enhancements**
   - Platform CRUD interface
   - Bulk code upload form
   - Stock dashboard with real-time counts
   - Low stock alerts

4. **Testing Scenarios**
   - Wallet purchase with sufficient stock
   - Wallet purchase with insufficient balance
   - Purchase attempt with 0 stock
   - Concurrent purchases (race condition test)
   - Manual payment flow

---

## 📞 Support & Maintenance

### Monitoring Points
- Track low stock products daily
- Monitor failed code assignments
- Check audit logs for suspicious activity
- Review order completion rates

### Regular Tasks
- Upload new codes when stock runs low
- Update platform logos and tutorial videos
- Archive sold codes older than 6 months
- Clean up expired sessions

---

**System Status:** ✅ Production Ready
**Last Updated:** March 6, 2026
**Version:** 2.0.0 - Full Automation
