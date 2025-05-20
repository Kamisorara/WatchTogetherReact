import { AxiosRequestConfig, AxiosResponse } from 'axios';
import axios, { AxiosError, AxiosInstance, InternalAxiosRequestConfig } from "axios";
import { API_URL } from './ipAddress';
import { toast } from 'react-toastify';

const API_BASE_URL: string = API_URL;

interface ErrorResponseData {
  status?: number;
  success?: boolean;
  message?: string;
  code?: string;
}

interface ExtendedRequestConfig extends AxiosRequestConfig {
  _retry?: boolean;
  headers: Record<string, string>;
}


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

// 创建一个记录刷新token状态的变量
let isRefreshing = false;
// 存储等待token刷新的请求
let refreshSubscribers: ((token: string) => void)[] = [];

// 执行被挂起的请求
function onRefreshed(token: string): void {
  refreshSubscribers.forEach(callback => callback(token));
  refreshSubscribers = [];
}

// 添加请求到队列
function addSubscriber(callback: (token: string) => void): void {
  refreshSubscribers.push(callback);
}

// 刷新token的方法
async function refreshToken(): Promise<string | null> {
  try {
    console.log("正在刷新Token...");
    // 使用独立的axios实例避免拦截器循环
    const response = await axios.post<ApiResponse<{ token: string }>>(
      `${API_BASE_URL}/api/sys/refresh-token`,
      {},
      {
        withCredentials: true // 确保发送cookies
      }
    );

    console.log("Token刷新成功:", response.data);
    // 提取新的access token
    const newToken = response.data.message.token;
    localStorage.setItem("token", newToken);
    return newToken;
  } catch (error) {
    console.error("Token刷新失败:", error);
    // 如果刷新token失败，需要重新登录
    localStorage.removeItem("token");
    window.location.href = '/login';
    return null;
  }
};

// axios instance
const axiosInstance: AxiosInstance = axios.create({
  baseURL: API_BASE_URL,
  timeout: 10000, // 10s 请求超时时间
  headers: {
    "Content-Type": "application/json",
  },
});

// request interceptor
axiosInstance.interceptors.request.use(
  (config: InternalAxiosRequestConfig) => {
    // 不需要token参与的api
    const publicRoutes = ['/api/sys/login', '/api/sys/register', '/api/sys/refresh-token'];
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
  async (err: AxiosError) => {
    const originalRequest = err.config as ExtendedRequestConfig;
    // HTTP 状态码
    const httpStatus = err.response?.status || 500;
    let errorMessage = '未知错误';

    console.log("API错误状态码:", httpStatus);
    console.log("错误响应数据:", err.response?.data);

    // 从响应体中提取应用状态码
    const responseData = err.response?.data as ErrorResponseData;
    const appStatus = responseData?.status;

    // 修改检测token过期的方式 - 同时检查HTTP状态码和响应体中的状态码
    const isTokenExpired =
      // 检查响应体中的自定义状态码
      appStatus === 4011 ||
      // 或者检查标准HTTP 401状态码加上额外条件
      (httpStatus === 401 &&
        typeof responseData === 'object' &&
        responseData &&
        (responseData.code === 'token_expired' ||
          (typeof responseData.message === 'string' &&
            responseData.message.includes('expired'))));

    // 增加调试日志
    console.log("是否检测到token过期:", isTokenExpired);
    console.log("应用状态码:", appStatus);

    if (isTokenExpired && !originalRequest._retry) {
      console.log("检测到token过期，尝试刷新...");
      // token过期，尝试刷新
      if (!isRefreshing) {
        isRefreshing = true;

        try {
          const newToken = await refreshToken();

          if (newToken) {
            // 更新token后通知所有等待的请求
            onRefreshed(newToken);
            // 重试当前请求
            originalRequest._retry = true;
            originalRequest.headers.Authorization = newToken;
            return axiosInstance(originalRequest);
          }
        } finally {
          isRefreshing = false;
        }
      } else {
        // 如果正在刷新，将请求添加到队列
        return new Promise(resolve => {
          addSubscriber(token => {
            originalRequest.headers.Authorization = token;
            resolve(axiosInstance(originalRequest));
          });
        });
      }
    } else if (err.response?.status === 4012 || err.response?.status === 4013) {
      // token无效或登录状态失效，直接重新登录
      errorMessage = '您的登录状态已失效，请重新登录';
      localStorage.removeItem('token');
      window.location.href = '/login';
    } else {
      // 处理其他错误码
      switch (httpStatus) {
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
        case 429:
          errorMessage = '请求过于频繁，请稍后再试';
          toast.warning('操作太频繁，请稍等片刻再试', {
            position: "top-center",
            autoClose: 5000,
            hideProgressBar: false,
            closeOnClick: true,
            pauseOnHover: true,
            draggable: true,
          });
          break;
        case 500:
          errorMessage = '服务器内部错误';
          break;
        default:
          errorMessage = `请求失败(${httpStatus})`;
      }
    }

    console.error(`[API 错误] ${errorMessage}`, err);

    return Promise.reject({
      success: false,
      status: httpStatus,
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
      timeout: 1800000, // 默认30分钟
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
  },


  // 备用上传方案
  // upload: <T>(
  //   url: string,
  //   formData: FormData,
  //   onProgress?: (percentage: number) => void,
  //   config?: AxiosRequestConfig
  // ) => {
  //   // 尝试获取文件大小来动态设置超时时间
  //   let timeout = 1800000; // 默认30分钟
  //   const fileEntry = formData.get('file');
  //   if (fileEntry instanceof File) {
  //     // 根据文件大小动态计算超时时间
  //     // 假设每MB需要3秒，最少10分钟，最多2小时
  //     const fileSizeMB = fileEntry.size / (1024 * 1024);
  //     const calculatedTimeout = Math.max(600000, Math.min(7200000, fileSizeMB * 3000));
  //     timeout = calculatedTimeout;
  //   }

  //   const uploadConfig: AxiosRequestConfig = {
  //     ...config,
  //     timeout: timeout,
  //     headers: {
  //       'Content-Type': 'multipart/form-data',
  //       ...(config?.headers || {})
  //     },
  //     onUploadProgress: (progressEvent) => {
  //       if (progressEvent.total && onProgress) {
  //         const percentCompleted = Math.round((progressEvent.loaded * 100) / progressEvent.total);
  //         onProgress(percentCompleted);
  //       }
  //     }
  //   };

  //   return axiosInstance.post<ApiResponse<T>, T>(url, formData, uploadConfig);
  // }
};

export default apiClient;
