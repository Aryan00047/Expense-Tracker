import { useEffect, useState } from "react";
import { resetPassword, validateResetToken } from "../services/authService";
import type { IResetPassword, TokenStatus } from "../models/LandingPageModel";
import { EyeIcon, EyeSlashIcon, LockClosedIcon } from "@heroicons/react/24/outline";
import FormError from "./FormError";
import { useSearchParams } from "react-router-dom";

const ResetPassword = () => {
  const [formData, setFormData] = useState({
    password:"",
    verifyPassword:"",
    showPassword: false
  });
  const [touched, setTouched] = useState({
    password: false,
    verifyPassword: false
  });
  const [done, setDone] = useState(false);
  const password = formData.password;
  const isEmpty = password.length === 0;
  const isTooShort = password.length > 0 && password.length < 6;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{6,}$/;
  const isWeak = password.length >= 6 && !passwordRegex.test(password);
  const isPasswordVerified = password.length > 0 && formData.verifyPassword.length>0 && password === formData.verifyPassword;
  const [searchParams] = useSearchParams();
  const token = searchParams.get("token");

  const payload: IResetPassword = {
    token: token,
    password: password
  }
    const [tokenStatus, setTokenStatus] = useState<TokenStatus>(
    token ? "checking" : "invalid"
    );

  useEffect(() => {
    if (!token) return; // no state update here

    validateResetToken(token)
        .then(() => setTokenStatus("valid"))
        .catch(() => setTokenStatus("invalid"));
  }, [token]);

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
        await resetPassword(payload);
        setDone(true);

    } catch (error) {
      let message = "Something went wrong";

      if (error instanceof Error) {
        message = error.message;
      }
        if (message === "Invalid or expired token") {
            setTokenStatus("invalid");
        }
        console.log(error);
    }
  };

  if (tokenStatus === "checking") {
  return (
    <div className="max-w-sm mx-auto p-6 text-center text-sm text-gray-500">
      Verifying reset link…
    </div>
  );
}

if (tokenStatus === "invalid") {
  return (
    <div className="max-w-sm mx-auto p-6">
      <div className="rounded-lg bg-red-50 border border-red-200 p-4 text-sm text-red-700">
        This password reset link is invalid or has expired.
        <br />
        <a href="/forgot-password" className="text-purple-600 underline">
          Request a new reset link
        </a>
      </div>
    </div>
  );
}


return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 px-4">
      <div className="w-full max-w-md bg-white rounded-2xl shadow-xl p-6">
        <h2 className="text-2xl font-semibold text-gray-900 mb-1">
          Reset your password
        </h2>
        <p className="text-sm text-gray-500 mb-6">
          Create a strong password to secure your account.
        </p>

        {/* SUCCESS */}
        {done && (
        <div className="text-center">
            <p className="text-green-600 text-sm mb-4">
            Password reset successfully.
            </p>
            <a href="/login" className="text-purple-600 underline">
            Go to sign in
            </a>
        </div>
        )}

        {/* FORM */}
        {!done &&   (
          <form onSubmit={onSubmit} className="space-y-4">
            {/* Password */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                New password
              </label>
              <div className="relative mt-1">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type={formData.showPassword ? "text" : "password"}
                  placeholder="••••••••"
                  onBlur={() => setTouched({ ...touched, password: true })}
                  value={formData.password}
                  onChange={(e) =>
                    setFormData({ ...formData, password: e.target.value })
                  }
                  className="w-full rounded-xl bg-gray-100 px-10 pr-12 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
                <button
                  type="button"
                  onClick={() =>
                    setFormData({
                      ...formData,
                      showPassword: !formData.showPassword,
                    })
                  }
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500"
                >
                  {formData.showPassword ? (
                    <EyeIcon className="w-4 h-4" />
                  ) : (
                    <EyeSlashIcon className="w-4 h-4" />
                  )}
                </button>
              </div>

              <FormError show={touched.password && isEmpty} message="Please enter a password" />
              <FormError show={touched.password && isTooShort} message="Minimum 6 characters required" />
              <FormError show={touched.password && isWeak} message="Use upper, lower, number & special character" />
            </div>

            {/* Confirm */}
            <div>
              <label className="text-sm font-medium text-gray-700">
                Confirm password
              </label>
              <div className="relative mt-1">
                <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                <input
                  type="password"
                  placeholder="••••••••"
                  onBlur={() =>
                    setTouched({ ...touched, verifyPassword: true })
                  }
                  value={formData.verifyPassword}
                  onChange={(e) =>
                    setFormData({
                      ...formData,
                      verifyPassword: e.target.value,
                    })
                  }
                  className="w-full rounded-xl bg-gray-100 px-10 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
                />
              </div>

              <FormError
                show={touched.verifyPassword && !isPasswordVerified}
                message="Passwords do not match"
              />
            </div>

            <button
              type="submit"
              disabled={!isPasswordVerified}
              className={`w-full rounded-xl py-2 text-white transition ${
                isPasswordVerified
                  ? "bg-linear-to-r from-purple-500 to-blue-500 hover:opacity-90"
                  : "bg-gray-300 cursor-not-allowed"
              }`}
            >
              Reset password
            </button>
          </form>
        )}
      </div>
    </div>
  );
};

export default ResetPassword;