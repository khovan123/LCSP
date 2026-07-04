"""
AC-037: LLM gateway never sends raw source code to provider.
AC-038: LLM gateway redacts secrets from prompts before transmission.
"""
import pytest


@pytest.mark.p0
def test_llm_gateway_strips_source_code_from_prompt() -> None:
    """
    AC-037: The LLM gateway must strip any raw source code from prompts
    before transmitting to the LLM provider.

    Source code is defined as text containing def/function/import/class/const
    with brace density > 5%.
    """
    try:
        from lcsp_workers.scanner.llm_gateway import LlmGateway

        gateway = LlmGateway()
        raw_prompt = (
            "Analyze this:\n"
            "def authenticate(user, password):\n"
            "    db_pass = db.get_password(user)\n"
            "    return hash(password) == db_pass\n"
        )

        sanitized = gateway.sanitize_prompt(raw_prompt)
        assert "def authenticate" not in sanitized, (
            "AC-037 FAIL: source code def must be stripped from LLM prompt"
        )
        assert "db_pass" not in sanitized, (
            "AC-037 FAIL: source code variable must be stripped from LLM prompt"
        )
    except ImportError:
        pytest.skip("AC-037 RED: LlmGateway not yet implemented")


@pytest.mark.p0
def test_llm_gateway_redacts_github_token_from_prompt() -> None:
    """
    AC-038: Any GitHub token (ghp_*), Anthropic key (sk-ant-*), or AWS key (AKIA*)
    in a prompt must be redacted to [REDACTED] before transmission.
    """
    try:
        from lcsp_workers.scanner.llm_gateway import LlmGateway

        gateway = LlmGateway()
        prompt_with_secret = "The token is ghp_realTokenValue1234567890abcdefg"

        sanitized = gateway.sanitize_prompt(prompt_with_secret)
        assert "ghp_realTokenValue" not in sanitized, (
            "AC-038 FAIL: GitHub token must be redacted before LLM transmission"
        )
        assert "[REDACTED]" in sanitized or "***" in sanitized, (
            "AC-038 FAIL: Redacted value must be replaced with a placeholder"
        )
    except ImportError:
        pytest.skip("AC-038 RED: LlmGateway not yet implemented")


@pytest.mark.p0
def test_llm_gateway_redacts_anthropic_key_from_prompt() -> None:
    """AC-038: Anthropic API key pattern redacted from prompt."""
    try:
        from lcsp_workers.scanner.llm_gateway import LlmGateway

        gateway = LlmGateway()
        prompt_with_secret = "Using key sk-ant-api03-ExampleKeyValue12345"

        sanitized = gateway.sanitize_prompt(prompt_with_secret)
        assert "sk-ant-api03" not in sanitized, (
            "AC-038 FAIL: Anthropic key must be redacted"
        )
    except ImportError:
        pytest.skip("AC-038 RED: LlmGateway not yet implemented")


@pytest.mark.p0
def test_llm_gateway_redacts_aws_key_from_prompt() -> None:
    """AC-038: AWS access key pattern (AKIA...) redacted from prompt."""
    try:
        from lcsp_workers.scanner.llm_gateway import LlmGateway

        gateway = LlmGateway()
        prompt_with_secret = "AWS key AKIAIOSFODNN7EXAMPLE in config"

        sanitized = gateway.sanitize_prompt(prompt_with_secret)
        assert "AKIAIOSFODNN7EXAMPLE" not in sanitized, (
            "AC-038 FAIL: AWS key must be redacted"
        )
    except ImportError:
        pytest.skip("AC-038 RED: LlmGateway not yet implemented")


@pytest.mark.p0
def test_llm_gateway_never_sends_full_ast_body() -> None:
    """
    AC-037: LLM gateway must not transmit full AST JSON bodies — only
    summary metadata (function names, finding types, line numbers).
    """
    try:
        from lcsp_workers.scanner.llm_gateway import LlmGateway
        from unittest.mock import patch, MagicMock

        gateway = LlmGateway()

        large_ast_body = '{"type": "Module", "body": [' + '{"type": "FunctionDef"} ' * 1000 + "]}"
        prompt = f"Analyze this AST:\n{large_ast_body}"

        # Intercept the HTTP call to the LLM provider
        with patch.object(gateway, "_send_to_provider") as mock_send:
            mock_send.return_value = MagicMock(content="analysis complete")
            gateway.analyze(prompt=prompt)

            assert mock_send.called, "gateway._send_to_provider must be called"
            actual_prompt = mock_send.call_args[0][0] if mock_send.call_args[0] else str(mock_send.call_args)

            # The sent prompt must not contain the full AST
            assert len(actual_prompt) < len(large_ast_body), (
                "AC-037 FAIL: Full AST body transmitted to LLM provider"
            )
    except ImportError:
        pytest.skip("AC-037 RED: LlmGateway not yet implemented")


@pytest.mark.p0
def test_llm_gateway_sanitize_is_called_before_every_provider_request() -> None:
    """
    AC-037/AC-038: sanitize_prompt must be called unconditionally before any
    HTTP request to the LLM provider. This is a defense-in-depth gate.
    """
    try:
        from lcsp_workers.scanner.llm_gateway import LlmGateway
        from unittest.mock import patch, MagicMock

        gateway = LlmGateway()
        sanitize_called = []

        original_sanitize = gateway.sanitize_prompt

        def tracking_sanitize(prompt: str) -> str:
            sanitize_called.append(True)
            return original_sanitize(prompt)

        gateway.sanitize_prompt = tracking_sanitize

        with patch.object(gateway, "_send_to_provider", return_value=MagicMock(content="ok")):
            gateway.analyze(prompt="test prompt")

        assert len(sanitize_called) > 0, (
            "AC-037 FAIL: sanitize_prompt was never called before LLM provider request"
        )
    except ImportError:
        pytest.skip("AC-037 RED: LlmGateway not yet implemented")
