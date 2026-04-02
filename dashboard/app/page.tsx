import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";
import { RoleDashboard } from "@/components/dashboards/RoleDashboard";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ preview?: string }>;
}) {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const displayName =
    session.user.name ?? session.user.email ?? "User";

  const roles = session.user.roles ?? [];
  const sp = await searchParams;

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-6 p-6">
      <p className="text-lg">
        Hello, <span className="font-medium">{displayName}</span>
      </p>
      <SignOutButton />

      <div className="w-full max-w-3xl">
        <RoleDashboard roles={roles} preview={sp.preview} />
      </div>
    </div>
  );
}
