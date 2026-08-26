# Repository & Monorepo Evidence Graph — Technical Direction

## 1. Mục tiêu

Xây dựng một hệ thống có khả năng:

- Quét source code của nhiều repository hoặc một monorepo lớn.
- Phát hiện cấu trúc hệ thống, service, application, package và deployable unit.
- Phát hiện các hình thức giao tiếp giữa các thành phần:
  - HTTP / REST
  - gRPC
  - RabbitMQ / AMQP
  - Kafka
  - WebSocket
  - SSE
  - Database
  - Redis
- Chuẩn hóa các kết quả scan thành một **Evidence Graph**.
- Đọc tài liệu khai báo kiến trúc hoặc system declaration để tạo **Declared Graph**.
- Đối chứng giữa:
  - những gì hệ thống **khai báo**
  - những gì source code **thực sự thể hiện**
- Sinh ra các kết quả:
  - `CONFIRMED`
  - `PROBABLE`
  - `AMBIGUOUS`
  - `MISSING_IMPLEMENTATION`
  - `UNDOCUMENTED`
  - `CONFLICT`

Mục tiêu quan trọng nhất:

> Mọi kết luận về kiến trúc hoặc communication phải truy ngược được về evidence cụ thể như repository, commit SHA, file, line và extractor.

---

# 2. Nguyên tắc thiết kế chính

Không nên match theo:

```text
Repo A <-> Repo B
```

Vì cách này không scale tốt khi:

- có nhiều repository
- có monorepo
- một repository chứa nhiều service
- một service được deploy dưới nhiều alias khác nhau

Thay vào đó nên match tại mức:

```text
Integration Endpoint <-> Integration Endpoint
```

Ví dụ:

```text
OrderService
    |
    | HTTP POST /payments
    v
PaymentService
```

hoặc:

```text
PaymentService
    |
    | PUBLISH payment.completed
    v
RabbitMQ
    |
    | CONSUME payment.completed
    v
NotificationService
```

Repository chỉ là boundary vật lý của source code, không phải boundary logic của hệ thống.

---

# 3. Unified Architecture cho Multi-Repo và Monorepo

Nên dùng abstraction chung:

```text
System
  |
  +-- Repository
        |
        +-- Project
              |
              +-- DeployableUnit
              |      |
              |      +-- Service
              |      +-- Application
              |      +-- Worker
              |
              +-- Package
              +-- Library
```

## Multi-repo

```text
System
├── Repo A
│   └── Project A
│       └── OrderService
│
├── Repo B
│   └── Project B
│       └── PaymentService
│
└── Repo C
    └── Project C
        └── NotificationService
```

## Monorepo

```text
System
└── ecommerce-monorepo
    ├── apps/order
    │   └── OrderService
    ├── apps/payment
    │   └── PaymentService
    ├── apps/notification
    │   └── NotificationService
    └── packages/contracts
        └── SharedContracts
```

Matcher chỉ quan tâm đến `Project`, `Service`, `IntegrationEndpoint`.

Nó không cần quan tâm hai project nằm:

- cùng repo
- khác repo
- monorepo
- hybrid structure

---

# 4. Boundary quan trọng: Deployable Unit

Trong monorepo, folder không nhất thiết tương ứng với service.

Ví dụ:

```text
apps/
├── api/
│   ├── order-module
│   ├── payment-module
│   └── notification-module
```

Nếu cả ba module chạy trong cùng một process:

```text
OrderModule
   |
   | CALLS_INTERNAL
   v
PaymentModule
```

Không được suy ra:

```text
OrderService
   |
   | HTTP
   v
PaymentService
```

Do đó scanner cần xác định:

```text
Deployable Unit
```

Một deployable unit thường có thể:

- build riêng
- run riêng
- deploy riêng
- scale riêng

Signals:

```text
Dockerfile
main.ts / server.ts
package.json start script
SpringBootApplication
docker-compose service
Kubernetes Deployment
Helm chart
port binding
independent process command
```

Ví dụ scoring:

```text
Dockerfile                  +0.30
Independent start command   +0.20
Network port                +0.20
Kubernetes Deployment       +0.30
```

---

# 5. Các lớp graph nên có

Không nên dùng một graph duy nhất với semantics quá rộng.

Nên chia logic thành ba lớp.

## 5.1 Physical Structure Graph

