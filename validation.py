"""
Input validation and type checking for DARK analysis engine.
Provides runtime validation for all pipeline inputs.
"""

from __future__ import annotations

from dataclasses import dataclass
from pathlib import Path
from typing import Any

from pydantic import BaseModel, ConfigDict, Field, ValidationError as PydanticValidationError, field_validator


@dataclass
class ValidationError(Exception):
    """Exception raised for validation failures."""
    field: str
    message: str

    def __str__(self) -> str:
        return f"Validation error in {self.field}: {self.message}"


def validate_mode(mode: str) -> None:
    """Validate analysis mode."""
    valid_modes = ("simulate", "replay", "pcap", "live")
    if mode not in valid_modes:
        raise ValidationError("mode", f"must be one of {valid_modes}, got {mode}")


def validate_sessions(sessions: int) -> None:
    """Validate session count."""
    if not isinstance(sessions, int):
        raise ValidationError("sessions", f"must be integer, got {type(sessions)}")
    if sessions < 1 or sessions > 1000:
        raise ValidationError("sessions", f"must be between 1 and 1000, got {sessions}")


def validate_seed(seed: int) -> None:
    """Validate random seed."""
    if not isinstance(seed, int):
        raise ValidationError("seed", f"must be integer, got {type(seed)}")
    if seed < 0 or seed > 2**31 - 1:
        raise ValidationError("seed", f"must be valid 32-bit integer, got {seed}")


def validate_top_k(top_k: int | None) -> None:
    """Validate top-K ranking parameter."""
    if top_k is None:
        return
    if not isinstance(top_k, int):
        raise ValidationError("top_k", f"must be integer, got {type(top_k)}")
    if top_k < 1 or top_k > 50:
        raise ValidationError("top_k", f"must be between 1 and 50, got {top_k}")


def validate_dataset_path(dataset: str | Path | None, mode: str) -> None:
    """Validate dataset path for replay/pcap modes."""
    if mode in ("replay", "pcap"):
        if not dataset:
            raise ValidationError("dataset", f"{mode} mode requires dataset parameter")

    if dataset:
        path_obj = Path(dataset) if isinstance(dataset, str) else dataset
        if not path_obj.exists():
            raise ValidationError("dataset", f"file not found: {dataset}")
        if not path_obj.is_file():
            raise ValidationError("dataset", f"not a file: {dataset}")


def validate_interface_name(interface: str | None) -> None:
    """Validate network interface name."""
    if interface and not isinstance(interface, str):
        raise ValidationError("interface", f"must be string, got {type(interface)}")
    if interface and (len(interface) < 1 or len(interface) > 128):
        raise ValidationError("interface", f"invalid interface name length: {len(interface)}")


def validate_capture_seconds(seconds: int) -> None:
    """Validate capture duration."""
    if not isinstance(seconds, int):
        raise ValidationError("capture_seconds", f"must be integer, got {type(seconds)}")
    if seconds < 1 or seconds > 3600:
        raise ValidationError("capture_seconds", f"must be between 1 and 3600, got {seconds}")


class PipelineInputModel(BaseModel):
    model_config = ConfigDict(extra="forbid")

    mode: str
    dataset: str | Path | None = None
    sessions: int = Field(default=18, ge=1, le=1000)
    seed: int = Field(default=7, ge=0, le=2**31 - 1)
    top_k: int | None = Field(default=None, ge=1, le=50)
    interface: str | None = Field(default=None, min_length=1, max_length=128)
    capture_seconds: int = Field(default=8, ge=1, le=3600)

    @field_validator("mode")
    @classmethod
    def validate_mode_value(cls, value: str) -> str:
        validate_mode(value)
        return value

    @field_validator("dataset")
    @classmethod
    def normalize_dataset(cls, value: str | Path | None) -> str | Path | None:
        return value

    @field_validator("interface")
    @classmethod
    def validate_interface_value(cls, value: str | None) -> str | None:
        if value is not None:
            validate_interface_name(value)
        return value


def validate_pipeline_inputs(
    mode: str,
    dataset: str | Path | None = None,
    sessions: int = 18,
    seed: int = 7,
    top_k: int | None = None,
    interface: str | None = None,
    capture_seconds: int = 8,
) -> None:
    """Validate all pipeline input parameters."""
    try:
        PipelineInputModel(
            mode=mode,
            dataset=dataset,
            sessions=sessions,
            seed=seed,
            top_k=top_k,
            interface=interface,
            capture_seconds=capture_seconds,
        )
    except PydanticValidationError as exc:
        issue = exc.errors()[0]
        field = ".".join(str(part) for part in issue["loc"]) or "input"
        raise ValidationError(field, issue["msg"]) from exc

    validate_dataset_path(dataset, mode)
