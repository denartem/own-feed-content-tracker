export const STATUSES = ['to do', 'in progress', 'done', 'invalid data'];
export const PRIORITIES = ['high', 'medium', 'low'];
export const UNIT_TYPES = ['pair', 'player', 'team'];
export const PASSPORT_SECTIONS = [
  'Формат',
  'Як готується контент',
  'Критерій даних',
  'Нюанси',
  'Ринки й математика',
  'Правила ставок',
  'Дизайн',
  'Відкриті питання',
];
export const PASSPORT_TEMPLATE = PASSPORT_SECTIONS.map((s) => `## ${s}\n`).join('\n');
