from __future__ import annotations
 
import base64
import json
import os
from typing import Any
 
from cryptography.hazmat.primitives.ciphers.aead import AESGCM
from cryptography.hazmat.primitives.kdf.hkdf import HKDF
from cryptography.hazmat.primitives import hashes
 
_SERVER_PEPPER = os.environ.get("AIRGUARD_PEPPER", "").encode() or os.urandom(32)
 
_NONCE_SIZE = 12
 
 
def derive_key(device_id: str) -> bytes:
    hkdf = HKDF(
        algorithm=hashes.SHA256(),
        length=32,
        salt=None,
        info=device_id.encode("utf-8"),
    )
    return hkdf.derive(_SERVER_PEPPER)
 
 
def encrypt_record(device_id: str, record: dict[str, Any]) -> str:
    key = derive_key(device_id)
    aesgcm = AESGCM(key)
    nonce = os.urandom(_NONCE_SIZE)
 
    plaintext = json.dumps(record, separators=(",", ":")).encode("utf-8")
    ciphertext = aesgcm.encrypt(nonce, plaintext, associated_data=device_id.encode())
 
    payload = nonce + ciphertext
    return base64.urlsafe_b64encode(payload).decode("ascii")
 
 
def decrypt_record(device_id: str, token: str) -> dict[str, Any]:
    key = derive_key(device_id)
    aesgcm = AESGCM(key)
 
    payload = base64.urlsafe_b64decode(token.encode("ascii"))
    nonce, ciphertext = payload[:_NONCE_SIZE], payload[_NONCE_SIZE:]
 
    plaintext = aesgcm.decrypt(nonce, ciphertext, associated_data=device_id.encode())
    return json.loads(plaintext.decode("utf-8"))
 
 
def encrypt_batch(device_id: str, records: list[dict[str, Any]]) -> list[str]:
    return [encrypt_record(device_id, r) for r in records]
 
 
def decrypt_batch(device_id: str, tokens: list[str]) -> list[dict[str, Any]]:
    return [decrypt_record(device_id, t) for t in tokens]
 
