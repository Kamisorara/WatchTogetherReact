import { useCallback, useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import VideoPlayer from "../components/VideoPlayer";

// 图标
import { PlusCircleIcon, SearchIcon, UserIcon, SettingsIcon, AudioIcon, PhoneIcon, DisconnectIcon } from "../components/Icons";

interface User {
  id: string;
  userName: string;
  userAvatar: string;
}

const LOCAL_WEBSOCKET_SERVER_URL = "http://localhost:8081/ws"; // 使用你的WebSocket服务器URL更新此处

const HomePage: React.FC = () => {
  // 房间状态
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [roomCodeInput, setRoomCodeInput] = useState<string>("");
  const [stompClient, setStompClient] = useState<Client | null>(null);

  // 模态框状态
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState<boolean>(false);
  const [joinRoomModalOpen, setJoinRoomModalOpen] = useState<boolean>(false);

  // 用户状态
  const [currentUser, setCurrentUser] = useState<User>({
    id: "1",
    userName: "当前用户",
    userAvatar: ""
  });
  const [otherUsers, setOtherUsers] = useState<User[]>([]);

  // 连接到WebSocket服务器
  const connectToWebSocketServer = useCallback((room: string) => {
    const socket = new SockJS(LOCAL_WEBSOCKET_SERVER_URL);

    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        token: localStorage.getItem("token"),
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

      // 订阅房间更新
      client.subscribe(`/topic/room/${room}`, (message) => {
        const payload = JSON.parse(message.body);
        console.log(payload);
        if (payload.type === "USER_CHANGE") {
          console.log("检测到用户变化");
          // 这里你需要调用API获取更新后的用户列表
          // 现在我们使用模拟数据
          setOtherUsers([
            { id: "2", userName: "其他用户1", userAvatar: "" },
            { id: "3", userName: "其他用户2", userAvatar: "" }
          ]);
        }
      });

      setStompClient(client);
    };

    client.onStompError = (frame) => {
      console.error('代理报告错误: ' + frame.headers['message']);
      console.error('额外详情: ' + frame.body);
    };

    client.activate();

    return client;
  }, []);

  // 组件卸载时清理WebSocket连接
  useEffect(() => {
    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [stompClient]);

  // 创建房间
  const handleCreateRoom = async () => {
    // 在实际实现中，你需要调用API
    try {
      // 模拟API调用
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(newRoomCode);
      setIsInRoom(true);
      connectToWebSocketServer(newRoomCode);
      showNotification("房间创建成功", `房间代码: ${newRoomCode}`, "success");
      setCreateRoomModalOpen(false);
    } catch (error) {
      showNotification("创建房间失败", "", "error");
    }
  };

  // 加入房间
  const handleJoinRoom = async () => {
    try {
      // 模拟API调用
      if (roomCodeInput) {
        setRoomCode(roomCodeInput);
        setIsInRoom(true);
        connectToWebSocketServer(roomCodeInput);
        showNotification("成功加入房间", "", "success");
        setJoinRoomModalOpen(false);
      } else {
        showNotification("请输入房间代码", "", "error");
      }
    } catch (error) {
      showNotification("加入房间失败", "请检查房间代码并重试", "error");
    }
  };

  // 简单通知函数（在生产环境中你应该使用适当的通知库）
  const showNotification = (message: string, description: string, type: 'success' | 'error') => {
    console.log(`${type.toUpperCase()}: ${message} - ${description}`);
    alert(`${message}\n${description}`);
  };

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
          <span className="text-sm font-medium">{otherUsers.length} 在线</span>
        </div>

        <div className="overflow-y-auto p-5 flex-1">
          {otherUsers.map((user, index) => (
            <div key={index} className="p-4 rounded-xl mb-3 bg-white/70 transition-all duration-300 hover:bg-white hover:transform hover:translate-x-1 border border-purple-200/30 shadow-sm">
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
          ))}
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
              <AudioIcon className="ml-4 text-gray-500 cursor-pointer hover:text-purple-700 transition-all p-1.5 rounded-full hover:bg-purple-100 hover:scale-110" />
              <SettingsIcon className="ml-4 text-gray-500 cursor-pointer hover:text-purple-700 transition-all p-1.5 rounded-full hover:bg-purple-100 hover:scale-110" />
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
                      className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-purple-900 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                    >
                      <PlusCircleIcon />
                      <span>创建房间</span>
                    </button>
                    <button
                      onClick={() => setJoinRoomModalOpen(true)}
                      className="px-6 py-3 rounded-xl font-bold text-gray-800 bg-white border border-gray-100 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
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

      {/* 创建房间模态框 */}
      {createRoomModalOpen && (
        <div className="fixed inset-0 bg黑色/50 flex items-center justify-center z-50">
          <div className="bg-white w-80 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">创建新房间</h3>
            </div>
            <div className="p-6">
              <div className="mb-5 text-center text-gray-600">
                创建一个新的观影派对并邀请您的朋友!
              </div>
              <button
                onClick={handleCreateRoom}
                className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <PlusCircleIcon />
                创建房间
              </button>
              <div className="mt-4 text-right">
                <button
                  onClick={() => setCreateRoomModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* 加入房间模态框 */}
      {joinRoomModalOpen && (
        <div className="fixed inset-0 bg黑色/50 flex items-center justify-center z-50">
          <div className="bg-white w-96 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">加入观影派对</h3>
            </div>
            <div className="p-6">
              <div className="mb-5 text-center text-gray-600 font-medium">
                输入房间代码加入朋友的观影派对
              </div>
              <div className="flex gap-3">
                <input
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  placeholder="输入房间代码"
                  className="flex-1 px-4 py-3 text-base rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  加入
                </button>
              </div>
              <div className="mt-4 text-right">
                <button
                  onClick={() => setJoinRoomModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  取消
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default HomePage;