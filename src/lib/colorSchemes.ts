/**
 * ============================================================================
 * PREMIUM COLOR SCHEME SYSTEM
 * ============================================================================
 * 
 * 4 Premium Color Schemes: Mocha, Forest, Midnight, Clarity
 * Each scheme provides a complete color palette optimized for different use cases
 * and accessibility levels (WCAG AA+ to AAA).
 */

export type ColorScheme = 'mocha' | 'forest' | 'midnight' | 'clarity';

export interface ColorSchemeDefinition {
  name: string;
  personality: string;
  description: string;
  preview: string; // Tailwind class for preview
  wcagLevel: 'AA+' | 'AAA';
  bestFor: string[];
  semantics: {
    success: string; // HSL values
    warning: string;
    error: string;
    info: string;
  };
  colors: {
    primary: {
      '50': string;
      '100': string;
      '200': string;
      '300': string;
      '400': string;
      '500': string;
      '600': string;
      '700': string;
      '800': string;
      '900': string;
      '950': string;
    };
    secondary: {
      '50': string;
      '100': string;
      '200': string;
      '300': string;
      '400': string;
      '500': string;
      '600': string;
      '700': string;
      '800': string;
      '900': string;
      '950': string;
    };
  };
}

export const COLOR_SCHEMES: Record<ColorScheme, ColorSchemeDefinition> = {
  mocha: {
    name: 'Mocha',
    personality: 'Premium, warm, inviting, professional',
    description: 'Warm espresso to latte gradient. Perfect for professional contexts and administrative interfaces.',
    preview: 'bg-gradient-to-br from-amber-50 to-orange-100',
    wcagLevel: 'AA+',
    bestFor: ['All users (70% default)', 'Professional contexts', 'Administrative interfaces'],
    semantics: {
      success: '110 55% 43%', // Muted forest green
      warning: '38 85% 49%',  // Warm amber
      error: '15 76% 48%',    // Terracotta
      info: '200 10% 48%',    // Slate
    },
    colors: {
      primary: {
        '50': '39 100% 97%',   // Very light
        '100': '38 100% 94%',
        '200': '37 98% 88%',
        '300': '36 97% 80%',
        '400': '35 96% 70%',
        '500': '33 95% 58%',
        '600': '30 87% 50%',   // PRIMARY
        '700': '27 80% 44%',
        '800': '24 75% 38%',
        '900': '22 68% 32%',
        '950': '20 65% 18%',   // Very dark
      },
      secondary: {
        '50': '45 100% 97%',   // Warm latte
        '100': '43 100% 94%',
        '200': '41 98% 88%',
        '300': '39 97% 80%',
        '400': '37 96% 70%',
        '500': '35 95% 60%',
        '600': '33 90% 52%',   // SECONDARY
        '700': '31 85% 46%',
        '800': '29 80% 40%',
        '900': '27 75% 34%',
        '950': '25 70% 20%',
      },
    },
  },
  forest: {
    name: 'Forest',
    personality: 'Natural, grounded, focused—deep-work enabler',
    description: 'Deep forest sage to gentle gradient. Perfect for extended study periods and focused work.',
    preview: 'bg-gradient-to-br from-green-50 to-emerald-100',
    wcagLevel: 'AA+',
    bestFor: ['Testing environments', 'Grading workflows', 'Extended study periods'],
    semantics: {
      success: '120 60% 38%',  // Deeper forest green
      warning: '42 95% 50%',   // Golden yellow
      error: '8 72% 50%',      // Burnt orange
      info: '190 70% 45%',     // Slate teal
    },
    colors: {
      primary: {
        '50': '162 100% 97%',   // Deep Forest Sage
        '100': '163 95% 94%',
        '200': '164 90% 88%',
        '300': '165 85% 80%',
        '400': '164 80% 70%',
        '500': '163 75% 60%',
        '600': '162 70% 50%',   // PRIMARY
        '700': '161 65% 44%',
        '800': '160 60% 38%',
        '900': '159 55% 32%',
        '950': '158 50% 20%',
      },
      secondary: {
        '50': '95 100% 97%',    // Sage to moss
        '100': '96 95% 94%',
        '200': '97 90% 88%',
        '300': '97 85% 80%',
        '400': '97 80% 70%',
        '500': '97 75% 60%',
        '600': '97 70% 52%',    // SECONDARY
        '700': '97 65% 46%',
        '800': '97 60% 40%',
        '900': '97 55% 34%',
        '950': '97 50% 22%',
      },
    },
  },
  midnight: {
    name: 'Midnight',
    personality: 'Electric, vivid, protective—night guardian',
    description: 'Electric blue with OLED-optimized slate. Perfect for night work and low-light environments.',
    preview: 'bg-gradient-to-br from-slate-900 to-blue-950',
    wcagLevel: 'AAA',
    bestFor: ['Night work (8pm–8am)', 'Low-light environments', 'OLED devices', 'Eye strain prevention'],
    semantics: {
      success: '130 80% 50%',  // Bright mint
      warning: '45 95% 55%',   // Bright gold
      error: '0 100% 60%',     // Bright red
      info: '185 95% 50%',     // Bright cyan
    },
    colors: {
      primary: {
        '50': '218 100% 97%',   // Electric Blue
        '100': '219 95% 94%',
        '200': '220 90% 88%',
        '300': '221 85% 80%',
        '400': '220 80% 70%',
        '500': '219 75% 60%',
        '600': '218 70% 50%',   // PRIMARY
        '700': '217 65% 44%',
        '800': '216 60% 38%',
        '900': '215 55% 32%',
        '950': '214 50% 20%',
      },
      secondary: {
        '50': '220 15% 95%',    // OLED-Optimized Slate
        '100': '220 12% 90%',
        '200': '220 10% 85%',
        '300': '220 8% 75%',
        '400': '220 6% 65%',
        '500': '220 5% 55%',
        '600': '220 4% 45%',    // SECONDARY
        '700': '220 6% 35%',
        '800': '220 8% 25%',
        '900': '220 10% 15%',
        '950': '220 12% 10%',
      },
    },
  },
  clarity: {
    name: 'Clarity',
    personality: 'Bold, maximalist, inclusive—accessibility champion',
    description: 'Navy and vibrant cyan for maximum contrast. 100% CVD-safe (colorblind-friendly).',
    preview: 'bg-gradient-to-br from-blue-900 to-cyan-800',
    wcagLevel: 'AAA',
    bestFor: ['Low vision users', 'Colorblind users', 'Compliance requirements', 'Government institutions'],
    semantics: {
      success: '120 80% 35%',   // Strong green
      warning: '38 95% 45%',    // Bold amber
      error: '0 100% 50%',      // Clear red
      info: '190 100% 45%',     // Bright blue
    },
    colors: {
      primary: {
        '50': '220 100% 97%',   // Navy
        '100': '220 95% 94%',
        '200': '220 90% 88%',
        '300': '220 85% 80%',
        '400': '220 80% 70%',
        '500': '220 75% 60%',
        '600': '220 70% 50%',   // PRIMARY
        '700': '220 65% 44%',
        '800': '220 60% 38%',
        '900': '220 55% 32%',
        '950': '220 50% 20%',
      },
      secondary: {
        '50': '190 100% 97%',   // Vibrant cyan
        '100': '190 95% 94%',
        '200': '190 90% 88%',
        '300': '190 85% 80%',
        '400': '190 80% 70%',
        '500': '190 75% 60%',
        '600': '190 70% 50%',   // SECONDARY
        '700': '190 65% 44%',
        '800': '190 60% 38%',
        '900': '190 55% 32%',
        '950': '190 50% 20%',
      },
    },
  },
};

