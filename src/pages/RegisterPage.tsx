import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { toast } from 'react-toastify';
import { authApi } from '../apis/system/AuthApi';
import FormInput from '../components/FormInput';

// 定义表单值类型
interface FormValues {
  username: string;
  password: string;
  passwordRepeat: string;
  email: string;
  agreeToTerms: boolean;
}

const RegisterPage: React.FC = () => {
  const navigate = useNavigate();
  const [form, setForm] = useState<FormValues>({
    username: '',
    password: '',
    passwordRepeat: '',
    email: '',
    agreeToTerms: false,
  });

  const [errors, setErrors] = useState({
    username: '',
    password: '',
    passwordRepeat: '',
    email: '',
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
    const newErrors = {
      username: '',
      password: '',
      passwordRepeat: '',
      email: ''
    };

    // 验证用户名
    if (!form.username.trim()) {
      newErrors.username = '请输入用户名';
      valid = false;
    } else if (form.username.trim().length < 3) {
      newErrors.username = '用户名至少需要3个字符';
      valid = false;
    }

    // 验证密码
    if (!form.password) {
      newErrors.password = '请输入密码';
      valid = false;
    } else if (form.password.length < 6) {
      newErrors.password = '密码至少需要6个字符';
      valid = false;
    }

    // 验证确认密码
    if (!form.passwordRepeat) {
      newErrors.passwordRepeat = '请确认密码';
      valid = false;
    } else if (form.password !== form.passwordRepeat) {
      newErrors.passwordRepeat = '两次输入的密码不一致';
      valid = false;
    }

    // 验证邮箱
    if (!form.email) {
      newErrors.email = '请输入邮箱';
      valid = false;
    } else {
      const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
      if (!emailRegex.test(form.email)) {
        newErrors.email = '请输入有效的邮箱地址';
        valid = false;
      }
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
      const response = await authApi.register(
        form.username,
        form.password,
        form.passwordRepeat,
        form.email
      );

      console.log(response);

      if (response) {
        toast.success('注册成功！', {
          position: "top-left",
          autoClose: 2000,
          toastId: "register-success",
        });

        // 注册成功后延迟跳转到登录页
        setTimeout(() => {
          navigate("/login");
        }, 1500);
      } else {
        toast.error('注册失败，请重试', {
          position: "top-left",
        });
      }
    } catch (error) {
      console.error("注册失败", error);
      toast.error('注册请求失败，请稍后再试', {
        position: "top-left",
      });
    } finally {
      setIsLoading(false);
    }
  };

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
              <h2 className="text-4xl font-bold text-white mb-6">加入我们</h2>
              <p className="text-white text-lg opacity-90 mb-8">
                创建一个账号，开启您的共享观影之旅。与朋友一起分享精彩瞬间，共同讨论您喜爱的影片！
              </p>
              <div className="flex space-x-2">
                <span className="h-2 w-2 bg-white rounded-full animate-pulse"></span>
                <span className="h-2 w-2 bg-white rounded-full animate-pulse delay-100"></span>
                <span className="h-2 w-2 bg-white rounded-full animate-pulse delay-200"></span>
              </div>
            </div>
          </div>

          {/* 右侧注册区域 */}
          <div className="w-full md:w-1/2 p-8">
            <div className="max-w-md mx-auto">
              <div className="text-center md:text-left">
                <h2 className="text-2xl font-bold text-gray-800">创建账号</h2>
                <p className="mt-2 text-sm text-gray-600">填写以下信息完成注册</p>
              </div>

              <form onSubmit={handleSubmit} className="mt-8 space-y-4">
                {/* 用户名 */}
                <FormInput
                  label='用户名'
                  name='username'
                  value={form.username}
                  onChange={handleChange}
                  error={errors.username}
                  placeholder='请输入用户名'
                />

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

                {/* 密码 */}
                <FormInput
                  label='密码'
                  name='password'
                  type='password'
                  value={form.password}
                  onChange={handleChange}
                  error={errors.password}
                  placeholder='请输入密码'
                />

                {/* 确认密码 */}
                <FormInput
                  label='确认密码'
                  name='passwordRepeat'
                  type='password'
                  value={form.passwordRepeat}
                  onChange={handleChange}
                  error={errors.passwordRepeat}
                  placeholder='请再次输入密码'
                />

                <div className="flex items-start mt-4">
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
                  className="w-full py-3 px-4 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:from-indigo-600 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-400 focus:ring-opacity-75 transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-6"
                >
                  {isLoading ? (
                    <span className="flex items-center justify-center">
                      <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      处理中...
                    </span>
                  ) : "立即注册"}
                </button>
              </form>

              <div className="mt-6 text-center">
                <p className="text-sm text-gray-600">
                  已经有账号？
                  <Link to="/login" className="font-medium text-indigo-600 hover:text-indigo-700 ml-1">
                    立即登录
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

export default RegisterPage;