import type { ExportFormat, FeatureFlags } from '@itsjust/core';

const toolConfig = {
  id: 'week-number-calculator',
  name: 'Week Number Calculator',
  category: 'Utility',
  description:
    'Calculate the ISO-8601 week number for any date and list the dates of any week number in a year.',
  version: '1.0.0',
  exportFormats: ['png', 'jpeg', 'webp', 'pdf', 'json'] as ExportFormat[],
  features: {
    export: true,
    autoSave: true,
    undoRedo: true,
    sidebar: true,
    statusBar: true,
    darkMode: true,
  } as FeatureFlags,
  theme: { brand: 'Week Number Calculator', icon: '📅' },
};

export default toolConfig;
