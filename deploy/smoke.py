#!/usr/bin/env python3
"""Read-only deployment checks through the same proxy used by the tunnel."""
import json
import urllib.error
import urllib.request

checks = [
    ('GET', '/', None, 200),
    ('GET', '/healthz', None, 200),
    ('GET', '/mobile/releases/latest.json', None, 200),
    ('POST', '/api/user/login', {'email': 'deployment-probe@example.invalid', 'senha': 'invalid'}, 401),
    ('GET', '/api/planejamento', None, 401),
    ('POST', '/api/sync/download', {}, 401),
    ('GET', '/users', None, 401),
]
for method, path, body, expected in checks:
    request = urllib.request.Request(
        'http://127.0.0.1:8180' + path,
        data=json.dumps(body).encode() if body is not None else None,
        headers={'Content-Type': 'application/json'}, method=method,
    )
    try:
        response = urllib.request.urlopen(request, timeout=20)
    except urllib.error.HTTPError as error:
        response = error
    if response.status != expected:
        raise SystemExit(f'{method} {path}: expected {expected}, got {response.status}')
    response.close()
    print(f'{method} {path}: {expected}')
