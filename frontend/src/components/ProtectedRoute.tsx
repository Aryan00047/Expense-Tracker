import { Navigate } from "react-router-dom";
import type { ProtectedRouteProps } from "../models/LandingPageModel";

const ProtectedRoute = ({ children }:ProtectedRouteProps ) => {
  const token = localStorage.getItem("accessToken");

  if (!token) {
    return <Navigate to="/login" replace />;
  }

  return children;
};

export default ProtectedRoute;
