import { Router } from 'express';
import { v4 as uuidv4 } from 'uuid';
import * as orders from '../db/orders.js';
import { searchOrdersByCustomer } from '../db/orderSearch.js';
import { resolvePricePerGram } from '../services/priceResolver.js';

export const ordersRouter = Router();

ordersRouter.post('/', async (req, res) => {
  const userIdHeader = req.header('X-User-Id') ?? '';
  const customerId = userIdHeader || uuidv4();
  const { elementSymbol, quantity } = req.body as {
    elementSymbol?: string;
    quantity?: number;
  };

  if (!elementSymbol || !quantity || quantity <= 0) {
    return res.status(400).json({ error: 'elementSymbol and quantity are required.' });
  }

  const pricePerGram = await resolvePricePerGram(elementSymbol);
  if (!pricePerGram) {
    return res.status(400).json({ error: `Could not determine market price for '${elementSymbol}'.` });
  }

  const totalPrice = Math.round(quantity * pricePerGram * 10000) / 10000;
  const orderId = uuidv4();

  await orders.createOrderWithSaga({
    id: orderId,
    customerId,
    elementSymbol: elementSymbol.toUpperCase(),
    quantity,
    totalPrice,
  });

  return res.status(202).json({
    id: orderId,
    customerId,
    elementSymbol: elementSymbol.toUpperCase(),
    quantity,
    totalPrice,
    status: 'Submitted',
    createdAt: new Date().toISOString(),
  });
});

ordersRouter.get('/search', async (req, res) => {
  const customerId = req.header('X-User-Id');
  if (!customerId) return res.status(400).json({ error: 'X-User-Id header required' });

  const { status, elementSymbol, q, page, pageSize } = req.query;
  const result = await searchOrdersByCustomer({
    customerId,
    status: typeof status === 'string' ? status : undefined,
    elementSymbol: typeof elementSymbol === 'string' ? elementSymbol : undefined,
    q: typeof q === 'string' ? q : undefined,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 20,
  });

  return res.json({
    count: result.total,
    page: page ? Number(page) : 1,
    pageSize: pageSize ? Number(pageSize) : 20,
    results: result.rows.map(mapOrder),
  });
});

ordersRouter.get('/stats', async (req, res) => {
  const customerId = req.header('X-User-Id');
  if (!customerId) return res.status(400).json({ error: 'X-User-Id header required' });
  const stats = await orders.getOrderStatsByCustomer(customerId);
  return res.json(stats);
});

ordersRouter.get('/:id', async (req, res) => {
  const order = await orders.getOrderById(req.params.id);
  if (!order) return res.status(404).json({ error: 'Order not found' });
  return res.json(mapOrder(order));
});

ordersRouter.get('/', async (req, res) => {
  const customerId = req.header('X-User-Id');
  if (!customerId) return res.status(400).json({ error: 'X-User-Id header required' });
  const list = await orders.getOrdersByCustomer(customerId);
  return res.json(list.map(mapOrder));
});

function mapOrder(row: orders.OrderRow) {
  return {
    id: row.id,
    customerId: row.customer_id,
    elementSymbol: row.element_symbol,
    quantity: Number(row.quantity),
    totalPrice: Number(row.total_price),
    status: row.status,
    createdAt: row.created_at,
  };
}
