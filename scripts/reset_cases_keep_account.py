#!/usr/bin/env python3
import json
import urllib.error
import urllib.request

service_base_address = "http://127.0.0.1:8765"
profile_identifier = "main_chronicle"


def main() -> None:
    request = urllib.request.Request(
        f"{service_base_address}/api/case-start/case-material/reset",
        data=b"",
        headers={"X-Profile-Identifier": profile_identifier},
        method="POST",
    )
    try:
        with urllib.request.urlopen(request, timeout=30) as response:
            print(json.dumps(json.loads(response.read().decode("utf-8")), ensure_ascii=False, indent=2))
    except urllib.error.HTTPError as http_error:
        print(http_error.read().decode("utf-8"))
        raise SystemExit(1) from http_error


if __name__ == "__main__":
    main()
