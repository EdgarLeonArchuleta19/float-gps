import { useEffect, useMemo, useState } from 'react';

export function usePagination<T>(items: T[], resetKey: string = '', pageSize = 10) {
  const [page, setPage] = useState(1);
  const totalPages = Math.max(1, Math.ceil(items.length / pageSize));
  const current = Math.min(page, totalPages);

  useEffect(() => {
    setPage(1);
  }, [resetKey]);

  const pageItems = useMemo(() => items.slice((current - 1) * pageSize, current * pageSize), [items, current, pageSize]);

  return {
    pageItems,
    pager: { page: current, totalPages, total: items.length, pageSize, onChange: setPage },
  };
}
