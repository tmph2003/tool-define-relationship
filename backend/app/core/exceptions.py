"""
Custom exception classes for structured error handling.
"""

from fastapi import HTTPException, status


class TrinoConnectionError(HTTPException):
    """Raised when the application cannot connect to Trino."""

    def __init__(self, detail: str = "Failed to connect to Trino cluster") -> None:
        super().__init__(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail=detail,
        )


class TrinoQueryError(HTTPException):
    """Raised when a Trino query fails."""

    def __init__(self, detail: str = "Trino query execution failed") -> None:
        super().__init__(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=detail,
        )


class TrinoNotConnectedError(HTTPException):
    """Raised when an operation is attempted without an active connection."""

    def __init__(self) -> None:
        super().__init__(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=(
                "No active Trino connection. "
                "Call POST /api/v1/trino/connect first."
            ),
        )
