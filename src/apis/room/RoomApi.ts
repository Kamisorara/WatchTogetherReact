import apiClient from "../../service/apIclient";
import { User } from "../system/AuthApi";

// 房间内用户详情
export interface RoomUserDetails {
  roomCode: string;
  users: User[];
}

export const roomApi = {
  // 创建房间
  createRoom: () => {
    return apiClient.post<unknown>('/room/create');
  },

  // 加入房间
  joinRoom: (roomCode: string) => {
    return apiClient.post<unknown>('/room/join', { roomCode });
  },

  // 获取房间内的所有用户
  getUserDetailFromRoom: (roomCode: string) => {
    return apiClient.get<RoomUserDetails>('/room/get-room-user', { roomCode });
  }
}
