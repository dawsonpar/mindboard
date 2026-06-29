export type SortOption = 'priority' | 'alpha' | 'created' | 'modified' | 'complexity';

export const SORT_LABELS: Record<SortOption, string> = {
  priority: 'Priority',
  alpha: 'Alphabetical',
  created: 'Created',
  modified: 'Modified',
  complexity: 'Complexity',
};
