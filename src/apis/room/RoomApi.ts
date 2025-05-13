import apiClient from "../../service/apiClient";
import { User } from "../system/AuthApi";

export interface MovieProps {
  id: string;
  title: string;
  videoUrl: string;
  coverUrl?: string; // 封面图片
  description?: string;
  mimeType?: string; // 视频的MIME类型
  uploader?: {
    id: string;
    userName: string;
  };
  uploadTime?: string; // createTime
  fileSize?: number; // 可选：文件大小，便于前端显示
};

export interface JoinRoomResponse {
  message: string;
  currentMovie: MovieProps | null; // 当前播放的电影
  isCreator: boolean; // 加入者是否是房主
}

export const roomApi = {
  // 创建房间
  createRoom: () => {
    return apiClient.post<string>('/room/create');
  },

  // 加入房间
  joinRoom: (roomCode: string) => {
    return apiClient.post<JoinRoomResponse>('/room/join', { roomCode });
  },

  // 获取房间内的所有用户
  getUserDetailFromRoom: (roomCode: string) => {
    return apiClient.get<User[]>('/room/get-room-user', { roomCode });
  },

  // 获取房间内的电影列表
  getMovieList: () => {
    return apiClient.get<MovieProps[]>('/room/get-movie-list');
  },

  // 上传电影
  uploadMovie: (formData: FormData, onProgress?: (progress: number) => void) => {
    return apiClient.upload<MovieProps>('/room/movie-upload', formData, onProgress);
  }
};
