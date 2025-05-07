import React, { useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';

const OAuth2Success: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

  useEffect(() => {
    const token = searchParams.get('token');

    if (token) {
      // 保存token
      localStorage.setItem('token', token);
      toast.success('GitHub登录成功！', {
        position: "top-left",
        autoClose: 2000,
        toastId: "github-login-success",
      });

      // 重定向到首页
      navigate('/home');
    } else {
      toast.error('登录失败，未收到有效令牌', {
        position: "top-left",
      });
      navigate('/login');
    }
  }, [navigate, searchParams]);

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-500 mx-auto"></div>
        <p className="mt-4 text-gray-600">正在登录，请稍候...</p>
      </div>
    </div>
  );
};

export default OAuth2Success;