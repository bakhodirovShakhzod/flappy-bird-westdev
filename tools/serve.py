"""Tiny static server for local testing (no caching, so edits show up immediately).

Usage:  python tools/serve.py [port]
Then open http://localhost:5173
"""
import functools
import http.server
import os
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
PORT = int(sys.argv[1]) if len(sys.argv) > 1 else 5173


class NoCacheHandler(http.server.SimpleHTTPRequestHandler):
    extensions_map = {**http.server.SimpleHTTPRequestHandler.extensions_map, ".js": "text/javascript", ".ttf": "font/ttf"}

    def end_headers(self):
        self.send_header("Cache-Control", "no-store")
        super().end_headers()


if __name__ == "__main__":
    handler = functools.partial(NoCacheHandler, directory=ROOT)
    with http.server.ThreadingHTTPServer(("127.0.0.1", PORT), handler) as server:
        print(f"West Dev Flappy Bird -> http://localhost:{PORT}")
        server.serve_forever()
