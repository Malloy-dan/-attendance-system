import { Navigate } from "react-router-dom";
import { getRole, isAuthenticated } from "../utils/auth";

export default function ProtectedRoute({ allow, children }) {
  if (!isAuthenticated()) {
    return <Navigate to="/login" replace />;
  }
  const role = getRole();
  if (allow && !allow.includes(role)) {
    return <Navigate to="/login" replace />;
  }
  return children;
}
