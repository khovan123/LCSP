from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

class CallbackResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    success: Optional[bool] = None
    accepted: Optional[bool] = None
    evidence_report_id: Optional[str] = None
    correlation_id: Optional[str] = None
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class ScanCallbackPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str
    scan_job_id: Optional[str] = None
    tools_version: Dict[str, str] = Field(default_factory=dict)
    config_hash: Dict[str, str] = Field(default_factory=dict)
    evidence_payload: Dict[str, Any] = Field(default_factory=dict)
    privacy_flags: Dict[str, Any] = Field(default_factory=dict)
    schema_version: str = "1.0.0"
    error_code: Optional[str] = None
    findings: List[Dict[str, Any]] = Field(default_factory=list)

class TechnicalProfileCallbackPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scan_job_id: str
    profile_data: Dict[str, Any]

class AIUsageFlowCallbackPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scan_job_id: str
    usage_flows: List[Dict[str, Any]]

class VerifiedProfileCallbackPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scan_job_id: str
    verified_data: Dict[str, Any]

class LegalRuleMatchCallbackPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scan_job_id: str
    matches: List[Dict[str, Any]]

class ClassificationCallbackPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    scan_job_id: str
    classification_level: str
    reasoning: Optional[str] = None

class AuditExportCallbackPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str
    export_url: Optional[str] = None
    error_message: Optional[str] = None
