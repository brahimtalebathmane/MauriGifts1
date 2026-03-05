const fs = require('fs');
const path = require('path');

const htmlPath = path.join(__dirname, 'dist', 'index.html');

if (fs.existsSync(htmlPath)) {
  let html = fs.readFileSync(htmlPath, 'utf8');

  if (!html.includes('manifest.json')) {
    html = html.replace(
      '</head>',
      '  <link rel="manifest" href="/manifest.json" />\n  </head>'
    );
    console.log('✅ Manifest link injected into index.html');
  }

  if (!html.includes('serviceWorker')) {
    html = html.replace(
      '</body>',
      `  <script>
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js');
}
  </script>
</body>`
    );
    console.log('✅ Service worker registration injected into index.html');
  }

  fs.writeFileSync(htmlPath, html, 'utf8');
}
