"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { PRIMARY_OWNER_NAME } from "@/lib/app-config";
import { getUserDisplayName, signOutUser } from "@/lib/auth";
import { useAuthUser } from "@/hooks/use-auth-user";

export function CurrentUserIndicator() {
  const router = useRouter();
  const { loading, user } = useAuthUser();

  if (loading) {
    return (
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
        Checking session...
      </span>
    );
  }

  if (!user) {
    return (
      <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-300">
        Not logged in
      </span>
    );
  }

  const displayName = getUserDisplayName(user);
  const isPrimaryOwner = displayName?.trim().toLowerCase() === PRIMARY_OWNER_NAME.toLowerCase();

  return (
    <div className="flex items-center gap-2">
      <span className="rounded-full border border-emerald-400/20 bg-emerald-400/10 px-3 py-1 text-xs font-medium text-emerald-200">
        Logged in: {displayName}
      </span>
      {isPrimaryOwner ? (
        <Link
          href="/admin"
          className="rounded-full border border-sky-400/20 bg-sky-400/10 px-3 py-1 text-xs text-sky-100 transition hover:border-sky-300"
        >
          Admin
        </Link>
      ) : null}
      <button
        type="button"
        onClick={() => {
          void signOutUser().then(() => {
            router.refresh();
          });
        }}
        className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-slate-200 transition hover:border-sky-400"
      >
        Log out
      </button>
    </div>
  );
}
