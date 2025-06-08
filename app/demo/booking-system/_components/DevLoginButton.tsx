"use client";

import { supabase } from "../lib/supabaseClient";

export function DevLoginButton() {
  const handleDevLogin = async () => {
    const { error } = await supabase.auth.signInWithPassword({
      email: "user@example.com",
      password: "password",
    });
    if (error) {
      console.error("Dev login error:", error);
    } else {
      console.log("Dev user logged in");
      location.reload();
    }
  };

  return (
    <button
      onClick={handleDevLogin}
      className="rounded bg-green-500 px-4 py-2 text-white"
    >
      開発用ユーザーでログイン
    </button>
  );
}
