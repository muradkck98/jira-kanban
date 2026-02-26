import axios from 'axios';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

// ─── camelCase → snake_case utility (response dönüşümü için) ──────────────

function camelToSnake(str: string): string {
  return str.replace(/[A-Z]/g, (letter) => `_${letter.toLowerCase()}`);
}

function deepTransformKeys(obj: unknown, transformer: (key: string) => string): unknown {
  if (obj === null || obj === undefined) return obj;
  if (Array.isArray(obj)) {
    return obj.map((item) => deepTransformKeys(item, transformer));
  }
  if (typeof obj === 'object' && !(obj instanceof Date)) {
    const result: Record<string, unknown> = {};
    for (const [key, value] of Object.entries(obj as Record<string, unknown>)) {
      result[transformer(key)] = deepTransformKeys(value, transformer);
    }
    return result;
  }
  return obj;
}

function toSnakeCase(obj: unknown): unknown {
  return deepTransformKeys(obj, camelToSnake);
}

// ─── Axios Client ──────────────────────────────────────────────────────────

const client = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Request interceptor — sadece JWT token ekle
// NOT: Request body olduğu gibi gönderiliyor.
// Frontend API'leri zaten backend camelCase formatını kullanıyor
// (fullName, columnId, projectId, issueTypeId vb.)
client.interceptors.request.use((config) => {
  const token = localStorage.getItem('token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

// Response interceptor — Backend camelCase → Frontend snake_case dönüşüm
client.interceptors.response.use(
  (response) => {
    if (response.data && typeof response.data === 'object') {
      response.data = toSnakeCase(response.data);
    }
    return response;
  },
  (error) => {
    if (error.response?.status === 401) {
      console.warn('401 Unauthorized - oturum süresi dolmuş olabilir');
    }
    return Promise.reject(error);
  }
);

export default client;
