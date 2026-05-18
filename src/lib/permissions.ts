import { User, LeagueMember, League, Match } from "./types";

/**
 * Role helpers
 */
export function isPlatformAdmin(user?: User | null): boolean {
  return !!user && user.platformRole === "platform_admin";
}

export function isLeagueOwner(member?: LeagueMember | null, league?: League | null, user?: User | null): boolean {
  if (member) return member.role === "owner";
  if (league && user) return league.ownerUserId === user.id;
  return false;
}

export function isLeagueManager(member?: LeagueMember | null): boolean {
  if (!member) return false;
  return member.role === "manager";
}

export function isLeagueMember(member?: LeagueMember | null): boolean {
  if (!member) return false;
  return member.role === "member" || member.role === "manager" || member.role === "owner";
}

/**
 * Can manage a league (invite/remove members, change visibility, etc.).
 * Platform admins, league owners and managers can manage.
 */
export function canManageLeague(args: { user?: User | null; member?: LeagueMember | null; league?: League | null }): boolean {
  const { user = null, member = null, league = null } = args;
  if (isPlatformAdmin(user)) return true;
  if (member && (member.role === "owner" || member.role === "manager")) return true;
  if (league && user && league.ownerUserId === user.id) return true;
  return false;
}

/**
 * Can edit match details (time, teams, cancel) — usually reserved for managers/owners/platform_admin.
 */
export function canEditMatch(args: { user?: User | null; member?: LeagueMember | null; league?: League | null; match?: Match | null }): boolean {
  const { user = null, member = null } = args;
  if (isPlatformAdmin(user)) return true;
  if (!member) return false;
  return member.role === "owner" || member.role === "manager";
}

/**
 * Can submit predictions. Any active league member may submit predictions.
 * Platform admins are allowed as well.
 */
export function canSubmitPrediction(args: { user?: User | null; member?: LeagueMember | null }): boolean {
  const { user = null, member = null } = args;
  if (isPlatformAdmin(user)) return true;
  if (!member) return false;
  return Boolean(member.isActive !== false); // default to true when undefined
}

/**
 * Can edit scoring rules for the league. By default allow owners and managers and platform admins.
 */
export function canEditScoringRules(args: { user?: User | null; member?: LeagueMember | null }): boolean {
  const { user = null, member = null } = args;
  if (isPlatformAdmin(user)) return true;
  if (!member) return false;
  return member.role === "owner" || member.role === "manager";
}

export default {
  isPlatformAdmin,
  isLeagueOwner,
  isLeagueManager,
  isLeagueMember,
  canManageLeague,
  canEditMatch,
  canSubmitPrediction,
  canEditScoringRules,
};
import type { LeagueMember, LeagueRole, UserIdentity } from "@/lib/types";

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
  platform_admin: 4,
};

function hasRoleAtLeast(role: LeagueRole, minimumRole: LeagueRole): boolean {
  return ROLE_RANK[role] >= ROLE_RANK[minimumRole];
}

export function isPlatformAdmin(identity: UserIdentity | null | undefined): boolean {
  return identity?.platformRole === "platform_admin";
}

export function canManageLeague(member: LeagueMember | null | undefined): boolean {
  return Boolean(member && hasRoleAtLeast(member.role, "manager"));
}

export function canOwnLeague(member: LeagueMember | null | undefined): boolean {
  return Boolean(member && hasRoleAtLeast(member.role, "owner"));
}

export function canPerformLeagueAction(params: {
  action: PermissionAction;
  actor: UserIdentity | null | undefined;
  member: LeagueMember | null | undefined;
  targetMemberUserId?: string | null;
}): boolean {
  const { action, actor, member, targetMemberUserId } = params;

  if (isPlatformAdmin(actor)) {
    return true;
  }

  switch (action) {
    case "league:view":
    case "prediction:view":
      return Boolean(member);

    case "prediction:create":
    case "prediction:update":
      return Boolean(member && targetMemberUserId && member.userId === targetMemberUserId);

    case "match:manage":
    case "result:manage":
    case "deadline:manage":
    case "scoring:manage":
    case "member:invite":
    case "support-offer:manage":
      return canManageLeague(member);

    case "league:update":
    case "member:remove":
      return canOwnLeague(member);

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
  targetMemberUserId?: string | null;
}): void {
  if (!canPerformLeagueAction(params)) {
    throw new Error(`Forbidden action: ${params.action}`);
  }
}

