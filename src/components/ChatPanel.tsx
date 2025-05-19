import React, { useState, useRef, useEffect } from "react";
import { Client } from "@stomp/stompjs";
import { User } from "../apis/system/AuthApi";

interface ChatMessage {
  id: string;
  userId: string;
  userName: string;
  userAvatar?: string;
  content: string;
  timestamp: string;
}

interface ChatPanelProps {
  stompClient: Client | null;
  roomCode: string;
  currentUser: User;
  messages: ChatMessage[]; // 接受父容器的信息
}

const ChatPanel: React.FC<ChatPanelProps> = ({
  stompClient,
  roomCode,
  currentUser,
  messages
}) => {
  // 定义消息输入状态
  const [newMessage, setNewMessage] = useState("");
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // 滚动到最新消息
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages]);

  // 发送消息
  const sendMessage = () => {
    if (!stompClient || !newMessage.trim() || !roomCode) return;

    stompClient.publish({
      destination: `/app/chat/${roomCode}`,
      body: JSON.stringify({
        content: newMessage.trim()
      })
    });

    setNewMessage("");
  };

  // 格式化时间戳
  const formatTime = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="flex flex-col h-full">
      {/* Message area */}
      <div className="flex-grow overflow-y-auto p-4 space-y-3">
        {messages.length === 0 ? (
          <div className="text-center text-gray-400 py-10">
            暂无消息，发送第一条消息开始聊天吧！
          </div>
        ) : (
          messages.map((msg) => (
            <div
              key={msg.id}
              className={`flex ${msg.userId === currentUser.id ? 'justify-end' : 'justify-start'}`}
            >
              {/* 其他用户聊天信息 */}
              {msg.userId !== currentUser.id && (
                <div className="flex flex-col max-w-[80%]">
                  <div className="flex items-center mb-1">
                    <div className="w-6 h-6 rounded-full bg-purple-100 flex-shrink-0 overflow-hidden mr-2">
                      {msg.userAvatar ? (
                        <img src={msg.userAvatar} alt="" className="w-full h-full object-cover" />
                      ) : (
                        <div className="flex items-center justify-center h-full text-purple-500 text-xs">
                          {msg.userName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <span className="text-xs text-gray-500">{msg.userName}</span>
                    <span className="text-xs text-gray-400 ml-2">{formatTime(msg.timestamp)}</span>
                  </div>
                  <div className="bg-white p-3 rounded-2xl rounded-tl-none shadow-sm">
                    {msg.content}
                  </div>
                </div>
              )}

              {/* 当前用户发送的信息 */}
              {msg.userId === currentUser.id && (
                <div className="flex flex-col items-end max-w-[80%]">
                  <div className="flex items-center justify-end mb-1">
                    <span className="text-xs text-gray-400 mr-2">{formatTime(msg.timestamp)}</span>
                    <span className="text-xs text-gray-500">你</span>
                  </div>
                  <div className="bg-purple-100 p-3 rounded-2xl rounded-tr-none text-gray-800">
                    {msg.content}
                  </div>
                </div>
              )}
            </div>
          ))
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* 消息输入部分 */}
      <div className="border-t border-gray-200 p-3">
        <form
          onSubmit={(e) => {
            e.preventDefault();
            sendMessage();
          }}
          className="flex rounded-full bg-white border border-gray-200 overflow-hidden"
        >
          <input
            type="text"
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="输入消息..."
            className="flex-grow px-4 py-3 focus:outline-none text-sm"
          />
          <button
            type="submit"
            disabled={!newMessage.trim()}
            className="px-5 bg-purple-500 text-white disabled:opacity-50"
          >
            发送
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatPanel;