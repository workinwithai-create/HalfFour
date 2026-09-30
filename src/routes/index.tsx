import { createFileRoute } from "@tanstack/react-router";
import { HalfDesk } from "@/components/half-desk";

export const Route = createFileRoute("/")({
  component: HalfDesk,
});
