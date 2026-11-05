"""Small repeatable latency probe for the isolated local runtime."""
import json
import statistics
import time
import uuid
from pathlib import Path
from urllib.parse import urlencode
from urllib.request import Request, build_opener, ProxyHandler

ROOT = Path(__file__).resolve().parent
LOCAL_HTTP = build_opener(ProxyHandler({}))


def call(port, path, token=None, body=None):
    headers = {"Accept": "*/*"}
    if token:
        headers["Authorization"] = "Bearer " + token
    if body is not None:
        headers["Content-Type"] = "application/json"
    request = Request(
        f"http://127.0.0.1:{port}{path}",
        data=json.dumps(body).encode() if body is not None else None,
        headers=headers,
    )
    started = time.perf_counter()
    with LOCAL_HTTP.open(request, timeout=20) as response:
        payload = response.read()
        return (time.perf_counter() - started) * 1000, response.status, payload


def probe(name, port, path, token=None, count=8):
    samples = []
    for _ in range(count):
        route = path() if callable(path) else path
        elapsed, status, _ = call(port, route, token)
        if status != 200:
            raise RuntimeError(f"{name}: HTTP {status}")
        samples.append(elapsed)
    ordered = sorted(samples)
    return {"samples": count, "p50_ms": round(statistics.median(samples), 1),
            "p95_ms": round(ordered[min(count - 1, int(count * .95))], 1),
            "max_ms": round(max(samples), 1)}


def main():
    demo = json.loads((ROOT / ".local/demo.json").read_text(encoding="utf-8"))
    _, _, data = call(8080, "/api/user/login", body={"email": demo["email"], "senha": demo["password"]})
    identity = json.loads(data)
    token = identity["token"]
    user_id = identity["id"]
    results = {
        "auth_health": probe("auth_health", 8080, "/actuator/health"),
        "main_plan_list": probe("main_plan_list", 8070, "/api/planejamento-list", token),
        "load_first_page": probe("load_first_page", 8090, lambda: "/api/consumer/" + str(user_id) + "?" + urlencode({
            "isLoadFull": "false", "offset": 0, "downloadId": "", "clientId": str(uuid.uuid4())}), token, 4),
        "chat_users": probe("chat_users", 5000, "/users", token),
        "web_root": probe("web_root", 5173, "/"),
    }
    target = ROOT / ".local/benchmark.json"
    target.write_text(json.dumps(results, indent=2), encoding="utf-8")
    print(json.dumps(results, indent=2))


if __name__ == "__main__":
    main()
