import uuid
from pydantic import BaseModel, Field
from typing import List, Dict, Optional, Any

class IntegrationEvidence(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    nodeId: Optional[str] = None
    edgeId: Optional[str] = None
    evidenceType: str
    repositoryId: Optional[str] = None
    commitSha: Optional[str] = None
    filePath: Optional[str] = None
    lineStart: Optional[int] = None
    lineEnd: Optional[int] = None
    extractor: str
    hash: Optional[str] = None
    rawValue: Optional[str] = None

class GraphNode(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    type: str
    canonicalName: str
    properties: Dict[str, Any] = Field(default_factory=dict)
    evidences: List[IntegrationEvidence] = Field(default_factory=list)

class GraphEdge(BaseModel):
    id: str = Field(default_factory=lambda: str(uuid.uuid4()))
    sourceId: str
    targetId: str
    type: str
    confidence: float = 1.0
    properties: Dict[str, Any] = Field(default_factory=dict)
    evidences: List[IntegrationEvidence] = Field(default_factory=list)

class RepoSubgraph(BaseModel):
    nodes: List[GraphNode] = Field(default_factory=list)
    edges: List[GraphEdge] = Field(default_factory=list)
