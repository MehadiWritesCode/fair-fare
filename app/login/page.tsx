"use client";

import { createClient } from "@/lib/supabase/client";

export default function LoginPage() {
  const signInWithGoogle = async () => {
    const supabase = createClient();
    await supabase.auth.signInWithOAuth({
      provider: "google",
      options: { redirectTo: `${location.origin}/auth/callback` },
    });
  };

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <div className="w-full max-w-sm space-y-4 text-center">
        <h1 className="text-2xl font-bold">লগইন করুন</h1>
        <button
          onClick={signInWithGoogle}
          className="w-full rounded-lg border px-4 py-3 font-medium hover:bg-gray-100"
        >
          Google দিয়ে চালিয়ে যান
        </button>
      </div>
    </main>
  );
}
