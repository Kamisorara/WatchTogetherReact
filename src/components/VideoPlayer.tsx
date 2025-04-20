import { Client, IMessage } from "@stomp/stompjs";
import { useCallback, useEffect, useRef, useState } from "react";
import videoSource from "../assets/mv.mp4";

interface VideoPlayerProps {
  stompClient: Client | null;
  roomCode: string;
}

interface ControlProps {
  action: 'play' | 'pause' | 'sync';
  time: number;
}

const VideoPlayer: React.FC<VideoPlayerProps> = ({ stompClient, roomCode }) => {
  // 允许的时间差 1.5秒
  const SYNC_THRESHOLD = 1.5;
  // 同步间隔 2秒
  const SYNC_INTERVAL = 2001;

  const videoRef = useRef<HTMLVideoElement>(null);
  const [isControlledByServer, setIsControlledByServer] = useState(false);

  // 开始播放处理
  const handlePlay = () => {
    if (!videoRef.current || isControlledByServer) return;

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
    if (!videoRef.current || isControlledByServer) return;

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
    if (!videoRef.current || isControlledByServer) return;

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
    if (videoRef.current && !videoRef.current.paused && !isControlledByServer) {
      const currentTime = videoRef.current.currentTime;
      stompClient?.publish({
        destination: `/app/video-control/${roomCode}`,
        body: JSON.stringify({ action: 'sync', time: currentTime }),
      });
    }
  }, [stompClient, roomCode, isControlledByServer]);

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
    <div className="w-full h-full flex items-center justify-center bg-black">
      <video
        className="max-h-full max-w-full"
        controls
        ref={videoRef}
        onPlay={handlePlay}
        onPause={handlePause}
        onSeeked={handleSeeked}
        src={videoSource}
      >
        你的浏览器不支持这个视频播放
      </video>
    </div>
  );
};

export default VideoPlayer;