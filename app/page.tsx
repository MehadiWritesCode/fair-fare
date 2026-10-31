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
      <Link href="/login" className="btn-quiet">
        লগইন
      </Link>
    );
  }

  return (
    <div className="flex items-center gap-3">
      <span className="muted hidden max-w-48 truncate text-sm sm:inline">
        {user.email}
      </span>
      <form action="/auth/signout" method="post">
        <button className="btn-quiet">লগআউট</button>
      </form>
    </div>
  );
}

const FEATURES = [
  {
    title: "সরকারি রেট থেকে হিসাব",
    text: "ফলাফলের নিচেই রেটের কার্যকর তারিখ আর সোর্স লিংক দেখানো হয়, নিজে যাচাই করে নেওয়া যায়।",
  },
  {
    title: "লিখে খুঁজুন বা ম্যাপে ট্যাপ করুন",
    text: "জায়গার নাম লিখলে সাজেশন আসে। চাইলে ম্যাপে ছুঁয়ে শুরু ও গন্তব্য বাছতে পারেন।",
  },
  {
    title: "আপাতত ঢাকার সিএনজি ও বাস",
    text: "রিকশা আর অন্য শহরের ভাড়া পরে যোগ হবে। লগইন ছাড়াই যাচাই করা যায়।",
  },
];

export default function Home() {
  return (
    <div className="mx-auto flex min-h-dvh max-w-5xl flex-col px-5">
      <header className="flex items-center justify-between py-5">
        <span className="font-display text-2xl font-extrabold">ভাড়া কত?</span>
        <Suspense fallback={<div className="skeleton h-10 w-20" />}>
          <AuthSection />
        </Suspense>
      </header>

      <main className="grid flex-1 items-center gap-10 pb-12 md:grid-cols-2 md:gap-14">
        <section>
          <h1 className="font-display text-4xl font-extrabold leading-tight md:text-5xl">
            সিএনজি আর বাসে ঠকছেন কি না, সরকারি রেটে মিলিয়ে নিন
          </h1>
          <p className="muted mt-4 max-w-md text-lg leading-relaxed">
            শুরু আর গন্তব্য বাছুন, ন্যায্য ভাড়া জানুন। চালক কত চাইলেন লিখলেই
            দেখবেন বেশি চাইছেন কি না।
          </p>

          <div className="mt-7">
            <Link href="/calculator" className="btn-primary">
              ভাড়া যাচাই করুন
            </Link>
          </div>

          <ul className="list-rows mt-9 max-w-md">
            {FEATURES.map((f) => (
              <li key={f.title}>
                <p className="font-semibold">{f.title}</p>
                <p className="muted mt-0.5 text-sm leading-relaxed">{f.text}</p>
              </li>
            ))}
          </ul>
        </section>

        <aside aria-label="উদাহরণ" className="space-y-3">
          <p className="muted text-sm">উদাহরণ: ৪.৫ কিমি, সিএনজি</p>

          <div className="fare-hero">
            <p className="text-sm font-semibold">ন্যায্য ভাড়া</p>
            <p className="fare-number">৳৭০</p>
            <p className="mt-1 text-sm">৪.৫ কিমি, গাড়ির রাস্তা ধরে</p>
          </div>

          <div className="verdict verdict-bad">
            <p className="font-display text-xl font-bold leading-tight">
              বেশি ভাড়া চাইছে
            </p>
            <p className="mt-1 text-sm">
              সরকারি রেটে ৳৭০ হওয়ার কথা। চালক ৳৫০ (৭১%) বেশি চাইছেন।
            </p>

            <div className="mt-3 space-y-2 text-sm">
              <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2">
                <span>ন্যায্য</span>
                <div className="bar-track">
                  <div className="bar-fill bar-fair" style={{ width: "58%" }} />
                </div>
                <b className="text-right">৳৭০</b>
              </div>
              <div className="grid grid-cols-[4.5rem_1fr_3.5rem] items-center gap-2">
                <span>চালক</span>
                <div className="bar-track">
                  <div className="bar-fill bar-bad" style={{ width: "100%" }} />
                </div>
                <b className="text-right">৳১২০</b>
              </div>
            </div>
          </div>
        </aside>
      </main>
    </div>
  );
}
