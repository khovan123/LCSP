from unittest.mock import AsyncMock, MagicMock

import pytest
from langchain.agents.structured_output import (
    AutoStrategy,
    ProviderStrategy,
    ToolStrategy,
)
from langchain_core.tools import StructuredTool
from langchain_google_genai import ChatGoogleGenerativeAI
from langchain_openai import ChatOpenAI
from pydantic import BaseModel, ConfigDict

from contracts.handoffs import InvestigatorResult
from middleware.model_governance import MODEL_GOVERNANCE_MIDDLEWARE
from middleware.provider_schema import (
    ProviderSchemaCompatibilityMiddleware,
    relax_array_upper_bounds,
)


def _request(model, response_format, tools=None):
    request = MagicMock()
    request.model = model
    request.response_format = response_format
    request.model_settings = {}
    request.tools = list(tools or [])

    def _override(**kwargs):
        forwarded = _request(
            model,
            kwargs.get("response_format", response_format),
            kwargs.get("tools", request.tools),
        )
        forwarded.model_settings = kwargs.get("model_settings", request.model_settings)
        return forwarded

    request.override = MagicMock(side_effect=_override)
    return request


def _gemini() -> ChatGoogleGenerativeAI:
    return ChatGoogleGenerativeAI(model="gemini-3.5-flash-lite", google_api_key="test-key")


def test_model_governance_installs_provider_schema_compatibility() -> None:
    assert any(
        isinstance(item, ProviderSchemaCompatibilityMiddleware)
        for item in MODEL_GOVERNANCE_MIDDLEWARE
    )


def test_relaxing_removes_every_array_upper_bound_and_keeps_other_constraints() -> None:
    schema = InvestigatorResult.model_json_schema()
    relaxed = relax_array_upper_bounds(schema)

    def positive_upper_bounds(node) -> int:
        if isinstance(node, dict):
            hit = 1 if node.get("maxItems", 0) not in (0,) else 0
            return hit + sum(positive_upper_bounds(value) for value in node.values())
        if isinstance(node, list):
            return sum(positive_upper_bounds(value) for value in node)
        return 0

    assert positive_upper_bounds(schema) > 0
    # Every expansion-costly (>0) maxItems is gone...
    assert positive_upper_bounds(relaxed) == 0
    # ...but the 3 maxItems:0 on InvestigatorScopeNotApplicableClaim are a shape contract
    # (that claim_type must not carry these refs at all), not an expansion-cost bound, and
    # must survive relaxation untouched.
    scope_properties = relaxed["$defs"]["InvestigatorScopeNotApplicableClaim"]["properties"]
    for field in ("evidence_refs", "graph_path_refs", "source_anchor_refs"):
        assert scope_properties[field]["maxItems"] == 0, field
    # Lower bounds and value ranges cost the provider nothing, so they must survive.
    assert relaxed["properties"]["claims"]["items"] == schema["properties"]["claims"]["items"]
    assert (
        relaxed["$defs"]["InvestigatorRequirementMetClaim"]["properties"]["confidence"][
            "maximum"
        ]
        == 1
    )
    assert relaxed["$defs"]["BusinessContextNeed"]["properties"]["resolution_criteria"]["minItems"] == 1


def test_gemini_schema_strips_unsupported_additional_properties_recursively() -> None:
    schema = InvestigatorResult.model_json_schema()
    relaxed = relax_array_upper_bounds(schema)

    def count_key(node, key: str) -> int:
        if isinstance(node, dict):
            return (1 if key in node else 0) + sum(
                count_key(value, key) for value in node.values()
            )
        if isinstance(node, list):
            return sum(count_key(value, key) for value in node)
        return 0

    assert count_key(schema, "additionalProperties") > 0
    assert count_key(relaxed, "additionalProperties") == 0


def test_the_relaxed_schema_does_not_widen_the_validated_contract() -> None:
    # The provider stops rejecting oversize arrays, so Pydantic must still refuse them.
    payload = {
        "status": "READY",
        "artifact_versions": {"technicalEvidenceReportId": "report-1"},
        "claims": [
            {
                "claim_id": f"claim-{index}",
                "engineering_rule_id": "rule-1",
                "claim_type": "UNRESOLVED_ENGINEERING_FACT",
                "value": None,
                "confidence": 0.5,
            }
            for index in range(201)
        ],
        "next_step": "GATE",
    }
    with pytest.raises(Exception):
        InvestigatorResult.model_validate(payload)


