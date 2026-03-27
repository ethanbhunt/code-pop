import { redirect } from "next/navigation";
import { auth } from "@/auth";
import { SignOutButton } from "@/components/sign-out-button";

export default async function Page() {
  const session = await auth();

  if (!session?.user) {
    redirect("/login");
  }

  const displayName =
    session.user.name ?? session.user.email ?? "User";

  return (
    <div className="flex min-h-screen flex-col items-center justify-center gap-4 p-8">
      <p className="text-lg">
        Hello, <span className="font-medium">{displayName}</span>
      </p>
      <SignOutButton />
    </div>
  );
}
