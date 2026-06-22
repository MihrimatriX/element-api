const rawBase = import.meta.env.VITE_API_BASE_URL ?? 'http://localhost:5000/api/v1';

export const API_BASE_URL = rawBase.replace(/\/$/, '');
export const API_ORIGIN = API_BASE_URL.replace(/\/api\/v1$/i, '');
export const HUB_URL = `${API_ORIGIN}/hub/notifications`;
