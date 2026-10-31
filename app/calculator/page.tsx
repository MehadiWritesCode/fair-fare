import { Suspense } from "react";
import { createClient } from "@/lib/supabase/server";
import CalculatorClient from "@/components/CalculatorClient";

async function Rules() {
  const supabase = await createClient();
  const { data: rules, error } = await supabase.from("fare_rules").select("*");

  if (error) {
    console.error("fare_rules error:", error);
    return (
      <main className="p-6">
        রেট লোড করা যায়নি: {error.message} ({error.code})
      </main>
    );
  }

  return <CalculatorClient rules={rules ?? []} />;
}

export default function CalculatorPage() {
  return (
    <Suspense
      fallback={
        <div className="skeleton h-dvh w-full" style={{ borderRadius: 0 }} />
      }
    >
      <Rules />
    </Suspense>
  );
}
