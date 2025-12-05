// scripts/generate-icons.js
// Genera icone PNG dal logo SVG
const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const SVG_PATH = path.join(__dirname, '../public/logo.svg');
const OUTPUT_DIR = path.join(__dirname, '../public/icons');

const SIZES = [
  { name: 'icon-192.png', size: 192 },
  { name: 'icon-512.png', size: 512 },
  { name: 'apple-touch-icon.png', size: 180 },
  { name: 'favicon-32.png', size: 32 },
  { name: 'favicon-16.png', size: 16 },
];

async function generateIcons() {
  console.log('🎨 Generazione icone da logo.svg...\n');
  
  // Ensure output directory exists
  if (!fs.existsSync(OUTPUT_DIR)) {
    fs.mkdirSync(OUTPUT_DIR, { recursive: true });
  }
  
  // Read SVG
  const svgBuffer = fs.readFileSync(SVG_PATH);
  
  for (const { name, size } of SIZES) {
    const outputPath = path.join(OUTPUT_DIR, name);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`✅ ${name} (${size}x${size})`);
  }
  
  // Also copy to root as favicon
  const favicon32 = path.join(OUTPUT_DIR, 'favicon-32.png');
  const faviconDest = path.join(__dirname, '../public/favicon.png');
  fs.copyFileSync(favicon32, faviconDest);
  console.log(`✅ favicon.png (32x32)`);
  
  console.log('\n🎉 Icone generate con successo!');
  console.log('   Percorso:', OUTPUT_DIR);
}

generateIcons().catch(console.error);

