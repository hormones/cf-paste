export const TEMPLATES = {
  default: {
    id: 'default',
    name: '默认模板',
    component: () => import('@/templates/DefaultTemplate.vue'),
  },
  simple: {
    id: 'simple',
    name: '简约模板',
    component: () => import('@/templates/SimpleTemplate.vue'),
  },
} as const

export type TemplateKey = keyof typeof TEMPLATES
