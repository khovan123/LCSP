import type { PagesMessages } from "../../types.ts";
export const viPages = {
  signIn: {
    metadataTitle: "Đăng nhập | LCSP",
    metadataDescription: "Truy cập không gian làm việc tuân thủ LCSP.",
    homeAriaLabel: "Trang chủ LCSP",
    formEyebrow: "Truy cập an toàn",
    formTitle: "Đăng nhập LCSP",
    formDescription: "Dùng tài khoản tổ chức đã được phê duyệt của bạn.",
    emailLabel: "Email công việc",
    emailDescription: "Nhập địa chỉ email được liên kết với tổ chức của bạn.",
    passwordLabel: "Mật khẩu",
    passwordDescription:
      "Không lưu mật khẩu này trên trình duyệt khi dùng thiết bị dùng chung.",
    submit: "Đăng nhập",
    submitting: "Đang kiểm tra quyền truy cập",
    divider: "hoặc",
    oauthGitHub: "Tiếp tục với GitHub",
    accessHelp: "Cần quyền truy cập? Hãy liên hệ chủ sở hữu tổ chức.",
    errors: {
      emailRequired: "Nhập email công việc của bạn.",
      emailInvalid: "Nhập email công việc hợp lệ.",
      passwordRequired: "Nhập mật khẩu của bạn.",
      requestFailedTitle: "Không thể đăng nhập",
      requestFailedDetail: "Không thể đăng nhập. Vui lòng thử lại.",
    },
  },
} as const satisfies PagesMessages;
