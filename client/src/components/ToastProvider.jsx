import { Toaster } from "sonner";
import React from "react";

const ToastProvider = ({ children }) => {
  return (
    <>
      {children}
      <Toaster position="top-right" richColors />
    </>
  );
};

export default ToastProvider;
