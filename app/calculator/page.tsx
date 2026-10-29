import { createClient } from "@/lib/supabase/server";
import CalculatorClient from "@/components/CalculatorClient";

export default async function CalculatorPage() {
  const supabase = await createClient();
  const { data: rules, error } = await supabase.from("fare_rules").select("*");

  if (error) {
    return <main className="p-6">রেট লোড করা যায়নি: {error.message}</main>;
  }

  return <CalculatorClient rules={rules ?? []} />;
}
