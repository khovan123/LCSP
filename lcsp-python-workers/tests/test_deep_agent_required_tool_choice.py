from __future__ import annotations

from contextlib import contextmanager
from types import ModuleType
from types import SimpleNamespace
from unittest.mock import patch

import pytest

from lcsp_workers.llm import BudgetTracker, DeepAgentClient, LLMToolDefinition
from lcsp_workers.platform import tracing as tracing_module


@pytest.fixture(autouse=True)
def _disable_phoenix_tracing(monkeypatch) -> None:
    monkeypatch.setattr(tracing_module, "_tracer", None)


def _tracker() -> BudgetTracker:
    return BudgetTracker(monthly_budget_usd=100.0, monthly_token_cap=1_000_000)


class _FakeStateBackend:
    pass


class _FakeFilesystemBackend:
    def __init__(self, root_dir=None, virtual_mode=True, max_file_size_mb=10):
        self.root_dir = root_dir
        self.virtual_mode = virtual_mode
        self.max_file_size_mb = max_file_size_mb


class _FakeStoreBackend:
    def __init__(self, *, namespace, store=None):
        self.namespace = namespace
        self.store = store


class _FakeCompositeBackend:
    def __init__(self, default, routes, *, artifacts_root="/"):
        self.default = default
        self.routes = routes
        self.artifacts_root = artifacts_root


class _FakeMemorySaver:
    pass


class _FakeInMemoryStore:
    pass


class _FakeRubricMiddleware:
    def __init__(
        self,
        *,
        model,
        system_prompt=None,
        tools=None,
        max_iterations=3,
        on_evaluation=None,
    ):
        self.model = model
        self.system_prompt = system_prompt
        self.tools = tools
        self.max_iterations = max_iterations
        self.on_evaluation = on_evaluation


class _FakeAsyncSubAgent(dict):
    def __init__(self, **kwargs):
        super().__init__(kwargs)


class _FakeFilesystemPermission:
    def __init__(self, operations, paths, mode="allow"):
        self.operations = operations
        self.paths = paths
        self.mode = mode


@contextmanager
def _fake_deepagents(create_deep_agent):
    module = ModuleType("deepagents")
    module.__path__ = []
    module.AsyncSubAgent = _FakeAsyncSubAgent
    module.FilesystemPermission = _FakeFilesystemPermission
    module.create_deep_agent = create_deep_agent
    module.RubricMiddleware = _FakeRubricMiddleware
    backends = ModuleType("deepagents.backends")
    backends.CompositeBackend = _FakeCompositeBackend
    backends.FilesystemBackend = _FakeFilesystemBackend
    backends.StateBackend = _FakeStateBackend
    backends.StoreBackend = _FakeStoreBackend
    checkpoint = ModuleType("langgraph.checkpoint.memory")
    checkpoint.MemorySaver = _FakeMemorySaver
    store = ModuleType("langgraph.store.memory")
    store.InMemoryStore = _FakeInMemoryStore
    with patch.dict(
        "sys.modules",
        {
            "deepagents": module,
            "deepagents.backends": backends,
            "langgraph.checkpoint.memory": checkpoint,
            "langgraph.store.memory": store,
        },
    ):
        yield


def _required_tool() -> LLMToolDefinition:
    return LLMToolDefinition(
        name="finish",
        description="Submit the terminal structured result.",
        input_schema={
            "type": "object",
            "additionalProperties": False,
            "properties": {},
        },
        tool_choice_required=True,
    )


def test_required_tool_definition_is_captured_by_deep_agent() -> None:
    created = {}

    class FakeAgent:
        def invoke(self, _payload, config=None):
            del config
            next(tool for tool in created["tools"] if tool.__name__ == "finish")()
            return {
                "messages": [
                    SimpleNamespace(
                        content="done",
                        usage_metadata={"input_tokens": 10, "output_tokens": 5},
                    )
                ]
            }

    def fake_create_deep_agent(**kwargs):
        created.update(kwargs)
        return FakeAgent()

    client = DeepAgentClient(
        provider="openai",
        api_key="sk-test-key",
        model="gpt-4o",
        budget_tracker=_tracker(),
    )

    with _fake_deepagents(fake_create_deep_agent):
        response = client.complete_with_tools(
            "Finish now.",
            tools=[_required_tool()],
            workflow_run_id="workflow-1",
            node_name="investigate_engineering_rule_finish",
        )

    assert response.tool_calls[0].name == "finish"
    assert response.tool_calls[0].arguments == {}
    assert created["tools"][0].__name__ == "lcsp_search_source_code"
    assert created["tools"][-1].__name__ == "finish"
    assert "You must call one of the provided tools" in created["system_prompt"]
