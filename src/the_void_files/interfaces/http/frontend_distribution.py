from pathlib import Path

from starlette.staticfiles import StaticFiles
from starlette.types import ASGIApp, Receive, Scope, Send


class FrontendDistributionFiles(StaticFiles):
    def __init__(self, distribution_directory: Path) -> None:
        super().__init__(directory=distribution_directory, html=True)


class FrontendCacheControlMiddleware:
    def __init__(self, application: ASGIApp) -> None:
        self.application = application

    async def __call__(self, scope: Scope, receive: Receive, send: Send) -> None:
        if scope["type"] != "http":
            await self.application(scope, receive, send)
            return
        path = scope.get("path", "")

        async def send_with_cache_headers(message: dict) -> None:
            if message["type"] == "http.response.start" and (
                path in ("/", "/index.html") or path.endswith(".html") or path.startswith("/assets/")
            ):
                header_list = [
                    (header_name, header_value)
                    for header_name, header_value in message.get("headers", [])
                    if header_name.lower() != b"cache-control"
                ]
                if path in ("/", "/index.html") or path.endswith(".html"):
                    header_list.append((b"cache-control", b"no-store"))
                elif path.startswith("/assets/"):
                    header_list.append((b"cache-control", b"public, max-age=31536000, immutable"))
                message = {**message, "headers": header_list}
            await send(message)

        await self.application(scope, receive, send_with_cache_headers)
