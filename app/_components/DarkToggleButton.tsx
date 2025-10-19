"use client";

import { faCircleHalfStroke } from "@fortawesome/free-solid-svg-icons";
import { FontAwesomeIcon } from "@fortawesome/react-fontawesome";
import { useEffect, useLayoutEffect, useState } from "react";

export const DarkToggleButton: React.FC = () => {
  const [theme, setTheme] = useState<"light" | "dark" | undefined>();

  useLayoutEffect(() => {
    if (
      localStorage.theme === "dark" ||
      (!("theme" in localStorage) &&
        window.matchMedia("(prefers-color-scheme: dark)").matches)
    ) {
      setTheme("dark");
    } else {
      setTheme("light");
    }
  }, []);

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
      document.documentElement.classList.remove("light");
      localStorage.theme = "dark";
    } else if (theme === "light") {
      document.documentElement.classList.add("light");
      document.documentElement.classList.remove("dark");
      localStorage.theme = "light";
    }
  }, [theme]);

  return (
    <button
      className="flex items-center gap-2 rounded-lg border px-3 py-1 text-sm hover:bg-slate-400 sm:px-2"
      type="button"
      onClick={() => {
        setTheme((v) => (v === "dark" ? "light" : "dark"));
      }}
    >
      <FontAwesomeIcon icon={faCircleHalfStroke} />
      <span className="hidden sm:inline">Light / Dark</span>
    </button>
  );
};
