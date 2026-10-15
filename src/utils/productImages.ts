// Utility for reliable agricultural product images and SVG fallbacks

// Category-based fallback SVG Data URIs
const createFallbackSvg = (category: string, title: string, bgGradientStart: string, bgGradientEnd: string, accentColor: string): string => {
  const cleanTitle = title.replace(/[<>&'"]/g, '').slice(0, 32);
  const cleanCat = category.replace(/[<>&'"]/g, '').slice(0, 24);

  const svg = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 300" width="100%" height="100%">
    <defs>
      <linearGradient id="grad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stop-color="${bgGradientStart}" />
        <stop offset="100%" stop-color="${bgGradientEnd}" />
      </linearGradient>
      <filter id="shadow" x="-10%" y="-10%" width="120%" height="120%">
        <feDropShadow dx="0" dy="4" stdDeviation="6" flood-opacity="0.15" />
      </filter>
    </defs>
    <rect width="400" height="300" fill="url(#grad)" />
    
    <!-- Decorative background circles -->
    <circle cx="360" cy="40" r="120" fill="white" fill-opacity="0.06" />
    <circle cx="40" cy="260" r="90" fill="white" fill-opacity="0.04" />
    
    <!-- Central Icon Badge -->
    <g transform="translate(160, 70)" filter="url(#shadow)">
      <rect width="80" height="80" rx="24" fill="white" fill-opacity="0.95" />
      <!-- Sprout / Agriculture Icon -->
      <path d="M40 22 C40 22 45 32 45 42 C45 48 40 54 40 58 C40 54 35 48 35 42 C35 32 40 22 40 22 Z" fill="${accentColor}" />
      <path d="M40 42 C48 35 60 38 60 45 C60 52 50 54 40 50 Z" fill="${accentColor}" fill-opacity="0.85" />
      <path d="M40 46 C32 39 20 42 20 49 C20 56 30 58 40 54 Z" fill="${accentColor}" fill-opacity="0.85" />
    </g>

    <!-- Category Pill -->
    <g transform="translate(200, 180)">
      <rect x="-70" y="0" width="140" height="24" rx="12" fill="${accentColor}" />
      <text x="0" y="16" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="700" fill="#ffffff" text-anchor="middle" letter-spacing="0.5">${cleanCat.toUpperCase()}</text>
    </g>

    <!-- Product Title -->
    <text x="200" y="235" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="15" font-weight="800" fill="#1c1917" text-anchor="middle">${cleanTitle}</text>
    <text x="200" y="260" font-family="-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif" font-size="11" font-weight="500" fill="#57534e" text-anchor="middle">TaniMakmur Agrobisnis Resmi</text>
  </svg>`;

  return `data:image/svg+xml;charset=utf-8,${encodeURIComponent(svg)}`;
};

export const getCategoryFallbackImage = (category: string = '', title: string = 'Produk Pertanian'): string => {
  const cat = category.toLowerCase();
  if (cat.includes('pupuk') || cat.includes('nutrisi')) {
    return createFallbackSvg('Pupuk & Nutrisi', title || 'Pupuk Pertanian Unggul', '#eefbf4', '#d7f3e3', '#059669');
  }
  if (cat.includes('bibit') || cat.includes('benih')) {
    return createFallbackSvg('Bibit & Benih', title || 'Benih Unggul Bersertifikat', '#fef9ee', '#fdedc5', '#d97706');
  }
  if (cat.includes('obat') || cat.includes('pestisida')) {
    return createFallbackSvg('Obat & Pestisida', title || 'Proteksi Tanaman & Hama', '#f0fdf4', '#dcfce7', '#15803d');
  }
  return createFallbackSvg('Pertanian', title || 'Sarana Tani Terpercaya', '#f5f5f4', '#e7e5e4', '#44403c');
};

/**
 * Graceful image error handler for <img> elements
 */
export const handleProductImageError = (
  e: React.SyntheticEvent<HTMLImageElement, Event>,
  category?: string,
  title?: string
) => {
  const target = e.currentTarget;
  // Prevent infinite loops if fallback itself somehow failed
  target.onerror = null;
  target.src = getCategoryFallbackImage(category, title);
};