@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_gemini_receives_a_relaxed_schema_in_the_same_strategy(asynchronous) -> None:
    middleware = ProviderSchemaCompatibilityMiddleware()
    request = _request(_gemini(), ProviderStrategy(InvestigatorResult))
    handler = AsyncMock() if asynchronous else MagicMock()

    if asynchronous:
        await middleware.awrap_model_call(request, handler)
    else:
        middleware.wrap_model_call(request, handler)

    forwarded = handler.call_args.args[0].response_format
    assert isinstance(forwarded, ProviderStrategy)
    assert forwarded.schema == relax_array_upper_bounds(InvestigatorResult.model_json_schema())
    assert handler.call_args.args[0].model_settings["automatic_function_calling"] == {
        "disable": True
    }


def test_gemini_tool_strategy_switches_to_native_provider_strategy() -> None:
    middleware = ProviderSchemaCompatibilityMiddleware()
    request = _request(_gemini(), ToolStrategy(InvestigatorResult))
    handler = MagicMock()

    middleware.wrap_model_call(request, handler)

    forwarded = handler.call_args.args[0].response_format
    assert isinstance(forwarded, ProviderStrategy)
    assert forwarded.schema == relax_array_upper_bounds(
        InvestigatorResult.model_json_schema()
    )


def test_gemini_auto_strategy_switches_to_native_provider_strategy() -> None:
    middleware = ProviderSchemaCompatibilityMiddleware()
    request = _request(_gemini(), AutoStrategy(InvestigatorResult))
    handler = MagicMock()

    middleware.wrap_model_call(request, handler)

    forwarded = handler.call_args.args[0].response_format
    assert isinstance(forwarded, ProviderStrategy)
    assert forwarded.schema == relax_array_upper_bounds(
        InvestigatorResult.model_json_schema()
    )


def test_gemini_auto_strategy_switches_to_provider_strategy_without_schema_relaxation() -> None:
    class MinimalResult(BaseModel):
        status: str

    canonical_schema = MinimalResult.model_json_schema()
    middleware = ProviderSchemaCompatibilityMiddleware()
    request = _request(_gemini(), AutoStrategy(MinimalResult))
    handler = MagicMock()

    middleware.wrap_model_call(request, handler)

    forwarded = handler.call_args.args[0].response_format
    assert isinstance(forwarded, ProviderStrategy)
    assert forwarded.schema == canonical_schema


def test_gemini_provider_strategy_without_schema_relaxation_is_preserved() -> None:
    class MinimalResult(BaseModel):
        status: str

    response_format = ProviderStrategy(MinimalResult)
    middleware = ProviderSchemaCompatibilityMiddleware()
    request = _request(_gemini(), response_format)
    handler = MagicMock()

    middleware.wrap_model_call(request, handler)

    assert handler.call_args.args[0].response_format is response_format


def test_provider_facing_gemini_schema_does_not_mutate_canonical_schema() -> None:
    canonical_schema = InvestigatorResult.model_json_schema()
    middleware = ProviderSchemaCompatibilityMiddleware()
    request = _request(_gemini(), AutoStrategy(InvestigatorResult))
    handler = MagicMock()

    middleware.wrap_model_call(request, handler)

    forwarded = handler.call_args.args[0].response_format
    assert isinstance(forwarded, ProviderStrategy)
    assert InvestigatorResult.model_json_schema() == canonical_schema


def test_gemini_tool_schema_strips_unsupported_additional_properties() -> None:
    class SearchInput(BaseModel):
        model_config = ConfigDict(extra="forbid")
        query: str

    def search_repository(query: str) -> str:
        return query

    search_tool = StructuredTool.from_function(
        search_repository,
        name="search_repository",
        description="Search repository evidence.",
        args_schema=SearchInput,
    )
    middleware = ProviderSchemaCompatibilityMiddleware()
    request = _request(_gemini(), None, [search_tool])
    handler = MagicMock()

    middleware.wrap_model_call(request, handler)

    forwarded_tools = handler.call_args.args[0].tools
    assert len(forwarded_tools) == 1
    assert isinstance(forwarded_tools[0], dict)

    def contains_key(node, key: str) -> bool:
        if isinstance(node, dict):
            return key in node or any(contains_key(value, key) for value in node.values())
        if isinstance(node, list):
            return any(contains_key(value, key) for value in node)
        return False

    assert contains_key(forwarded_tools[0], "additionalProperties") is False


