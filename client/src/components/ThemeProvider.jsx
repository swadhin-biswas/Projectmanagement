// ThemeProvider.jsx
import { ThemeProvider as NextThemesProvider } from "next-themes";
import React from "react";

const ThemeProvider = ({ children }) => {
  return (
    <NextThemesProvider
      attribute="class"
      defaultTheme="system"
      enableSystem={true}
      storageKey="project-management-theme"
    >
      {children}
    </NextThemesProvider>
  );
};

export default ThemeProvider;
