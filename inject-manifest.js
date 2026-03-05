const fs = require('fs');
const path = require('path');

const distPath = path.join(__dirname, 'dist');
const htmlPath = path.join(distPath, 'index.html');

if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');

  // 1. حقن رابط الـ Manifest (تم تعديل المسار ليكون نسبياً)
  if (!html.includes('manifest.json')) {
    html = html.replace(
      '</head>',
      '  <link rel="manifest" href="./manifest.json" />\n  </head>'
    );
    console.log('✅ Manifest link injected (Relative path)');
  }

  // 2. حقن تسجيل الـ Service Worker (تم تعديل المسار ليكون نسبياً)
  if (!html.includes('serviceWorker')) {
    html = html.replace(
      '</body>',
      `  <script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}
  </script>\n</body>`
    );
    console.log('✅ Service worker registration injected (Relative path)');
  }

  // 3. معالجة خطأ الـ MIME type (تحويل مسارات الـ JS إلى نسبية)
  html = html.replace(/src="\/_expo/g, 'src="./_expo');
  
  fs.writeFileSync(htmlPath, html, 'utf8');
}

// 4. القضاء على مشكلة التوجيه نهائياً في Netlify
// نقوم بإنشاء ملف _redirects داخل مجلد dist مباشرة لضمان رفعه
try {
  if (fs.existsSync(distPath)) {
    fs.writeFileSync(path.join(distPath, '_redirects'), '/* /index.html 200');
    console.log('✅ Created _redirects in dist folder for Netlify');
  }
} catch (err) {
  console.error('❌ Error creating _redirects:', err);
}