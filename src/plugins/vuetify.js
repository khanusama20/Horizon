import 'vuetify/styles';
import '@mdi/font/css/materialdesignicons.css';
import { createVuetify } from 'vuetify';

/**
 * Horizon Warm Light Cream & Orange Brand Theme
 * Design Tokens:
 * - Background: #F7F3EB (Warm Cream)
 * - Secondary Background: #F1EBDD (Soft Sand)
 * - Surface / Card: #FFFDF8 (Crisp Warm Card)
 * - Primary: #E97824 (Horizon Brand Orange)
 * - Primary Hover / Darken: #D96718
 * - Soft Orange: #FCE8D8
 * - Primary Text: #29251F (Deep Warm Espresso)
 * - Secondary Text: #756D62 (Warm Clay)
 * - Border: #E7DED0 (Subtle Warm Border)
 * - Success: #3F8061 (Sage Green)
 * - Warning: #C58A35 (Warm Amber)
 * - Error: #C44D43 (Terracotta Red)
 */
export const warmCreamTheme = {
  dark: false,
  colors: {
    background: '#F7F3EB',
    surface: '#FFFDF8',
    'surface-variant': '#F1EBDD',
    'surface-bright': '#FFFFFF',
    primary: '#E97824',
    'primary-darken-1': '#D96718',
    secondary: '#29251F',
    'secondary-darken-1': '#1B1814',
    accent: '#E97824',
    'soft-orange': '#FCE8D8',
    error: '#C44D43',
    info: '#2D728F',
    success: '#3F8061',
    warning: '#C58A35',
    // Text contrast tokens
    'on-background': '#29251F',
    'on-surface': '#29251F',
    'on-surface-variant': '#29251F',
    'on-surface-bright': '#29251F',
    'on-primary': '#FFFFFF',
    'on-secondary': '#FFFFFF',
    'on-accent': '#FFFFFF',
    'on-error': '#FFFFFF',
    'on-info': '#FFFFFF',
    'on-success': '#FFFFFF',
    'on-warning': '#FFFFFF'
  },
  variables: {
    'border-color': '#E7DED0',
    'border-opacity': 1.0,
    'high-emphasis-opacity': 0.96,
    'medium-emphasis-opacity': 0.72,
    'disabled-opacity': 0.42,
    'theme-code': '#F1EBDD',
    'theme-on-code': '#E97824'
  }
};

export default createVuetify({
  theme: {
    defaultTheme: 'warmCreamTheme',
    themes: {
      warmCreamTheme
    }
  },
  defaults: {
    VTooltip: {
      location: 'top',
      openDelay: 100,
      closeDelay: 50,
      offset: 8
    },
    VCard: {
      elevation: 0,
      rounded: 'lg'
    },
    VBtn: {
      rounded: 'md',
      fontWeight: '600'
    },
    VTextField: {
      variant: 'outlined',
      density: 'comfortable',
      bgColor: 'surface',
      color: 'primary'
    },
    VSelect: {
      variant: 'outlined',
      density: 'comfortable',
      bgColor: 'surface',
      color: 'primary'
    },
    VTextarea: {
      variant: 'outlined',
      density: 'comfortable',
      bgColor: 'surface',
      color: 'primary'
    }
  }
});
