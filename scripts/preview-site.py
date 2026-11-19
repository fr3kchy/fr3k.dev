"""Serve the checkout on loopback, including the clean /media route."""
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from sys import argv
from urllib.parse import urlsplit


class PreviewHandler(SimpleHTTPRequestHandler):
    def translate_path(self, path):
        if urlsplit(path).path == "/media":
            path = "/media.html"
        return super().translate_path(path)


if __name__ == "__main__":
    root = Path(__file__).resolve().parents[1]
    port = int(argv[1]) if len(argv) > 1 else 8765
    handler = partial(PreviewHandler, directory=root)
    with ThreadingHTTPServer(("127.0.0.1", port), handler) as server:
        print(f"Preview at http://127.0.0.1:{port}/", flush=True)
        server.serve_forever()
