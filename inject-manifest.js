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
    
    fs.writeFileSync(htmlPath, html, 'utf8');
    console.log('✅ Manifest link injected into index.html');
  }
}
