import axios from 'axios';
import { API_BASE_URL } from '../config';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
});

apiClient.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  const apiKey = localStorage.getItem('apiKey');

  if (token && !config.headers.Authorization) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  
  if (apiKey && !config.headers['X-API-Key']) {
    config.headers['X-API-Key'] = apiKey;
  }

  return config;
});

export const authService = {
  login: async (credentials: any) => {
    const response = await apiClient.post('/auth/login', credentials);
    if (response.data.token) {
      localStorage.setItem('token', response.data.token);
    }
    return response.data;
  },
  register: async (userData: any) => {
    const response = await apiClient.post('/auth/register', userData);
    return response.data;
  },
  logout: () => {
    localStorage.removeItem('token');
    localStorage.removeItem('apiKey');
  }
};

export const apiKeyService = {
  generate: async (description: string, rateLimitTps: number = 5) => {
    const response = await apiClient.post('/api-keys/generate', { description, rateLimitTps });
    return response.data;
  }
};

export interface ElementQuery {
  page?: number;
  pageSize?: number;
  category?: string;
  block?: string;
  phase?: string;
  group?: number;
  period?: number;
  minPrice?: number;
  maxPrice?: number;
  inStock?: boolean;
  sort?: string;
  order?: 'asc' | 'desc';
}

export const elementService = {
  getElements: async (page = 1, pageSize = 100) => {
    const response = await apiClient.get('/elements', { params: { page, pageSize } });
    return response.data;
  },
  query: async (params: ElementQuery) => {
    const response = await apiClient.get('/elements', { params });
    return response.data;
  },
  getAllElements: async () => {
    const first = await elementService.getElements(1, 100);
    const results = [...(first.results || first)];
    if (first.info?.pages > 1) {
      const second = await elementService.getElements(2, 100);
      results.push(...(second.results || []));
    }
    return results;
  },
  getStatistics: async () => {
    const response = await apiClient.get('/statistics');
    return response.data;
  },
  getCategoryStatistics: async (category: string) => {
    const response = await apiClient.get(`/statistics/category/${encodeURIComponent(category)}`);
    return response.data;
  },
  compare: async (symbols: string[]) => {
    const response = await apiClient.get('/elements/compare', { params: { symbols: symbols.join(',') } });
    return response.data;
  },
  getNeighbors: async (symbol: string) => {
    const response = await apiClient.get(`/elements/${symbol.toLowerCase()}/neighbors`);
    return response.data;
  },
  getRelated: async (symbol: string, limit = 6) => {
    const response = await apiClient.get(`/elements/${symbol.toLowerCase()}/related`, { params: { limit } });
    return response.data;
  }
};

export const orderService = {
  submitOrder: async (elementSymbol: string, quantity: number) => {
    const response = await apiClient.post('/orders', { elementSymbol, quantity });
    return response.data;
  },
  getOrder: async (id: string) => {
    const response = await apiClient.get(`/orders/${id}`);
    return response.data;
  },
  getStats: async () => {
    const response = await apiClient.get('/orders/stats');
    return response.data;
  }
};
