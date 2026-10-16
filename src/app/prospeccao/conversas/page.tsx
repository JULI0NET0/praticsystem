import { Suspense } from "react";
import ConversasView from "@/components/prospeccao/ConversasView";

export default function ConversasPage() {
  return (
    <Suspense fallback={null}>
      <ConversasView />
    </Suspense>
  );
}
