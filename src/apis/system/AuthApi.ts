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