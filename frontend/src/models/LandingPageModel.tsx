import type { ReactNode } from "react";

export interface ILoginForm {
    email: string,
    password: string,
    showPassword?: boolean,
    rememberMe: boolean,
}

export interface ISignUpForm {
    name:string,
    email: string,
    password: string,
    verifyPassword:string,
    showPassword?: boolean,
}

export interface ICards {
    key?:string,
    color?:string,
    id?:string,
    title: string;
    description: string,
    icon: React.ComponentType<React.SVGProps<SVGSVGElement>>,
}

export interface IFormError {
  show: boolean,
  message: string | null
};

export interface IResetPassword{
    token: string | null,
    password: string
}

export type TokenStatus = "checking" | "valid" | "invalid";

export interface IHeaderItem {
  name: string;
  link: string;
}

export interface IHeaderProps {
  items: IHeaderItem[];
}

export type ProtectedRouteProps = {
  children: ReactNode;
};

export type LoginCardProps = {
  onSwitch: () => void;
};