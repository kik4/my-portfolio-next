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
      className="flex items-center rounded-lg border px-2 py-1 text-sm hover:bg-slate-400"
      type="button"
      onClick={() => {
        setTheme((v) => (v === "dark" ? "light" : "dark"));
      }}
    >
      <span className="mr-[0.5em] w-4">
        <FontAwesomeIcon icon={faCircleHalfStroke} />
      </span>
      Light / Dark
    </button>
  );
};