Biểu diễn source tree:

```text
Repository
   |
   CONTAINS
   v
Project
   |
   CONTAINS
   v
Module
   |
   CONTAINS
   v
File
   |
   DEFINES
   v
Symbol
```

Dùng để trả lời:

- file nằm ở đâu
- symbol thuộc project nào
- project thuộc repo nào

---

## 5.2 Build / Dependency Graph

Biểu diễn code dependency:

```text
OrderService
    |
    IMPORTS
    v
SharedContracts
```

hoặc:

```text
Project A
    |
    DEPENDS_ON_PACKAGE
    v
Package B
```

Đây là **build-time dependency**, không đồng nghĩa với runtime communication.

---

## 5.3 Runtime Integration Graph

Biểu diễn communication thực tế:

```text
OrderService
    |
    HTTP POST /payments
    v
PaymentService
```

hoặc:

```text
PaymentService
    |
    PUBLISH
    v
payment.completed
    |
    CONSUMED_BY
    v
NotificationService
```

Không nên collapse tất cả thành:

```text
COMMUNICATES_WITH
```

vì sẽ mất semantics.

---

# 6. Node Types đề xuất

## Structure

```text
System
Repository
Workspace
Project
DeployableUnit
Service
Application
Worker
Library
Package
Module
File
Symbol
Function
Class
```

## Integration

```text
HttpEndpoint
HttpClientCall

GrpcService
GrpcMethod

MessageChannel
MessageProducer
MessageConsumer
MessageSchema

WebSocketNamespace
WebSocketEvent

Database
Table
RedisKey

ExternalService
```

## Evidence / Documentation

```text
Evidence
Declaration
IntegrationContract
Configuration
EnvironmentVariable
```

---

# 7. Edge Types đề xuất

## Structure

```text
CONTAINS
IMPLEMENTS
DEPLOYED_AS
DEFINED_IN
ALIAS_OF
```

## Build-time

```text
IMPORTS
DEPENDS_ON_PACKAGE
USES_SYMBOL
```

## Runtime

```text
CALLS_INTERNAL

CALLS_HTTP
EXPOSES_HTTP

CALLS_GRPC
IMPLEMENTS_GRPC

PUBLISHES
CONSUMES

EMITS
LISTENS

READS_DB
WRITES_DB

USES_REDIS
```

## Evidence

```text
EVIDENCED_BY
DECLARED_BY
MATCHES
PROPOSES_MATCH
CONFLICTS_WITH
```

---

# 8. Integration abstraction

Nên chuẩn hóa mọi dạng giao tiếp về một schema chung.

Ví dụ:

```ts
interface IntegrationEvidence {
  id: string;

  repositoryId: string;
  projectId: string;
  serviceId?: string;

  direction:
    | "INBOUND"
    | "OUTBOUND"
    | "PUBLISH"
    | "CONSUME"
    | "READ"
    | "WRITE";

  interaction:
    | "REQUEST_RESPONSE"
    | "PUB_SUB"
    | "QUEUE"
    | "STREAM"
    | "REALTIME"
    | "SHARED_STATE"
    | "INTERNAL_CALL";

  protocol:
    | "HTTP"
    | "GRPC"
    | "AMQP"
    | "KAFKA"
    | "MQTT"
    | "WEBSOCKET"
    | "SSE"
    | "DATABASE"
    | "REDIS";

  method?: string;
  address?: string;

  channel?: string;
  routingKey?: string;
  messageName?: string;

  schemaHash?: string;

  targetService?: string;

  evidenceRefs: string[];

  confidence: number;
}
```

---

# 9. Integration Anchor

Đây là kỹ thuật quan trọng để tránh matching kiểu O(N²).

Thay vì so sánh từng node với tất cả node khác, tạo canonical key.

## HTTP

```text
HTTP:POST:/payments/{param}
```

## RabbitMQ

```text
AMQP:payment:payment.completed
```

## Kafka

```text
KAFKA:payment-events:PaymentCompleted
```

## gRPC

```text
GRPC:payment.v1.PaymentService/CreatePayment
```

## WebSocket

```text
WS:/notifications:notification:new
```

Integration Index:

```text
HTTP:POST:/payments
├── OrderService OUTBOUND
└── PaymentService INBOUND
```

Từ đó match trực tiếp.

---