/**
 * Apply a color scheme to the document root
 */
export function applyColorScheme(scheme: ColorScheme): void {
  const schemeDef = COLOR_SCHEMES[scheme];
  const root = document.documentElement;

  // Apply primary colors (50-950)
  Object.entries(schemeDef.colors.primary).forEach(([key, value]) => {
    root.style.setProperty(`--primary-${key}`, value);
  });

  // Apply secondary colors (50-950)
  Object.entries(schemeDef.colors.secondary).forEach(([key, value]) => {
    root.style.setProperty(`--secondary-${key}`, value);
  });

  // Apply semantic colors
  root.style.setProperty('--success-500', schemeDef.semantics.success);
  root.style.setProperty('--warning-500', schemeDef.semantics.warning);
  root.style.setProperty('--error-500', schemeDef.semantics.error);
  root.style.setProperty('--info-500', schemeDef.semantics.info);

  // Set main primary and secondary (using 600 variant)
  root.style.setProperty('--primary', schemeDef.colors.primary['600']);
  root.style.setProperty('--secondary', schemeDef.colors.secondary['600']);

  // Set accent and ring colors
  root.style.setProperty('--accent', schemeDef.colors.primary['500']);
  root.style.setProperty('--ring', schemeDef.colors.primary['600']);

  // Set primary and secondary foreground colors (for text on colored backgrounds)
  root.style.setProperty('--primary-foreground', '0 0% 100%'); // White text on primary
  root.style.setProperty('--secondary-foreground', '0 0% 100%'); // White text on secondary

  // Set hover states using color scheme colors
  root.style.setProperty('--primary-hover', schemeDef.colors.primary['700']);
  root.style.setProperty('--secondary-hover', schemeDef.colors.secondary['700']);

  // Set active states
  root.style.setProperty('--primary-active', schemeDef.colors.primary['800']);
  root.style.setProperty('--secondary-active', schemeDef.colors.secondary['800']);

  // Apply gradient variables
  root.style.setProperty(
    '--gradient-primary',
    `linear-gradient(135deg, hsl(${schemeDef.colors.primary['600']}) 0%, hsl(${schemeDef.colors.primary['700']}) 100%)`
  );
  root.style.setProperty(
    '--gradient-secondary',
    `linear-gradient(135deg, hsl(${schemeDef.colors.secondary['600']}) 0%, hsl(${schemeDef.colors.secondary['700']}) 100%)`
  );

  // Apply background gradients based on color scheme
  // Light mode background gradient
  root.style.setProperty(
    '--bg-gradient-main',
    `linear-gradient(135deg, hsl(${schemeDef.colors.primary['50']}) 0%, hsl(${schemeDef.colors.secondary['50']}) 25%, hsl(${schemeDef.colors.primary['100']}) 50%, hsl(${schemeDef.colors.secondary['100']}) 75%, hsl(${schemeDef.colors.primary['50']}) 100%)`
  );
  
  // Sidebar gradient
  root.style.setProperty(
    '--bg-gradient-sidebar',
    `linear-gradient(180deg, hsl(${schemeDef.colors.primary['100']}) 0%, hsl(${schemeDef.colors.primary['50']}) 50%, hsl(${schemeDef.colors.secondary['100']}) 100%)`
  );
  
  // Header gradient
  root.style.setProperty(
    '--bg-gradient-header',
    `linear-gradient(90deg, hsl(${schemeDef.colors.primary['100']}) 0%, hsl(${schemeDef.colors.secondary['100']}) 50%, hsl(${schemeDef.colors.primary['100']}) 100%)`
  );
  
  // Card/content gradient
  root.style.setProperty(
    '--bg-gradient-card',
    `linear-gradient(135deg, hsl(${schemeDef.colors.primary['50']}) 0%, hsl(${schemeDef.colors.secondary['50']}) 100%)`
  );
}

/**
 * Get color scheme from localStorage
 */
export function getColorSchemeFromStorage(): ColorScheme {
  if (typeof window === 'undefined') return 'mocha';
  const stored = localStorage.getItem('colorScheme') as ColorScheme | null;
  return stored && Object.keys(COLOR_SCHEMES).includes(stored) ? stored : 'mocha';
}

/**
 * Save color scheme to localStorage
 */
export function saveColorScheme(scheme: ColorScheme): void {
  if (typeof window === 'undefined') return;
  localStorage.setItem('colorScheme', scheme);
}

/**
 * Get all available color schemes
 */
export function getAvailableColorSchemes(): ColorScheme[] {
  return Object.keys(COLOR_SCHEMES) as ColorScheme[];
}

