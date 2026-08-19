import type { Locale } from "@lcsp/contracts/shared/locale";

export const CLASSIFICATION_RUNTIME_MESSAGE_KEYS = {
  passedDescription: "passedDescription",
  degradedDescription: "degradedDescription",
  blockedDescription: "blockedDescription",
  metricTotal: "metricTotal",
  metricCompliant: "metricCompliant",
  metricNonCompliant: "metricNonCompliant",
  metricUnknown: "metricUnknown",
  confidence: "confidence",
  technicalEvidence: "technicalEvidence",
  limitations: "limitations",
  evidenceType: "evidenceType",
  sourceLocation: "sourceLocation",
  sourceSymbol: "sourceSymbol",
  noTechnicalEvidence: "noTechnicalEvidence",
} as const;

export type ClassificationRuntimeMessageKey =
  (typeof CLASSIFICATION_RUNTIME_MESSAGE_KEYS)[keyof typeof CLASSIFICATION_RUNTIME_MESSAGE_KEYS];

const CLASSIFICATION_RUNTIME_MESSAGES = {
  vi: {
    passedDescription:
      "Phiên đánh giá EngineeringRule đã chạy đầy đủ. Kết quả từng quy tắc bên dưới phản ánh mức bằng chứng hiện có, không phải trạng thái lỗi runtime.",
    degradedDescription:
      "Phiên đánh giá chỉ hoàn tất một phần do có lỗi runtime hoặc một số EngineeringRule không được thực thi đầy đủ.",
    blockedDescription:
      "Runtime chưa tạo được tập kết quả EngineeringRule đủ tin cậy để tiếp tục.",
    metricTotal: "Tổng quy tắc",
    metricCompliant: "Đáp ứng",
    metricNonCompliant: "Chưa đáp ứng",
    metricUnknown: "Chưa kết luận",
    confidence: "Độ tin cậy",
    technicalEvidence: "Bằng chứng kỹ thuật",
    limitations: "Lý do chưa thể kết luận",
    evidenceType: "Loại bằng chứng",
    sourceLocation: "Vị trí mã nguồn",
    sourceSymbol: "Symbol",
    noTechnicalEvidence: "Chưa có vị trí bằng chứng kỹ thuật có thể hiển thị.",
  },
  en: {
    passedDescription:
      "The EngineeringRule evaluation run completed fully. Individual rule outcomes below reflect the available evidence, not runtime health.",
    degradedDescription:
      "The evaluation completed only partially because a runtime failure occurred or some EngineeringRules were not executed fully.",
    blockedDescription:
      "The runtime could not produce a trustworthy set of EngineeringRule results.",
    metricTotal: "Total rules",
    metricCompliant: "Met",
    metricNonCompliant: "Not met",
    metricUnknown: "Undetermined",
    confidence: "Confidence",
    technicalEvidence: "Technical evidence",
    limitations: "Why this is undetermined",
    evidenceType: "Evidence type",
    sourceLocation: "Source location",
    sourceSymbol: "Symbol",
    noTechnicalEvidence: "No displayable technical evidence location is available.",
  },
} as const;

