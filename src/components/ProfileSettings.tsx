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

  // 新增密码修改相关状态
  const [newPassword, setNewPassword] = useState<string>('');
  const [confirmPassword, setConfirmPassword] = useState<string>('');
  const [passwordError, setPasswordError] = useState<string>('');
  const [isUpdatingPassword, setIsUpdatingPassword] = useState<boolean>(false);
  const [showPasswordSection, setShowPasswordSection] = useState<boolean>(false);

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

  // 处理密码更新
  const handlePasswordUpdate = async () => {
    // 验证密码
    if (!newPassword || !confirmPassword) {
      setPasswordError('请输入密码');
      return;
    }

    if (newPassword !== confirmPassword) {
      setPasswordError('两次输入的密码不一致');
      return;
    }

    if (newPassword.length < 6) {
      setPasswordError('密码长度至少6位');
      return;
    }

    setPasswordError('');
    setIsUpdatingPassword(true);

    try {
      await authApi.updatePassword(newPassword, confirmPassword);
      toast.success('密码修改成功', { position: "top-center" });
      // 清空输入框
      setNewPassword('');
      setConfirmPassword('');
      setShowPasswordSection(false);
    } catch (error) {
      console.error('密码修改失败', error);
      toast.error('密码修改失败，请重试', { position: "top-center" });
    } finally {
      setIsUpdatingPassword(false);
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

        {/* 密码修改区域 */}
        <div className="border-t pt-4 mt-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="font-medium text-gray-700 flex items-center">
              <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2 text-purple-500" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M5 9V7a5 5 0 0110 0v2a2 2 0 012 2v5a2 2 0 01-2 2H5a2 2 0 01-2-2v-5a2 2 0 012-2zm8-2v2H7V7a3 3 0 016 0z" clipRule="evenodd" />
              </svg>
              密码设置
            </h3>
            <button
              onClick={() => setShowPasswordSection(!showPasswordSection)}
              className="text-purple-600 text-sm hover:text-purple-800 focus:outline-none flex items-center transition-all duration-200 bg-purple-50 hover:bg-purple-100 px-3 py-1 rounded-full"
            >
              {showPasswordSection ? (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  取消修改
                </>
              ) : (
                <>
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  修改密码
                </>
              )}
            </button>
          </div>

          <div
            className={`transition-all duration-300 ease-in-out ${showPasswordSection ? 'max-h-80 opacity-100' : 'max-h-0 opacity-0 overflow-hidden'
              }`}
          >
            <div className="bg-white p-5 rounded-lg space-y-4 border border-purple-100 shadow-sm transform transition-all duration-300">
              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">新密码</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={newPassword}
                    onChange={e => setNewPassword(e.target.value)}
                    placeholder="请输入新密码"
                  />
                </div>
              </div>

              <div className="relative">
                <label className="block text-sm font-medium text-gray-700 mb-1">确认密码</label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                    </svg>
                  </div>
                  <input
                    type="password"
                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent transition-all"
                    value={confirmPassword}
                    onChange={e => setConfirmPassword(e.target.value)}
                    placeholder="请再次输入新密码"
                  />
                </div>
                {passwordError && (
                  <p className="text-red-500 text-xs mt-2 flex items-center">
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    {passwordError}
                  </p>
                )}
              </div>

              <div className="pt-2">
                <button
                  onClick={handlePasswordUpdate}
                  className="w-full px-4 py-2 bg-gradient-to-r from-purple-500 to-purple-600 text-white rounded-md shadow hover:shadow-lg transform hover:-translate-y-0.5 transition-all disabled:opacity-70 disabled:transform-none"
                  disabled={isUpdatingPassword}
                >
                  {isUpdatingPassword ? (
                    <div className="flex items-center justify-center">
                      <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin mr-2"></div>
                      更新中...
                    </div>
                  ) : (
                    <div className="flex items-center justify-center">
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7H5a2 2 0 00-2 2v9a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-3m-1 4l-3 3m0 0l-3-3m3 3V4" />
                      </svg>
                      更新密码
                    </div>
                  )}
                </button>
              </div>

              <div className="text-xs text-gray-500 mt-2 flex items-start">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 mr-1 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span>密码必须至少6位，建议使用包含大小写字母、数字和特殊符号的组合以提高安全性</span>
              </div>
            </div>
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