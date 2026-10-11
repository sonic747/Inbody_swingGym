import fs from 'fs';
import path from 'path';
import sharp from 'sharp';

const publicDir = path.resolve(process.cwd(), 'public');
if (!fs.existsSync(publicDir)) {
  fs.mkdirSync(publicDir, { recursive: true });
}

// 1. Standard SVG Icon (512x512 viewBox)
const svgIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="50%" stop-color="#090D16"/>
      <stop offset="100%" stop-color="#05070B"/>
    </linearGradient>
    <linearGradient id="glowGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="50%" stop-color="#06B6D4"/>
      <stop offset="100%" stop-color="#10B981"/>
    </linearGradient>
    <linearGradient id="metalGrad" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#60A5FA"/>
      <stop offset="100%" stop-color="#2563EB"/>
    </linearGradient>
    <filter id="glow" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="12" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Background Canvas -->
  <rect width="512" height="512" rx="112" fill="url(#bgGrad)"/>
  
  <!-- Subtle Outer Border Accent -->
  <rect x="8" y="8" width="496" height="496" rx="104" fill="none" stroke="url(#glowGrad)" stroke-width="6" opacity="0.45"/>

  <!-- Center Glow Aura -->
  <circle cx="256" cy="256" r="140" fill="#3B82F6" opacity="0.12" filter="url(#glow)"/>

  <!-- Gym Dumbbell / Athletic Element -->
  <g transform="translate(256, 210)">
    <!-- Central Bar -->
    <rect x="-105" y="-12" width="210" height="24" rx="12" fill="#E2E8F0" opacity="0.9"/>
    
    <!-- Knurling pattern on grip -->
    <rect x="-42" y="-14" width="84" height="28" rx="6" fill="#38BDF8"/>
    
    <!-- Left Weight Plates -->
    <rect x="-132" y="-55" width="24" height="110" rx="10" fill="url(#glowGrad)"/>
    <rect x="-154" y="-42" width="18" height="84" rx="8" fill="#3B82F6"/>
    <rect x="-104" y="-30" width="12" height="60" rx="5" fill="#1E40AF"/>

    <!-- Right Weight Plates -->
    <rect x="108" y="-55" width="24" height="110" rx="10" fill="url(#glowGrad)"/>
    <rect x="136" y="-42" width="18" height="84" rx="8" fill="#3B82F6"/>
    <rect x="92" y="-30" width="12" height="60" rx="5" fill="#1E40AF"/>
  </g>

  <!-- InBody Biometric Pulse / Chart Analytics Line -->
  <g transform="translate(0, 50)">
    <!-- Pulse Line with Neon Glow -->
    <path d="M 96,280 L 175,280 L 210,230 L 256,330 L 302,240 L 335,280 L 416,280" 
          fill="none" 
          stroke="url(#glowGrad)" 
          stroke-width="16" 
          stroke-linecap="round" 
          stroke-linejoin="round"
          filter="url(#glow)"/>

    <!-- Data Nodes -->
    <circle cx="210" cy="230" r="9" fill="#FFFFFF"/>
    <circle cx="256" cy="330" r="10" fill="#10B981"/>
    <circle cx="302" cy="240" r="9" fill="#06B6D4"/>
  </g>

  <!-- Modern Brand Title -->
  <text x="256" y="420" 
        text-anchor="middle" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif" 
        font-size="44" 
        font-weight="900" 
        letter-spacing="4"
        fill="#FFFFFF">SWING GYM</text>
  
  <text x="256" y="458" 
        text-anchor="middle" 
        font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif" 
        font-size="24" 
        font-weight="700" 
        letter-spacing="8"
        fill="#38BDF8">INBODY</text>
