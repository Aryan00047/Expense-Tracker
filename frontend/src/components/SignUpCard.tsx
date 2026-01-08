import { useState } from "react";
import type { ISignUpForm, LoginCardProps } from "../models/LandingPageModel";
import { Link } from "react-router-dom";
import { registerUser } from "../services/authService";
import { ArrowLeftIcon, EnvelopeIcon, EyeIcon, EyeSlashIcon, LockClosedIcon, UserIcon } from "@heroicons/react/24/outline";
import FormError from "./FormError";
// import { GoogleLogin } from "@react-oauth/google";

const SignUpCard = ({onSwitch}: LoginCardProps) =>{
  const [formData, setFormData] = useState<ISignUpForm>({
    name:"",
    email: "",
    password: "",
    verifyPassword:"",
    showPassword: false,
  });
  const [touched, setTouched] = useState({
    name: false,
    email: false,
    password: false,
    verifyPassword: false,
  });

  const [registered, setRegistered] = useState<boolean | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const password = formData.password;
  const isEmpty = password.length === 0;
  const isTooShort = password.length > 0 && password.length < 6;
  const passwordRegex =
    /^(?=.*[a-z])(?=.*[A-Z])(?=.*\d)(?=.*[^A-Za-z0-9])\S{6,}$/;
  const isWeak = password.length >= 6 && !passwordRegex.test(password);
  const isPasswordVerified = formData.password.length > 0 && formData.password === formData.verifyPassword;
  const emailError = touched.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(formData.email) && formData.email.length>0;
  const isFormVerified = formData.name.length>0 && formData.email.length>0 && isPasswordVerified;
  // const navigate = useNavigate();
  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    const payload = {
      name: formData.name,
      email: formData.email,
      verifyPassword: formData.verifyPassword,
      password: formData.password,
    };
    try {
      await registerUser(payload);
      setRegistered(true);
      setTimeout(()=>{
        onSwitch();
      },3000)
    } catch (error) {
      console.error("Registration failed:", error);
      let message = "Something went wrong";

      if (error instanceof Error) {
        message = error.message;
      }
      setRegistered(false);
      setErrorMessage(message)
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
        Sign up to start managing your finances.
      </span>
      {/* <GoogleLogin
        onSuccess={async (cred) => {
          try {
            await fetch('http://localhost:3000/auth/google', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              credentials: 'include',
              body: JSON.stringify({
                idToken: cred.credential,
                rememberMe: true,
              }),
            });

            navigate('/dashboard');
          } catch (err) {
            console.error('Google signup failed', err);
            setErrorMessage('Google signup failed');
          }
        }}
        onError={() => {
          setErrorMessage('Google authentication failed');
        }}
      /> */}

      <div className="flex items-center gap-3 w-full my-2">
        <div className="flex-1 h-px bg-gray-300" />
        <span className="text-xs text-gray-500 whitespace-nowrap">
          Register with your email
        </span>
        <div className="flex-1 h-px bg-gray-300" />
      </div>
      <form noValidate className="flex flex-col mb-2" onSubmit={onSubmit}>
        <label className="text-sm mb-1">Name: </label>
        <div className="relative mb-3">
            <UserIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
            <input type="text" placeholder="Name" id="name" onBlur={() => setTouched({...touched, name:true})} value={formData.name} onChange={(e) => setFormData({...formData, name: e.target.value})} className="w-full rounded-xl bg-gray-100 px-10 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"/>
        </div>
        <FormError show={touched.name && formData.name.length === 0} message="Please enter your name" />
        <label className="text-sm mb-1">Email</label>
        <div className="relative mb-3">
          <EnvelopeIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
          <input
            type="email"
            placeholder="you@example.com"
            id="email"
            onBlur={() => setTouched({...touched, email:true})}
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
            onBlur={() => setTouched({...touched, password:true})}
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
        <FormError show={touched.password && isTooShort} message="Password must have minimum length 6" />
        <FormError show={touched.password && isWeak} message="Password must include atleast one uppercase, lowercase, number and special character"/> 
        <FormError show={touched.password && isEmpty} message="Please enter your password" />
        <label className="">Verify Password</label>
        <div className="relative mb-3">
          <LockClosedIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />

          <input
            type="password"
            placeholder="••••••••"
            id="verifyPassword"
            onBlur={() => setTouched({...touched, verifyPassword:true})}
            value={formData.verifyPassword} 
            onChange={(e) => setFormData({...formData, verifyPassword: e.target.value})}
            className="w-full rounded-xl bg-gray-100 px-10 pr-12 py-2 text-sm outline-none focus:ring-2 focus:ring-purple-400"
          />
        </div>
        <FormError show={formData.verifyPassword.length > 0 && !isPasswordVerified} message="Passwords do not match" />
        <button
          type="submit"
          disabled={!isFormVerified}
          className={`${isFormVerified ? "bg-linear-to-r from-purple-500 to-blue-500 hover:opacity-90" : "bg-gray-400 cursor-not-allowed "} rounded-xl inline-flex justify-center items-center px-2 py-1 text-white`}
        >
          Sign Up
        </button>
        {registered === true  && <p className="text-xs text-green-500 mt-0.5">User registered successfully, redirecting to sign in...</p>}
        {registered === false && <p className="text-xs text-red-500 mt-0.5">{errorMessage}</p>}
      </form>
      <span className="text-xs inline-flex items-center justify-center mt-1">
        Already have an account?
        <button
          type="button"
          onClick={onSwitch}
          className="ml-1 text-purple-500 hover:underline"
        >
          Sign In
        </button>
      </span>
    </div>
  );
};

export default SignUpCard;