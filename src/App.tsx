import { RouterProvider } from "react-router-dom";
import router from "./router";
import { ToastContainer } from "react-toastify";

const App: React.FC = () => {
  return (
    <>
      {/* 使用Toast弹窗 */}
      <ToastContainer />
      <RouterProvider router={router} />
    </>
  );
}

export default App;