</svg>
`;

// 2. Maskable SVG Icon (Safe zone margin for Android adaptive icons: content fits in middle 80%)
const svgMaskableIcon = `
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 512 512" width="512" height="512">
  <defs>
    <linearGradient id="bgGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#0F172A"/>
      <stop offset="50%" stop-color="#090D16"/>
      <stop offset="100%" stop-color="#05070B"/>
    </linearGradient>
    <linearGradient id="glowGradM" x1="0%" y1="0%" x2="100%" y2="100%">
      <stop offset="0%" stop-color="#3B82F6"/>
      <stop offset="50%" stop-color="#06B6D4"/>
      <stop offset="100%" stop-color="#10B981"/>
    </linearGradient>
    <filter id="glowM" x="-20%" y="-20%" width="140%" height="140%">
      <feGaussianBlur stdDeviation="10" result="blur" />
      <feComposite in="SourceGraphic" in2="blur" operator="over" />
    </filter>
  </defs>

  <!-- Full-bleed background for maskable -->
  <rect width="512" height="512" fill="url(#bgGradM)"/>

  <!-- Content scaled to 78% and centered in safe zone -->
  <g transform="translate(256, 256) scale(0.78) translate(-256, -256)">
    <!-- Center Glow Aura -->
    <circle cx="256" cy="256" r="140" fill="#3B82F6" opacity="0.15" filter="url(#glowM)"/>

    <!-- Gym Dumbbell / Athletic Element -->
    <g transform="translate(256, 210)">
      <rect x="-105" y="-12" width="210" height="24" rx="12" fill="#E2E8F0" opacity="0.9"/>
      <rect x="-42" y="-14" width="84" height="28" rx="6" fill="#38BDF8"/>
      
      <rect x="-132" y="-55" width="24" height="110" rx="10" fill="url(#glowGradM)"/>
      <rect x="-154" y="-42" width="18" height="84" rx="8" fill="#3B82F6"/>
      <rect x="-104" y="-30" width="12" height="60" rx="5" fill="#1E40AF"/>

      <rect x="108" y="-55" width="24" height="110" rx="10" fill="url(#glowGradM)"/>
      <rect x="136" y="-42" width="18" height="84" rx="8" fill="#3B82F6"/>
      <rect x="92" y="-30" width="12" height="60" rx="5" fill="#1E40AF"/>
    </g>

    <!-- InBody Biometric Pulse / Chart Analytics Line -->
    <g transform="translate(0, 50)">
      <path d="M 96,280 L 175,280 L 210,230 L 256,330 L 302,240 L 335,280 L 416,280" 
            fill="none" 
            stroke="url(#glowGradM)" 
            stroke-width="16" 
            stroke-linecap="round" 
            stroke-linejoin="round"
            filter="url(#glowM)"/>

      <circle cx="210" cy="230" r="9" fill="#FFFFFF"/>
      <circle cx="256" cy="330" r="10" fill="#10B981"/>
      <circle cx="302" cy="240" r="9" fill="#06B6D4"/>
    </g>

    <text x="256" y="420" 
          text-anchor="middle" 
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif" 
          font-size="44" 
          font-weight="900" 
          letter-spacing="4"
          fill="#FFFFFF">SWING GYM</text>
    
    <text x="256" y="458" 
          text-anchor="middle" 
          font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Noto Sans KR', sans-serif" 
          font-size="24" 
          font-weight="700" 
          letter-spacing="8"
          fill="#38BDF8">INBODY</text>
  </g>
</svg>
`;

async function generate() {
  const svgBuffer = Buffer.from(svgIcon);
  const svgMaskableBuffer = Buffer.from(svgMaskableIcon);

  // Write SVG files
  fs.writeFileSync(path.join(publicDir, 'icon.svg'), svgIcon.trim());
  fs.writeFileSync(path.join(publicDir, 'icon-maskable.svg'), svgMaskableIcon.trim());

  // Generate PNGs
  // 1. 192x192
  await sharp(svgBuffer)
    .resize(192, 192)
    .png()
    .toFile(path.join(publicDir, 'pwa-192x192.png'));
  console.log('✓ Created pwa-192x192.png');

  // 2. 512x512
  await sharp(svgBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-512x512.png'));
  console.log('✓ Created pwa-512x512.png');

  // 3. Maskable 512x512 (with safe zone)
  await sharp(svgMaskableBuffer)
    .resize(512, 512)
    .png()
    .toFile(path.join(publicDir, 'pwa-maskable-512x512.png'));
  console.log('✓ Created pwa-maskable-512x512.png');

  // 4. Apple Touch Icon 180x180 (for iOS Safari)
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(path.join(publicDir, 'apple-touch-icon.png'));
  console.log('✓ Created apple-touch-icon.png');

  // 5. Favicon 64x64 & 32x32
  await sharp(svgBuffer)
    .resize(64, 64)
    .png()
    .toFile(path.join(publicDir, 'favicon.png'));
  console.log('✓ Created favicon.png');
}

generate().catch((err) => {
  console.error('Error generating icons:', err);
  process.exit(1);
});
