import { createBrowserRouter, Navigate } from "react-router-dom";
import HomePage from "../pages/HomePage";
import LoginPage from "../pages/LoginPage";
import Registerpage from "../pages/RegisterPage";
import OAuth2Success from "../pages/OAuth2Success";
import OAuth2Register from "../pages/OAuth2Register";

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
  },
  {
    path: '/oauth2/success',
    element: <OAuth2Success />
  },
  {
    path: '/oauth2/register',
    element: <OAuth2Register />
  }
]);

export default router;