const ENGINEERING_LIMITATION_LABELS = {
  vi: {
    NO_ENGINEERING_RULE_SOURCE_RULES: "Không có EngineeringRule nguồn đã được phê duyệt.",
    ENGINEERING_RULE_COMPILATION_FAILED: "Không thể materialize EngineeringRule từ nguồn pháp lý đã pin.",
    ENGINEERING_INVESTIGATION_FAILED: "Phiên điều tra EngineeringRule không hoàn tất thành công.",
    INVESTIGATION_RETURNED_NO_VALID_CLAIMS:
      "LLM không trả về claim kỹ thuật hợp lệ có provenance để evaluator sử dụng.",
    MODEL_LIMITATION_CODE_INVALID:
      "Model trả về limitation ngoài tập machine-code được cho phép.",
    ENGINEERING_EVIDENCE_INSUFFICIENT:
      "Bằng chứng kỹ thuật hiện có chưa đủ để kết luận yêu cầu này.",
    CONFLICTING_ENGINEERING_EVIDENCE:
      "Bằng chứng kỹ thuật đang mâu thuẫn giữa trạng thái đáp ứng và chưa đáp ứng.",
    DYNAMIC_PATH_UNRESOLVED:
      "Có nhánh runtime hoặc dynamic dispatch chưa thể chứng minh bằng phân tích tĩnh.",
    EXTERNAL_BOUNDARY_UNRESOLVED:
      "Kết luận còn phụ thuộc hệ thống hoặc boundary nằm ngoài repository.",
    GRAPH_COVERAGE_LIMITED:
      "Độ bao phủ của Program Evidence Graph còn giới hạn cho yêu cầu này.",
    SEARCH_COVERAGE_INCOMPLETE:
      "Phạm vi truy tìm hiện tại chưa đủ hoàn chỉnh để dùng absence làm bằng chứng.",
  },
  en: {
    NO_ENGINEERING_RULE_SOURCE_RULES: "No approved source EngineeringRule is available.",
    ENGINEERING_RULE_COMPILATION_FAILED:
      "The EngineeringRule could not be materialized from pinned legal provenance.",
    ENGINEERING_INVESTIGATION_FAILED:
      "The EngineeringRule investigation did not complete successfully.",
    INVESTIGATION_RETURNED_NO_VALID_CLAIMS:
      "The model returned no provenance-backed technical claim that the evaluator could use.",
    MODEL_LIMITATION_CODE_INVALID:
      "The model returned a limitation outside the allowed machine-code set.",
    ENGINEERING_EVIDENCE_INSUFFICIENT:
      "The available technical evidence is insufficient for this requirement.",
    CONFLICTING_ENGINEERING_EVIDENCE:
      "Technical evidence conflicts between met and not-met states.",
    DYNAMIC_PATH_UNRESOLVED:
      "A runtime or dynamically dispatched path cannot be proven statically.",
    EXTERNAL_BOUNDARY_UNRESOLVED:
      "The determination depends on a system boundary outside the repository.",
    GRAPH_COVERAGE_LIMITED:
      "Program Evidence Graph coverage is limited for this requirement.",
    SEARCH_COVERAGE_INCOMPLETE:
      "The current search coverage is not complete enough to treat absence as evidence.",
  },
} as const;

const ENGINEERING_REASON_LABELS = {
  vi: {
    "Conflicting evidence supports both satisfied and unsatisfied control states.":
      "Bằng chứng kỹ thuật đang cho thấy cả trạng thái đáp ứng và chưa đáp ứng đối với cùng yêu cầu.",
    "Repository evidence demonstrates that the engineering requirement is not met.":
      "Bằng chứng trong repository cho thấy yêu cầu kỹ thuật này chưa được đáp ứng.",
    "Repository evidence demonstrates that the engineering requirement is met.":
      "Bằng chứng trong repository cho thấy yêu cầu kỹ thuật này đã được đáp ứng.",
    "Available repository evidence is insufficient to determine this engineering requirement.":
      "Bằng chứng hiện có trong repository chưa đủ để kết luận yêu cầu kỹ thuật này.",
  },
  en: {
    "Conflicting evidence supports both satisfied and unsatisfied control states.":
      "Conflicting evidence supports both satisfied and unsatisfied control states.",
    "Repository evidence demonstrates that the engineering requirement is not met.":
      "Repository evidence demonstrates that the engineering requirement is not met.",
    "Repository evidence demonstrates that the engineering requirement is met.":
      "Repository evidence demonstrates that the engineering requirement is met.",
    "Available repository evidence is insufficient to determine this engineering requirement.":
      "Available repository evidence is insufficient to determine this engineering requirement.",
  },
} as const;

