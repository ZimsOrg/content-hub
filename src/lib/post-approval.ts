import type { Post } from "./types";

export function getApprovalStatusForPostStatus(
  status: Post["status"],
  currentApprovalStatus?: Post["approvalStatus"],
): Post["approvalStatus"] {
  if (status === "approved" || status === "posted") {
    return "approved";
  }

  return "pending";
}

export function resolveApprovalStatus(
  status: Post["status"],
  stored: Post["approvalStatus"] | null | undefined,
): Post["approvalStatus"] {
  if (stored != null) {
    return stored;
  }
  return getApprovalStatusForPostStatus(status, undefined);
}
