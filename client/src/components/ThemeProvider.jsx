// ThemeProvider.jsx
import { ThemeProvider as ShadcnThemeProvider } from "next-themes"
import React from "react";

const ThemeProvider = ({ children }) => {
  return (
    <ShadcnThemeProvider
      defaultTheme="dark"
      storageKey="project-management-theme"
    >
      {children}
    </ShadcnThemeProvider>
  );
};

export default ThemeProvider;
