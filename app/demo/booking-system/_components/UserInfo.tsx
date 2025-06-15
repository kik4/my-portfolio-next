"use client";
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseClient";

export default function UserInfo() {
  const [user, setUser] = useState<{ id: string } | null>(null);

  useEffect(() => {
    const getUser = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const res = await supabase
        .from("users")
        .select("id")
        .filter("user_id", "eq", user.id)
        .filter("deleted_at", "is", null)
        .single();
      if (!res.data) return;
      setUser(res.data);
    };
    getUser();
  }, []);

  if (!user) return <div>未ログイン</div>;

  return (
    <div className="flex flex-col items-center">
      <p>こんにちは、{user.id} さん！</p>
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
