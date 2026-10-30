/**
 * Informações Oficiais e Institucionais do Momentus
 * Fonte única da verdade (Single Source of Truth) para marca, canais de contato,
 * domínios de produção e titularidade de direitos autorais.
 */
export const APP_INFO = {
  name: 'Momentus',
  developer: 'Fabricio Lima',
  email: 'contato@momentusapp.com.br',
  website: 'https://www.momentusapp.com.br/',
  webAccess: 'https://app.momentusapp.com.br/',
  domains: {
    official: 'www.momentusapp.com.br',
    webApp: 'app.momentusapp.com.br',
    naked: 'momentusapp.com.br',
  },
  copyright: '© 2025-2026 Fabricio Lima. Todos os direitos reservados.',
  dpoContact: 'contato@momentusapp.com.br',
  tagline: 'Viva o presente, planeje o futuro.',
} as const;

export default APP_INFO;
