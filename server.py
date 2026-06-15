#!/usr/bin/env python3
"""Simple HTTP server with range-request support for video streaming."""

import os
import re
import time
import errno
import mimetypes
from http.server import SimpleHTTPRequestHandler, HTTPServer
from socketserver import ThreadingMixIn

PORT = 8080


class RangeHTTPRequestHandler(SimpleHTTPRequestHandler):
    def send_head(self):
        path = self.translate_path(self.path)

        if os.path.isdir(path):
            return super().send_head()

        if not os.path.isfile(path):
            self.send_error(404, "File not found")
            return None

        file_size = os.path.getsize(path)
        content_type, _ = mimetypes.guess_type(path)
        content_type = content_type or "application/octet-stream"

        range_header = self.headers.get("Range")
        if range_header:
            m = re.match(r"bytes=(\d+)-(\d*)", range_header)
            if m:
                start = int(m.group(1))
                end = int(m.group(2)) if m.group(2) else file_size - 1
                end = min(end, file_size - 1)
                length = end - start + 1

                self.send_response(206)
                self.send_header("Content-Type", content_type)
                self.send_header("Content-Length", str(length))
                self.send_header("Content-Range", f"bytes {start}-{end}/{file_size}")
                self.send_header("Accept-Ranges", "bytes")
                self.end_headers()

                f = open(path, "rb")
                f.seek(start)
                return _BoundedFile(f, length)

        self.send_response(200)
        self.send_header("Content-Type", content_type)
        self.send_header("Content-Length", str(file_size))
        self.send_header("Accept-Ranges", "bytes")
        self.end_headers()
        return open(path, "rb")


class _BoundedFile:
    """Wraps a file to limit how many bytes are read."""

    def __init__(self, f, remaining):
        self._f = f
        self._remaining = remaining

    def read(self, n=-1):
        if self._remaining <= 0:
            return b""
        if n < 0 or n > self._remaining:
            n = self._remaining
        data = self._read_with_retry(n)
        self._remaining -= len(data)
        return data

    def _read_with_retry(self, n, attempts=20):
        # Docker Desktop's VirtioFS/FUSE mounts on macOS can transiently
        # return EDEADLK/EAGAIN on read(); a no-byte read leaves the offset
        # untouched, so retrying is safe.
        for attempt in range(attempts):
            try:
                return self._f.read(n)
            except OSError as e:
                if e.errno in (errno.EDEADLK, errno.EAGAIN) and attempt < attempts - 1:
                    time.sleep(0.05)
                    continue
                raise
        return b""

    def close(self):
        self._f.close()


class ThreadedHTTPServer(ThreadingMixIn, HTTPServer):
    daemon_threads = True


if __name__ == "__main__":
    server = ThreadedHTTPServer(("", PORT), RangeHTTPRequestHandler)
    print(f"Serving on http://localhost:{PORT}")
    server.serve_forever()
