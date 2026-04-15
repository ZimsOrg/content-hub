import type { Post } from "./types";

export function getApprovalStatusForPostStatus(
  status: Post["status"],
  currentApprovalStatus?: Post["approvalStatus"],
): Post["approvalStatus"] {
  if (status === "approved" || status === "posted") {
    return "approved";
  }

  if (status === "review") {
    return currentApprovalStatus === "needs-revision" || currentApprovalStatus === "rejected"
      ? currentApprovalStatus
      : "pending";
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
