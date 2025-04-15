const fs = require('fs');
const path = require('path');

// Function to create a simple SVG logo
function createLogoSVG(size = 192) {
  return `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
    <rect width="100%" height="100%" fill="#3B82F6"/>
    <text x="50%" y="50%" font-size="${size/4}px" text-anchor="middle" dy=".3em" font-family="Arial" font-weight="bold" fill="white">ML</text>
  </svg>`;
}

// Directory where we want to save the logos
const publicDir = path.resolve(__dirname, '../../public');

// Create logo192.png (this will be a simple SVG instead of PNG but will work for now)
fs.writeFileSync(
  path.join(publicDir, 'logo192.svg'),
  createLogoSVG(192)
);

// Create logo512.png
fs.writeFileSync(
  path.join(publicDir, 'logo512.svg'),
  createLogoSVG(512)
);

// Create favicon.ico (this will be a simple SVG instead of ICO but will work for now)
fs.writeFileSync(
  path.join(publicDir, 'favicon.svg'),
  createLogoSVG(32)
);

console.log('Placeholder logo files created!');
