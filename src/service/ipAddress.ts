// 从环境变量获取基础URL
export const API_URL = import.meta.env.VITE_API_BASE_URL as string;
export const WEBSOCKET_SERVER_URL = import.meta.env.VITE_WS_URL as string;

// 向后兼容
export const SERVER_IP = "127.0.0.1";
export const SERVER_PORT = "8081";
export const API_URL_PROD = API_URL;