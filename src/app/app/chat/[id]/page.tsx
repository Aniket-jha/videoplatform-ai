"use client";
import { Suspense, use } from "react";
import { Studio } from "@/components/studio";

export default function ChatPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  return <Suspense><Studio key={id} chatId={id} /></Suspense>;
}