def test_openai_requests_are_forwarded_untouched() -> None:
    middleware = ProviderSchemaCompatibilityMiddleware()
    response_format = ProviderStrategy(InvestigatorResult)
    request = _request(ChatOpenAI(model="gpt-5-mini", api_key="test-key"), response_format)
    handler = MagicMock()

    middleware.wrap_model_call(request, handler)

    assert handler.call_args.args[0] is request
    assert request.override.call_count == 0


def test_raw_schema_without_array_upper_bounds_still_disables_gemini_afc() -> None:
    middleware = ProviderSchemaCompatibilityMiddleware()
    request = _request(_gemini(), {"type": "object", "properties": {"status": {"type": "string"}}})
    handler = MagicMock()

    middleware.wrap_model_call(request, handler)

    assert handler.call_args.args[0].response_format is request.response_format
    assert handler.call_args.args[0].model_settings["automatic_function_calling"] == {
        "disable": True
    }


def _llm7() -> ChatOpenAI:
    return ChatOpenAI(
        model="codestral-latest",
        base_url="https://api.llm7.io/v1",
        api_key="llm7-test-token",
        use_responses_api=False,
    )


def _conversation():
    from langchain_core.messages import AIMessage, HumanMessage, SystemMessage, ToolMessage

    return [
        SystemMessage(content="system"),
        HumanMessage(content="analyze", name="customer"),
        AIMessage(
            content="",
            name="repository-analyst",
            tool_calls=[{"id": "m9WhW6SDw", "name": "ls", "args": {"path": "/"}}],
        ),
        ToolMessage(content="app.py", tool_call_id="m9WhW6SDw", name="ls"),
    ]


def _message_request(model, messages):
    from langchain.agents.middleware import ModelRequest

    return ModelRequest(model=model, messages=messages, tools=[])


@pytest.mark.parametrize("asynchronous", [False, True])
@pytest.mark.asyncio
async def test_llm7_requests_drop_assistant_name(asynchronous) -> None:
    # Regression: LLM7's upstream answers 422 upstream_unprocessable_request when an
    # assistant message carries `name` (Deep Agents stamp the agent name), so LLM7
    # failed on the first tool continuation of every scan and its circuit opened.
    messages = _conversation()
    request = _message_request(_llm7(), messages)
    handler = AsyncMock(return_value="ok") if asynchronous else MagicMock(return_value="ok")
    middleware = ProviderSchemaCompatibilityMiddleware()

    if asynchronous:
        await middleware.awrap_model_call(request, handler)
    else:
        middleware.wrap_model_call(request, handler)

    sent = handler.call_args.args[0].messages
    assert [type(message).__name__ for message in sent] == [
        "SystemMessage", "HumanMessage", "AIMessage", "ToolMessage",
    ]
    assert sent[2].name is None
    assert sent[2].tool_calls == messages[2].tool_calls
    # Only assistant names are dropped; graph state keeps the original message.
    assert sent[1].name == "customer"
    assert sent[3].name == "ls"
    assert messages[2].name == "repository-analyst"


@pytest.mark.parametrize(
    "model",
    [
        _gemini(),
        ChatOpenAI(model="mercury-2.5", base_url="https://api.inceptionlabs.ai/v1", api_key="k", use_responses_api=False),
        ChatOpenAI(model="gpt-5-nano", api_key="k"),
    ],
)
def test_other_providers_keep_assistant_name(model) -> None:
    messages = _conversation()
    request = _message_request(model, messages)
    handler = MagicMock(return_value="ok")

    ProviderSchemaCompatibilityMiddleware().wrap_model_call(request, handler)

    assert handler.call_args.args[0].messages[2].name == "repository-analyst"
