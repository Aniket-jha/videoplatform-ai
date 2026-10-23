"use client";
import { Suspense } from "react";
import { Studio } from "@/components/studio";

export default function Generate() {
  return <Suspense><Studio /></Suspense>;
}
