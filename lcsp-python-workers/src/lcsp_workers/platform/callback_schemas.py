from typing import Any, Dict, List, Optional
from pydantic import BaseModel, ConfigDict, Field

class CallbackResponse(BaseModel):
    model_config = ConfigDict(extra="forbid")
    success: bool
    message: Optional[str] = None
    data: Optional[Dict[str, Any]] = None

class ScanCallbackPayload(BaseModel):
    model_config = ConfigDict(extra="forbid")
    status: str
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
