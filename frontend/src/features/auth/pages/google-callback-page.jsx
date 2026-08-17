import React, { useEffect, useRef } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import useAuth from "@/features/auth/hooks/useAuth";

export function GoogleCallbackPage() {
  const [searchParams] = useSearchParams(); // hook để đọc query params từ URL (accessToken, user, mode, error)
  const { loginWithOAuth, refreshSession } = useAuth();
  const navigate = useNavigate();
  const handled = useRef(false); // ref để đảm bảo logic trong useEffect chỉ chạy 1 lần (tránh double-invoke của React strict mode)

  useEffect(() => {
    // Guard against React strict-mode double-invoke
    //Nếu không có cờ handled.current, luồng điều hướng và các hàm bên dưới sẽ bị gọi 2 lần, gây ra lỗi chớp màn hình hoặc gọi API dư thừa. Đoạn code này đảm bảo logic bên dưới chỉ chạy đúng 1 lần duy nhất.
    if (handled.current) return;
    handled.current = true; 

    const accessToken = searchParams.get("accessToken");
    const userRaw = searchParams.get("user");
    const mode = searchParams.get("mode");
    const error = searchParams.get("error");

    const resolveLinkErrorMessage = (errorKey) => {
      if (errorKey === "link_conflict") {
        return "Tai khoan nay da duoc lien ket voi nguoi dung khac.";
      }

      if (errorKey === "email_mismatch") {
        return "Email tai khoan lien ket khong trung khop voi email hien tai.";
      }

      return "Lien ket that bai. Vui long thu lai.";
    };

    const setLinkToast = (payload) => {
      sessionStorage.setItem("integrationLinkToast", JSON.stringify(payload));
    };

    const handleLinkFlow = async () => {
      if (error) {
        setLinkToast({
          type: "error",
          message: resolveLinkErrorMessage(error),
        });
        navigate("/mail", { replace: true });
        return;
      }

      try {
        await refreshSession();
        setLinkToast({ type: "success", message: "Lien ket thanh cong." });
        navigate("/mail", { replace: true });
      } catch {
        setLinkToast({
          type: "error",
          message: "Khong the tai lai phien dang nhap.",
        });
        navigate("/auth/login?reason=session_expired", { replace: true });
      }
    };

    if (mode === "link") {
      void handleLinkFlow();
      return;
    }

    if (error || !accessToken || !userRaw) {
      const tryRefreshSession = async () => {
        try {
          await refreshSession();
          navigate("/app", { replace: true });
        } catch {
          navigate("/auth/login?error=oauth_failed", { replace: true });
        }
      };

      void tryRefreshSession();
      return;
    }

    try {
      const user = JSON.parse(userRaw);

      loginWithOAuth({ accessToken, user });
    } catch {
      navigate("/auth/login?error=oauth_failed", { replace: true });
    }
  }, [searchParams, loginWithOAuth, refreshSession, navigate]);

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
