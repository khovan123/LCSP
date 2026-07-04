import type { CommonMessages } from "../../types.ts";

export const viCommon = {
  actions: {
    signIn: "Đăng nhập",
    verifyEmail: "Xác minh email",
    acceptInvite: "Chấp nhận lời mời",
    contactOwner: "Liên hệ chủ tổ chức",
    waitAndRetry: "Chờ và thử lại",
    verifyMfa: "Xác thực mã hai bước",
    retryRecovery: "Yêu cầu liên kết khôi phục mới",
    none: "Không cần hành động"
  }
} as const satisfies CommonMessages;
