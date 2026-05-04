import type { TabId } from './types';

export const DASHBOARD_TAB_EVENT = 'grindos:set-tab';

export function dispatchDashboardTab(tab: TabId): void {
  if (typeof window === 'undefined') return;
  window.dispatchEvent(new CustomEvent(DASHBOARD_TAB_EVENT, { detail: { tab } }));
}