# 10. Normalize trước khi match

Ví dụ:

```text
/payments/:id
/payments/{id}
/payments/:paymentId
```

normalize thành:

```text
/payments/{param}
```

Tương tự:

```text
payment.completed
payment_completed
PaymentCompleted
```

có thể được giữ raw value và thêm canonical representation.

Không nên mất raw evidence.

---

# 11. Service Identity Resolution

Một service có thể xuất hiện dưới nhiều tên.

Ví dụ:

```text
Repository:
payment-backend

package.json:
@system/payment

Docker Compose:
payment

Kubernetes:
payment-service

DNS:
payment-service.default.svc

Documentation:
Payment API
```

Graph:

```text
payment-backend
        |
        IMPLEMENTS
        v
PaymentService
        |
        DEPLOYED_AS
        v
payment-service
```

Các alias:

```text
payment
@system/payment
payment-service
payment-service.default.svc
Payment API
```

đều:

```text
ALIAS_OF PaymentService
```

Đây là bài toán:

```text
Entity Resolution
```

---

# 12. Configuration Resolution Graph

Nhiều integration không có URL trực tiếp trong code.

Ví dụ:

```ts
axios.post(
  `${process.env.PAYMENT_SERVICE_URL}/payments`,
  data
);
```

Config:

```yaml
PAYMENT_SERVICE_URL: http://payment-service:3000
```

Graph:

```text
HttpCall
   |
   USES_CONFIG
   v
PAYMENT_SERVICE_URL
   |
   RESOLVES_TO
   v
http://payment-service:3000
   |
   IDENTIFIES
   v
PaymentService
```

Do đó scanner nên đọc thêm:

```text
.env.example
docker-compose.yml
Dockerfile
k8s/
helm/
terraform/
application.yml
application.properties
nginx.conf
config/
```

---

# 13. Monorepo Workspace Discovery

Trước khi scan AST nên chạy:

```text
Monorepo
   ↓
Workspace Discovery
   ↓
Project Detection
   ↓
Project Classification
```

Nguồn metadata có thể gồm:

```text
pnpm-workspace.yaml
package.json workspaces
nx.json
project.json
turbo.json
lerna.json
pom.xml
settings.gradle
Cargo.toml
```

Ví dụ:

```text
apps/order
apps/payment
packages/contracts
packages/common
```

classify:

```text
apps/order
type = SERVICE

apps/payment
type = SERVICE

packages/contracts
type = LIBRARY

packages/common
type = LIBRARY
```

---

# 14. Shared contract trong monorepo

Đây là một evidence rất mạnh.

Ví dụ:

```ts
export interface PaymentCompleted {
  orderId: string;
  amount: number;
}
```

Producer:

```ts
rabbit.publish(
  "payment.completed",
  event as PaymentCompleted
);
```

Consumer:

```ts
consume<PaymentCompleted>("payment.completed");
```

Graph:

```text
PaymentService
    |
    PRODUCES
    v
PaymentCompleted
    ^
    CONSUMES
    |
NotificationService
```

Shared contract có thể tạo canonical anchor:

```text
TYPE:@repo/contracts:PaymentCompleted
```

Nhưng:

> Hai project cùng import một DTO không có nghĩa chúng communicate với nhau.

Shared type chỉ tăng confidence nếu nó gắn với một integration operation như:

```text
HTTP body
Message publish
Message consume
gRPC request
Serialization
```

---

# 15. Contract Extraction

Scanner nên ưu tiên explicit contract trước source inference.

Priority:

```text
Explicit Contract
      ↓
Framework Metadata
      ↓
AST
      ↓
Symbol Resolution
      ↓
Data Flow
      ↓
Heuristic
      ↓
LLM Assistance
```

Các contract nên hỗ trợ:

```text
OpenAPI
AsyncAPI
Protobuf
GraphQL Schema
JSON Schema
```

---

# 16. AST và Static Analysis

## Tree-sitter

Phù hợp cho:

- multi-language parsing
- syntax tree
- imports
- calls
- decorators
- class/function detection
- string literal detection

Nhưng AST một mình không đủ.

Ví dụ:

```ts
const base = config.paymentUrl;
const url = `${base}/payments`;

axios.post(url);
```

AST chỉ biết:

```text
axios.post(url)
```

Muốn resolve target cần:

```text
Symbol Resolution
+
Data Flow
+
Constant Propagation
+
Configuration Resolution
```

---

# 17. Scanner Architecture

```text
Source Repository
      |
      v
Snapshot / Commit Pin
      |
      v
Workspace Discovery
      |
      v
Language Detection
      |
      +---------------------+
      |                     |
      v                     v
AST Scanner           Config Scanner
      |                     |
      v                     v
Code Evidence        Deployment Evidence
      |                     |
      +----------+----------+
                 |
                 v
        Semantic Resolution
                 |
                 v
        Integration Detector
                 |
                 v
        Evidence Normalizer
                 |
                 v
          Repo Subgraph
                 |
                 v
        Integration Index
                 |
                 v
      Cross-Project Resolver
                 |
                 v
       System Evidence Graph
```

---

# 18. Repo Subgraph và System Graph

Không nên rebuild toàn hệ thống mỗi khi một repo thay đổi.

Mỗi repository hoặc project nên sinh subgraph riêng:

```text
repo-a.graph
repo-b.graph
repo-c.graph
```

Sau đó resolver build:

```text
SystemGraph
```

Khi Repo A đổi:

```text
SHA1 -> SHA2
```

chỉ cần:

```text
rebuild Repo A subgraph
```

và rerun các integration liên quan.

Đây là nền tảng cho incremental scanning.

---

# 19. Evidence Model

Mỗi evidence nên có tối thiểu:

```ts
interface Evidence {
  id: string;

  repositoryId: string;
  projectId?: string;

  commitSha: string;

  file: string;

  lineStart?: number;
  lineEnd?: number;

  extractor: string;

  evidenceType:
    | "STATIC"
    | "CONTRACT"
    | "CONFIG"
    | "DOCUMENTATION"
    | "RUNTIME";

  hash?: string;

  rawValue?: string;
}
```

Commit SHA cực kỳ quan trọng để tránh đối chứng sai snapshot.

---

# 20. Declaration Graph

Tài liệu kiến trúc không nên được merge thẳng vào Observed Graph.

Ví dụ tài liệu khai báo:

```text
Order Service communicates with Payment Service
through HTTP POST /payments.
```

Normalize:

```json
{
  "source": "OrderService",
  "target": "PaymentService",
  "interaction": "REQUEST_RESPONSE",
  "protocol": "HTTP",
  "method": "POST",
  "path": "/payments"
}
```

Sinh:

```text
DeclaredIntegration
```

không phải:

```text
ObservedIntegration
```

---

# 21. Two-Graph Model

Nên có hai graph logic chính.

## Observed Graph

Sinh từ:

```text
Source Code
Configuration
OpenAPI
AsyncAPI
Protobuf
Runtime Trace
```

## Declared Graph

Sinh từ:

```text
Architecture Docs
System Specification
User Declaration
Wizard
YAML Declaration
```

Sau đó:

```text
Declared Graph
      |
      v
Graph Reconciliation
      ^
      |
Observed Graph
```

---

# 22. Reconciliation Result

Các trạng thái chính:

## Confirmed

```text
DECLARED + OBSERVED
        ↓
CONFIRMED
```

## Missing Implementation

```text
DECLARED
but no OBSERVED
        ↓
MISSING_IMPLEMENTATION
```

## Undocumented

```text
OBSERVED
but no DECLARED
        ↓
UNDOCUMENTED
```

## Conflict

```text
DECLARED Kafka

OBSERVED RabbitMQ
        ↓
CONFLICT
```

## Ambiguous

```text
Candidate A score 0.58
Candidate B score 0.55
        ↓
AMBIGUOUS
```

---

# 23. Matching Strategy

Không nên chỉ exact match.

Nên có ba tầng.

## Level 1 — Deterministic

Ưu tiên:

```text
protocol
method
normalized path
topic
routing key
gRPC service/method
shared contract
schema hash
service config
```

Ví dụ:

```text
POST /payments/{id}
POST /payments/:paymentId
```

normalize:

```text
POST /payments/{param}
```

---

## Level 2 — Structural Matching

Dùng graph context:

```text
shared neighbors
config resolution
shared contract
deployment alias
dependency neighborhood
```

Có thể dùng:

```text
Jaccard Similarity
Cosine Similarity
Common Neighbors
Graph Distance
```

Chỉ nên tạo:

```text
PROBABLE
```

hoặc:

```text
PROPOSES_MATCH
```

Không tự confirm.

---

## Level 3 — LLM Assisted Matching

LLM dùng cho:

- parse architecture documentation
- resolve semantic aliases
- propose mapping
- explain conflicts
- rank ambiguous candidates

LLM không nên được quyền tạo `CONFIRMED` integration nếu thiếu deterministic evidence.

Output dạng:

```json
{
  "candidate": "PaymentCompleted",
  "confidence": 0.74,
  "reason": "Semantically similar to successful payment event",
  "evidence_refs": ["..."]
}
```

---

# 24. Confidence Model

Ví dụ:

```text
HTTP endpoint match       0.30
Protocol match            0.15
Target service match      0.20
Schema match              0.15
Configuration evidence    0.10
Graph context             0.10
```

Trạng thái:

```text
CONFIRMED
PROBABLE
AMBIGUOUS
UNRESOLVED
CONFLICT
```

Ví dụ threshold:

```text
>= 0.85    CONFIRMED
0.65-0.84  PROBABLE
0.45-0.64  AMBIGUOUS
< 0.45     UNRESOLVED
```

Threshold thực tế nên được calibration bằng dataset.

---

# 25. Schema Fingerprinting

Để match contract giữa producer và consumer:

```json
{
  "id": "uuid",
  "amount": 10,
  "currency": "USD"
}
```

Normalize:

```text
amount:number
currency:string
id:string
```

Hash:

```text
sha256(normalized_schema)
```

Producer:

```text
schemaHash = abc123
```

Consumer:

```text
schemaHash = abc123
```

=> confidence rất cao.

Nếu:

```text
abc123 != def789
```

có thể sinh:

```text
CONTRACT_SCHEMA_CONFLICT
```

---

# 26. Communication Types cần support

## HTTP / REST

Detect:

```text
fetch
axios
HttpClient
RestTemplate
WebClient
NestJS Controller
Spring Controller
Laravel Route
```

Normalize:

```text
HTTP
POST
/payments
```

---

## RabbitMQ

Detect:

```text
publish
sendToQueue
consume
subscribe
```

Normalize:

```text
platform = RabbitMQ
protocol = AMQP
exchange = payment
routingKey = payment.completed
direction = PUBLISH / CONSUME
```

---

## Kafka

Normalize:

```text
platform = Kafka
interaction = STREAM
topic = payment-events
message = PaymentCompleted
```

---

## gRPC

Canonical key:

```text
GRPC:payment.v1.PaymentService/CreatePayment
```

---

## WebSocket

Canonical key:

```text
WS:/notification:notification:new
```

---

## Database

Graph:

```text
ServiceA
   |
   WRITES
   v
users

ServiceB
   |
   READS
   v
users
```

Không nên coi shared DB giống HTTP communication.

Nên dùng semantics:

```text
SHARES_DATA_WITH
```

hoặc giữ edge `READS_DB` / `WRITES_DB`.

---

## Redis

Có thể detect:

```text
Redis key
Redis pub/sub
Redis stream
Redis cache
```

Cần phân biệt:

```text
cache usage
shared state
message communication
```

---

# 27. Runtime Evidence

Static analysis có giới hạn.

Ví dụ:

```ts
serviceDiscovery.find("payment")
```

Scanner có thể không resolve được target.

Nếu có runtime tracing:

```text
OrderService
     |
     HTTP span
     v
PaymentService
```

thì có thêm:

```text
RUNTIME evidence
```

Nên model:

```text
STATIC
CONTRACT
CONFIG
DOCUMENTATION
RUNTIME
```

Runtime evidence có thể lấy từ:

```text
OpenTelemetry
Distributed Trace
Service Mesh telemetry
```

---

# 28. Graph Persistence

## MVP

Có thể dùng PostgreSQL:

```text
graph_nodes
graph_edges
evidence
snapshots
integration_index
```

Ví dụ:

```sql
graph_nodes(
  id,
  type,
  properties_jsonb,
  snapshot_id
)
```

```sql
graph_edges(
  id,
  source_id,
  target_id,
  type,
  properties_jsonb
)
```

## Khi traversal trở thành core

Có thể chuyển hoặc replicate sang:

```text
Neo4j
```

Phù hợp cho query kiểu:

```cypher
MATCH (a:Service)-[:PUBLISHES]->(e:Event)
      <-[:CONSUMES]-(b:Service)
RETURN a, e, b
```

---

# 29. Visualization

Có thể dùng:

```text
Graphology
Sigma.js
Cytoscape.js
```

Visualization nên support filter theo:

```text
Repository
Project
Service
Protocol
Evidence Type
Confidence
Gap Type
```

Ví dụ user có thể bật:

```text
Show only runtime integrations
Show only conflicts
Show only HTTP
Show undocumented integrations
```

---

# 30. Khai báo hệ thống thủ công

Có thể cho user khai báo bằng `system.yaml`.

Ví dụ:

```yaml
services:

  order-service:
    repository: ecommerce
    project: apps/order

    outbound:
      - target: payment-service
        interaction: request_response
        protocol: http
        method: POST
        path: /payments

  payment-service:
    repository: ecommerce
    project: apps/payment

    outbound:
      - target: notification-service
        interaction: pub_sub
        platform: rabbitmq
        protocol: amqp
        channel: payment
        message: payment.completed
```

Pipeline:

```text
system.yaml
    |
    v
Declaration Parser
    |
    v
Declared Graph
```

---

# 31. Unified Example

System:

```text
repo-core
├── apps/order
├── apps/payment
└── packages/contracts

repo-notification
└── notification

repo-web
└── frontend
```

Physical graph:

```text
System
├── repo-core
│   ├── OrderService
│   ├── PaymentService
│   └── SharedContracts
├── repo-notification
│   └── NotificationService
└── repo-web
    └── Frontend
```

Runtime Integration Graph:

```text
Frontend
    |
    HTTP
    v
OrderService
    |
    HTTP
    v
PaymentService
    |
    AMQP payment.completed
    v
NotificationService
```

Build Graph:

```text
OrderService
     \
      \ IMPORTS
       v
  SharedContracts
       ^
      / IMPORTS
     /
PaymentService
```

Hai graph này có liên quan nhưng không nên bị trộn semantics.

---

# 32. Pipeline Tổng Thể Đề Xuất

```text
                Git Repositories
                       |
                       v
               Commit Snapshots
                       |
                       v
             Workspace Discovery
                       |
                       v
              Project Detection
                       |
                       v
           Deployable Unit Detection
                       |
        +--------------+--------------+
        |                             |
        v                             v
     AST Scan                    Config Scan
        |                             |
        v                             v
 Source Evidence              Deploy Evidence
        |                             |
        +--------------+--------------+
                       |
                       v
              Semantic Resolver
                       |
                       v
            Integration Detector
                       |
                       v
            Evidence Normalizer
                       |
                       v
               Repo Subgraphs
                       |
                       v
             Integration Index
                       |
                       v
          Cross-Project Resolution
                       |
                       v
            System Evidence Graph
                       ^
                       |
        +--------------+--------------+
        |              |              |
     OpenAPI        AsyncAPI       Protobuf
        |
        v
 Architecture Documentation
        |
        v
      LLM Parser
        |
        v
   Declaration Graph
        |
        v
 Graph Reconciliation
        |
        +------------------------------+
        |              |               |
        v              v               v
    CONFIRMED       CONFLICT       MISSING
        |
        v
    Audit Result
```

---

# 33. Kỹ thuật cốt lõi cần dùng

## 1. Static Program Analysis

```text
AST
Symbol Resolution
Call Graph
Data Flow
Constant Propagation
```

## 2. Multi-language Parsing

```text
Tree-sitter
Language-specific extractors
```

## 3. Workspace / Monorepo Analysis

```text
pnpm workspace
Nx
Turborepo
Lerna
Maven
Gradle
```

## 4. Deployable Unit Detection

```text
Docker
Kubernetes
Entrypoint
Runtime command
Port binding
```

## 5. Configuration Resolution

```text
ENV
Docker Compose
Kubernetes
Helm
Terraform
Application Config
```

## 6. Contract Extraction

```text
OpenAPI
AsyncAPI
Protobuf
GraphQL
JSON Schema
```

## 7. Knowledge Graph

```text
Typed nodes
Typed edges
Provenance
Snapshots
```

## 8. Entity Resolution

```text
Repository name
Package name
Service name
Container name
Kubernetes name
DNS
Documentation aliases
```

