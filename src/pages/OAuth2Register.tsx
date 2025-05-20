import React, { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../apis/system/AuthApi';
import FormInput from '../components/FormInput';

interface RegisterFormState {
  email: string;
  username: string;
  oauthId: string;
}

const OAuth2Register: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [isLoading, setIsLoading] = useState(false);

  const [form, setForm] = useState<RegisterFormState>({
    email: '',
    username: '',
    oauthId: '',
  });

  const [errors, setErrors] = useState({
    email: '',
    username: '',
  });

  // 从URL获取参数
  useEffect(() => {
    const oauthId = searchParams.get('oauthId');
    const login = searchParams.get('login');

    if (oauthId) {
      setForm(prev => ({
        ...prev,
        oauthId,
        username: login || '',
      }));
    } else {
      // 没有必要参数，返回登录页
      toast.error('注册信息不完整', {
        position: "top-left",
      });
      navigate('/login');
    }
  }, [searchParams, navigate]);

  // 表单处理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setForm({
      ...form,
      [name]: value,
    });

    // 清除错误
    if (errors[name as keyof typeof errors]) {
      setErrors({
        ...errors,
        [name]: '',
      });
    }
  };

  // 表单验证
  const validateForm = (): boolean => {
    let valid = true;
    const newErrors = { email: '', username: '' };

    // 验证邮箱
    if (!form.email.trim()) {
      newErrors.email = '请输入邮箱';
      valid = false;
    } else if (!/^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/.test(form.email)) {
      newErrors.email = '请输入有效的邮箱地址';
      valid = false;
    }

    // 验证用户名
    if (!form.username.trim()) {
      newErrors.username = '请输入用户名';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // 提交表单
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      const response = await authApi.completeOAuthRegistration(
        form.email,
        form.oauthId,
        form.username
      );

      if (response && response.token) {
        localStorage.setItem('token', response.token);
        toast.success('注册成功，欢迎加入！', {
          position: "top-left",
          autoClose: 2000
        });
        navigate('/home');
      } else {
        throw new Error('注册失败');
      }
    } catch (error) {
      console.error("OAuth注册失败", error);
      toast.error('注册失败，请稍后再试或使用其他方式登录', {
        position: "top-left",
      });
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
      <div className="bg-white p-8 rounded-lg shadow-lg max-w-md w-full">
        <h2 className="text-2xl font-bold text-gray-800 mb-6">完成快捷登录注册</h2>
        <p className="text-sm text-gray-600 mb-8">请提供以下信息完成您的账户设置</p>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* 邮箱 */}
          <FormInput
            label='邮箱'
            name='email'
            type='email'
            value={form.email}
            onChange={handleChange}
            error={errors.email}
            placeholder='请输入邮箱'
          />

          {/* 用户名 */}
          <FormInput
            label='用户名'
            name='username'
            value={form.username}
            onChange={handleChange}
            error={errors.username}
            placeholder='请输入用户名'
          />

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中...
              </span>
            ) : "完成注册"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default OAuth2Register;