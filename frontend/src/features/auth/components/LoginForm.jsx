import React, { useState } from "react";
import { Link } from "react-router-dom";
import { Mail, Lock, ArrowRight, Loader2, Eye, EyeOff } from "lucide-react";
import SocialButtons from "../../../components/ui/SocialButtons";
import useAuth from "../../../hooks/useAuth";

const LoginForm = () => {
  const { login } = useAuth();
  const [formData, setFormData] = useState({ email: "", password: "" });
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState("");

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    setError("");
    try {
      await login(formData);
    } catch (err) {
      const status = err.response?.status;
      const message = err.response?.data?.message;
      if (status === 401) {
        setError("Email or password is incorrect.");
      } else if (status === 403) {
        setError("Your account has been locked. Please contact support.");
      } else if (status === 422) {
        const firstError =
          err.response?.data?.errors?.[0]?.message || "Invalid input.";
        setError(firstError);
      } else {
        setError(message || "Something went wrong. Please try again.");
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Header */}
      <div className="text-center">
        <div className="w-14 h-14 bg-gradient-to-br from-text-primary to-neutral-400 text-bg-main text-[32px] font-bold flex items-center justify-center rounded-xl mx-auto mb-5 shadow-lg transition-all duration-300 hover:scale-105 hover:-rotate-2 hover:shadow-xl">
          <span>N</span>
        </div>
        <h1 className="text-[28px] font-bold m-0 mb-2 bg-gradient-to-br from-text-primary to-neutral-400 bg-clip-text text-transparent">
          Welcome back
        </h1>
        <p className="text-text-secondary text-sm m-0 mb-8">
          Log in to your Notion account
        </p>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="mb-4 px-4 py-3 rounded-lg bg-red-500/10 border border-red-500/30 text-red-400 text-sm">
          {error}
        </div>
      )}

      {/* Form */}
      <form className="text-left" onSubmit={handleSubmit}>
        {/* Email */}
        <div className="mb-4">
          <label
            htmlFor="email"
            className="block text-[13px] font-medium text-text-secondary mb-2"
          >
            Email
          </label>
          <div className="relative flex items-center">
            <Mail
              className="absolute left-3.5 text-text-tertiary pointer-events-none transition-colors duration-200"
              size={18}
            />
            <input
              id="email"
              name="email"
              type="email"
              placeholder="Enter your email address..."
              value={formData.email}
              onChange={handleChange}
              required
              className="w-full py-3 pr-3.5 pl-11 bg-white/[0.03] border border-border-subtle rounded-lg text-text-primary text-[15px] outline-none transition-all duration-200 hover:border-border-focused hover:bg-white/[0.05] focus:border-accent-primary focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(35,131,226,0.35)] placeholder:text-text-tertiary"
            />
          </div>
        </div>

        {/* Password */}
        <div className="mb-5">
          <label
            htmlFor="password"
            className="block text-[13px] font-medium text-text-secondary mb-2"
          >
            Password
          </label>
          <div className="relative flex items-center">
            <Lock
              className="absolute left-3.5 text-text-tertiary pointer-events-none"
              size={18}
            />
            <input
              id="password"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Enter your password..."
              value={formData.password}
              onChange={handleChange}
              required
              className="w-full py-3 pr-10 pl-11 bg-white/[0.03] border border-border-subtle rounded-lg text-text-primary text-[15px] outline-none transition-all duration-200 hover:border-border-focused hover:bg-white/[0.05] focus:border-accent-primary focus:bg-white/[0.05] focus:shadow-[0_0_0_3px_rgba(35,131,226,0.35)] placeholder:text-text-tertiary"
            />
            <button
              type="button"
              className="absolute right-3 bg-transparent border-none text-text-tertiary cursor-pointer p-1 flex items-center justify-center transition-colors duration-200 hover:text-text-primary"
              onClick={() => setShowPassword(!showPassword)}
              tabIndex={-1}
            >
              {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
            </button>
          </div>
        </div>

        <button
          type="submit"
          className="w-full py-3 px-5 border-none rounded-lg text-[15px] font-semibold cursor-pointer flex items-center justify-center gap-2 transition-all duration-200 bg-gradient-to-br from-accent-primary to-accent-hover text-white shadow-[0_2px_8px_rgba(35,131,226,0.3)] hover:enabled:-translate-y-0.5 hover:enabled:shadow-[0_4px_16px_rgba(35,131,226,0.4)] active:enabled:translate-y-0 disabled:opacity-70 disabled:cursor-not-allowed"
          disabled={isLoading}
        >
          {isLoading ? (
            <>
              <Loader2 className="animate-spin" size={18} />
              <span>Signing in...</span>
            </>
          ) : (
            <>
              <span>Continue with Email</span>
              <ArrowRight
                className="transition-transform duration-200 group-hover:translate-x-1"
                size={18}
              />
            </>
          )}
        </button>

        {/* Divider */}
        <div className="my-6 flex items-center text-text-tertiary text-xs uppercase tracking-wide">
          <span className="flex-1 border-b border-border-subtle"></span>
          <span className="px-4">OR</span>
          <span className="flex-1 border-b border-border-subtle"></span>
        </div>

        <SocialButtons mode="login" />
      </form>

      {/* Footer */}
      <div className="mt-8 text-sm text-text-secondary">
        <p className="m-0">
          Don't have an account?{" "}
          <Link
            to="/register"
            className="text-accent-primary font-medium no-underline transition-all duration-200 hover:text-white hover:drop-shadow-[0_0_8px_rgba(35,131,226,0.8)]"
          >
            Sign up
          </Link>
        </p>
      </div>
    </>
  );
};

export default LoginForm;
