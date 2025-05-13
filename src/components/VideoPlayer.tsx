import { Client, IMessage } from "@stomp/stompjs";
import { useCallback, useEffect, useRef, useState } from "react";

interface VideoPlayerProps {
  stompClient: Client | null;
  roomCode: string;
  videoUrl: string;
  isRoomCreator: boolean; // Add this new prop
}

interface ControlProps {
  action: 'play' | 'pause' | 'sync';
  time: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ stompClient, roomCode, videoUrl, isRoomCreator }) => {
  // 允许的时间差 1.5秒
  const SYNC_THRESHOLD = 1.5;
  // 同步间隔 2秒
  const SYNC_INTERVAL = 2001;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isControlledByServer, setIsControlledByServer] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // 视频加载成功处理
  const handleVideoLoaded = () => {
    setIsLoading(false);
    setError(null);
  };

  // 视频加载错误处理
  const handleVideoError = () => {
    setIsLoading(false);
    setError("无法加载视频，请检查视频链接或网络连接");
  };

  // 开始播放处理
  const handlePlay = () => {
    if (!videoRef.current || isControlledByServer || !isRoomCreator) return;

    setIsControlledByServer(true);
    const currTime = videoRef.current.currentTime;
    // 发送当前时间到服务器
    stompClient?.publish({
      destination: `/app/video-control/${roomCode}`,
      body: JSON.stringify({ action: 'play', time: currTime }),
    });
    setTimeout(() => {
      setIsControlledByServer(false);
    }, 101);
  };

  // 处理播放暂停
  const handlePause = () => {
    if (!videoRef.current || isControlledByServer || !isRoomCreator) return;

    setIsControlledByServer(true);
    const currentTime = videoRef.current.currentTime;
    stompClient?.publish({
      destination: `/app/video-control/${roomCode}`,
      body: JSON.stringify({ action: 'pause', time: currentTime }),
    });
    setTimeout(() => {
      setIsControlledByServer(false);
    }, 101);
  };

  // 处理进度条拖动
  const handleSeeked = () => {
    if (!videoRef.current || isControlledByServer || !isRoomCreator) return;

    setIsControlledByServer(true);
    const currentTime = videoRef.current.currentTime;
    const action = videoRef.current.paused ? 'pause' : 'play';

    stompClient?.publish({
      destination: `/app/video-control/${roomCode}`,
      body: JSON.stringify({ action, time: currentTime }),
    });

    setTimeout(() => {
      setIsControlledByServer(false);
    }, 101);
  };

  // 同步进度到服务器
  const syncVideoToServer = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused && !isControlledByServer && isRoomCreator) {
      const currentTime = videoRef.current.currentTime;
      stompClient?.publish({
        destination: `/app/video-control/${roomCode}`,
        body: JSON.stringify({ action: 'sync', time: currentTime }),
      });
    }
  }, [stompClient, roomCode, isControlledByServer, isRoomCreator]);

  useEffect(() => {
    if (!stompClient) return;

    // 订阅视频控制消息
    const subscription = stompClient.subscribe(
      `/topic/video-sync/${roomCode}`,
      (message: IMessage) => {
        try {
          const controlParam: ControlProps = JSON.parse(message.body);

          // 确保视频元素存在且不是本地控制状态
          if (videoRef.current && !isControlledByServer) {
            const currentTime = videoRef.current.currentTime;
            const timeDifference = Math.abs(currentTime - controlParam.time);

            // 如果时间差超过允许的范围，则进行同步
            if (timeDifference > SYNC_THRESHOLD) {
              videoRef.current.currentTime = controlParam.time;
            }

            // 同步播放或是暂停操作
            if (controlParam.action === 'play') {
              videoRef.current.play().catch(err => {
                console.error("播放失败:", err);
                // 自动播放失败，通常是浏览器策略导致
                alert("播放失败，请手动点击播放按钮");
              });
            } else if (controlParam.action === 'pause') {
              videoRef.current.pause();
            }
          }
        } catch (error) {
          console.error("处理同步消息失败:", error);
        }
      }
    );

    // 定时同步进度
    const interval = setInterval(syncVideoToServer, SYNC_INTERVAL);

    // 清理函数
    return () => {
      subscription.unsubscribe();
      clearInterval(interval);
    };
  }, [stompClient, roomCode, isControlledByServer, syncVideoToServer]);

  return (
    <div className="w-full h-full flex items-center justify-center bg-black relative">
      {isLoading && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-50 z-10">
          <div className="animate-spin rounded-full h-16 w-16 border-b-4 border-white"></div>
        </div>
      )}

      {error && (
        <div className="absolute inset-0 flex items-center justify-center bg-black bg-opacity-75 z-10">
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded">
            <p>{error}</p>
          </div>
        </div>
      )}

      <video
        className="max-h-full max-w-full"
        controls={isRoomCreator} // Only show controls for room creator
        ref={videoRef}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeked={handleSeeked}
        onLoadedData={handleVideoLoaded}
        onError={handleVideoError}
        src={videoUrl}
      >
        你的浏览器不支持这个视频播放
      </video>

      {!isRoomCreator && (
        <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-60 text-white text-center py-2">
          只有房主可以控制视频播放
        </div>
      )}
    </div>
  );
};

export default VideoPlayer;