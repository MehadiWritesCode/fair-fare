import { Suspense } from "react";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";

async function AuthSection() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return (
      <Link href="/login" className="rounded-lg border px-4 py-2">
        লগইন
      </Link>
    );
  }

  return (
    <>
      <p>স্বাগতম, {user.email}</p>
      <form action="/auth/signout" method="post">
        <button className="rounded-lg border px-4 py-2">লগআউট</button>
      </form>
    </>
  );
}

export default function Home() {
  return (
    <main className="flex min-h-screen flex-col items-center justify-center gap-4 p-6">
      <h1 className="font-display text-3xl font-bold">ভাড়া কত?</h1>
      <p className="muted">সরকারি রেটে ন্যায্য ভাড়া যাচাই</p>
      <Link
        href="/calculator"
        className="rounded-lg bg-black px-5 py-3 text-white"
      >
        ভাড়া যাচাই করুন
      </Link>
      <Suspense fallback={<div className="skeleton h-10 w-32" />}>
        <AuthSection />
      </Suspense>
    </main>
  );
}
