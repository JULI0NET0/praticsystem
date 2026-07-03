"use client";

import { useParams } from "next/navigation";
import ListView from "@/components/operacao/ListView";

export default function ListPage() {
  const params = useParams<{ areaId: string; listId: string }>();
  return <ListView areaId={params.areaId} listId={params.listId} />;
}
