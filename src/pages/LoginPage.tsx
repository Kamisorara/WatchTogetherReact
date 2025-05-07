import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../apis/system/AuthApi';
import FormInput from '../components/FormInput';

// 定义表单值类型
interface FormValues {
  userName: string;
  userPassword: string;
  agreeToTerms: boolean;
}

// 定义OAuth注册表单类型
interface OAuthRegisterForm {
  email: string;
  username: string;
  oauthId: string;
}

const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();

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
  const [isGithubLoading, setIsGithubLoading] = useState(false);

  // OAuth注册表单状态
  const [showOAuthRegister, setShowOAuthRegister] = useState(false);
  const [oauthRegisterForm, setOAuthRegisterForm] = useState<OAuthRegisterForm>({
    email: '',
    username: '',
    oauthId: '',
  });
  const [oauthRegisterErrors, setOAuthRegisterErrors] = useState({
    email: '',
    username: '',
  });

  // GitHub登录处理
  const handleGithubLogin = async () => {
    try {
      setIsGithubLoading(true);
      // 获取GitHub OAuth URL
      const response = await authApi.getGithubOAuthUrl();
      // 重定向到GitHub授权页面
      window.location.href = response.url;
    } catch (error) {
      console.error("获取GitHub认证URL失败", error);
      toast.error('GitHub登录暂时不可用，请稍后再试', {
        position: "top-left",
      });
    } finally {
      setIsGithubLoading(false);
    }
  };

  // OAuth注册表单处理
  const handleOAuthRegisterChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setOAuthRegisterForm({
      ...oauthRegisterForm,
      [name]: value,
    });

    // 清除错误
    if (oauthRegisterErrors[name as keyof typeof oauthRegisterErrors]) {
      setOAuthRegisterErrors({
        ...oauthRegisterErrors,
        [name]: '',
      });
    }
  };

  // 验证OAuth注册表单
  const validateOAuthRegisterForm = (): boolean => {
    let valid = true;
    const newErrors = { email: '', username: '' };

    // 验证邮箱
    if (!oauthRegisterForm.email.trim()) {
      newErrors.email = '请输入邮箱';
      valid = false;
    } else if (!/^[\w.-]+@([\w-]+\.)+[\w-]{2,4}$/.test(oauthRegisterForm.email)) {
      newErrors.email = '请输入有效的邮箱地址';
      valid = false;
    }

    // 验证用户名
    if (!oauthRegisterForm.username.trim()) {
      newErrors.username = '请输入用户名';
      valid = false;
    }

    setOAuthRegisterErrors(newErrors);
    return valid;
  };

  // 提交OAuth注册表单
  const handleOAuthRegisterSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!validateOAuthRegisterForm()) return;

    setIsLoading(true);

    try {
      const response = await authApi.completeOAuthRegistration(
        oauthRegisterForm.email,
        oauthRegisterForm.oauthId,
        oauthRegisterForm.username
      );

      if (response && response.token) {
        localStorage.setItem('token', response.token);
        toast.success('注册成功，欢迎加入！', {
          position: "top-left",
          autoClose: 2000
        });
        navigate('/home');
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

  // 检查URL参数中的OAuth信息
  useEffect(() => {
    // 检查是否需要完成GitHub注册
    const oauthId = searchParams.get('oauthId');
    const provider = searchParams.get('provider');
    const needEmail = searchParams.get('needEmail');

    if (oauthId && provider && needEmail === 'true') {
      // 显示注册表单，让用户填写邮箱
      setShowOAuthRegister(true);
      setOAuthRegisterForm({
        ...oauthRegisterForm,
        oauthId: `${provider}_${oauthId}`,
        username: searchParams.get('suggestedUsername') || ''
      });

      // 清除URL参数
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      // 正常的Token验证流程
      const verifyToken = async () => {
        const token = localStorage.getItem("token");
        if (token) {
          try {
            const response = await authApi.getUserInfoFromToken();
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
    }
  }, [navigate, searchParams]);

  // 渲染OAuth注册表单
  const renderOAuthRegisterForm = () => (
    <form onSubmit={handleOAuthRegisterSubmit} className="mt-8 space-y-6">
      <h3 className="text-lg font-medium text-gray-900">完成注册</h3>
      <p className="text-sm text-gray-600">请填写以下信息完成注册</p>

      {/* 邮箱 */}
      <FormInput
        label='邮箱'
        name='email'
        type='email'
        value={oauthRegisterForm.email}
        onChange={handleOAuthRegisterChange}
        error={oauthRegisterErrors.email}
        placeholder='请输入邮箱'
      />

      {/* 用户名 */}
      <FormInput
        label='用户名'
        name='username'
        value={oauthRegisterForm.username}
        onChange={handleOAuthRegisterChange}
        error={oauthRegisterErrors.username}
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
  );

  // 渲染正常登录表单
  const renderLoginForm = () => (
    <>
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

      {/* github授权登录 */}
      <div className="mt-8">
        <div className="relative">
          <div className="absolute inset-0 flex items-center">
            <div className="w-full border-t border-gray-300"></div>
          </div>
          <div className="relative flex justify-center text-sm">
            <span className="px-2 bg-white text-gray-500">或者使用以下方式登录</span>
          </div>
        </div>

        <div className="mt-6">
          <button
            type="button"
            onClick={handleGithubLogin}
            disabled={isGithubLoading}
            className="w-full flex justify-center items-center py-2.5 px-4 border rounded-lg shadow-sm bg-gray-800 hover:bg-gray-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500 transition-all disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {isGithubLoading ? (
              <span className="flex items-center justify-center">
                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                处理中...
              </span>
            ) : (
              <>
                <svg className="h-5 w-5 mr-2" fill="white" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 24 24">
                  <path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12" />
                </svg>
                <span className="text-white font-medium">使用 GitHub 账号登录</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* 前往注册 */}
      <div className="mt-6 text-center">
        <p className="text-sm text-gray-600">
          还没有账号？
          <Link to="/register" className="font-medium text-indigo-600 hover:text-indigo-700 ml-1">
            立即注册
          </Link>
        </p>
      </div>
    </>
  );

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
                <h2 className="text-2xl font-bold text-gray-800">
                  {showOAuthRegister ? '完成注册' : '欢迎回来'}
                </h2>
                <p className="mt-2 text-sm text-gray-600">
                  {showOAuthRegister
                    ? '请填写以下信息完成注册'
                    : '请登录您的账号继续访问'}
                </p>
              </div>

              {showOAuthRegister ? renderOAuthRegisterForm() : renderLoginForm()}
            </div>
          </div>
        </div>
      </div>
    </>
  );
};

export default LoginPage;