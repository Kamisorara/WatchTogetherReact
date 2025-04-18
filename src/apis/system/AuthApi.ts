import apiClient from "../../service/apIclient";

export interface User {
  id: string;
  username: string;
  email: string;
  userPhone?: string;
  userSex?: string;
  avatar?: string;
}

export interface LoginResponse {
  token: string;
  user: User;
}

export const authApi = {
  // 登录
  login: (username: string, password: string) => {
    return apiClient.post<LoginResponse>('/api/sys/login', { username, password });
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
}