# MauriPlay - Deployment & Testing Checklist

## ✅ Backend Infrastructure (COMPLETED)

### Database Schema
- [x] `platforms` table created with RLS policies
- [x] `product_codes` table created with RLS policies
- [x] `categories` table updated with `platform_id` column
- [x] Foreign key constraints configured
- [x] Indexes created for performance
- [x] Cascade delete rules configured

### Edge Functions
- [x] `admin_manage_platforms` - Platform CRUD operations
- [x] `admin_bulk_upload_codes` - Bulk code upload
- [x] `get_product_stock` - Real-time stock queries
- [x] `list_platforms` - Public platform listing
- [x] `get_order_details` - Order details with delivery code
- [x] `create_order` - Updated with automatic code assignment

### Security
- [x] Row Level Security (RLS) enabled on all tables
- [x] Admin-only policies for sensitive operations
- [x] Public read policies for platform browsing
- [x] Session validation on all authenticated endpoints
- [x] Concurrency protection for code assignment

---

## 🚀 Frontend Implementation (TODO)

### Phase 1: Data Models & API Integration

#### TypeScript Types
```typescript
// Add to types file
interface Platform {
  id: string;
  name: string;
  logo_url: string;
  website_url: string;
  tutorial_video_url: string;
  active: boolean;
  created_at: string;
  updated_at: string;
}

interface ProductCode {
  id: string;
  product_id: string;
  code_value: string;
  is_sold: boolean;
  order_id?: string;
  created_at: string;
  sold_at?: string;
}

interface Product {
  // existing fields...
  stock_count?: number;
}

interface Category {
  // existing fields...
  platform_id?: string;
  platforms?: Platform;
}

interface OrderDetails extends Order {
  delivery_code?: string;
  products: {
    categories: {
      platforms: Platform;
    }
  }
}
```

#### API Service Methods
```typescript
// Add to apiService class

async listPlatforms() {
  return this.request('list_platforms', {
    method: 'POST',
    body: JSON.stringify({}),
  });
}

async getProductStock(productId: string) {
  return this.request('get_product_stock', {
    method: 'POST',
    body: JSON.stringify({ product_id: productId }),
  });
}

async getCategoryStock(categoryId: string) {
  return this.request('get_product_stock', {
    method: 'POST',
    body: JSON.stringify({ category_id: categoryId }),
  });
}

async getOrderDetails(token: string, orderId: string) {
  return this.request('get_order_details', {
    method: 'POST',
    body: JSON.stringify({ token, order_id: orderId }),
  }, token);
}

// Admin methods
async managePlatforms(token: string, action: string, data: any) {
  return this.request('admin_manage_platforms', {
    method: 'POST',
    body: JSON.stringify({ token, action, ...data }),
  }, token);
}

async bulkUploadCodes(token: string, productId: string, codes: string[]) {
  return this.request('admin_bulk_upload_codes', {
    method: 'POST',
    body: JSON.stringify({ token, product_id: productId, codes }),
  }, token);
}
```

---

### Phase 2: User Interface Components

#### Home Screen - Platform Browsing
- [ ] **PlatformGrid Component**
  - Display platform logos in grid layout
  - Show platform name below logo
  - Handle tap to navigate to categories
  - Loading state while fetching platforms
  - Empty state if no platforms available

```tsx
// Pseudo-code
<PlatformGrid>
  {platforms.map(platform => (
    <PlatformCard
      key={platform.id}
      logo={platform.logo_url}
      name={platform.name}
      onPress={() => navigateTo(`/categories/${platform.id}`)}
    />
  ))}
</PlatformGrid>
```

#### Category Screen
- [ ] **CategoryList Component**
  - Filter categories by platform_id
  - Show category images
  - Display product count per category
  - Navigate to products list

#### Product List Screen
- [ ] **ProductCard with Stock Badge**
  - Fetch stock count for each product
  - Display green badge if stock > 0
  - Display red "نفذ المخزون" badge if stock = 0
  - Disable purchase button when out of stock
  - Show stock count (e.g., "15 متوفر")

```tsx
// Pseudo-code
<ProductCard>
  <ProductImage />
  <ProductName />
  <ProductPrice />
  {stock > 0 ? (
    <View style={styles.stockBadge}>
      <Text>{stock} متوفر</Text>
    </View>
  ) : (
    <View style={styles.outOfStock}>
      <Text>نفذ المخزون</Text>
    </View>
  )}
  <PurchaseButton disabled={stock === 0} />
</ProductCard>
```

