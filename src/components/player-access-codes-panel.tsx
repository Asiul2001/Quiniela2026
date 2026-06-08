"use client";

import { useEffect, useState } from "react";
import { PRIMARY_OWNER_NAME } from "@/lib/app-config";
import { getUserDisplayName } from "@/lib/auth";
import { supabase } from "@/lib/supabase";
import { useAuthUser } from "@/hooks/use-auth-user";

type Toast = {
  id: number;
  message: string;
  type: "success" | "error";
};

type PlayerAccessCode = {
  userId: string;
  name: string;
  accessCode: string | null;
  profileExists: boolean;
  memberExists: boolean;
  platformRole: string | null;
  statusIssue: string | null;
  isPrimaryOwner: boolean;
};

export function PlayerAccessCodesPanel() {
  const { user: currentUser } = useAuthUser();
  const currentUserName = getUserDisplayName(currentUser);
  const isPrimaryOwner = currentUserName?.trim().toLowerCase() === PRIMARY_OWNER_NAME.toLowerCase();
  const [playerAccessCodes, setPlayerAccessCodes] = useState<PlayerAccessCode[]>([]);
  const [loadingPlayerAccessCodes, setLoadingPlayerAccessCodes] = useState(false);
  const [syncingDatabase, setSyncingDatabase] = useState(false);
  const [regeneratingUserId, setRegeneratingUserId] = useState<string | null>(null);
  const [deletingUserId, setDeletingUserId] = useState<string | null>(null);
  const [toasts, setToasts] = useState<Toast[]>([]);

  useEffect(() => {
    const client = supabase;

    if (!currentUser || !isPrimaryOwner || !client) {
      return;
    }

    const supabaseClient = client;

    let active = true;

    async function loadPlayerAccessCodes() {
      setLoadingPlayerAccessCodes(true);

      try {
        const {
          data: { session },
        } = await supabaseClient.auth.getSession();

        const accessToken = session?.access_token;

        if (!accessToken) {
          throw new Error("Your admin session is missing, so player codes cannot be loaded.");
        }

        const response = await fetch("/api/admin/player-access-codes", {
          headers: {
            Authorization: `Bearer ${accessToken}`,
          },
        });

        const payload = (await response.json().catch(() => null)) as
          | { players?: PlayerAccessCode[]; error?: string }
          | null;

        if (!response.ok) {
          throw new Error(payload?.error ?? "Unable to load player access codes.");
        }

        if (!active) return;
        setPlayerAccessCodes(payload?.players ?? []);
      } catch (error) {
        if (!active) return;
        showToast(error instanceof Error ? error.message : "Unable to load player access codes.", "error");
      } finally {
        if (active) {
          setLoadingPlayerAccessCodes(false);
        }
      }
    }

    void loadPlayerAccessCodes();

    return () => {
      active = false;
    };
  }, [currentUser, isPrimaryOwner]);

  function showToast(message: string, type: Toast["type"]) {
    const toastId = Date.now() + Math.floor(Math.random() * 1000);
    setToasts((current) => [...current, { id: toastId, message, type }]);
    window.setTimeout(() => {
      setToasts((current) => current.filter((toast) => toast.id !== toastId));
    }, 3200);
  }

  async function copyAccessCode(accessCode: string) {
    try {
      await navigator.clipboard.writeText(accessCode);
      showToast(`Copied access code ${accessCode}.`, "success");
    } catch {
      showToast("Could not copy that access code automatically.", "error");
    }
  }

  async function regenerateAccessCode(userId: string) {
    if (!supabase) {
      showToast("Supabase is not configured.", "error");
      return;
    }

    setRegeneratingUserId(userId);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("Your admin session is missing, so the code cannot be regenerated.");
      }

      const response = await fetch("/api/admin/player-access-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { userId?: string; name?: string; accessCode?: string; error?: string }
        | null;

      if (!response.ok || !payload?.userId || !payload?.accessCode) {
        throw new Error(payload?.error ?? "Unable to regenerate the access code.");
      }

      setPlayerAccessCodes((current) =>
        current.map((player) =>
          player.userId === payload.userId
            ? {
                ...player,
                accessCode: payload.accessCode ?? null,
              }
            : player,
        ),
      );
      showToast(`New access code for ${payload.name ?? "that player"}: ${payload.accessCode}`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to regenerate the access code.", "error");
    } finally {
      setRegeneratingUserId(null);
    }
  }

  async function syncUsersToDatabase() {
    if (!supabase) {
      showToast("Supabase is not configured.", "error");
      return;
    }

    setSyncingDatabase(true);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("Your admin session is missing, so the database sync cannot run.");
      }

      const response = await fetch("/api/admin/player-access-codes", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ action: "sync_all" }),
      });

      const payload = (await response.json().catch(() => null)) as
        | {
            players?: PlayerAccessCode[];
            repairedCount?: number;
            failedCount?: number;
            failures?: Array<{ name?: string; error?: string }>;
            error?: string;
          }
        | null;

      if (!response.ok) {
        throw new Error(payload?.error ?? "Unable to sync users to the database.");
      }

      setPlayerAccessCodes(payload?.players ?? []);

      if (payload?.failedCount) {
        const firstFailure = payload.failures?.[0];
        throw new Error(
          `Synced ${payload.repairedCount ?? 0} users, but ${payload.failedCount} failed.${firstFailure?.name ? ` First failure: ${firstFailure.name}.` : ""}${firstFailure?.error ? ` ${firstFailure.error}` : ""}`,
        );
      }

      showToast(`Synced ${payload?.repairedCount ?? 0} users into the database.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to sync users to the database.", "error");
    } finally {
      setSyncingDatabase(false);
    }
  }

  function getDatabaseStatus(player: PlayerAccessCode) {
    if (player.isPrimaryOwner && player.profileExists && player.memberExists) {
      return "Owner account ready";
    }

    if (player.statusIssue) {
      return `Status check limited: ${player.statusIssue}`;
    }

    if (player.profileExists && player.memberExists) {
      return "Database ready";
    }

    if (!player.profileExists && !player.memberExists) {
      return "Missing profile and league membership";
    }

    if (!player.profileExists) {
      return "Missing profile";
    }

    return "Missing league membership";
  }

  async function deletePlayerAccount(player: PlayerAccessCode) {
    if (!supabase) {
      showToast("Supabase is not configured.", "error");
      return;
    }

    const confirmed = window.confirm(
      `Permanently delete ${player.name}? This removes their login and cascades through linked prediction data.`,
    );

    if (!confirmed) {
      return;
    }

    setDeletingUserId(player.userId);

    try {
      const {
        data: { session },
      } = await supabase.auth.getSession();

      const accessToken = session?.access_token;

      if (!accessToken) {
        throw new Error("Your admin session is missing, so the player cannot be deleted.");
      }

      const response = await fetch("/api/admin/player-access-codes", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${accessToken}`,
        },
        body: JSON.stringify({ userId: player.userId }),
      });

      const payload = (await response.json().catch(() => null)) as
        | { userId?: string; name?: string; deleted?: boolean; error?: string }
        | null;

      if (!response.ok || !payload?.deleted || !payload?.userId) {
        throw new Error(payload?.error ?? "Unable to delete the player account.");
      }

      setPlayerAccessCodes((current) => current.filter((entry) => entry.userId !== payload.userId));
      showToast(`${payload.name ?? player.name} was permanently deleted.`, "success");
    } catch (error) {
      showToast(error instanceof Error ? error.message : "Unable to delete the player account.", "error");
    } finally {
      setDeletingUserId(null);
    }
  }

  if (!isPrimaryOwner) {
    return (
      <section
        className="rounded-[2rem] p-6"
        style={{
          border: "1px solid var(--color-border-accent)",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          boxShadow: "0 24px 56px rgba(0, 0, 0, 0.22)",
        }}
      >
        <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
          Only Luisa can manage player access codes.
        </p>
      </section>
    );
  }

  return (
    <>
      <section
        className="rounded-[2rem] p-6"
        style={{
          border: "1px solid var(--color-border-accent)",
          backgroundColor: "rgba(255, 255, 255, 0.05)",
          boxShadow: "0 24px 56px rgba(0, 0, 0, 0.22)",
        }}
      >
        <div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.24em]" style={{ color: "var(--color-text-subtle)" }}>
              Admin tools
            </p>
            <h1 className="text-3xl font-black text-white">Player access codes</h1>
          </div>
          <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
            Copy or regenerate family player codes here.
          </p>
        </div>

        <div className="mt-4 flex justify-end">
          <button
            type="button"
            disabled={loadingPlayerAccessCodes || syncingDatabase}
            onClick={() => {
              void syncUsersToDatabase();
            }}
            className="rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
            style={{
              border: "1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)",
              backgroundColor: "color-mix(in srgb, var(--color-accent) 16%, rgba(255,255,255,0.08))",
              color: "var(--color-text)",
            }}
          >
            {syncingDatabase ? "Syncing database..." : "Sync users to database"}
          </button>
        </div>

        <div className="mt-6 grid gap-3">
          {loadingPlayerAccessCodes ? (
            <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
              Loading player codes...
            </p>
          ) : playerAccessCodes.length ? (
            playerAccessCodes.map((player) => (
              <div
                key={player.userId}
                className="flex flex-col gap-3 rounded-[1.4rem] p-4 sm:flex-row sm:items-center sm:justify-between"
                style={{
                  border: "1px solid var(--color-border-accent)",
                  backgroundColor: "rgba(255, 255, 255, 0.04)",
                }}
              >
                <div>
                  <p className="text-base font-bold text-white">{player.name}</p>
                  <p className="mt-1 text-sm font-semibold uppercase tracking-[0.2em]" style={{ color: "var(--color-text-subtle)" }}>
                    {player.accessCode ?? "No code stored yet"}
                  </p>
                  <p className="mt-2 text-xs font-medium" style={{ color: "var(--color-text-subtle)" }}>
                    {getDatabaseStatus(player)}
                    {player.platformRole ? ` · ${player.platformRole}` : ""}
                  </p>
                </div>

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={!player.accessCode}
                    onClick={() => {
                      if (player.accessCode) {
                        void copyAccessCode(player.accessCode);
                      }
                    }}
                    className="rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      border: "1px solid var(--color-border-accent)",
                      backgroundColor: "rgba(255, 255, 255, 0.08)",
                      color: "var(--color-text)",
                    }}
                  >
                    Copy code
                  </button>
                  <button
                    type="button"
                    disabled={player.isPrimaryOwner || regeneratingUserId === player.userId}
                    onClick={() => {
                      void regenerateAccessCode(player.userId);
                    }}
                    className="rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      border: "1px solid color-mix(in srgb, var(--color-accent) 28%, transparent)",
                      backgroundColor: "color-mix(in srgb, var(--color-accent) 18%, rgba(255,255,255,0.08))",
                      color: "var(--color-text)",
                    }}
                  >
                    {player.isPrimaryOwner
                      ? "Fixed owner code"
                      : regeneratingUserId === player.userId
                        ? "Regenerating..."
                        : "Regenerate code"}
                  </button>
                  <button
                    type="button"
                    disabled={player.isPrimaryOwner || deletingUserId === player.userId}
                    onClick={() => {
                      void deletePlayerAccount(player);
                    }}
                    className="rounded-full px-4 py-2 text-sm font-semibold transition disabled:cursor-not-allowed disabled:opacity-60"
                    style={{
                      border: "1px solid rgba(248, 113, 113, 0.3)",
                      backgroundColor: "rgba(127, 29, 29, 0.24)",
                      color: "rgb(254, 202, 202)",
                    }}
                  >
                    {player.isPrimaryOwner
                      ? "Owner protected"
                      : deletingUserId === player.userId
                        ? "Deleting..."
                        : "Delete user"}
                  </button>
                </div>
              </div>
            ))
          ) : (
            <p className="text-sm" style={{ color: "var(--color-text-subtle)" }}>
              No player codes are available yet.
            </p>
          )}
        </div>
      </section>

      <div className="pointer-events-none fixed bottom-4 right-4 z-50 flex w-full max-w-sm flex-col gap-3 px-4">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className="rounded-2xl px-4 py-3 text-sm shadow-2xl backdrop-blur-xl"
            style={{
              border:
                toast.type === "success"
                  ? "1px solid rgba(74, 222, 128, 0.28)"
                  : "1px solid rgba(248, 113, 113, 0.28)",
              backgroundColor:
                toast.type === "success"
                  ? "rgba(22, 101, 52, 0.84)"
                  : "rgba(127, 29, 29, 0.84)",
              color: "white",
              boxShadow: "0 20px 50px rgba(0, 0, 0, 0.28)",
            }}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </>
  );
}
