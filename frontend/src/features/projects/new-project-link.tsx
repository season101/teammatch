"use client";

import Link from "next/link";
import { buttonClasses } from "@/components/ui/button";
import { useMyRole } from "@/features/profiles/queries";

// Moderators and admins don't post projects (the API refuses them), so they get no button.
export function NewProjectLink() {
  const role = useMyRole();
  if (role === "moderator" || role === "admin") return null;
  return (
    <Link href="/projects/new" className={buttonClasses("cta", "sm")}>
      New project
    </Link>
  );
}
