import logging
import datetime
from threading import Lock
from typing import Optional
import redis

logger = logging.getLogger(__name__)

class BudgetExceeded(Exception):
    """Raised when the LLM token or cost budget is exceeded."""
    pass

class BudgetTracker:
    def __init__(self, monthly_budget_usd: float, monthly_token_cap: int, redis_url: Optional[str] = None):
        self.monthly_budget_usd = monthly_budget_usd
        self.monthly_token_cap = monthly_token_cap
        
        self._redis_client = None
        if redis_url:
            try:
                self._redis_client = redis.from_url(redis_url)
                self._redis_client.ping()
                logger.info("Connected to Redis for budget tracking.")
            except Exception as e:
                logger.warning("Failed to connect to Redis for budget tracking. Falling back to in-memory store.", exc_info=e)
                self._redis_client = None

        self._in_memory_store = {
            "month": datetime.datetime.now(datetime.UTC).month,
            "cost": 0.0,
            "tokens": 0
        }
        self._lock = Lock()

    def _get_current_month_key(self) -> str:
        now = datetime.datetime.now(datetime.UTC)
        return f"llm_budget:{now.year}-{now.month:02d}"

    def check_budget_and_accumulate(self, input_tokens: int, output_tokens: int, estimated_cost: float) -> None:
        total_tokens_call = input_tokens + output_tokens
        current_month = datetime.datetime.now(datetime.UTC).month
        month_key = self._get_current_month_key()

        if self._redis_client:
            try:
                # Use Redis transactions to atomically check and update
                cost_key = f"{month_key}:cost"
                tokens_key = f"{month_key}:tokens"
                
                current_cost = float(self._redis_client.get(cost_key) or 0.0)
                current_tokens = int(self._redis_client.get(tokens_key) or 0)
                
                if current_cost + estimated_cost > self.monthly_budget_usd:
                    raise BudgetExceeded("Monthly USD budget exceeded.")
                if current_tokens + total_tokens_call > self.monthly_token_cap:
                    raise BudgetExceeded("Monthly token cap exceeded.")
                
                pipe = self._redis_client.pipeline()
                pipe.incrbyfloat(cost_key, estimated_cost)
                pipe.incrby(tokens_key, total_tokens_call)
                # Set expiry for 60 days
                pipe.expire(cost_key, 60 * 24 * 60 * 60)
                pipe.expire(tokens_key, 60 * 24 * 60 * 60)
                pipe.execute()
                return
            except BudgetExceeded:
                raise
            except Exception as e:
                logger.warning("Redis operation failed during budget tracking. Falling back to in-memory.", exc_info=e)

        # Fallback to in-memory tracking
        with self._lock:
            if self._in_memory_store["month"] != current_month:
                self._in_memory_store = {
                    "month": current_month,
                    "cost": 0.0,
                    "tokens": 0
                }

            if self._in_memory_store["cost"] + estimated_cost > self.monthly_budget_usd:
                raise BudgetExceeded("Monthly USD budget exceeded.")
            if self._in_memory_store["tokens"] + total_tokens_call > self.monthly_token_cap:
                raise BudgetExceeded("Monthly token cap exceeded.")

            self._in_memory_store["cost"] += estimated_cost
            self._in_memory_store["tokens"] += total_tokens_call