const ENGINEERING_CONCEPT_LABELS = {
  vi: {
    HUMAN_AUTHORITY_AND_CONTROL: "Quyền quyết định và kiểm soát của con người",
    FAIRNESS_TRANSPARENCY_ACCOUNTABILITY: "Công bằng, minh bạch và trách nhiệm giải trình",
    HEALTH_AI_SAFETY_DATA_PROTECTION: "An toàn AI y tế và bảo vệ dữ liệu",
    EDUCATION_AI_RISK_CONTROL: "Kiểm soát rủi ro AI trong giáo dục",
    PROHIBITED_MANIPULATION: "Hành vi thao túng bị cấm",
    PROHIBITED_VULNERABLE_GROUP_EXPLOITATION: "Khai thác nhóm dễ bị tổn thương bị cấm",
    PROHIBITED_HARMFUL_FAKE_CONTENT: "Nội dung giả mạo gây hại bị cấm",
    PROHIBITED_UNLAWFUL_AI_DATA_USE: "Sử dụng dữ liệu AI trái pháp luật bị cấm",
    PROHIBITED_HUMAN_CONTROL_TAMPERING: "Can thiệp trái phép vào cơ chế kiểm soát của con người",
    PROHIBITED_TRANSPARENCY_CONCEALMENT: "Che giấu nghĩa vụ minh bạch bị cấm",
    CLASSIFICATION_DOSSIER_AND_NOTIFICATION: "Hồ sơ phân loại và thông báo",
    MACHINE_READABLE_AI_MEDIA_MARK: "Đánh dấu nội dung AI ở định dạng máy có thể đọc",
  },
  en: {
    HUMAN_AUTHORITY_AND_CONTROL: "Human authority and control",
    FAIRNESS_TRANSPARENCY_ACCOUNTABILITY: "Fairness, transparency and accountability",
    HEALTH_AI_SAFETY_DATA_PROTECTION: "Health AI safety and data protection",
    EDUCATION_AI_RISK_CONTROL: "Education AI risk control",
    PROHIBITED_MANIPULATION: "Prohibited manipulation",
    PROHIBITED_VULNERABLE_GROUP_EXPLOITATION: "Prohibited exploitation of vulnerable groups",
    PROHIBITED_HARMFUL_FAKE_CONTENT: "Prohibited harmful fake content",
    PROHIBITED_UNLAWFUL_AI_DATA_USE: "Prohibited unlawful AI data use",
    PROHIBITED_HUMAN_CONTROL_TAMPERING: "Prohibited human-control tampering",
    PROHIBITED_TRANSPARENCY_CONCEALMENT: "Prohibited transparency concealment",
    CLASSIFICATION_DOSSIER_AND_NOTIFICATION: "Classification dossier and notification",
    MACHINE_READABLE_AI_MEDIA_MARK: "Machine-readable AI media marking",
  },
} as const;