#### Success Screen (Post-Purchase)
- [ ] **DeliverySuccessScreen Component**
  - Show congratulations message
  - Display delivery code in highlighted box
  - Copy to clipboard button
  - "Visit Platform" button (opens website_url)
  - Tutorial video player (YouTube or native)
  - Order summary details
  - Navigate to orders screen

```tsx
// Pseudo-code
<SuccessScreen>
  <CongratsHeader>
    <CheckCircle size={60} color="green" />
    <Text>تم الشراء بنجاح!</Text>
  </CongratsHeader>

  <CodeBox>
    <Text style={styles.code}>{deliveryCode}</Text>
    <CopyButton onPress={() => copyToClipboard(deliveryCode)} />
  </CodeBox>

  <ActionButtons>
    <Button
      title="زيارة الموقع"
      onPress={() => openURL(platform.website_url)}
    />
  </ActionButtons>

  <TutorialSection>
    <Text>كيفية الاستخدام</Text>
    <VideoPlayer url={platform.tutorial_video_url} />
  </TutorialSection>

  <OrderSummary order={orderDetails} />
</SuccessScreen>
```

---

### Phase 3: Admin Dashboard

#### Platform Management
- [ ] **Admin Platform CRUD Screen**
  - List all platforms (including inactive)
  - Add new platform form
  - Edit platform details
  - Toggle active/inactive status
  - Delete platform (with confirmation)

#### Bulk Code Upload
- [ ] **BulkUploadScreen Component**
  - Product selector dropdown
  - Multi-line text area for codes
  - Parse codes (one per line)
  - Show preview before upload
  - Display success summary
  - Show duplicates removed count

```tsx
// Pseudo-code
<BulkUploadForm>
  <ProductSelector
    products={products}
    onSelect={setSelectedProduct}
  />

  <TextArea
    placeholder="أدخل الأكواد (كل كود في سطر منفصل)"
    rows={15}
    value={codesText}
    onChange={setCodesText}
  />

  <PreviewButton onPress={parseAndPreview} />

  {preview && (
    <PreviewModal>
      <Text>عدد الأكواد: {preview.count}</Text>
      <Text>أكواد مكررة: {preview.duplicates}</Text>
      <ConfirmButton onPress={uploadCodes} />
    </PreviewModal>
  )}
</BulkUploadForm>
```

#### Stock Dashboard
- [ ] **InventoryDashboard Component**
  - Fetch all products with stock counts
  - Display in table/list format
  - Highlight low stock (< 5 codes)
  - Highlight out of stock (0 codes)
  - Quick access to bulk upload
  - Filter by platform/category

---

### Phase 4: Purchase Flow Updates

#### Payment Screen
- [ ] Update validation to check stock before payment
- [ ] Show stock count on payment confirmation
- [ ] Handle out of stock error gracefully

```typescript
// Before initiating payment
const stockResponse = await apiService.getProductStock(productId);
if (stockResponse.data.stock_count === 0) {
  showErrorToast('المنتج غير متوفر في المخزون');
  return;
}
```

#### Order Handling
- [ ] Update `createOrder` to handle instant delivery response
- [ ] Navigate to success screen for wallet payments
- [ ] Pass platform details to success screen

```typescript
// After successful wallet payment
const orderResponse = await apiService.createOrder(
  token,
  productId,
  'wallet',
  'wallet_payment'
);

if (orderResponse.data.instant_delivery) {
  // Fetch full order details with platform info
  const detailsResponse = await apiService.getOrderDetails(
    token,
    orderResponse.data.order_id
  );

  // Navigate to success screen
  router.push({
    pathname: '/order-success',
    params: {
      orderId: orderResponse.data.order_id,
      deliveryCode: orderResponse.data.delivery_code,
      platformData: JSON.stringify(detailsResponse.data.order.products.categories.platforms)
    }
  });
}
```

---

## 🧪 Testing Scenarios

### User Testing
- [ ] **Browse Platforms**
  - Open app → See platform icons
  - Tap platform → See categories
  - Tap category → See products with stock

- [ ] **Purchase with Wallet (In Stock)**
  - Select product with stock > 0
  - Pay with wallet
  - Receive instant delivery code
  - See success screen with code
  - Copy code to clipboard
  - Open platform website
  - Watch tutorial video

- [ ] **Purchase with Wallet (Out of Stock)**
  - Select product with stock = 0
  - Purchase button should be disabled
  - See "نفذ المخزون" badge

