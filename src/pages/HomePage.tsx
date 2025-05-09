import { useCallback, useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import VideoPlayer from "../components/VideoPlayer";
import Dialog from "../components/dialog";
import { authApi, User } from "../apis/system/AuthApi";
import { toast } from 'react-toastify';
import { WEBSOCKET_SERVER_URL } from "../service/ipAddress";
import { roomApi } from "../apis/room/RoomApi"; // 导入房间API

// 图标
import { PlusCircleIcon, SearchIcon, UserIcon, SettingsIcon, AudioIcon, PhoneIcon, DisconnectIcon } from "../components/Icons";
import { useNavigate } from "react-router-dom";


const LOCAL_WEBSOCKET_SERVER_URL = WEBSOCKET_SERVER_URL;

const HomePage: React.FC = () => {
  // 路由
  const navigate = useNavigate();
  // 房间状态
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [roomCodeInput, setRoomCodeInput] = useState<string>("");
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // 创建和加入房间dialog状态
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState<boolean>(false);
  const [joinRoomModalOpen, setJoinRoomModalOpen] = useState<boolean>(false);

  // 设置dialog
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  // 用户状态
  const [currentUser, setCurrentUser] = useState<User>({
    id: "1",
    userName: "当前用户",
    userAvatar: "",
    email: "",
  });
  const [otherUsers, setOtherUsers] = useState<User[]>([]);

  // 添加麦克风状态
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // 获取房间用户列表
  const fetchRoomUsers = useCallback(async (roomId: string) => {
    try {
      console.log("获取房间用户列表...");
      setIsLoading(true);

      const response: User[] = await roomApi.getUserDetailFromRoom(roomId);
      console.log("房间用户列表:", response);

      if (response) {
        // 过滤掉当前用户
        const others: User[] = response.filter(user => user.id !== currentUser.id);
        setOtherUsers(others);
      }
    } catch (error) {
      console.error("获取房间用户失败:", error);
      toast.error('获取房间用户失败', {
        position: "top-right",
        autoClose: 2000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  // 连接到WebSocket服务器
  const connectToWebSocketServer = useCallback((room: string) => {
    const socket = new SockJS(LOCAL_WEBSOCKET_SERVER_URL);

    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        token: localStorage.getItem("token") || "",
        roomCode: room,
      },
      debug: function (str) {
        console.log(str);
      },
      reconnectDelay: 5000,
      heartbeatIncoming: 4000,
      heartbeatOutgoing: 4000,
    });

    client.onConnect = () => {
      console.log("已连接到WebSocket服务器");

      // 连接成功后立即获取房间用户列表
      fetchRoomUsers(room);

      // 订阅房间更新
      client.subscribe(`/topic/room/${room}`, (message) => {
        const payload = JSON.parse(message.body);
        console.log("收到WebSocket消息:", payload);

        if (payload.type === "USER_CHANGE") {
          console.log("检测到用户变化，正在更新用户列表");
          fetchRoomUsers(room);
        }
      });

      setStompClient(client);
    };

    client.onStompError = (frame) => {
      console.error('代理报告错误: ' + frame.headers['message']);
      console.error('额外详情: ' + frame.body);
      toast.error('连接错误，请稍后再试', {
        position: "top-right",
        autoClose: 3000,
      });
    };

    client.activate();

    return client;
  }, [fetchRoomUsers]);

  // 添加切换麦克风状态的函数
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // 创建房间
  const handleCreateRoom = async () => {
    try {
      setIsLoading(true);
      // 调用API创建房间
      const response: string = await roomApi.createRoom();
      console.log(response);
      if (response) {
        const newRoomCode = response;
        setRoomCode(newRoomCode);
        setIsInRoom(true);
        connectToWebSocketServer(newRoomCode);
        toast.success(`房间创建成功! 房间代码: ${newRoomCode}`, {
          position: "top-right",
          autoClose: 3000,
        });
        setCreateRoomModalOpen(false);
      } else {
        toast.error('创建房间失败: 服务器响应格式不正确', {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("创建房间失败", error);
      toast.error('创建房间失败，请稍后再试', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 加入房间
  const handleJoinRoom = async () => {
    try {
      if (!roomCodeInput) {
        toast.warn('请输入房间代码', {
          position: "top-right",
          autoClose: 2000,
        });
        return;
      }

      setIsLoading(true);
      // 调用API加入房间
      const response: string = await roomApi.joinRoom(roomCodeInput);
      console.log(response)
      if (response) {
        setRoomCode(roomCodeInput);
        setIsInRoom(true);
        connectToWebSocketServer(roomCodeInput);
        toast.success('成功加入房间!', {
          position: "top-right",
          autoClose: 2000,
        });
        setJoinRoomModalOpen(false);
      } else {
        toast.error('加入房间失败: ' + '未知错误', {
          position: "top-right",
          autoClose: 3000,
        });
      }
    } catch (error) {
      console.error("加入房间失败", error);
      toast.error('加入房间失败，请检查房间代码是否正确', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 获取用户信息
  const getUserInfo = async () => {
    try {
      const res = await authApi.getUserInfoFromToken();
      if (res && res.id) {
        setCurrentUser({
          id: res.id || "1",
          userName: res.userName || "当前用户",
          userAvatar: res.userAvatar || "",
          email: res.email || "",
        });
        console.log("自动获取用户信息成功");
      } else {
        toast.error('获取用户信息失败', {
          position: "top-left",
          autoClose: 2000,
          toastId: "login-fail",
        });
      }
    } catch (error) {
      console.log("获取用户信息失败", error);
      toast.error('获取用户信息失败, 请登录！', {
        position: "top-left",
        autoClose: 2000,
        toastId: "login-fail",
      });
      navigate('/login');
    }
  };

  // 组件加载时获取用户信息
  useEffect(() => {
    getUserInfo();
  }, []);

  // 组件卸载时清理WebSocket连接
  useEffect(() => {
    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [stompClient]);

  return (
    <div className="flex flex-row h-screen bg-gray-50 overflow-hidden">
      {/* 侧边栏 */}
      <div className="min-w-[80px] bg-gradient-to-b from-purple-400 to-purple-700 py-6 flex flex-col items-center shadow-lg z-10">
        <div className="text-2xl font-bold mb-9 text-white w-14 h-14 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-2xl transition-all duration-300 ease-out shadow-md hover:transform hover:-translate-y-1 hover:scale-105 hover:shadow-lg">
          WT
        </div>

        {/* 创建房间按钮 */}
        {!isInRoom && (
          <div
            className="w-14 h-14 mb-6 bg-white/15 rounded-2xl flex justify-center items-center text-white cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-md"
            onClick={() => setCreateRoomModalOpen(true)}
          >
            <PlusCircleIcon style={{ fontSize: 24 }} />
          </div>
        )}

        {/* 加入房间按钮 */}
        {!isInRoom && (
          <div
            className="w-14 h-14 mb-6 bg-white/15 rounded-2xl flex justify-center items-center text-white cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-md"
            onClick={() => setJoinRoomModalOpen(true)}
          >
            <SearchIcon style={{ fontSize: 24 }} />
          </div>
        )}
      </div>

      {/* 频道/用户列表 */}
      <div className="min-w-[280px] bg-gradient-to-b from-gray-100 to-purple-100 flex flex-col shadow-md z-5">
        <div className="px-4 pt-5 flex justify-between items-center text-gray-700">
          <span className="text-sm font-medium">派对成员</span>
          <span className="text-sm font-medium">
            {isLoading ? '加载中...' : `${otherUsers.length} 在线`}
          </span>
        </div>

        <div className="overflow-y-auto p-5 flex-1">
          {isLoading ? (
            <div className="flex justify-center items-center h-20">
              <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-purple-700"></div>
            </div>
          ) : otherUsers.length > 0 ? (
            otherUsers.map((user, index) => (
              <div key={user.id || index} className="p-4 rounded-xl mb-3 bg-white/70 transition-all duration-300 hover:bg-white hover:transform hover:translate-x-1 border border-purple-200/30 shadow-sm">
                <div className="flex items-center">
                  <div className="w-[38px] h-[38px] rounded-full bg-purple-200 flex items-center justify-center shadow-sm">
                    <UserIcon className="text-purple-700" />
                  </div>
                  <div className="ml-3.5 flex-grow text-gray-700 font-semibold text-sm overflow-hidden whitespace-nowrap text-ellipsis">
                    {user.userName}
                  </div>
                  <div className="ml-auto flex items-center">
                    <AudioIcon className="ml-3 text-gray-500 hover:text-purple-700 transition-all" />
                    <PhoneIcon className="ml-3 text-gray-500 hover:text-purple-700 transition-all" />
                  </div>
                </div>
              </div>
            ))
          ) : isInRoom ? (
            <div className="text-center py-10 text-gray-500">
              暂无其他用户在房间内
            </div>
          ) : (
            <div className="text-center py-10 text-gray-500">
              请创建或加入房间
            </div>
          )}
        </div>

        {/* 当前用户 */}
        <div className="bg-white/80 p-5 border-t border-purple-200/50">
          <div className="flex items-center">
            <div className="w-[38px] h-[38px] rounded-full bg-purple-200 flex items-center justify-center border-2 border-purple-300 shadow-md">
              <UserIcon className="text-purple-700" />
            </div>
            <div className="ml-3.5 flex-grow text-gray-700 font-bold text-sm overflow-hidden whitespace-nowrap text-ellipsis">
              {currentUser.userName}
            </div>
            <div className="ml-auto flex items-center">
              <div
                onClick={toggleMute}
                className="ml-4 text-gray-500 cursor-pointer hover:text-purple-700 transition-all p-1.5 rounded-full hover:bg-purple-100 hover:scale-110"
              >
                <AudioIcon isMuted={isMuted} />
              </div>
              <div className="ml-4 text-gray-500 cursor-pointer hover:text-purple-700 transition-all p-1.5 rounded-full hover:bg-purple-100 hover:scale-110" onClick={openSettings}>
                <SettingsIcon />
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-grow flex flex-col bg-gray-50 relative">
        {/* 头部 */}
        <div className="flex justify-center p-4 m-5 mt-5 mb-0 rounded-2xl bg-white shadow-md z-1">
          {!isInRoom ? (
            <div className="text-lg font-bold text-gray-800">尚未加入房间</div>
          ) : (
            <div className="text-lg font-bold text-gray-800">观影派对: {roomCode}</div>
          )}
        </div>

        {/* 视频内容 */}
        <div className="flex-grow m-5 rounded-3xl bg-white shadow-md flex justify-center items-center overflow-hidden relative">
          {!stompClient ? (
            <div className="flex flex-col items-center justify-center gap-6 h-full w-full bg-gradient-to-br from-purple-50 to-purple-100 p-15">
              <div className="w-25 h-25 rounded-full bg-purple-100 flex items-center justify-center shadow-lg">
                <DisconnectIcon style={{ fontSize: 48, color: "#7c4dff", opacity: 0.8 }} />
              </div>
              <div className="max-w-xs text-center text-gray-700 leading-relaxed font-medium">
                WebSocket未连接。请创建或加入房间以开始您的观影派对。
              </div>
              <div className="flex gap-4 mt-6">
                {!isInRoom && (
                  <>
                    <button
                      onClick={() => setCreateRoomModalOpen(true)}
                      className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-400 to-purple-500 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                      disabled={isLoading}
                    >
                      {isLoading ? (
                        <span className="animate-pulse">处理中...</span>
                      ) : (
                        <>
                          <PlusCircleIcon />
                          <span>创建房间</span>
                        </>
                      )}
                    </button>
                    <button
                      onClick={() => setJoinRoomModalOpen(true)}
                      className="px-6 py-3 rounded-xl font-bold text-gray-800 bg-white border border-gray-100 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                      disabled={isLoading}
                    >
                      <SearchIcon />
                      <span>加入房间</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          ) : (
            <VideoPlayer stompClient={stompClient} roomCode={roomCode} />
          )}
        </div>
      </div>

      {/* 创建房间dialog */}
      <Dialog
        isOpen={createRoomModalOpen}
        onClose={() => !isLoading && setCreateRoomModalOpen(false)}
        title="创建新房间"
        size="sm"
      >
        <div className="mb-5 text-center text-gray-600">
          创建一个新的观影派对并邀请您的朋友!
        </div>
        <button
          onClick={handleCreateRoom}
          className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-purple-400 to-purple-500 text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg flex items-center justify-center gap-2"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center">
              <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              处理中...
            </div>
          ) : (
            <>
              <PlusCircleIcon />
              创建房间
            </>
          )}
        </button>
      </Dialog>

      {/* 加入房间dialog */}
      <Dialog
        isOpen={joinRoomModalOpen}
        onClose={() => !isLoading && setJoinRoomModalOpen(false)}
        title="加入观影派对"
        size="md"
      >
        <div className="mb-5 text-center text-gray-600 font-medium">
          输入房间代码加入朋友的观影派对
        </div>
        <div className="flex gap-3">
          <input
            value={roomCodeInput}
            onChange={(e) => setRoomCodeInput(e.target.value)}
            placeholder="输入房间代码"
            className="flex-1 px-4 py-3 text-base rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isLoading}
          />
          <button
            onClick={handleJoinRoom}
            className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-400 to-purple-500 text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center w-16 justify-center">
                <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
              </div>
            ) : (
              '加入'
            )}
          </button>
        </div>
      </Dialog>

      {/* 设置对话框 */}
      <Dialog
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        title="个人资料设置"
      >
        <div className="space-y-4">
          <div className="flex flex-col items-center gap-4 mb-6">
            <div className="w-20 h-20 rounded-full bg-purple-200 flex items-center justify-center border-2 border-purple-300 shadow-md">
              <UserIcon className="text-purple-700" style={{ fontSize: 30 }} />
            </div>
            <p className="text-lg font-bold">{currentUser.userName}</p>
          </div>

          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
              <input
                type="text"
                className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
                value={currentUser.userName}
                disabled
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">麦克风</label>
              <div
                className="flex items-center space-x-3 p-3 border border-gray-200 rounded-md cursor-pointer hover:bg-gray-50"
                onClick={toggleMute}
              >
                <AudioIcon isMuted={isMuted} className={isMuted ? "text-red-500" : "text-green-500"} />
                <span>{isMuted ? "麦克风已关闭" : "麦克风已开启"}</span>
              </div>
            </div>
          </div>

          <div className="flex justify-end pt-4">
            <button
              onClick={closeSettings}
              className="px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-500 text-white rounded-md shadow hover:shadow-md transition-all"
            >
              确定
            </button>
          </div>
        </div>
      </Dialog>
    </div>
  );
};

export default HomePage;