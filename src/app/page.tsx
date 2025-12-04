"use client"

import { useEffect } from "react";
import App from "../App"

export default function Page() {
  useEffect(() => {
    // Initialize dark mode on first load
    const isDarkMode = localStorage.getItem("darkMode")
    if (isDarkMode === null) {
      localStorage.setItem("darkMode", "true")
      document.documentElement.classList.add("dark-mode")
    } else if (JSON.parse(isDarkMode)) {
      document.documentElement.classList.add("dark-mode")
    }
  }, [])

  return <App />
}