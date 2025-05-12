import React, { useRef, useState } from "react";
import { AudioIcon, UserIcon } from "./Icons";
import { User, authApi } from "../apis/system/AuthApi";
import { toast } from 'react-toastify';

interface ProfileSettingsProps {
  user: User;
  isMuted: boolean;
  toggleMute: () => void;
  onClose: () => void;
  onUserUpdate?: (updatedUser: User) => void; // 保存修改后回调
}

const ProfileSettings: React.FC<ProfileSettingsProps> = ({
  user,
  isMuted,
  toggleMute,
  onClose,
  onUserUpdate
}) => {
  // 表单字段的本地状态
  const [userPhone, setUserPhone] = useState<string>(user.userPhone || '');
  const [userSex, setUserSex] = useState<string>(user.userSex || '2'); // 如果未设置，为未知
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [avatarUrl, setAvatarUrl] = useState<string>(user.userAvatar || '');
  const [uploadProgress, setUploadProgress] = useState<number>(0);

  // 隐藏文件输入的引用
  const fileInputRef = useRef<HTMLInputElement>(null);

  // 处理头像点击以触发文件选择
  const handleAvatarClick = () => {
    fileInputRef.current?.click();
  };

  // 处理文件选择和上传
  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // 只允许图片文件
    if (!file.type.startsWith('image/')) {
      toast.error('请选择图片文件', { position: "top-center" });
      return;
    }

    try {
      setIsLoading(true);
      setUploadProgress(0);

      // 创建一个本地预览URL让用户立即看到他们选择的图片
      const localPreviewUrl = URL.createObjectURL(file);
      setAvatarUrl(localPreviewUrl); // 立即显示本地预览

      // 使用AuthApi上传头像，添加进度回调
      const response = await authApi.uploadAvatar(file);
      // 清理本地预览URL
      URL.revokeObjectURL(localPreviewUrl);

      // 在本地状态中更新头像为服务器返回的URL
      if (response && response.url) {
        console.log('头像URL:', response.url);
        setAvatarUrl(response.url);

        // 立即更新父组件中的用户头像信息
        if (onUserUpdate) {
          onUserUpdate({
            ...user,
            userAvatar: response.url
          });
        }

        toast.success('头像上传成功', { position: "top-center" });
      } else {
        console.error('Upload response missing URL:', response);
        toast.error('头像上传异常，请重试', { position: "top-center" });
      }
    } catch (error) {
      console.error('上传头像失败', error);
      toast.error('头像上传失败，请重试', { position: "top-center" });
    } finally {
      setIsLoading(false);
      setUploadProgress(0);
    }
  };

  // 保存用户资料更改
  const handleSaveChanges = async () => {
    try {
      setIsLoading(true);

      // 调用API更新用户信息
      const updatedUser = await authApi.updateUserDetailInfo(userPhone, userSex);

      if (updatedUser) {
        toast.success('个人资料已更新', { position: "top-center" });

        // 通知父组件有关更新的用户
        if (onUserUpdate) {
          onUserUpdate(updatedUser);
        }

        onClose();
      }
    } catch (error) {
      console.error('更新用户信息失败', error);
      toast.error('保存个人资料失败，请重试', { position: "top-center" });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="space-y-4">
      {/* 头像部分与文件输入 */}
      <div className="flex flex-col items-center gap-4 mb-6">
        <div
          className="w-20 h-20 rounded-full bg-purple-200 flex items-center justify-center border-2 border-purple-300 shadow-md cursor-pointer relative overflow-hidden hover:opacity-90 transition-opacity"
          onClick={handleAvatarClick}
        >
          {avatarUrl ? (
            <img
              src={avatarUrl}
              alt={user.userName}
              className="w-full h-full object-cover"
              onError={(e) => {
                console.error('Error loading avatar image:', e);
                console.log('Failed avatar URL:', avatarUrl);
                setAvatarUrl('');
              }}
            />
          ) : (
            <UserIcon className="text-purple-700" style={{ fontSize: 30 }} />
          )}

          {isLoading && (
            <div className="absolute inset-0 bg-black bg-opacity-40 flex items-center justify-center flex-col">
              <div className="w-8 h-8 border-2 border-t-transparent border-white rounded-full animate-spin mb-1"></div>
              {uploadProgress > 0 && (
                <div className="text-white text-xs font-medium">{uploadProgress}%</div>
              )}
            </div>
          )}

          <div className="absolute bottom-0 left-0 right-0 bg-black bg-opacity-50 text-white text-xs py-1 text-center">
            点击修改
          </div>
        </div>
        <input
          type="file"
          ref={fileInputRef}
          className="hidden"
          accept="image/*"
          onChange={handleFileChange}
        />
        <p className="text-lg font-bold">{user.userName}</p>
      </div>

      <div className="space-y-4">
        {/* 用户名 - 禁用 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">用户名</label>
          <input
            type="text"
            className="w-full px-4 py-2 border border-gray-300 rounded-md bg-gray-100 cursor-not-allowed"
            value={user.userName}
            disabled
          />
          <p className="text-xs text-gray-500 mt-1">用户名不可修改</p>
        </div>

        {/* 手机号 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">手机号</label>
          <input
            type="tel"
            className="w-full px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500"
            value={userPhone}
            onChange={e => setUserPhone(e.target.value)}
            placeholder="请输入手机号"
          />
        </div>

        {/* 性别选择 */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">性别</label>
          <div className="flex gap-4">
            <label className="flex items-center">
              <input
                type="radio"
                name="gender"
                value="1"
                checked={userSex === "1"}
                onChange={() => setUserSex("1")}
                className="mr-2 text-purple-600 focus:ring-purple-500"
              />
              男
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="gender"
                value="2"
                checked={userSex === "2"}
                onChange={() => setUserSex("2")}
                className="mr-2 text-purple-600 focus:ring-purple-500"
              />
              女
            </label>
            <label className="flex items-center">
              <input
                type="radio"
                name="gender"
                value="0"
                checked={userSex === "0"}
                onChange={() => setUserSex("0")}
                className="mr-2 text-purple-600 focus:ring-purple-500"
              />
              不公开
            </label>
          </div>
        </div>

        {/* 麦克风设置 */}
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

      {/* 操作按钮 */}
      <div className="flex justify-end gap-3 pt-4">
        <button
          onClick={onClose}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-all"
          disabled={isLoading}
        >
          取消
        </button>
        <button
          onClick={handleSaveChanges}
          className="px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-500 text-white rounded-md shadow hover:shadow-md transition-all disabled:opacity-70"
          disabled={isLoading}
        >
          {isLoading ? (
            <div className="flex items-center justify-center">
              <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
              保存中...
            </div>
          ) : "保存修改"}
        </button>
      </div>
    </div>
  );
};

export default ProfileSettings;