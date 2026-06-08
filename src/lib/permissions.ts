import type { League, LeagueMember, LeagueRole, UserIdentity } from "@/lib/types";

export type PermissionAction =
  | "league:view"
  | "league:update"
  | "member:invite"
  | "member:remove"
  | "match:manage"
  | "result:manage"
  | "deadline:manage"
  | "scoring:manage"
  | "prediction:create"
  | "prediction:update"
  | "prediction:view"
  | "support-offer:manage"
  | "platform:admin";

const ROLE_RANK: Record<LeagueRole, number> = {
  member: 1,
  manager: 2,
  owner: 3,
};

function hasRoleAtLeast(role: LeagueRole, minimumRole: LeagueRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimumRole];
}

export function isPlatformAdmin(identity: UserIdentity | null | undefined): boolean {
  return identity?.platformRole === "platform_admin";
}

export function isLeagueMember(member: LeagueMember | null | undefined): boolean {
  return Boolean(member && member.isActive);
}

export function isLeagueManager(member: LeagueMember | null | undefined): boolean {
  return Boolean(member && member.isActive && hasRoleAtLeast(member.role, "manager"));
}

export function isLeagueOwner(member: LeagueMember | null | undefined): boolean {
  return Boolean(member && member.isActive && member.role === "owner");
}

export function canManageLeague(member: LeagueMember | null | undefined): boolean {
  return Boolean(member && member.isActive && hasRoleAtLeast(member.role, "manager"));
}

export function canOwnLeague(member: LeagueMember | null | undefined): boolean {
  return Boolean(member && member.isActive && hasRoleAtLeast(member.role, "owner"));
}

export function isLeagueOwnerByLeague(params: {
  actor: UserIdentity | null | undefined;
  league: League | null | undefined;
}): boolean {
  return Boolean(params.actor && params.league && params.actor.id === params.league.ownerUserId);
}

export function canPerformLeagueAction(params: {
  action: PermissionAction;
  actor: UserIdentity | null | undefined;
  member: LeagueMember | null | undefined;
  league?: League | null | undefined;
  targetMemberUserId?: string | null;
}): boolean {
  const { action, actor, member, league, targetMemberUserId } = params;

  if (isPlatformAdmin(actor)) {
    return true;
  }

  switch (action) {
    case "league:view":
    case "prediction:view":
      return isLeagueMember(member);

    case "prediction:create":
    case "prediction:update":
      return Boolean(
        isLeagueMember(member) &&
          targetMemberUserId &&
          member?.userId === targetMemberUserId,
      );

    case "match:manage":
    case "result:manage":
    case "deadline:manage":
    case "scoring:manage":
    case "member:invite":
    case "support-offer:manage":
      return canManageLeague(member);

    case "league:update":
    case "member:remove":
      return canOwnLeague(member) || isLeagueOwnerByLeague({ actor, league });

    case "platform:admin":
      return false;

    default:
      return false;
  }
}

export function assertPermission(params: {
  action: PermissionAction;
  actor: UserIdentity | null | undefined;
  member: LeagueMember | null | undefined;
  league?: League | null | undefined;
  targetMemberUserId?: string | null;
}): void {
  if (!canPerformLeagueAction(params)) {
    throw new Error(`Forbidden action: ${params.action}`);
  }
}
