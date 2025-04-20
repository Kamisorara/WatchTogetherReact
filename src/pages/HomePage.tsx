import { useCallback, useEffect, useState } from "react";
import { Client } from "@stomp/stompjs";
import SockJS from "sockjs-client";
import VideoPlayer from "../components/VideoPlayer";

// Icons
import { PlusCircleIcon, SearchIcon, UserIcon, SettingsIcon, AudioIcon, PhoneIcon, DisconnectIcon } from "../components/Icons";

interface User {
  id: string;
  userName: string;
  userAvatar: string;
}

const LOCAL_WEBSOCKET_SERVER_URL = "http://localhost:8081/ws"; // Update this with your WebSocket server URL

const HomePage: React.FC = () => {
  // Room state
  const [isInRoom, setIsInRoom] = useState<boolean>(false);
  const [roomCode, setRoomCode] = useState<string>("");
  const [roomCodeInput, setRoomCodeInput] = useState<string>("");
  const [stompClient, setStompClient] = useState<Client | null>(null);

  // Modal state
  const [createRoomModalOpen, setCreateRoomModalOpen] = useState<boolean>(false);
  const [joinRoomModalOpen, setJoinRoomModalOpen] = useState<boolean>(false);

  // User state
  const [currentUser, setCurrentUser] = useState<User>({
    id: "1",
    userName: "Current User",
    userAvatar: ""
  });
  const [otherUsers, setOtherUsers] = useState<User[]>([]);

  // Connect to WebSocket server
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
      console.log("Connected to WebSocket server");

      // Subscribe to room updates
      client.subscribe(`/topic/room/${room}`, (message) => {
        const payload = JSON.parse(message.body);
        console.log(payload);
        if (payload.type === "USER_CHANGE") {
          console.log("User change detected");
          // Here you would call your API to get updated user list
          // For now we'll simulate with dummy data
          setOtherUsers([
            { id: "2", userName: "Other User 1", userAvatar: "" },
            { id: "3", userName: "Other User 2", userAvatar: "" }
          ]);
        }
      });

      setStompClient(client);
    };

    client.onStompError = (frame) => {
      console.error('Broker reported error: ' + frame.headers['message']);
      console.error('Additional details: ' + frame.body);
    };

    client.activate();

    return client;
  }, []);

  // Clean up WebSocket connection on unmount
  useEffect(() => {
    return () => {
      if (stompClient) {
        stompClient.deactivate();
      }
    };
  }, [stompClient]);

  // Create a room
  const handleCreateRoom = async () => {
    // In a real implementation, you would call your API here
    try {
      // Simulate API call
      const newRoomCode = Math.random().toString(36).substring(2, 8).toUpperCase();
      setRoomCode(newRoomCode);
      setIsInRoom(true);
      connectToWebSocketServer(newRoomCode);
      showNotification("Room created successfully", `Room code: ${newRoomCode}`, "success");
      setCreateRoomModalOpen(false);
    } catch (error) {
      showNotification("Failed to create room", "", "error");
    }
  };

  // Join a room
  const handleJoinRoom = async () => {
    try {
      // Simulate API call
      if (roomCodeInput) {
        setRoomCode(roomCodeInput);
        setIsInRoom(true);
        connectToWebSocketServer(roomCodeInput);
        showNotification("Successfully joined room", "", "success");
        setJoinRoomModalOpen(false);
      } else {
        showNotification("Please enter a room code", "", "error");
      }
    } catch (error) {
      showNotification("Failed to join room", "Please check the room code and try again", "error");
    }
  };

  // Simple notification function (you would use a proper notification library in production)
  const showNotification = (message: string, description: string, type: 'success' | 'error') => {
    console.log(`${type.toUpperCase()}: ${message} - ${description}`);
    alert(`${message}\n${description}`);
  };

  return (
    <div className="flex flex-row h-screen bg-gray-50 overflow-hidden">
      {/* Sidebar */}
      <div className="min-w-[80px] bg-gradient-to-b from-purple-600 to-purple-900 py-6 flex flex-col items-center shadow-lg z-10">
        <div className="text-2xl font-bold mb-9 text-white w-14 h-14 flex items-center justify-center bg-white/20 backdrop-blur-md rounded-2xl transition-all duration-300 ease-out shadow-md hover:transform hover:-translate-y-1 hover:scale-105 hover:shadow-lg">
          WT
        </div>

        {/* Create Room Button */}
        {!isInRoom && (
          <div
            className="w-14 h-14 mb-6 bg-white/15 rounded-2xl flex justify-center items-center text-white cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-md"
            onClick={() => setCreateRoomModalOpen(true)}
          >
            <PlusCircleIcon style={{ fontSize: 24 }} />
          </div>
        )}

        {/* Join Room Button */}
        {!isInRoom && (
          <div
            className="w-14 h-14 mb-6 bg-white/15 rounded-2xl flex justify-center items-center text-white cursor-pointer transition-all duration-300 hover:-translate-y-1 hover:bg-white/20 hover:shadow-md"
            onClick={() => setJoinRoomModalOpen(true)}
          >
            <SearchIcon style={{ fontSize: 24 }} />
          </div>
        )}
      </div>

      {/* Channel/Users List */}
      <div className="min-w-[280px] bg-gray-800 flex flex-col shadow-md z-5 text-white">
        <div className="px-4 pt-5 flex justify-between items-center">
          <span className="text-sm">Party Members</span>
          <span className="text-sm">{otherUsers.length} online</span>
        </div>

        <div className="overflow-y-auto p-5 flex-1">
          {otherUsers.map((user, index) => (
            <div key={index} className="p-4 rounded-xl mb-3 bg-white/12 transition-all duration-300 hover:bg-white/20 hover:transform hover:translate-x-1 border border-white/5">
              <div className="flex items-center">
                <div className="w-[38px] h-[38px] rounded-full bg-gray-700 flex items-center justify-center">
                  <UserIcon />
                </div>
                <div className="ml-3.5 flex-grow text-gray-400 font-semibold text-sm overflow-hidden whitespace-nowrap text-ellipsis">
                  {user.userName}
                </div>
                <div className="ml-auto flex items-center">
                  <AudioIcon className="ml-3 text-gray-500 hover:text-white transition-all" />
                  <PhoneIcon className="ml-3 text-gray-500 hover:text-white transition-all" />
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Current User */}
        <div className="bg-black/25 p-5 border-t border-white/8">
          <div className="flex items-center">
            <div className="w-[38px] h-[38px] rounded-full bg-gray-700 flex items-center justify-center border-2 border-white/20 shadow-md">
              <UserIcon />
            </div>
            <div className="ml-3.5 flex-grow text-white font-bold text-sm overflow-hidden whitespace-nowrap text-ellipsis">
              {currentUser.userName}
            </div>
            <div className="ml-auto flex items-center">
              <AudioIcon className="ml-4 text-gray-500 cursor-pointer hover:text-white transition-all p-1.5 rounded-full hover:bg-white/10 hover:scale-110" />
              <SettingsIcon className="ml-4 text-gray-500 cursor-pointer hover:text-white transition-all p-1.5 rounded-full hover:bg-white/10 hover:scale-110" />
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="flex-grow flex flex-col bg-gray-50 relative">
        {/* Header */}
        <div className="flex justify-center p-4 m-5 mt-5 mb-0 rounded-2xl bg-white shadow-md z-1">
          {!isInRoom ? (
            <div className="text-lg font-bold text-gray-800">Not in a room yet</div>
          ) : (
            <div className="text-lg font-bold text-gray-800">Watch Party: {roomCode}</div>
          )}
        </div>

        {/* Video Content */}
        <div className="flex-grow m-5 rounded-3xl bg-white shadow-md flex justify-center items-center overflow-hidden relative">
          {!stompClient ? (
            <div className="flex flex-col items-center justify-center gap-6 h-full w-full bg-gradient-to-br from-purple-50 to-purple-100 p-15">
              <div className="w-25 h-25 rounded-full bg-purple-100 flex items-center justify-center shadow-lg">
                <DisconnectIcon style={{ fontSize: 48, color: "#7c4dff", opacity: 0.8 }} />
              </div>
              <div className="max-w-xs text-center text-gray-700 leading-relaxed font-medium">
                WebSocket not connected. Please create or join a room to start your watch party.
              </div>
              <div className="flex gap-4 mt-6">
                {!isInRoom && (
                  <>
                    <button
                      onClick={() => setCreateRoomModalOpen(true)}
                      className="px-6 py-3 rounded-xl font-bold text-white bg-gradient-to-r from-purple-600 to-purple-900 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                    >
                      <PlusCircleIcon />
                      <span>Create Room</span>
                    </button>
                    <button
                      onClick={() => setJoinRoomModalOpen(true)}
                      className="px-6 py-3 rounded-xl font-bold text-gray-800 bg-white border border-gray-100 shadow-md transition-all hover:-translate-y-1 hover:shadow-lg flex items-center gap-2"
                    >
                      <SearchIcon />
                      <span>Join Room</span>
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

      {/* Create Room Modal */}
      {createRoomModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-80 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Create New Room</h3>
            </div>
            <div className="p-6">
              <div className="mb-5 text-center text-gray-600">
                Create a new watch party and invite your friends!
              </div>
              <button
                onClick={handleCreateRoom}
                className="w-full h-12 text-base font-semibold rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg flex items-center justify-center gap-2"
              >
                <PlusCircleIcon />
                Create Room
              </button>
              <div className="mt-4 text-right">
                <button
                  onClick={() => setCreateRoomModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Join Room Modal */}
      {joinRoomModalOpen && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white w-96 rounded-2xl shadow-2xl overflow-hidden">
            <div className="px-6 py-4 border-b border-gray-100">
              <h3 className="text-lg font-bold text-gray-800">Join Watch Party</h3>
            </div>
            <div className="p-6">
              <div className="mb-5 text-center text-gray-600 font-medium">
                Enter a room code to join your friend's watch party
              </div>
              <div className="flex gap-3">
                <input
                  value={roomCodeInput}
                  onChange={(e) => setRoomCodeInput(e.target.value)}
                  placeholder="Enter room code"
                  className="flex-1 px-4 py-3 text-base rounded-xl border border-gray-200 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
                <button
                  onClick={handleJoinRoom}
                  className="px-4 py-3 rounded-xl bg-gradient-to-r from-purple-600 to-purple-800 text-white shadow-md transition-all hover:-translate-y-1 hover:shadow-lg"
                >
                  Join
                </button>
              </div>
              <div className="mt-4 text-right">
                <button
                  onClick={() => setJoinRoomModalOpen(false)}
                  className="text-gray-500 hover:text-gray-700"
                >
                  Cancel
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