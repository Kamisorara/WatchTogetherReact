import React from "react";
import { AudioIcon, UserIcon } from "./Icons";
import { User } from "../apis/system/AuthApi";

interface ProfileSettingsProps {
  user: User;
  isMuted: boolean;
  toggleMute: () => void;
  onClose: () => void;
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  user,
  isMuted,
  toggleMute,
  onClose,
}) => {
  return (
    <div className="space-y-4">
      <div className="flex flex-col items-center gap-4 mb-6">
        <div className="w-20 h-20 rounded-full bg-purple-200 flex items-center justify-center border-2 border-purple-300 shadow-md">
          <UserIcon className="text-purple-700" style={{ fontSize: 30 }} />
        </div>
        <p className="text-lg font-bold">{user.userName}</p>
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">昵称</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={user.userName}
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
          onClick={onClose}
          className="px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-500 text-white rounded-md shadow hover:shadow-md transition-all"
        >
          确定
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;