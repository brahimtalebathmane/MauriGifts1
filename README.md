# MauriGift - Gift Card Mobile Application

تطبيق MauriGift هو منصة شراء بطاقات الهدايا الرقمية مع دعم كامل للغة العربية ونظام RTL.

## المتطلبات

- Node.js 18+
- Expo CLI
- حساب Supabase
- هاتف ذكي أو محاكي للتطوير

## الإعداد السريع

### 1. إعداد Supabase

1. أنشئ مشروع جديد على [Supabase](https://supabase.com)
2. انسخ `SUPABASE_URL` و `SUPABASE_ANON_KEY` و `SUPABASE_SERVICE_ROLE_KEY`
3. أنشئ ملف `.env` وأضف المتغيرات:

```env
EXPO_PUBLIC_SUPABASE_URL=your_supabase_url
EXPO_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_service_role_key
```

### 2. إعداد قاعدة البيانات

```bash
# تشغيل المايجريشن
supabase db reset
# أو
supabase db push
```

### 3. إنشاء مجلد التخزين

في لوحة تحكم Supabase:
1. اذهب إلى Storage
2. أنشئ bucket جديد باسم `receipts`
3. اجعله Private

### 4. نشر Edge Functions

```bash
supabase functions deploy signup --project-ref your-project-ref
supabase functions deploy login --project-ref your-project-ref
supabase functions deploy me --project-ref your-project-ref
supabase functions deploy list_products --project-ref your-project-ref
supabase functions deploy create_order --project-ref your-project-ref
supabase functions deploy upload_receipt --project-ref your-project-ref
supabase functions deploy my_orders --project-ref your-project-ref
supabase functions deploy admin_list_users --project-ref your-project-ref
supabase functions deploy admin_list_orders --project-ref your-project-ref
supabase functions deploy admin_approve_order --project-ref your-project-ref
supabase functions deploy admin_reject_order --project-ref your-project-ref
supabase functions deploy notifications --project-ref your-project-ref
```

### 5. تشغيل التطبيق

```bash
# تثبيت التبعيات
npm install

# تشغيل التطبيق
expo start
```

## حسابات التجربة

### المدير
- رقم الهاتف: `00000000`
- الرمز: `1234`

يمكنك إنشاء حسابات مستخدمين جديدة من خلال شاشة التسجيل.

## الميزات الأساسية

### للمستخدمين
- التسجيل بالهاتف ورمز PIN
- تصفح فئات المنتجات (PUBG, Free Fire, iTunes, PlayStation)
- شراء بطاقات الهدايا
- طرق دفع متعددة (بنكيلي، السداد، مصرفي، بيم بنك، أمانتي، كليك)
- رفع إيصال الدفع
- متابعة حالة الطلبات
- استلام أكواد الشحن
- نظام الإشعارات

### للمديرين
- لوحة تحكم شاملة
- إدارة المستخدمين
- إدارة الطلبات
- تأكيد أو رفض الطلبات
- إرسال أكواد الشحن
- سجل العمليات

## التقنيات المستخدمة

- **Frontend**: Expo (React Native + TypeScript)
- **Backend**: Supabase (Postgres + Edge Functions + Storage)
- **State Management**: Zustand
- **UI Components**: Custom RTL components
- **Authentication**: Custom session management
- **Internationalization**: Arabic with RTL support
- **Image Handling**: Expo Image Picker + Manipulator
- **Notifications**: Local notifications

## هيكل المشروع

```
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigation screens
│   ├── auth/              # Authentication screens
│   ├── category/          # Category screens
│   └── payment/           # Payment flow
├── components/            # Reusable UI components
├── lib/                   # API client and utilities
├── state/                 # Zustand store
├── hooks/                 # Custom hooks
├── i18n/                  # Arabic translations
└── supabase/             # Database and functions
    ├── migrations/       # SQL migrations
    └── functions/        # Edge Functions
```

## API Endpoints

جميع الـ Edge Functions تدعم CORS وتستخدم Zod للتحقق من البيانات:

- `POST /signup` - إنشاء حساب جديد
- `POST /login` - تسجيل الدخول
- `POST /me` - جلب بيانات المستخدم
- `GET /list_products` - جلب المنتجات
- `POST /create_order` - إنشاء طلب جديد
- `POST /upload_receipt` - رفع إيصال الدفع
- `POST /my_orders` - جلب طلبات المستخدم
- `POST /admin_list_users` - إدارة المستخدمين
- `POST /admin_list_orders` - إدارة الطلبات
- `POST /admin_approve_order` - تأكيد الطلب
- `POST /admin_reject_order` - رفض الطلب
- `POST /notifications` - إدارة الإشعارات

## الأمان

- استخدام Service Role Key في Edge Functions فقط
- تشفير جميع الاتصالات عبر HTTPS
- تخزين آمن للجلسات
- التحقق من صحة البيانات في الخادم
- إدارة أذونات Storage بعناية

## التطوير والاختبار

```bash
# تشغيل في وضع التطوير
expo start

# بناء للإنتاج
expo build

# اختبار على الهاتف
expo start --tunnel
```

## الدعم

للمساعدة أو الاستفسارات، يرجى التواصل عبر فريق التطوير.

---

تم تطوير MauriGift بواسطة فريق متخصص لخدمة السوق الموريتاني 🇲🇷