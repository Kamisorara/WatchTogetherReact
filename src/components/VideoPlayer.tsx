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
    if (videoRef.current) {
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
    }
  };

  // 处理播放暂停
  const handlePause = () => {
    if (videoRef.current) {
      setIsControlledByServer(true);
      const currentTime = videoRef.current.currentTime;
      stompClient?.publish({
        destination: `/app/video-control/${roomCode}`,
        body: JSON.stringify({ action: 'pause', time: currentTime }),
      });
      setTimeout(() => {
        setIsControlledByServer(false);
      }, 101);
    }
  };

  // 订阅视频控制消息
  const subscribeToSyncMessage = useCallback(() => {
    return stompClient?.subscribe(
      `/topic/video-control/${roomCode}`,
      (message: IMessage) => {
        const controlParam: ControlProps = JSON.parse(message.body);
        // 手动拖动
        if (videoRef.current && !isControlledByServer) {
          const currentTime = videoRef.current.currentTime;
          const timeDifference = Math.abs(currentTime - controlParam.time);

          // 如果时间差超过允许的范围，则进行同步
          if (timeDifference > SYNC_THRESHOLD) {
            videoRef.current.currentTime = controlParam.time;
          }

          // 同步播放或是暂停操作
          if (controlParam.action === 'play') {
            videoRef.current.play();
          } else if (controlParam.action === 'pause') {
            videoRef.current.pause();
          }
        }

      }
    );
  }, [stompClient, roomCode, isControlledByServer]);


  // 同步进度到服务器
  const syncVideoToServer = useCallback(() => {
    if (videoRef.current && !videoRef.current.paused) {
      const currentTime = videoRef.current.currentTime;
      stompClient?.publish({
        destination: `/app/video-control/${roomCode}`,
        body: JSON.stringify({ action: 'sync', time: currentTime }),
      });
    }
  }, [stompClient, roomCode]);

  useEffect(() => {
    // 组件挂载时订阅消息
    const subscription = subscribeToSyncMessage();
    // 每隔一段时间就像服务器发送状态
    const syncInterval = setInterval(syncVideoToServer, SYNC_INTERVAL);

    return () => {
      subscription?.unsubscribe();
      clearInterval(syncInterval);
    };
  }, [subscribeToSyncMessage, syncVideoToServer, SYNC_INTERVAL]);


  return (
    <video
      className="chat-content-video"
      controls
      ref={videoRef}
      onPlay={handlePlay}
      onPause={handlePause}
      src={videoSource}
      muted
    >
      你的浏览器不支持这个视频播放
    </video>
  );

}

export default VideoPlayer;