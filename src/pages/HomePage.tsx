import { useCallback, useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import VideoPlayer from "../components/VideoPlayer";
import Dialog from "../components/dialog";
import { authApi, User } from "../apis/system/AuthApi";
import { toast } from 'react-toastify';
import { WEBSOCKET_SERVER_URL } from "../service/ipAddress";
import { roomApi, MovieProps, JoinRoomResponse } from "../apis/room/RoomApi";
import MovieUploader from "../components/MovieUploader";

// 图标
import { PlusCircleIcon, SearchIcon, UserIcon, SettingsIcon, AudioIcon, PhoneIcon, DisconnectIcon, FilmIcon, FileUploadIcon, LogoutIcon, ChatIcon } from "../components/Icons";
import { useNavigate } from "react-router-dom";
import ProfileSettings from "../components/ProfileSettings";
import MovieSelector from "../components/MovieSelector";
import ChatPanel from "../components/ChatPanel";

const LOCAL_WEBSOCKET_SERVER_URL = WEBSOCKET_SERVER_URL;

const HomePage: React.FC = () => {
  // 用户信息加载状态
  const [isUserLoading, setIsUserLoading] = useState<boolean>(true);
  // 路由
  const navigate = useNavigate();

  // 房间状态
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [roomCodeInput, setRoomCodeInput] = useState<string>("");
  const [stompClient, setStompClient] = useState<Client | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  // WebSocket连接状态
  const [wsConnectionStatus, setWsConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'failed'>('disconnected');

  // 电影相关状态
  const [movies, setMovies] = useState<MovieProps[]>([]);
  const [selectedMovie, setSelectedMovie] = useState<MovieProps | null>(null);
  const [isRoomCreator, setIsRoomCreator] = useState<boolean>(false);
  const [showMovieSelector, setShowMovieSelector] = useState<boolean>(false);
  const [loadingMovies, setLoadingMovies] = useState<boolean>(false);

  // 创建和加入房间dialog状态
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState<boolean>(false);
  const [joinRoomModalOpen, setJoinRoomModalOpen] = useState<boolean>(false);

  // 设置dialog
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const openSettings = () => setIsSettingsOpen(true);
  const closeSettings = () => setIsSettingsOpen(false);

  // 强制轮询状态
  const [forcePolling, setForcePolling] = useState<boolean>(false);

  // 聊天窗口状态
  const [isChatOpen, setIsChatOpen] = useState<boolean>(false);
  const [hasUnreadMessages, setHasUnreadMessages] = useState<boolean>(false);
  const [chatMessages, setChatMessages] = useState<{
    id: string;
    userId: string;
    userName: string;
    userAvatar?: string;
    content: string;
    timestamp: string;
  }[]>([]);

  // 用户状态
  const [currentUser, setCurrentUser] = useState<User>({
    id: "1",
    userName: "当前用户",
    userAvatar: "",
    userSex: "",
    userPhone: "",
    email: "",
  });
  const [otherUsers, setOtherUsers] = useState<User[]>([]);

  // 麦克风状态
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // 电影上传相关状态
  const [showUploadMovieDialog, setShowUploadMovieDialog] = useState<boolean>(false);

  // 添加退出登录确认对话框状态
  const [showLogoutConfirm, setShowLogoutConfirm] = useState<boolean>(false);

  // 聊天窗口
  const toggleChat = () => {
    if (!isChatOpen) {
      // 打开聊天时清除未读标记
      setHasUnreadMessages(false);
    }
    setIsChatOpen(!isChatOpen);
  };


  // 退出登录处理
  const handleLogout = async () => {
    try {
      setIsLoading(true);
      await authApi.logout();
      // 清除本地存储的 token
      localStorage.removeItem("token");
      // 显示消息
      toast.success('已成功退出登录', {
        position: "top-right",
        autoClose: 2000,
      });
      // 重定向到登录页面
      navigate('/login');
    } catch (error) {
      console.error("退出登录失败", error);
      toast.error('退出登录失败，请重试', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 获取电影列表
  const fetchMovies = useCallback(async () => {
    try {
      setLoadingMovies(true);
      // 这里替换为实际的 API 调用
      const response = await roomApi.getMovieList();
      setMovies(response);
    } catch (error) {
      console.error("获取电影列表失败", error);
      toast.error('获取电影列表失败', {
        position: "top-right",
        autoClose: 3000,
      });
    } finally {
      setLoadingMovies(false);
    }
  }, []);

  // 选择电影
  const handleSelectMovie = (movie: MovieProps) => {
    if (!isRoomCreator) {
      toast.info('只有房主可以选择电影', {
        position: "top-center",
        autoClose: 2000,
      });
      return;
    }

    setSelectedMovie(movie);
    setShowMovieSelector(false);

    // 通过 WebSocket 广播电影选择
    if (stompClient && roomCode) {
      stompClient.publish({
        destination: `/app/movie-select/${roomCode}`,
        body: JSON.stringify({
          movieId: movie.id,
          videoUrl: movie.videoUrl,
          title: movie.title
        }),
      });

      toast.success(`已选择电影: ${movie.title}`, {
        position: "top-right",
        autoClose: 2000,
      });
    }
  };

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
        autoClose: 3000,
      });
    } finally {
      setIsLoading(false);
    }
  }, [currentUser.id]);

  // 连接到WebSocket服务器
  const connectToWebSocketServer = useCallback((room: string) => {
    // 设置连接状态为"连接中"
    setWsConnectionStatus('connecting');

    // 强制使用轮询
    const socketOptions = {
      transports: forcePolling
        ? ['xhr-streaming', 'xhr-polling']
        : undefined, // undefined 让 SockJS 使用默认顺序
      timeout: 10000
    };

    // 创建 SockJS 实例，启用所有可能的传输方式
    const socket = new SockJS(LOCAL_WEBSOCKET_SERVER_URL, null, socketOptions);

    // 监听SockJS原生事件
    socket.onopen = () => console.log("SockJS连接已打开");

    socket.onclose = (event) => {
      console.log("SockJS连接已关闭, 代码:", event.code, "原因:", event.reason);
      // 常见 WebSocket 关闭代码的处理
      if (event.code === 1006) {
        console.log("异常关闭 - 可能是网络限制导致");
      } else if (event.code === 1001) {
        console.log("正常关闭 - 客户端主动断开");
      }
    };

    socket.onerror = (error) => {
      console.error("SockJS连接错误:", error);
      // 仅记录错误，让STOMP客户端处理重连
    };

    const client = new Client({
      webSocketFactory: () => socket,
      connectHeaders: {
        token: localStorage.getItem("token") || "",
        roomCode: room,
      },
      // 减少心跳间隔，提高频率以保持连接活跃
      heartbeatIncoming: 5000,
      heartbeatOutgoing: 5000,
      // 减小重连延迟，更快地尝试恢复连接
      reconnectDelay: 2000,
    });

    client.onConnect = () => {
      console.log("已连接到WebSocket服务器");
      // 更新连接状态为"已连接"
      setWsConnectionStatus('connected');

      // 连接成功后立即获取房间用户列表
      fetchRoomUsers(room);

      // 连接成功后获取电影列表
      fetchMovies();

      // 订阅房间更新
      client.subscribe(`/topic/room/${room}`, (message) => {
        const payload = JSON.parse(message.body);
        console.log("收到WebSocket消息:", payload);

        if (payload.type === "USER_CHANGE") {
          console.log("检测到用户变化，正在更新用户列表");
          fetchRoomUsers(room);
        }
      });

      // 订阅聊天消息
      client.subscribe(`/topic/chat/${room}`, (message) => {
        try {
          const chatMessage = JSON.parse(message.body);
          console.log("收到聊天消息:", chatMessage);
          setChatMessages(prevMessages => [...prevMessages, chatMessage]);

          // 如果聊天窗口没有打开，且不是当前用户发送的消息，标记为有未读消息
          if (!isChatOpen && chatMessage.userId !== currentUser.id) {
            setHasUnreadMessages(true);
          }
        } catch (error) {
          console.error("处理聊天消息失败:", error);
        }
      });

      // 订阅房间状态更新（包括房主变更）
      client.subscribe(`/topic/room-status/${room}`, (message) => {
        try {
          const payload = JSON.parse(message.body);
          console.log("房间状态更新:", payload);

          // 处理房主变更消息
          if (payload.type === "OWNER_CHANGED") {
            console.log("房主已变更:", payload);

            // 如果当前用户是新房主
            if (payload.newOwnerId === currentUser.id) {
              setIsRoomCreator(true);
              toast.info("您已成为房间的新房主！", {
                position: "top-center",
                autoClose: 3000,
              });
            } else {
              setIsRoomCreator(false);
              toast.info(`房间房主已更换`, {
                position: "top-center",
                autoClose: 3000,
              });
            }
          }
        } catch (error) {
          console.error("处理房间状态消息失败:", error);
        }
      });

      // 订阅个人房间状态消息
      client.subscribe(`/user/queue/room-status/${room}`, (message) => {
        try {
          const statusData = JSON.parse(message.body);
          console.log("收到个人房间状态:", statusData);

          // 根据消息更新房主状态
          if (statusData.isCreator !== undefined) {
            setIsRoomCreator(statusData.isCreator);

            if (statusData.isCreator) {
              toast.success("您已被指定为房间的房主！", {
                position: "top-center",
                autoClose: 2000,
              });
            }
          }
        } catch (error) {
          console.error("处理个人房间状态消息失败:", error);
        }
      });

      // 订阅电影选择消息
      client.subscribe(`/topic/movie-select/${room}`, (message) => {
        try {
          const movieData = JSON.parse(message.body);
          console.log("收到电影选择:", movieData);

          // 从电影列表中找到对应的电影
          const selected = movies.find(m => m.id === movieData.movieId);
          if (selected) {
            setSelectedMovie(selected);
            toast.info(`正在播放: ${selected.title}`, {
              position: "top-center",
              autoClose: 2000,
            });
          } else if (movieData.videoUrl) {
            // 如果找不到电影但有 URL，创建一个临时电影对象
            setSelectedMovie({
              id: movieData.movieId || "unknown",
              title: movieData.title || "未知电影",
              videoUrl: movieData.videoUrl,
              coverUrl: ""
            });
          }
        } catch (error) {
          console.error("处理电影选择失败:", error);
        }
      });

      setStompClient(client);
    };

    client.onStompError = (frame) => {
      console.error('代理报告错误: ' + frame.headers['message']);
      console.error('额外详情: ' + frame.body);
      setWsConnectionStatus('failed');
      toast.error('连接错误，正在尝试重新连接...', {
        position: "top-right",
        autoClose: 3000,
      });

      // 记录具体错误类型，帮助诊断问题
      const errorDetails = {
        message: frame.headers['message'],
        body: frame.body,
        timestamp: new Date().toISOString()
      };
      console.log("STOMP错误详情:", errorDetails);
    };

    // 添加WebSocket断开连接处理
    client.onWebSocketClose = () => {
      console.log("WebSocket连接已关闭，等待重连");
      // 仅在控制台记录，不改变状态，避免UI抖动
    };

    client.activate();
    setStompClient(client);

    return client;
  }, [fetchRoomUsers, fetchMovies, movies, currentUser.id, forcePolling]);

  // 添加切换麦克风状态的函数
  const toggleMute = () => {
    setIsMuted(!isMuted);
  };

  // 处理上传完成
  const handleUploadComplete = () => {
    // 重新获取电影列表
    fetchMovies();
    // 关闭上传对话框
    setShowUploadMovieDialog(false);
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
        setIsRoomCreator(true); // 设置为房主
        setCreateRoomModalOpen(false);
        // 连接前先置状态
        setWsConnectionStatus('connecting');
        connectToWebSocketServer(newRoomCode);
        toast.success(`房间创建成功! 房间代码: ${newRoomCode}`, {
          position: "top-right",
          autoClose: 3000,
        });
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
      const response: JoinRoomResponse = await roomApi.joinRoom(roomCodeInput);
      console.log(response)
      if (response) {
        setRoomCode(roomCodeInput);
        setIsInRoom(true);
        setIsRoomCreator(false); // 不是房主
        setJoinRoomModalOpen(false);

        // 检查并加载当前正在播放的电影
        if (response.currentMovie) {
          setSelectedMovie(response.currentMovie);
          toast.info(`房间正在播放: ${response.currentMovie.title}`, {
            position: "top-center",
            autoClose: 2000,
          });
        }

        // 连接前先置状态
        setWsConnectionStatus('connecting');
        connectToWebSocketServer(roomCodeInput);
        toast.success('成功加入房间!', {
          position: "top-right",
          autoClose: 2000,
        });
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
      setIsUserLoading(true);
      const res = await authApi.getUserInfoFromToken();
      console.log(res);
      if (res && res.id) {
        setCurrentUser({
          id: res.id || "1",
          userName: res.userName || "当前用户",
          userAvatar: res.userAvatar || "",
          email: res.email || "",
          userSex: res.userSex || '2',
          userPhone: res.userPhone || ''
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
    } finally {
      setIsUserLoading(false);
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
      <div className="min-w-[80px] bg-gradient-to-b from-purple-400 to-purple-700 py-6 flex flex-col items-center justify-between shadow-lg z-10">
        {/* 顶部内容 */}
        <div className="flex flex-col items-center">
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

          {/* 已在房间内且是创建者，显示选择电影按钮 */}
          {isInRoom && (
            <div
              className="w-14 h-14 mb-6 bg-white/15 rounded-2xl flex justify-center items-center text-white cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-md"
              onClick={() => setShowMovieSelector(true)}
            >
              <FilmIcon style={{ fontSize: 24 }} />
            </div>
          )}

          {/* 上传电影按钮 - 显示给所有在房间中的用户 */}
          {isInRoom && (
            <div
              className="w-14 h-14 mb-6 bg-white/15 rounded-2xl flex justify-center items-center text-white cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-md"
              onClick={() => setShowUploadMovieDialog(true)}
            >
              <FileUploadIcon style={{ fontSize: 24 }} />
            </div>
          )}
        </div>

        {/* 修改退出登录按钮点击事件，显示确认对话框而不是直接退出 */}
        <div
          className="w-14 h-14 mb-6 bg-white/15 rounded-2xl flex justify-center items-center text-white cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-md hover:text-red-100"
          onClick={() => setShowLogoutConfirm(true)}
          title="退出登录"
        >
          <LogoutIcon style={{ fontSize: 24 }} />
        </div>
      </div>

      {/* 频道/用户列表 */}
      <div className="min-w-[280px] bg-gradient-to-b from-gray-100 to-purple-100 flex flex-col shadow-md z-5">
        <div className="px-4 pt-5 flex justify-between items-center text-gray-700">
          <span className="text-sm font-medium">频道成员</span>
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
                {/* 用户头像 */}
                <div className="flex items-center">
                  <div className="w-[38px] h-[38px] rounded-full bg-purple-200 flex items-center justify-center shadow-sm overflow-hidden relative">
                    {user.userAvatar && (
                      <img
                        src={user.userAvatar}
                        alt={user.userName}
                        className="w-full h-full object-cover"
                        onError={(e) => {
                          (e.target as HTMLImageElement).style.display = 'none';
                        }}
                      />
                    )}
                    <div className={`absolute inset-0 flex items-center justify-center ${user.userAvatar ? 'opacity-0' : 'opacity-100'}`}>
                      <UserIcon className="text-purple-700" />
                    </div>
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
            {isUserLoading ? (
              <>
                {/* Loading skeleton */}
                <div className="w-[38px] h-[38px] rounded-full bg-gray-200 animate-pulse"></div>
                <div className="ml-3.5 flex-grow h-5 bg-gray-200 rounded animate-pulse"></div>
                <div className="ml-auto flex items-center gap-3">
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="w-8 h-8 bg-gray-200 rounded-full animate-pulse"></div>
                </div>
              </>
            ) : (
              <>
                {/* 用户头像 */}
                <div className="w-[38px] h-[38px] rounded-full bg-purple-200 flex items-center justify-center shadow-sm overflow-hidden relative">
                  {currentUser.userAvatar && (
                    <img
                      src={currentUser.userAvatar}
                      alt={currentUser.userName}
                      className="w-full h-full object-cover"
                      onError={(e) => {
                        (e.target as HTMLImageElement).style.display = 'none';
                      }}
                    />
                  )}
                  <div className={`absolute inset-0 flex items-center justify-center ${currentUser.userAvatar ? 'opacity-0' : 'opacity-100'}`}>
                    <UserIcon className="text-purple-700" />
                  </div>
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
              </>
            )}
          </div>
        </div>
      </div>

      {/* 主要内容 */}
      <div className="flex-grow flex flex-col bg-gray-50 relative">
        {/* 头部 */}
        <div className="flex items-center justify-between p-4 m-5 mt-5 mb-0 rounded-2xl bg-white shadow-md z-1">
          <div className="flex items-center flex-grow">
            {!isInRoom ? (
              <div className="text-lg font-bold text-gray-800">尚未加入房间</div>
            ) : (
              <div className="flex flex-col">
                <div className="text-lg font-bold text-gray-800">观影派对: {roomCode}</div>
                {selectedMovie && (
                  <div className="text-sm font-medium text-purple-600 mt-1">
                    正在播放: {selectedMovie.title}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* 工具栏按钮区域 */}
          <div className="flex items-center">
            {isInRoom && wsConnectionStatus === 'connected' && (
              <button
                onClick={toggleChat}
                className={`p-2.5 rounded-lg transition-all flex items-center justify-center ${isChatOpen
                  ? 'bg-purple-100 text-purple-700'
                  : 'text-gray-600 hover:bg-gray-100'
                  }`}
                title={isChatOpen ? "关闭聊天" : "打开聊天"}
              >
                <div className="relative">
                  <ChatIcon className="w-5 h-5" />
                  {hasUnreadMessages && !isChatOpen && (
                    <span className="absolute -top-1 -right-1 w-3 h-3 bg-red-500 rounded-full animate-pulse"></span>
                  )}
                </div>
              </button>
            )}
          </div>
        </div>

        {/* 修改视频内容区域为可分割布局 */}
        <div className="flex-grow m-5 flex">
          {/* 视频区域 - 根据聊天面板是否打开调整宽度 */}
          <div className={`${isChatOpen ? 'w-2/3' : 'w-full'} rounded-3xl bg-white shadow-md flex justify-center items-center overflow-hidden relative transition-all duration-300`}>
            {wsConnectionStatus === 'connecting' ? (
              <div className="flex flex-col items-center justify-center gap-6 h-full w-full bg-gradient-to-br from-purple-50 to-purple-100 p-15">
                <div className="animate-spin rounded-full h-16 w-16 border-4 border-purple-400 border-t-transparent"></div>
                <div className="max-w-xs text-center text-gray-700 leading-relaxed font-medium">
                  正在连接到服务器，请稍候...
                </div>
              </div>
            ) : !stompClient || wsConnectionStatus === 'disconnected' || wsConnectionStatus === 'failed' ? (
              <div className="flex flex-col items-center justify-center gap-6 h-full w-full bg-gradient-to-br from-purple-50 to-purple-100 p-15">
                <div className="w-25 h-25 rounded-full bg-purple-100 flex items-center justify-center shadow-lg">
                  {wsConnectionStatus === 'failed' ? (
                    <div className="text-red-500 text-5xl">!</div>
                  ) : (
                    <DisconnectIcon style={{ fontSize: 48, color: "#7c4dff", opacity: 0.8 }} />
                  )}
                </div>
                <div className="max-w-xs text-center text-gray-700 leading-relaxed font-medium">
                  {wsConnectionStatus === 'failed' ?
                    "连接服务器时遇到问题，正在尝试重新连接..." :
                    "WebSocket未连接。请创建或加入房间以开始您的观影派对。"}
                </div>
                <div className="flex gap-4 mt-6">
                  {!isInRoom && (
                    <>
                      <button
                        onClick={() => setCreateRoomModalOpen(true)}
                        className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-400 to-purple-500 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                        disabled={isLoading || (wsConnectionStatus as string) === 'connecting'}
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
                        disabled={isLoading || (wsConnectionStatus as string) === 'connecting'}
                      >
                        <SearchIcon />
                        <span>加入房间</span>
                      </button>
                    </>
                  )}
                  {wsConnectionStatus === 'failed' && isInRoom && (
                    <button
                      onClick={() => connectToWebSocketServer(roomCode)}
                      className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-400 to-purple-500 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
                    >
                      重新连接
                    </button>
                  )}
                </div>
              </div>
            ) : selectedMovie ? (
              <VideoPlayer
                stompClient={stompClient}
                roomCode={roomCode}
                videoUrl={selectedMovie.videoUrl}
                isRoomCreator={isRoomCreator}
              />
            ) : (
              <div className="flex flex-col items-center justify-center gap-6 h-full w-full bg-gradient-to-br from-purple-50 to-purple-100 p-15">
                <div className="w-25 h-25 rounded-full bg-purple-100 flex items-center justify-center shadow-lg">
                  <FilmIcon style={{ fontSize: 48, color: "#7c4dff", opacity: 0.8 }} />
                </div>
                <div className="max-w-xs text-center text-gray-700 leading-relaxed font-medium">
                  {isRoomCreator ? "请选择一部电影开始观看" : "等待房主选择电影..."}
                </div>
                {isRoomCreator && (
                  <button
                    onClick={() => setShowMovieSelector(true)}
                    className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-400 to-purple-500 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                  >
                    <FilmIcon />
                    <span>选择电影</span>
                  </button>
                )}
              </div>
            )}
          </div>

          {/* 聊天面板 - 仅当isChatOpen为true时显示 */}
          {isChatOpen && isInRoom && stompClient && (
            <div className="w-1/3 ml-5 rounded-3xl bg-white shadow-md overflow-hidden transition-all duration-300">
              <ChatPanel
                stompClient={stompClient}
                roomCode={roomCode}
                currentUser={currentUser}
                messages={chatMessages}
              />
            </div>
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

      {/* 电影选择dialog */}
      <Dialog
        isOpen={showMovieSelector}
        onClose={() => setShowMovieSelector(false)}
        title="选择电影"
        size="lg"
      >
        <MovieSelector
          isRoomCreator={isRoomCreator}
          movies={movies}
          selectedMovie={selectedMovie}
          loadingMovies={loadingMovies}
          onSelectMovie={handleSelectMovie}
          onOpenUploadDialog={() => setShowUploadMovieDialog(true)}
          onClose={() => setShowMovieSelector(false)}
        />
      </Dialog>

      {/* 电影上传dialog */}
      <Dialog
        isOpen={showUploadMovieDialog}
        onClose={() => setShowUploadMovieDialog(false)}
        title="上传电影"
        size="md"
      >
        <MovieUploader
          roomCode={roomCode}
          onUploadComplete={handleUploadComplete}
          onCancel={() => setShowUploadMovieDialog(false)}
        />
      </Dialog>

      {/* 个人资料设置 */}
      <Dialog
        isOpen={isSettingsOpen}
        onClose={closeSettings}
        title="个人资料设置"
      >
        <ProfileSettings
          user={currentUser}
          isMuted={isMuted}
          toggleMute={toggleMute}
          onClose={closeSettings}
          onUserUpdate={() => getUserInfo()}
        />
      </Dialog>

      {/* 退出登录确认对话框 */}
      <Dialog
        isOpen={showLogoutConfirm}
        onClose={() => setShowLogoutConfirm(false)}
        title="确认退出"
        size="sm"
      >
        <div className="mb-6 text-center text-gray-600">
          确定要退出登录吗？
        </div>
        <div className="flex justify-center gap-4 pt-2">
          <button
            onClick={() => setShowLogoutConfirm(false)}
            className="px-6 py-3 rounded-xl font-medium text-gray-700 bg-white border border-gray-200 shadow-sm transition-all hover:bg-gray-50 hover:-translate-y-0.5 hover:shadow"
          >
            取消
          </button>
          <button
            onClick={handleLogout}
            className="px-6 py-3 rounded-xl font-medium text-white bg-gradient-to-r from-purple-500 to-purple-600 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg hover:from-purple-600 hover:to-purple-700"
            disabled={isLoading}
          >
            {isLoading ? (
              <div className="flex items-center">
                <div className="animate-spin mr-2 h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div>
                处理中...
              </div>
            ) : (
              '确认退出'
            )}
          </button>
        </div>
      </Dialog>
    </div>
  );
};

export default HomePage;