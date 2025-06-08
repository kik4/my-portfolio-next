"use client";

import type { User } from "@supabase/supabase-js";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function UserInfo() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      setUser(user);
    };
    getUser();
  }, []);

  if (!user) return <div>未ログイン</div>;

  return (
    <div>
      <p>こんにちは、{user.user_metadata.full_name} さん！</p>
      <button
        onClick={async () => {
          await supabase.auth.signOut();
          location.reload();
        }}
        className="rounded bg-red-500 px-4 py-2 text-white"
      >
        ログアウト
      </button>
    </div>
  );
}