const VI_MACHINE_LABEL_TOKENS: Record<string, string> = {
  AI: "AI",
  API: "API",
  PII: "PII",
  LLM: "LLM",
  AND: "và",
  HUMAN: "con người",
  AUTHORITY: "quyền quyết định",
  CONTROL: "kiểm soát",
  FAIRNESS: "công bằng",
  TRANSPARENCY: "minh bạch",
  ACCOUNTABILITY: "trách nhiệm giải trình",
  HEALTH: "y tế",
  SAFETY: "an toàn",
  DATA: "dữ liệu",
  PROTECTION: "bảo vệ",
  EDUCATION: "giáo dục",
  RISK: "rủi ro",
  PROHIBITED: "bị cấm",
  MANIPULATION: "thao túng",
  VULNERABLE: "dễ bị tổn thương",
  GROUP: "nhóm",
  EXPLOITATION: "khai thác",
  HARMFUL: "gây hại",
  FAKE: "giả mạo",
  CONTENT: "nội dung",
  UNLAWFUL: "trái pháp luật",
  USE: "sử dụng",
  TAMPERING: "can thiệp trái phép",
  CONCEALMENT: "che giấu",
  CLASSIFICATION: "phân loại",
  DOSSIER: "hồ sơ",
  NOTIFICATION: "thông báo",
  MACHINE: "máy",
  READABLE: "có thể đọc",
  MEDIA: "nội dung đa phương tiện",
  MARK: "đánh dấu",
  MARKING: "đánh dấu",
  SECURITY: "bảo mật",
  CYBER: "an ninh mạng",
  PRIVACY: "quyền riêng tư",
  PERSONAL: "cá nhân",
  SENSITIVE: "nhạy cảm",
  TRAINING: "huấn luyện",
  TESTING: "kiểm thử",
  VALIDATION: "xác thực",
  QUALITY: "chất lượng",
  GOVERNANCE: "quản trị",
  OVERSIGHT: "giám sát",
  REVIEW: "xem xét",
  APPEAL: "khiếu nại",
  DISCLOSURE: "công bố",
  LABEL: "nhãn",
  WARNING: "cảnh báo",
  OUTPUT: "đầu ra",
  SYSTEM: "hệ thống",
  DEPLOYMENT: "triển khai",
  CHANGE: "thay đổi",
  REGISTRATION: "đăng ký",
  TRACEABILITY: "khả năng truy vết",
  RETENTION: "lưu giữ",
  NOTICE: "thông báo",
  INCIDENT: "sự cố",
  REPORTING: "báo cáo",
  LOGGING: "ghi log",
  MONITORING: "giám sát",
  PROVIDER: "nhà cung cấp",
  DEVELOPER: "đơn vị phát triển",
  RESPONSIBILITY: "trách nhiệm",
  COPYRIGHT: "bản quyền",
  INTELLECTUAL: "sở hữu trí tuệ",
  PROPERTY: "tài sản",
  RIGHTS: "quyền",
  COMPENSATION: "bồi thường",
  HIGH: "cao",
  MEDIUM: "trung bình",
  LOW: "thấp",
  IMPACT: "tác động",
  ASSESSMENT: "đánh giá",
  PROCESS: "quy trình",
  PLAN: "kế hoạch",
  MITIGATION: "giảm thiểu",
  PERFORMANCE: "hiệu năng",
  ROBUSTNESS: "độ vững",
  ACCURACY: "độ chính xác",
  RELIABILITY: "độ tin cậy",
  ACCESS: "truy cập",
  MANAGEMENT: "quản lý",
  RECORD: "hồ sơ",
  RECORDS: "hồ sơ",
  USER: "người dùng",
  USERS: "người dùng",
  OPERATOR: "đơn vị vận hành",
  OPERATIONS: "vận hành",
  PURPOSE: "mục đích",
  GENERATED: "được tạo",
  SYNTHETIC: "tổng hợp",
  AUDIO: "âm thanh",
  IMAGE: "hình ảnh",
  VIDEO: "video",
  TEXT: "văn bản",
  WATERMARK: "watermark",
  IDENTIFICATION: "nhận diện",
  DIGITAL: "số",
  PUBLIC: "công cộng",
  SERVICE: "dịch vụ",
  CHILDREN: "trẻ em",
  MINOR: "người chưa thành niên",
  BIOMETRIC: "sinh trắc học",
  DECISION: "quyết định",
  DECISIONS: "quyết định",
  AUTOMATED: "tự động",
  EXPLAINABILITY: "khả năng giải thích",
  EXPLANATION: "giải thích",
  CONSENT: "sự đồng ý",
};

export function resolveClassificationRuntimeMessage(
  locale: Locale,
  key: ClassificationRuntimeMessageKey,
): string {
  const dictionary = CLASSIFICATION_RUNTIME_MESSAGES[locale] ?? CLASSIFICATION_RUNTIME_MESSAGES.en;
  return dictionary[key];
}

export function formatClassificationRuntimeSummary(
  locale: Locale,
  summary: {
    compliant: number;
    nonCompliant: number;
    unknown: number;
    total: number;
  },
): string {
  if (locale === "vi") {
    return `${summary.compliant} đáp ứng · ${summary.nonCompliant} chưa đáp ứng · ${summary.unknown} chưa kết luận trên tổng ${summary.total} EngineeringRule.`;
  }
  return `${summary.compliant} met · ${summary.nonCompliant} not met · ${summary.unknown} undetermined out of ${summary.total} EngineeringRules.`;
}

export function formatEngineeringConcept(value: string): string;
export function formatEngineeringConcept(locale: Locale, value: string): string;
export function formatEngineeringConcept(
  localeOrValue: Locale | string,
  maybeValue?: string,
): string {
  const locale: Locale = maybeValue === undefined ? "en" : (localeOrValue as Locale);
  const value = maybeValue === undefined ? localeOrValue : maybeValue;
  const key = value.trim().replace(/[\s-]+/g, "_").toUpperCase();
  const dictionary = ENGINEERING_CONCEPT_LABELS[locale] ?? ENGINEERING_CONCEPT_LABELS.en;
  const known = dictionary[key as keyof typeof dictionary];
  if (known) return known;
  if (locale === "vi") return formatVietnameseMachineLabel(key);
  return humanizeMachineLabel(key);
}

