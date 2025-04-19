import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../apis/system/AuthApi';
import FormInput from '../components/FormInput';

// 定义表单值类型
interface FormValues {
  userName: string;
  userPassword: string;
  agreeToTerms: boolean;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormValues>({
    userName: '',
    userPassword: '',
    agreeToTerms: false,
  });
  const [errors, setErrors] = useState({
    userName: '',
    userPassword: '',
  });
  const [isLoading, setIsLoading] = useState(false);

  // 表单处理
  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value, type, checked } = e.target;
    setForm({
      ...form,
      [name]: type === 'checkbox' ? checked : value,
    });

    // 用户开始输入时清除错误
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
    const newErrors = { userName: '', userPassword: '' };

    if (!form.userName.trim()) {
      newErrors.userName = '请输入用户名';
      valid = false;
    }

    if (!form.userPassword.trim()) {
      newErrors.userPassword = '请输入密码';
      valid = false;
    }

    setErrors(newErrors);
    return valid;
  };

  // 表单提交
  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateForm()) return;

    setIsLoading(true);

    try {
      // 使用实际的API调用
      const response = await authApi.login(form.userName, form.userPassword);
      console.log(response);
      if (response) {
        toast.success('登录成功，欢迎回来！', {
          position: "top-left",
          autoClose: 2000,
          toastId: "login-success",
        });
        localStorage.setItem('token', response.token);
        setTimeout(() => {
          navigate("/home");
        }, 1500);
      } else {
        toast.error('账号或密码错误，请重试', {
          position: "top-left",
        });
      }
    } catch (error) {
      console.error("登录失败", error);
      toast.error('登录请求失败，请稍后再试', {
        position: "top-left",
      });
    } finally {
      setIsLoading(false);
    }
  };

  // 验证Token
  useEffect(() => {
    const verifyToken = async () => {
      const token = localStorage.getItem("token");
      if (token) {
        try {
          const response = await authApi.getUserInfoFromToken();
          // console.log("Token验证", response);
          if (response && response.id) {
            toast.success('欢迎回来!', {
              position: "top-right",
              autoClose: 2000,
              toastId: "login-success",
            });
            navigate("/home");
          }
        } catch (error) {
          console.error("Token验证失败", error);
          localStorage.removeItem("token");
        }
      }
    };

    verifyToken();
  }, [navigate]);

  return (
    <>
      <div className="min-h-screen w-full bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center p-4">
        <div className="w-full max-w-5xl flex rounded-2xl shadow-2xl overflow-hidden bg-white">
          {/* 左侧装饰区域 */}
          <div className="hidden md:block md:w-1/2 bg-gradient-to-br from-blue-500 via-indigo-500 to-purple-600 p-12 relative">
            <div className="absolute inset-0 opacity-10">
              <div className="absolute top-10 left-10 w-20 h-20 rounded-full bg-white"></div>
              <div className="absolute bottom-10 right-10 w-32 h-32 rounded-full bg-white"></div>
              <div className="absolute top-1/2 left-1/3 w-16 h-16 rounded-full bg-white"></div>
            </div>
            <div className="relative z-10 h-full flex flex-col justify-center">
              <h2 className="text-4xl font-bold text-white mb-6">共享观影</h2>
              <p className="text-white text-lg opacity-90 mb-8">
                与朋友一起享受精彩影片，实时交流分享感受。登录后即可开始您的观影之旅！
              </p>
              <div className="flex space-x-2">
                <span className="h-2 w-2 bg-white rounded-full animate-pulse"></span>
                <span className="h-2 w-2 bg-white rounded-full animate-pulse delay-100"></span>
                <span className="h-2 w-2 bg-white rounded-full animate-pulse delay-200"></span>
              </div>
            </div>
          </div>

          {/* 右侧登录区域 */}
          <div className="w-full md:w-1/2 p-8">
            <div className="max-w-md mx-auto">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-800">欢迎回来</h2>
                <p className="mt-2 text-sm text-gray-600">请登录您的账号继续访问</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-6">
                {/* 用户名 */}
                <FormInput
                  label='用户名'
                  name='userName'
                  value={form.userName}
                  onChange={handleChange}
                  error={errors.userName}
                  placeholder='请输入用户名'
                />

                {/* 密码 */}
                <FormInput
                  label='密码'
                  name='userPassword'
                  type='password'
                  value={form.userPassword}
                  onChange={handleChange}
                  error={errors.userPassword}
                  placeholder='请输入密码'
                />

                <div className="flex items-start">
                  <input
                    type="checkbox"
                    id="agreeToTerms"
                    name="agreeToTerms"
                    checked={form.agreeToTerms}
                    onChange={handleChange}
                    className="mt-1 h-4 w-4 text-indigo-600 rounded border-gray-300"
                  />
                  <label htmlFor="agreeToTerms" className="ml-2 text-sm text-gray-600">
                    已阅读并同意本网站的
                    <a href="#" className="text-indigo-600 hover:text-indigo-700"> 《服务条款》</a> 与
                    <a href="#" className="text-indigo-600 hover:text-indigo-700"> 《隐私政策》</a>
                  </label>
                </div>

                <button
                  type="submit"
                  disabled={!form.agreeToTerms || isLoading}
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
                  ) : "立即登录"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  还没有账号？
                  <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-700 ml-1">
                    立即注册
                  </Link>
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;