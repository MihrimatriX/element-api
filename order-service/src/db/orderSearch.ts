import type { OrderRow } from './orders.js';
import { pool } from './pool.js';

export interface OrderSearchParams {
  customerId: string;
  status?: string;
  elementSymbol?: string;
  q?: string;
  page?: number;
  pageSize?: number;
}

export async function searchOrdersByCustomer(params: OrderSearchParams): Promise<{ total: number; rows: OrderRow[] }> {
  const page = Math.max(1, params.page ?? 1);
  const pageSize = Math.min(100, Math.max(1, params.pageSize ?? 20));
  const conditions = ['customer_id = $1'];
  const values: unknown[] = [params.customerId];
  let idx = 2;

  if (params.status) {
    conditions.push(`status = $${idx++}`);
    values.push(params.status);
  }
  if (params.elementSymbol) {
    conditions.push(`element_symbol = $${idx++}`);
    values.push(params.elementSymbol.toUpperCase());
  }
  if (params.q?.trim()) {
    conditions.push(`(id::text ILIKE $${idx} OR element_symbol ILIKE $${idx})`);
    values.push(`%${params.q.trim()}%`);
    idx++;
  }

  const where = conditions.join(' AND ');
  const countRes = await pool.query(`SELECT COUNT(*)::int AS c FROM orders WHERE ${where}`, values);
  const total = Number(countRes.rows[0]?.c ?? 0);

  values.push(pageSize, (page - 1) * pageSize);
  const res = await pool.query(
    `SELECT * FROM orders WHERE ${where} ORDER BY created_at DESC LIMIT $${idx++} OFFSET $${idx}`,
    values
  );

  return { total, rows: res.rows };
}