## 9. Graph Matching

```text
Integration Anchor
Exact Matching
Structural Similarity
Candidate Ranking
```

## 10. Schema Matching

```text
Schema normalization
Schema fingerprint
Contract compatibility
```

## 11. Evidence & Provenance

```text
Repository
Commit SHA
Project
File
Line
Extractor
Hash
```

## 12. LLM-assisted Reconciliation

```text
Document parsing
Semantic mapping
Alias suggestion
Conflict explanation
Ambiguous candidate ranking
```

## 13. Runtime Observability

```text
OpenTelemetry
Distributed Tracing
Runtime Service Graph
```

---

# 34. Roadmap Triển Khai

## Phase 1 — Foundation

Support:

```text
Repository
Project
File
Symbol
Evidence
```

Implement:

```text
Workspace Discovery
AST parsing
HTTP inbound
HTTP outbound
Integration Anchor
```

Goal:

```text
HTTP OUTBOUND <-> HTTP INBOUND
```

---

## Phase 2 — Messaging & RPC

Thêm:

```text
RabbitMQ
Kafka
gRPC
WebSocket
```

và canonical signatures.

---

## Phase 3 — Configuration Resolution

Thêm:

```text
ENV
Docker Compose
Dockerfile
Kubernetes
Helm
```

Goal:

```text
${PAYMENT_URL}
    ↓
payment-service
    ↓
PaymentService
```

---

## Phase 4 — Monorepo Intelligence

Thêm:

```text
Workspace Detection
Project Classification
Deployable Unit Detection
Shared Contracts
Build Dependency Graph
```

---

## Phase 5 — Documentation Reconciliation

Thêm:

```text
Declared Graph
Observed Graph
```

Sinh:

```text
CONFIRMED
MISSING_IMPLEMENTATION
UNDOCUMENTED
CONFLICT
```

---

## Phase 6 — Advanced Matching

Thêm:

```text
Structural similarity
Graph context scoring
Schema fingerprints
LLM candidate ranking
```

---

## Phase 7 — Runtime Verification

Thêm:

```text
OpenTelemetry
Runtime traces
Service graph
```

So sánh:

```text
Declared
vs
Static
vs
Runtime
```

---

# 35. Kiến trúc nên chốt

Abstraction tổng quát:

```text
System
  |
  v
Repository
  |
  v
Project
  |
  v
DeployableUnit
  |
  v
Service / Application
  |
  v
IntegrationEndpoint
```

Matching:

```text
IntegrationEndpoint
       |
       | MATCH
       v
IntegrationEndpoint
```

Không matching tại:

```text
Repository <-> Repository
```

---

# 36. Mô hình Evidence cuối cùng

Một integration được xác nhận tốt nhất khi có nhiều nguồn evidence cùng hội tụ:

```text
                    Integration Contract

                  /        |        \
                 /         |         \
          Declaration    Static     Runtime
             Evidence    Evidence   Evidence
                 \         |         /
                  \        |        /
                   Reconciliation
                         |
                         v
                Integration Result
                         |
        +----------------+----------------+
        |                |                |
    CONFIRMED         CONFLICT         AMBIGUOUS
```

Ví dụ:

```text
OrderService
   |
   HTTP
   |
   POST /payments
   |
   PaymentRequest
   |
   v
PaymentService
```

với provenance:

```text
repository
project
commit SHA
file
line
extractor
contract
configuration
runtime trace
```

---

# 37. Kết luận

Hướng phù hợp nhất là xây dựng một **Evidence-backed Software Knowledge Graph**.

Ba ý quan trọng cần giữ:

1. **Repository không phải integration boundary.**
   - Với multi-repo và monorepo, đơn vị quan trọng là `Project`, `DeployableUnit`, `Service`.

2. **Build dependency khác runtime communication.**
   - `IMPORTS` không đồng nghĩa với `CALLS_HTTP`.
   - `Shared DTO` không đồng nghĩa với hai service communicate.

3. **Declaration và Observed Evidence phải tách riêng.**
   - Sau đó mới reconciliation để sinh gap/conflict.

Kiến trúc này cho phép hệ thống scale từ:

```text
1 repo
```

đến:

```text
monorepo
```

rồi:

```text
nhiều repo + nhiều monorepo + shared infrastructure
```

mà không cần thay đổi core matching model.
