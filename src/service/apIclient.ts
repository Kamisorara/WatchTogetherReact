import { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { API_URL } from './ipAddress';

const API_BASE_URL: string = API_URL;

// API response 结构
export interface ApiResponse<T = unknown> {
  status: number;
  success: boolean;
  message: T;
}

// API err 结构
export interface ApiError {
  status: number;
  success: boolean;
  message: unknown;
}

// axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  //TODO 测试文件上传，后续调整超时时间为10000
  timeout: 200000,
  headers: {
    "Content-Type": "application/json",
  },
});

// request interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 不需要token参与的api
    const publicRoutes = ['/api/sys/login', '/api/sys/register'];
    const isPublicRoute = publicRoutes.some(route => config.url?.includes(route));

    if (!isPublicRoute) {
      // 获取token
      const token = localStorage.getItem("token");
      if (token) {
        config.headers.Authorization = token;
      }
    }
    return config;
  },
  (err: AxiosError) => {
    return Promise.reject(err);
  }
);

// 使用类型转换处理响应数据
function isApiResponse(data: unknown): data is ApiResponse {
  return (
    typeof data === 'object' &&
    data !== null &&
    'status' in data &&
    'success' in data &&
    'message' in data
  );
}

// response interceptor
axiosInstance.interceptors.response.use(
  <T>(response: AxiosResponse): T | Promise<T> => {
    const data: ApiResponse = response.data;

    if (isApiResponse(data) && data.success && data.status === 200) {
      // 返回实际的数据
      return data.message as T;
    }

    // 处理失败 - 创建可预测类型的错误对象
    const apiError: ApiError = {
      status: isApiResponse(data) ? data.status : response.status,
      message: isApiResponse(data) ? data.message : "操作失败",
      success: false
    };
    return Promise.reject(apiError);
  },
  (err: AxiosError) => {
    // 处理错误码
    const status = err.response?.status || 500;
    let errorMessage = '未知错误';

    switch (status) {
      case 400:
        errorMessage = '请求参数错误';
        break;
      case 401:
        errorMessage = '请重新登录';
        localStorage.removeItem('token');
        window.location.href = '/login';
        break;
      case 403:
        errorMessage = '拒绝访问';
        break;
      case 404:
        errorMessage = '请求的资源不存在';
        break;
      case 500:
        errorMessage = '服务器内部错误';
        break;
      default:
        errorMessage = `请求失败(${status})`;
    }
    console.error(`[API 错误] ${errorMessage}`, err);

    return Promise.reject({
      success: false,
      status,
      message: errorMessage,
    });
  }
);

// 定义 API Client
export const apiClient = {
  get: <T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig) => {
    return axiosInstance.get<ApiResponse<T>, T>(url, { ...config, params });
  },

  post: <T>(url: string, data?: Record<string, unknown>, config?: AxiosRequestConfig) => {
    return axiosInstance.post<ApiResponse<T>, T>(url, data, config);
  },

  put: <T>(url: string, data?: Record<string, unknown>, config?: AxiosRequestConfig) => {
    return axiosInstance.put<ApiResponse<T>, T>(url, data, config);
  },

  delete: <T>(url: string, params?: Record<string, unknown>, config?: AxiosRequestConfig) => {
    return axiosInstance.delete<ApiResponse<T>, T>(url, { ...config, params });
  },

  // 原始请求方法，直接返回 ApiResponse，不经过自动解包
  request: <T>(config: AxiosRequestConfig) => {
    return axiosInstance.request<ApiResponse<T>, ApiResponse<T>>(config);
  },

  // 文件上传方法，支持进度监控
  //TODO 还需实现分段上传
  upload: <T>(
    url: string,
    formData: FormData,
    onProgress?: (percentage: number) => void,
    config?: AxiosRequestConfig
  ) => {
    const uploadConfig: AxiosRequestConfig = {
      ...config,
      headers: {
        'Content-Type': 'multipart/form-data',
        ...(config?.headers || {})
      },
      //TODO 因为onUploadProgress不能在nodejs环境中使用，之后创建Electorn版本需要使用XMLHttpRequest
      onUploadProgress: (progressEvent) => {
        if (progressEvent.total && onProgress) {
          const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
          onProgress(percentCompleted);
        }
      }
    };

    return axiosInstance.post<ApiResponse<T>, T>(url, formData, uploadConfig);
  }
};

export default apiClient;
