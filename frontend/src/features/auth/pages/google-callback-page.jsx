import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuth from "@/hooks/useAuth";

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams();
  const { loginWithOAuth } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false);

  useEffect(() => {
    // Guard against React strict-mode double-invoke
    if (handled.current) return;
    handled.current = true;

    const accessToken = searchParams.get("accessToken");
    const refreshToken = searchParams.get("refreshToken");
    const userRaw = searchParams.get("user");
    const error = searchParams.get("error");

    if (error || !accessToken || !refreshToken || !userRaw) {
      navigate("/auth/login?error=oauth_failed", { replace: true });
      return;
    }

    try {
      const user = JSON.parse(userRaw);
      loginWithOAuth({ accessToken, refreshToken, user });
    } catch {
      navigate("/auth/login?error=oauth_failed", { replace: true });
    }
  }, [searchParams, loginWithOAuth, navigate]);

  return (
    <div className="flex items-center justify-center min-h-screen bg-bg-primary">
      <div className="flex flex-col items-center gap-4 text-text-secondary">
        <svg
          className="animate-spin w-8 h-8 text-text-primary"
          fill="none"
          viewBox="0 0 24 24"
        >
          <circle
            className="opacity-25"
            cx="12"
            cy="12"
            r="10"
            stroke="currentColor"
            strokeWidth="4"
          />
          <path
            className="opacity-75"
            fill="currentColor"
            d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z"
          />
        </svg>
        <span className="text-sm">Đang đăng nhập...</span>
      </div>
    </div>
  );
}
