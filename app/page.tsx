import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

export default async function Home() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="text-3xl font-bold">Fair Fare</h1>
      <p className="text-gray-600">ন্যায্য ভাড়া যাচাই করুন</p>
      {user ? (
        <>
          <p>স্বাগতম, {user.email}</p>
          <form action="/auth/signout" method="post">
            <button className="rounded-lg border px-4 py-2">লগআউট</button>
          </form>
        </>
      ) : (
        <Link href="/login" className="rounded-lg border px-4 py-2">
          লগইন
        </Link>
      )}
    </main>
  );
}
