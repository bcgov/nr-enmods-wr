import type { FC } from "react";
import { Navigate } from "react-router-dom";
import type Roles from "../roles";
import Dashboard from "@/pages/Dashboard";

export const ProtectedRoutes: FC<{ roles: Array<Roles> }> = () => {
  const auth = { token: true };

  return auth.token ? <Dashboard /> : <Navigate to="/not-authorized" />;
};
