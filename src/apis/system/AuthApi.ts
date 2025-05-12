import apiClient from "../../service/apiClient";

export interface User {
  id: string;
  userName: string;
  email: string;
  userPhone?: string;
  userSex?: string;
  userAvatar?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}


interface UploadAvatarResponse {
  url: string;
  fileName: string;
}


export const authApi = {
  // 登录
  login: (userName: string, userPassword: string) => {
    return apiClient.post<LoginResponse>('/api/sys/login', { userName, userPassword });
  },

  // 注册
  register: (username: string, password: string, passwordRepeat: string, email: string) => {
    return apiClient.post<boolean>('/api/sys/register', {
      username,
      password,
      passwordRepeat,
      email
    });
  },

  // 根据Token获取用户信息
  getUserInfoFromToken: () => {
    return apiClient.get<User>('/api/sys/user-info');
  },

  // 更新用户基本信息
  updateUserDetailInfo: (userPhone: string, userSex: string) => {
    return apiClient.post<User>('/api/sys/update-userDetailInfo', {
      userPhone,
      userSex
    });
  },

  // 上传头像
  uploadAvatar: (file: File, onProgress?: (percentage: number) => void) => {
    const formData = new FormData();
    formData.append('file', file);
    // 添加过期时间参数（7天，以秒为单位）
    formData.append('expiry', '604800');
    
    return apiClient.upload<UploadAvatarResponse>(
      '/api/sys/minio-upload',
      formData,
      onProgress
    );
  },

  // GitHub OAuth相关
  getGithubOAuthUrl: () => {
    return apiClient.get<{ url: string }>('/api/oauth2/github/authorize');
  },

  // GitHub OAuth完成注册
  completeOAuthRegistration: (email: string, oauthId: string, username?: string) => {
    return apiClient.post<LoginResponse>('/api/oauth2/complete-registration', {
      email,
      oauthId,
      username
    });
  },
}