import { useState } from 'react';

/**
 * Pull-to-refresh state that only reflects user-initiated refreshes
 * (so background polling doesn't keep the spinner visible).
 */
export function useRefresh(refresh: () => Promise<unknown>): { refreshing: boolean; onRefresh: () => void } {
  const [refreshing, setRefreshing] = useState(false);
  const onRefresh = () => {
    setRefreshing(true);
    refresh()
      .catch(() => undefined)
      .finally(() => setRefreshing(false));
  };
  return { refreshing, onRefresh };
}
