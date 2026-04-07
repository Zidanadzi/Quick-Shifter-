const fs = require('fs');
const https = require('https');
const path = require('path');

const download = (url, dest) => {
  return new Promise((resolve, reject) => {
    const file = fs.createWriteStream(dest);
    https.get(url, (response) => {
      if (response.statusCode === 301 || response.statusCode === 302) {
        return download(response.headers.location, dest).then(resolve).catch(reject);
      }
      if (response.statusCode !== 200) {
        return reject(new Error(`Failed to download ${url}: ${response.statusCode}`));
      }
      response.pipe(file);
      file.on('finish', () => {
        file.close(resolve);
      });
    }).on('error', (err) => {
      fs.unlink(dest, () => reject(err));
    });
  });
};

// A minimal valid 1x1 black PNG
const MINIMAL_PNG = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mNkYAAAAAYAAjCB0C8AAAAASUVORK5CYII=', 'base64');

async function main() {
  const assetsDir = path.join(__dirname, '../assets');
  if (!fs.existsSync(assetsDir)) {
    fs.mkdirSync(assetsDir, { recursive: true });
  }

  // Using SDK 50 specific paths which are more likely to exist
  const baseUrl = 'https://raw.githubusercontent.com/expo/expo/sdk-50/templates/expo-template-blank/assets';
  const assets = [
    { name: 'icon.png', url: `${baseUrl}/icon.png` },
    { name: 'splash.png', url: `${baseUrl}/splash.png` },
    { name: 'adaptive-icon.png', url: `${baseUrl}/adaptive-icon.png` }
  ];

  for (const asset of assets) {
    const dest = path.join(assetsDir, asset.name);
    try {
      console.log(`Downloading ${asset.name}...`);
      await download(asset.url, dest);
      console.log(`Successfully downloaded ${asset.name}`);
    } catch (error) {
      console.warn(`Failed to download ${asset.name}, using fallback minimal PNG. Error: ${error.message}`);
      fs.writeFileSync(dest, MINIMAL_PNG);
    }
  }
  console.log('Asset fix completed!');
}

main().catch(console.error);
