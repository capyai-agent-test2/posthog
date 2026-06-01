from typing import Any

from pydantic import BaseModel
from rest_framework.utils.encoders import JSONEncoder


def orjson_default(obj: Any) -> Any:
    if isinstance(obj, BaseModel):
        return obj.model_dump(mode="json")
    return JSONEncoder().default(obj)
