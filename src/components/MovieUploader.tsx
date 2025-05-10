import React, { useState } from 'react';
import { toast } from 'react-toastify';
import { FilmIcon, FileUploadIcon } from './Icons';
import { roomApi } from '../apis/room/RoomApi';

interface MovieUploaderProps {
  roomCode: string;
  onUploadComplete: () => void;
  onCancel: () => void;
}

const MovieUploader: React.FC<MovieUploaderProps> = ({ roomCode, onUploadComplete, onCancel }) => {
  // 状态管理
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [movieTitle, setMovieTitle] = useState<string>('');
  const [movieDescription, setMovieDescription] = useState<string>('');
  const [selectedFile, setSelectedFile] = useState<File | null>(null);

  // 处理文件选择
  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      setSelectedFile(e.target.files[0]);
    }
  };

  // 处理拖放文件
  const handleDrop = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();

    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      const file = e.dataTransfer.files[0];
      if (file.type.startsWith('video/')) {
        setSelectedFile(file);
      } else {
        toast.error('请上传视频文件', {
          position: 'top-center',
          autoClose: 2000,
        });
      }
    }
  };

  // 处理拖拽事件（防止默认行为）
  const handleDragOver = (e: React.DragEvent<HTMLDivElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  // 处理电影上传
  const handleUploadMovie = async () => {
    if (!selectedFile || !movieTitle || !movieDescription || !roomCode) {
      toast.error('请填写电影标题、描述并选择文件', {
        position: 'top-center',
        autoClose: 2000,
      });
      return;
    }

    try {
      setIsUploading(true);

      // 创建 FormData 对象
      const formData = new FormData();
      formData.append('file', selectedFile);
      formData.append('title', movieTitle);
      if (movieDescription) {
        formData.append('description', movieDescription);
      }

      // 调用上传 API
      await roomApi.uploadMovie(formData, (progress) => {
        setUploadProgress(progress);
      });

      toast.success('电影上传成功！', {
        position: 'top-center',
        autoClose: 2000,
      });

      // 清理状态
      setMovieTitle('');
      setMovieDescription('');
      setSelectedFile(null);
      setUploadProgress(0);

      // 调用完成回调
      onUploadComplete();
    } catch (error) {
      console.error('上传电影失败:', error);
      toast.error('上传失败，请稍后重试', {
        position: 'top-center',
        autoClose: 3000,
      });
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div className="space-y-4">
      <div className="mb-5 text-center text-gray-600">
        上传电影以与房间内的所有人一起观看
      </div>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            电影标题 <span className="text-red-500">*</span>
          </label>
          <input
            type="text"
            value={movieTitle}
            onChange={(e) => setMovieTitle(e.target.value)}
            placeholder="输入电影标题"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            disabled={isUploading}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            电影描述 <span className="text-red-500">*</span>
          </label>
          <textarea
            value={movieDescription}
            onChange={(e) => setMovieDescription(e.target.value)}
            placeholder="输入电影描述"
            className="w-full px-4 py-2 rounded-lg border border-gray-300 focus:outline-none focus:ring-2 focus:ring-purple-500 focus:border-transparent h-24 resize-none"
            disabled={isUploading}
            required
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            电影文件 <span className="text-red-500">*</span>
          </label>
          <div
            className="border-2 border-dashed border-gray-300 rounded-lg p-6 text-center relative"
            onDragOver={handleDragOver}
            onDrop={handleDrop}
          >
            {selectedFile ? (
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <FilmIcon style={{ fontSize: 32, color: "#6d28d9" }} />
                </div>
                <p className="text-sm font-medium text-gray-900">{selectedFile.name}</p>
                <p className="text-xs text-gray-500">{(selectedFile.size / (1024 * 1024)).toFixed(2)} MB</p>
                <button
                  className="text-sm text-purple-600 hover:text-purple-800"
                  onClick={() => setSelectedFile(null)}
                  disabled={isUploading}
                  type="button"
                >
                  更换文件
                </button>
              </div>
            ) : (
              <div className="space-y-2">
                <div className="flex items-center justify-center">
                  <FileUploadIcon style={{ fontSize: 32, color: "#6d28d9" }} />
                </div>
                <p className="text-sm font-medium text-gray-900">点击选择或拖放文件</p>
                <p className="text-xs text-gray-500">支持 MP4, WebM 等视频格式</p>
              </div>
            )}
            <input
              type="file"
              accept="video/*"
              onChange={handleFileSelect}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
              disabled={isUploading}
            />
          </div>
        </div>

        {isUploading && (
          <div className="space-y-2">
            <div className="w-full bg-gray-200 rounded-full h-2.5">
              <div
                className="bg-purple-600 h-2.5 rounded-full transition-all duration-300"
                style={{ width: `${uploadProgress}%` }}
              ></div>
            </div>
            <p className="text-xs text-gray-500 text-right">{uploadProgress}%</p>
          </div>
        )}
      </div>

      <div className="mt-6 flex justify-end space-x-3">
        <button
          onClick={onCancel}
          className="px-4 py-2 bg-gray-200 text-gray-800 rounded-md hover:bg-gray-300 transition-colors"
          disabled={isUploading}
          type="button"
        >
          取消
        </button>
        <button
          onClick={handleUploadMovie}
          className="px-4 py-2 bg-gradient-to-r from-purple-400 to-purple-500 text-white rounded-md hover:shadow-md transition-all"
          disabled={isUploading || !selectedFile || !movieTitle || !movieDescription}
          type="button"
        >
          {isUploading ? (
            <div className="flex items-center">
              <div className="animate-spin mr-2 h-4 w-4 border-2 border-white border-t-transparent rounded-full"></div>
              上传中...
            </div>
          ) : '上传电影'}
        </button>
      </div>
    </div>
  );
};

export default MovieUploader;