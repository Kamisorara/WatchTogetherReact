import { InputHTMLAttributes } from "react";

interface FormInputProps extends InputHTMLAttributes<HTMLInputElement> {
  label: string;
  name: string;
  error?: string;
  width?: string; // 宽度
  type?: string; // 输入类型
  containerClassName?: string; // 额外样式
}

const FormInput: React.FC<FormInputProps> = ({ label,
  name,
  error,
  width = 'w-full', // 默认宽度
  containerClassName = '',
  className = '',
  type = 'text', // 默认类型
  ...restProps
}) => {
  return (
    <div className={`${width} ${containerClassName}`}>
      {label && (
        <label
          htmlFor={name}
          className="block text-sm font-medium text-gray-700 mb-1"
        >
          {label}
        </label>
      )}
      <input
        id={name}
        name={name}
        type={type}
        className={`w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-all ${className}`}
        {...restProps}
      />
      <div className="h-6 overflow-hidden"> {/* 固定高度的错误消息容器 */}
        {error && (
          <p className="mt-1 text-sm text-red-600 animate-[bounce_0.3s_ease-out] opacity-100">
            {error}
          </p>
        )}
      </div>
    </div>
  )
};

export default FormInput;