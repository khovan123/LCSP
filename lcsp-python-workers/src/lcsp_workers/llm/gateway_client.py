import os
import json
import logging
import tiktoken
from dataclasses import dataclass
from typing import Optional

from lcsp_workers.llm.prompt_safety import check_prompt_safety
from lcsp_workers.llm.budget_tracker import BudgetTracker
from lcsp_workers.platform.redaction import redact_string

logger = logging.getLogger(__name__)

@dataclass
class LLMResponse:
    content: str
    input_tokens: int
    output_tokens: int
    model: str
    provider: str

# Very rough estimated cost per 1M tokens (input, output) in USD for common models
# These are illustrative and should ideally be updated regularly
DEFAULT_MODEL_PRICING = {
    "gpt-4o": (5.0, 15.0),
    "gpt-4-turbo": (10.0, 30.0),
    "gpt-3.5-turbo": (0.5, 1.5),
    "claude-3-opus-20240229": (15.0, 75.0),
    "claude-3-sonnet-20240229": (3.0, 15.0),
    "claude-3-haiku-20240307": (0.25, 1.25),
}

def get_model_pricing() -> dict[str, tuple[float, float]]:
    pricing_env = os.environ.get("LLM_MODEL_PRICING")
    if pricing_env:
        try:
            parsed = json.loads(pricing_env)
            return {k: (float(v[0]), float(v[1])) for k, v in parsed.items()}
        except Exception as e:
            logger.warning("Failed to parse LLM_MODEL_PRICING env var, using defaults.", exc_info=e)
    return DEFAULT_MODEL_PRICING

def estimate_tokens(text: str) -> int:
    try:
        encoding = tiktoken.get_encoding("cl100k_base")
        return len(encoding.encode(text))
    except Exception:
        return len(text) // 4

def estimate_cost(model: str, input_tokens: int, output_tokens: int) -> float:
    # Fallback to a relatively high cost if model unknown to be safe (e.g., $10/$30)
    pricing = get_model_pricing()
    in_price, out_price = pricing.get(model, (10.0, 30.0))
    return (input_tokens / 1_000_000 * in_price) + (output_tokens / 1_000_000 * out_price)

class LLMGatewayClient:
    def __init__(
        self,
        provider: str,
        api_key: str,
        model: str,
        budget_tracker: BudgetTracker,
        max_tokens_per_call: int = 4096
    ):
        self.provider = provider.lower()
        self.api_key = api_key
        self.model = model
        self.max_tokens_per_call = max_tokens_per_call
        self.budget_tracker = budget_tracker

        if self.provider == "openai":
            import openai
            self._openai_client = openai.OpenAI(api_key=self.api_key)
        elif self.provider == "anthropic":
            import anthropic
            self._anthropic_client = anthropic.Anthropic(api_key=self.api_key)
        else:
            raise ValueError(f"Unsupported LLM_PROVIDER: {self.provider}")

    def complete(
        self,
        prompt: str,
        max_tokens: Optional[int] = None,
        correlation_id: Optional[str] = None
    ) -> LLMResponse:
        # 1. Pre-flight safety check
        check_prompt_safety(prompt)

        max_tokens_to_use = max_tokens if max_tokens is not None else self.max_tokens_per_call

        # Sanitize prompt before sending
        safe_prompt = redact_string(prompt)

        # 2. Budget pre-check (conservative estimate before calling)
        est_input = estimate_tokens(safe_prompt)
        est_cost_pre = estimate_cost(self.model, est_input, max_tokens_to_use)
        
        # Check budget without accumulating yet
        self.budget_tracker.check_budget_and_accumulate(0, 0, 0.0)

        # 3. Call Provider
        content = ""
        input_tokens = 0
        output_tokens = 0

        extra_headers = {}
        if correlation_id:
            extra_headers["X-Correlation-Id"] = correlation_id

        if self.provider == "openai":
            response = self._openai_client.chat.completions.create(
                model=self.model,
                messages=[{"role": "user", "content": safe_prompt}],
                max_tokens=max_tokens_to_use,
                extra_headers=extra_headers if extra_headers else None
            )
            content = response.choices[0].message.content or ""
            if response.usage:
                input_tokens = response.usage.prompt_tokens
                output_tokens = response.usage.completion_tokens

        elif self.provider == "anthropic":
            response = self._anthropic_client.messages.create(
                model=self.model,
                messages=[{"role": "user", "content": safe_prompt}],
                max_tokens=max_tokens_to_use,
                # extra_headers unsupported directly in simple create, but could be passed to default_headers in client
            )
            # Text block extraction
            text_blocks = [block.text for block in response.content if hasattr(block, "text")]
            content = "".join(text_blocks)
            input_tokens = response.usage.input_tokens
            output_tokens = response.usage.output_tokens

        # 4. Actual Budget Accumulation
        actual_cost = estimate_cost(self.model, input_tokens, output_tokens)
        self.budget_tracker.check_budget_and_accumulate(input_tokens, output_tokens, actual_cost)

        # 5. Redact Response
        safe_content = redact_string(content)

        return LLMResponse(
            content=safe_content,
            input_tokens=input_tokens,
            output_tokens=output_tokens,
            model=self.model,
            provider=self.provider
        )