- [ ] **Purchase with Wallet (Insufficient Balance)**
  - Select product
  - Wallet balance < product price
  - See error: "رصيد المحفظة غير كافٍ"

- [ ] **Purchase with Manual Payment**
  - Select product
  - Choose Bankily/Masrvi/etc.
  - Upload receipt
  - Order goes to "under_review"
  - No instant code delivered

### Admin Testing
- [ ] **Platform Management**
  - Create new platform
  - Upload platform logo
  - Set website URL
  - Set tutorial video URL
  - Edit existing platform
  - Toggle platform active status
  - Delete platform

- [ ] **Bulk Code Upload**
  - Select product
  - Paste 100 codes
  - Upload successfully
  - Verify codes in database
  - Check stock count updated

- [ ] **Stock Monitoring**
  - View inventory dashboard
  - See products with low stock
  - Filter by platform/category
  - Quick navigate to bulk upload

### Stress Testing
- [ ] **Concurrent Purchases**
  - Two users buy same product simultaneously
  - Only one gets the code
  - Other sees appropriate error
  - No duplicate code assignment

- [ ] **Stock Validation**
  - Product has 1 code left
  - User 1 starts checkout
  - User 2 also starts checkout
  - User 1 completes purchase
  - Stock becomes 0
  - User 2 should see stock error

---

## 📊 Monitoring & Analytics

### Database Queries for Monitoring
```sql
-- Low stock products (< 5 codes)
SELECT
  p.name,
  p.sku,
  COUNT(pc.id) as stock
FROM products p
LEFT JOIN product_codes pc ON pc.product_id = p.id AND pc.is_sold = false
WHERE p.active = true
GROUP BY p.id, p.name, p.sku
HAVING COUNT(pc.id) < 5
ORDER BY stock ASC;

-- Sales today (wallet purchases)
SELECT
  COUNT(*) as orders_today,
  SUM(pr.price_mru) as revenue_today
FROM orders o
JOIN products pr ON pr.id = o.product_id
WHERE o.payment_method = 'wallet'
  AND o.status = 'completed'
  AND o.created_at >= CURRENT_DATE;

-- Top selling products
SELECT
  pr.name,
  pr.sku,
  COUNT(o.id) as sales_count,
  SUM(pr.price_mru) as total_revenue
FROM orders o
JOIN products pr ON pr.id = o.product_id
WHERE o.status = 'completed'
  AND o.created_at >= CURRENT_DATE - INTERVAL '30 days'
GROUP BY pr.id, pr.name, pr.sku
ORDER BY sales_count DESC
LIMIT 10;
```

---

## 🔧 Maintenance Tasks

### Daily
- [ ] Check low stock products
- [ ] Review failed orders/code assignments
- [ ] Monitor wallet purchase success rate

### Weekly
- [ ] Upload new codes for popular products
- [ ] Review platform tutorial videos (ensure not broken)
- [ ] Clean up old sessions (handled by DB trigger)

### Monthly
- [ ] Archive sold codes older than 6 months
- [ ] Review platform performance (which platforms sell best)
- [ ] Update platform logos/videos as needed

---

## 🚨 Emergency Procedures

### If Stock Runs Out
1. Admins receive notification (if implemented)
2. Disable product (set active = false)
3. Upload new codes via bulk upload
4. Re-enable product (set active = true)

### If Code Assignment Fails
1. Check audit_logs for error details
2. Verify product_codes table integrity
3. Manually assign code if needed
4. Investigate concurrency issues

### If Wallet Deduction Fails
1. Check wallet trigger logs
2. Verify user balance
3. Refund if needed via admin_adjust_wallet
4. Review order status

---

## 📱 App Store Submission

Before submitting to app stores:
- [ ] Test all purchase flows thoroughly
- [ ] Verify all platform logos are high quality
- [ ] Ensure tutorial videos are appropriate
- [ ] Test on multiple devices (iOS & Android)
- [ ] Check RTL layout (Arabic)
- [ ] Verify all error messages are user-friendly
- [ ] Test offline behavior
- [ ] Review app permissions

---

## 📄 Documentation

Files Created:
- ✅ `MAURIPLAY_AUTOMATION_GUIDE.md` - Complete system overview
- ✅ `API_ENDPOINTS.md` - API reference
- ✅ `SAMPLE_DATA.sql` - Sample data for testing
- ✅ `DEPLOYMENT_CHECKLIST.md` - This file

---

**Status:** Backend Complete ✅ | Frontend In Progress 🚧
**Next Steps:** Implement Phase 1 (Data Models & API Integration)
