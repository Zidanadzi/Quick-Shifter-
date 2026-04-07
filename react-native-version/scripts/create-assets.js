const fs = require('fs');
const path = require('path');

// A minimal valid 1x1 black PNG
const MINIMAL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

async function main() {
  const assetsDir = path.join(__dirname, '../assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  const assets = [
    { name: 'icon.png', size: 1024 },
    { name: 'splash.png', size: 2048 },
    { name: 'adaptive-icon.png', size: 1024 }
  ];

  for (const asset of assets) {
    const dest = path.join(assetsDir, asset.name);
    console.log(`Creating valid ${asset.name}...`);
    // In a real scenario, we would generate a proper image here.
    // For now, we overwrite with the minimal valid PNG to ensure it's not corrupted.
    fs.writeFileSync(dest, MINIMAL_PNG);
    console.log(`Successfully created ${asset.name}`);
  }
  console.log('Asset creation completed!');
}

main().catch(console.error);