export function formatEngineeringLimitation(locale: Locale, code: string): string {
  const dictionary = ENGINEERING_LIMITATION_LABELS[locale] ?? ENGINEERING_LIMITATION_LABELS.en;
  const known = dictionary[code as keyof typeof dictionary];
  if (known) return known;
  return formatEngineeringConcept(locale, code);
}

export function formatEngineeringReason(locale: Locale, reason: string): string {
  const dictionary = ENGINEERING_REASON_LABELS[locale] ?? ENGINEERING_REASON_LABELS.en;
  return dictionary[reason as keyof typeof dictionary] ?? reason;
}

export function formatTechnicalEvidenceMore(locale: Locale, count: number): string {
  return locale === "vi"
    ? `Còn ${count} tham chiếu kỹ thuật khác trong artifact audit.`
    : `${count} additional technical references remain in the audit artifact.`;
}

export function formatLegalProvisionCitation(
  locale: Locale,
  provision: {
    documentId: string;
    articleNumber: string | null;
    clauseNumber: string | null;
    pointCode: string | null;
  },
): string {
  const parts = [formatLegalDocument(locale, provision.documentId)];
  if (provision.articleNumber) {
    parts.push(
      locale === "vi"
        ? `Điều ${provision.articleNumber}`
        : `Article ${provision.articleNumber}`,
    );
  }
  if (provision.clauseNumber) {
    parts.push(
      locale === "vi"
        ? `Khoản ${provision.clauseNumber}`
        : `Clause ${provision.clauseNumber}`,
    );
  }
  if (provision.pointCode) {
    parts.push(
      locale === "vi"
        ? `Điểm ${provision.pointCode}`
        : `Point ${provision.pointCode}`,
    );
  }
  return parts.join(" · ");
}

export function formatLegalReference(locale: Locale, value: string): string {
  const segments = value.split("::").filter(Boolean);
  return segments
    .map((segment) => formatLegalReferenceSegment(locale, segment))
    .join(" · ");
}

function humanizeMachineLabel(value: string): string {
  return value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((token) => {
      const upper = token.toUpperCase();
      if (["AI", "API", "PII", "LLM"].includes(upper)) return upper;
      return `${token.slice(0, 1).toUpperCase()}${token.slice(1).toLowerCase()}`;
    })
    .join(" ");
}

function formatVietnameseMachineLabel(value: string): string {
  const translated = value
    .split(/[_\s-]+/)
    .filter(Boolean)
    .map((token) => VI_MACHINE_LABEL_TOKENS[token.toUpperCase()] ?? token.toLowerCase())
    .join(" ");
  return translated
    ? `${translated.slice(0, 1).toUpperCase()}${translated.slice(1)}`
    : value;
}

function formatLegalDocument(locale: Locale, value: string): string {
  const lawMatch = /^LAW-(\d+)-(\d{4})-(QH\d+)$/i.exec(value);
  if (!lawMatch) return value;
  return locale === "vi"
    ? `Luật ${lawMatch[1]}/${lawMatch[2]}/${lawMatch[3].toUpperCase()}`
    : `Law ${lawMatch[1]}/${lawMatch[2]}/${lawMatch[3].toUpperCase()}`;
}

function formatLegalReferenceSegment(locale: Locale, value: string): string {
  const document = formatLegalDocument(locale, value);
  if (document !== value) return document;

  const article = /^art-(.+)$/i.exec(value);
  if (article) return locale === "vi" ? `Điều ${article[1]}` : `Article ${article[1]}`;

  const clause = /^cl-(.+)$/i.exec(value);
  if (clause) return locale === "vi" ? `Khoản ${clause[1]}` : `Clause ${clause[1]}`;

  const point = /^pt-(.+)$/i.exec(value);
  if (point) return locale === "vi" ? `Điểm ${point[1]}` : `Point ${point[1]}`;

  return value;
}
