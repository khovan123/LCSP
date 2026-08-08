from __future__ import annotations

import argparse
import importlib
import inspect
from typing import Type

from lcsp_workers.platform.config import load_config
from lcsp_workers.platform.pbac_client import PbacClient
from lcsp_workers.platform.queue_consumer import ConsumerBase


def _load_consumer(target: str) -> Type[ConsumerBase]:
    module_name, separator, class_name = target.partition(":")
    if not separator or not module_name or not class_name:
        raise ValueError(
            "worker target must use module.path:ClassName syntax"
        )

    module = importlib.import_module(module_name)
    consumer_type = getattr(module, class_name, None)
    if not inspect.isclass(consumer_type) or not issubclass(consumer_type, ConsumerBase):
        raise TypeError(f"{target} is not a ConsumerBase implementation")
    return consumer_type


def _build_consumer(target: str) -> ConsumerBase:
    config = load_config()
    consumer_type = _load_consumer(target)
    constructor = inspect.signature(consumer_type)
    kwargs: dict[str, object] = {}

    if "pbac_client" in constructor.parameters:
        kwargs["pbac_client"] = PbacClient(
            config.nestjs_api_base_url,
            config.worker_api_key,
        )

    return consumer_type(config, **kwargs)


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Run one LCSP RabbitMQ worker consumer."
    )
    parser.add_argument(
        "target",
        help="Consumer import target in module.path:ClassName format",
    )
    args = parser.parse_args()

    consumer = _build_consumer(args.target)
    consumer.run()


if __name__ == "__main__":
    main()
