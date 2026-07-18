import { Request } from 'express';

export interface PageParams {
  page: number;
  limit: number;
  skip: number;
  search: string;
}

export function getPageParams(req: Request): PageParams {
  const q = req.query as Record<string, string | undefined>;
  const page = Math.max(1, parseInt(q.page ?? '1', 10) || 1);
  const limit = Math.min(200, Math.max(1, parseInt(q.limit ?? '20', 10) || 20));
  return {
    page,
    limit,
    skip: (page - 1) * limit,
    search: (q.search ?? '').trim(),
  };
}

export function paginated<T>(data: T[], total: number, p: PageParams) {
  return {
    data,
    pagination: {
      page: p.page,
      limit: p.limit,
      total,
      pages: Math.ceil(total / p.limit),
    },
  };
}
