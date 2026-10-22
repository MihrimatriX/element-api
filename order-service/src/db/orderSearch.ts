import type { OrderRow } from "./orders.js";
import { pool } from "./pool.js";

/** Page size used when the caller does not ask for one. */
export const DEFAULT_PAGE_SIZE = 20;
/** Largest page size a caller may request. */
export const MAX_PAGE_SIZE = 100;

/** Filters for one customer's order search; every filter is optional except the customer. */
export interface OrderSearchParams {
  customerId: string;
  status?: string;
  elementSymbol?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

/**
 * Filters and pages one customer's orders (newest first) and also returns the total match count.
 * Values are always bound as SQL parameters, never concatenated into the query text.
 */
export async function searchOrdersByCustomer(
  params: OrderSearchParams,
): Promise<{ total: number; rows: OrderRow[] }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(
    MAX_PAGE_SIZE,
    Math.max(1, params.pageSize ?? DEFAULT_PAGE_SIZE),
  );
  const values: unknown[] = [];
  const addValue = (value: unknown): string => {
    values.push(value);
    return `$${values.length}`;
  };

  const conditions = [`customer_id = ${addValue(params.customerId)}`];
  if (params.status) {
    conditions.push(`status = ${addValue(params.status)}`);
  }
  if (params.elementSymbol) {
    const symbol = addValue(params.elementSymbol.toUpperCase());
    conditions.push(`element_symbol = ${symbol}`);
  }
  const searchText = params.q?.trim();
  if (searchText) {
    const pattern = addValue(`%${searchText}%`);
    conditions.push(`(id::text ILIKE ${pattern} OR element_symbol ILIKE ${pattern})`);
  }
  const where = conditions.join(" AND ");

  const countResult = await pool.query(
    `SELECT COUNT(*)::int AS c FROM orders WHERE ${where}`,
    values,
  );
  const total = Number(countResult.rows[0]?.c ?? 0);

  const limit = addValue(pageSize);
  const offset = addValue((page - 1) * pageSize);
  const pageResult = await pool.query(
    `SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT ${limit} OFFSET ${offset}`,
    values,
  );

  return { total, rows: pageResult.rows };
}
