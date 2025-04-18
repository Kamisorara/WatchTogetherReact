import { createBrowserRouter, Navigate } from "react-router-dom";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import Registerpage from "../pages/RegisterPage";

const router = createBrowserRouter([
  {
    path: '/',
    element: <Navigate to="/login" replace />, // 重定向
  },
  {
    path: '/login',
    element: <LoginPage />,
  },
  {
    path: '/home',
    element: <HomePage />,
  },
  {
    path: '/register',
    element: <Registerpage />
  }
]);

export default router;