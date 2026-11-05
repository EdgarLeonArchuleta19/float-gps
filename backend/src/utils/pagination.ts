const MAX_LIMIT = 500;

// Clamps page/limit from the query string so a client can't request huge or
// invalid pages (NaN or negative values used to reach Prisma unchecked).
export function pageParams(query: { page?: string; limit?: string }, defaultLimit: number) {
  const page = Math.max(1, parseInt(query.page || '1', 10) || 1);
  const limit = Math.min(MAX_LIMIT, Math.max(1, parseInt(query.limit || String(defaultLimit), 10) || defaultLimit));
  return { page, limit, skip: (page - 1) * limit };
}
