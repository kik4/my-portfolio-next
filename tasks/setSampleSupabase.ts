import "./utils/envConfig";
import type { Database } from "@/database.types";
import { createClient } from "@supabase/supabase-js";

const supabaseClient = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.SUPABASE_SERVICE_ROLE_KEY,
);

const res = await supabaseClient.auth.admin.createUser({
  email: "user@example.com",
  password: "password",
  email_confirm: true,
});
await supabaseClient
  .from("users")
  .insert({ id: "user", user_id: res.data.user?.id });
