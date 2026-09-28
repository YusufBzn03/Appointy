import { Suspense } from "react";
import { SalonsPageClient } from "@/components/salons-page-client";

export default function SalonsPage() {
  return (
    <Suspense fallback={null}>
      <SalonsPageClient />
    </Suspense>
  );
}
