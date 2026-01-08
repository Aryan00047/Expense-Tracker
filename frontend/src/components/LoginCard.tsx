import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import type { ILoginForm, LoginCardProps } from "../models/LandingPageModel";
import { loginUser } from "../services/authService";
import {
  ArrowLeftIcon,
  EnvelopeIcon,
  EyeIcon,
  EyeSlashIcon,
  LockClosedIcon,
} from "@heroicons/react/24/outline";
import FormError from "./FormError";

const LoginCard = ({ onSwitch}: LoginCardProps) => {
  const [loginFailed, setLoginFailed] = useState(false)
  const [formData, setFormData] = useState<ILoginForm>({
    email: "",
    password: "",
    showPassword: false,
    rememberMe: false,
  });

  const [touched, setTouched] = useState({
    email: false,
    password: false
  });
  const navigate = useNavigate();
  const emailError = touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && formData.email.length>0;

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      email: formData.email,
      password: formData.password,
      rememberMe: formData.rememberMe,
    };
    try {
      const response = await loginUser(payload);
      localStorage.setItem("accessToken", response.accessToken);
      navigate("/dashboard");
    } catch (error) {
      console.error("Registration failed:", error);
      setLoginFailed(true);
    }
  };
  return (
    <div className="flex flex-col">
      <div className="md:hidden flex flex-wrap items-center justify-start text-sm text-gray-600 mb-2">
        <Link to="/">
          <ArrowLeftIcon className="w-8 h-5 cursor-pointer" />
        </Link>
        <h2 className="font-semibold">Back</h2>
      </div>
      <h2 className="text-xl">Manage your finances</h2>
      <span className="text-sm text-gray-500">
        Sign in to continue to your dashboard.
      </span>
      <div className="flex items-center gap-3 w-full my-2">
        <div className="flex-1 h-px bg-gray-300" />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          Continue with email
        </span>
        <div className="flex-1 h-px bg-gray-300" />
      </div>
      <form noValidate className="flex flex-col mb-2" onSubmit={onSubmit}>
        <label className="text-sm mb-1">Email</label>
        <div className="relative mb-3">
          <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            placeholder="you@example.com"
            id="email"
            onBlur={()=>setTouched({...touched, email:true})}
            value={formData.email}
            onChange={(e) =>
              setFormData({ ...formData, email: e.target.value })
            }
            className="w-full rounded-xl bg-gray-100 px-10 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <FormError show={touched.email && formData.email.length === 0} message="Please enter your email" />
        <FormError show={touched.email && emailError} message="Please enter a valid email address" />
        <label className="text-sm mb-1">Password</label>
        <div className="relative mb-3">
          <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

          <input
            type={formData.showPassword ? "text" : "password"}
            placeholder="••••••••"
            id="password"
            onBlur={()=>setTouched({...touched, password:true})}
            value={formData.password}
            onChange={(e) =>
              setFormData({ ...formData, password: e.target.value })
            }
            className="w-full rounded-xl bg-gray-100 px-10 pr-12 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />

          <button
            type="button"
            onClick={() =>
              setFormData({ ...formData, showPassword: !formData.showPassword })
            }
            className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700"
          >
            {formData.showPassword ? (
              <EyeIcon className="w-4 h-4" />
            ) : (
              <EyeSlashIcon className="w-4 h-4" />
            )}
          </button>
        </div>
        <FormError show={touched.password && formData.password.length === 0} message="Please enter your password" />
        <div className="flex justify-between items-center mb-2">
          <label className="flex items-center gap-2 text-xs cursor-pointer">
            <input type="checkbox" checked={formData.rememberMe} id="showPassword" onChange={(e)=>setFormData({...formData, rememberMe: e.target.checked })} />
            Remember me
          </label>
          <Link to="/forgot-password" className="text-xs text-purple-800 cursor-pointer">
            Forgot Password?
          </Link>
        </div>
        <FormError show={loginFailed} message="Invaild email or password. Please try again!" />
        <button
          type="submit"
          className="rounded-xl inline-flex justify-center items-center bg-linear-to-r from-purple-500 to-blue-500 px-2 py-1 text-white hover:opacity-90"
        >
          Sign In
        </button>
      </form>
      <span className="text-xs inline-flex items-center justify-center mt-1">
        Don't have an account?
        <button
          type="button"
          onClick={onSwitch}
          className="ml-1 text-purple-500 hover:underline"
        >
          Sign Up
        </button>
      </span>
    </div>
  );
};

export default LoginCard;
