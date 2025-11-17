import favicons from 'favicons';
import fs from 'fs/promises';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const source = path.join(__dirname, '../src/lib/assets/logo.svg');
const outputDir = path.join(__dirname, '../static');

const configuration = {
  path: '/',
  appName: 'CITE',
  appShortName: 'CITE',
  appDescription: 'Coordinated AI Safety Measures: Context, Interception, Thinking, and Escalation',
  developerName: 'CITE Team',
  developerURL: null,
  dir: 'auto',
  lang: 'en-US',
  background: '#7c3aed',
  theme_color: '#7c3aed',
  appleStatusBarStyle: 'black-translucent',
  display: 'standalone',
  orientation: 'any',
  scope: '/',
  start_url: '/',
  preferRelatedApplications: false,
  relatedApplications: undefined,
  version: '1.0',
  pixel_art: false,
  loadManifestWithCredentials: false,
  manifestMaskable: true,
  icons: {
    android: true,
    appleIcon: true,
    appleStartup: false,
    favicons: true,
    windows: true,
    yandex: false,
  },
};

async function generateFavicons() {
  try {
    console.log('🧠 Generating favicons from logo.svg...');

    const response = await favicons(source, configuration);

    // Write images
    await Promise.all(
      response.images.map(async (image) => {
        const imagePath = path.join(outputDir, image.name);
        await fs.writeFile(imagePath, image.contents);
        console.log(`  ✓ ${image.name}`);
      })
    );

    // Write files (manifest, browserconfig, etc.)
    await Promise.all(
      response.files.map(async (file) => {
        const filePath = path.join(outputDir, file.name);
        await fs.writeFile(filePath, file.contents);
        console.log(`  ✓ ${file.name}`);
      })
    );

    // Write HTML meta tags to a separate file for reference
    const htmlPath = path.join(__dirname, '../static/favicon-meta.html');
    await fs.writeFile(htmlPath, response.html.join('\n'));
    console.log(`  ✓ favicon-meta.html (copy these tags to app.html)`);

    console.log('\n✨ Favicons generated successfully!');
    console.log('\n📝 Next steps:');
    console.log('   Copy the meta tags from static/favicon-meta.html to src/app.html <head>');

  } catch (error) {
    console.error('❌ Error generating favicons:', error);
    process.exit(1);
  }
}

generateFavicons();
