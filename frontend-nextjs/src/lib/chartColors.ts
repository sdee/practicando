// Spanish-themed color palettes for charts
export const CHART_PALETTES = {
  // Fiesta - Bold and vibrant colors
  fiesta: {
    primary: '#D32F2F',      // Spanish Red
    secondary: '#FF9800',    // Saffron Orange  
    tertiary: '#4CAF50',     // Olive Green
    accent: '#9C27B0',       // Purple
    background: '#FFF3E0',   // Warm Cream
    text: '#2C1810',         // Dark Brown
    colors: ['#D32F2F', '#FF9800', '#4CAF50', '#9C27B0', '#FF5722', '#795548']
  },

  // Tropical - Warm sunset colors
  tropical: {
    primary: '#FF6B35',      // Sunset Orange
    secondary: '#F7931E',    // Bright Orange
    tertiary: '#FFD23F',     // Golden Yellow
    accent: '#06D6A0',       // Turquoise
    background: '#FFF8E1',   // Light Cream
    text: '#2E2E2E',         // Dark Gray
    colors: ['#FF6B35', '#F7931E', '#FFD23F', '#06D6A0', '#F72585', '#4361EE']
  },

  // Spanish Sunset - Elegant warm tones
  sunset: {
    primary: '#E85A4F',      // Coral Red
    secondary: '#D8973C',    // Golden
    tertiary: '#BD632F',     // Burnt Orange
    accent: '#A8DADC',       // Soft Blue
    background: '#F8F9FA',   // Off White
    text: '#2F1B14',         // Rich Brown
    colors: ['#E85A4F', '#D8973C', '#BD632F', '#A8DADC', '#457B9D', '#1D3557']
  }
};

// Default palette
export const DEFAULT_PALETTE = CHART_PALETTES.fiesta;

// Recharts-specific color configurations
export const getRechartsColors = (palette: keyof typeof CHART_PALETTES = 'fiesta') => {
  return CHART_PALETTES[palette].colors;
};

// Common chart style configurations
export const CHART_STYLES = {
  grid: {
    strokeDasharray: '3 3',
    stroke: '#e0e0e0'
  },
  
  tooltip: {
    contentStyle: {
      backgroundColor: '#ffffff',
      border: '1px solid #e0e0e0',
      borderRadius: '8px',
      boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1)',
      fontSize: '14px'
    }
  },

  legend: {
    wrapperStyle: {
      fontSize: '14px',
      color: '#374151'
    }
  }
};
