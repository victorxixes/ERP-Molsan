"""Pruebas de límites de tamaño para cargas de ficheros."""
import asyncio
import unittest

from fastapi import HTTPException

from backend.app.uploads import read_upload_limited


class FakeUpload:
    def __init__(self, content: bytes):
        self.content = content
        self.requested_size = None
        self.closed = False

    async def read(self, size: int) -> bytes:
        self.requested_size = size
        return self.content[:size]

    async def close(self) -> None:
        self.closed = True


class UploadLimitTests(unittest.TestCase):
    def test_accepts_file_at_limit_and_closes_stream(self):
        upload = FakeUpload(b"12345")
        content = asyncio.run(read_upload_limited(upload, 5, "Excel"))
        self.assertEqual(content, b"12345")
        self.assertEqual(upload.requested_size, 6)
        self.assertTrue(upload.closed)

    def test_rejects_file_over_limit_and_closes_stream(self):
        upload = FakeUpload(b"123456")
        with self.assertRaises(HTTPException) as caught:
            asyncio.run(read_upload_limited(upload, 5, "Excel"))
        self.assertEqual(caught.exception.status_code, 413)
        self.assertTrue(upload.closed)


if __name__ == "__main__":
    unittest.main()
