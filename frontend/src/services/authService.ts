import api from "./api";
import type { ISignUpForm, ILoginForm, IResetPassword } from "../models/LandingPageModel";

export const registerUser = async (payload: ISignUpForm) => {
  const { data } = await api.post("/auth/register", payload);
  return data;
};

export const loginUser = async (payload: ILoginForm) => {
  const { data } = await api.post("/auth/login", payload);
  return data;
};

export const forgotPassword = async (email: string) => {
  const { data } = await api.post("/auth/forgot-password", { email });
  return data;
};

export const resetPassword = async (props: IResetPassword) => {
  const { data } = await api.post("/auth/reset-password", {
    token: props.token,
    newPassword: props.password,
  });
  return data;
};

export const validateResetToken = async (token: string) => {
  const { data } = await api.post("/auth/validate-reset-token", { token });
  return data;
};

export const logoutUser = async () => {
  const { data } = await api.post("/auth/logout");
  return data;
};
