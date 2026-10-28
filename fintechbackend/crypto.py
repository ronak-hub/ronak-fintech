"""
Asymmetric cryptography module for secure webhook token validation and inter-service communication.
Uses RSA for digital signatures and validation.
"""

import os
import json
import logging
from cryptography.hazmat.primitives import hashes, serialization
from cryptography.hazmat.primitives.asymmetric import rsa, padding
from cryptography.hazmat.backends import default_backend
from datetime import datetime, timedelta
from typing import Tuple, Optional

logger = logging.getLogger(__name__)


class CryptoManager:
    """
    Manages RSA key generation, digital signatures, and verification.
    Handles asymmetric encryption for webhook validation.
    """

    def __init__(self, private_key_path: str = None, public_key_path: str = None):
        """Initialize crypto manager with existing keys or generate new ones."""
        self.private_key_path = private_key_path or os.getenv("PRIVATE_KEY_PATH", "./keys/private.pem")
        self.public_key_path = public_key_path or os.getenv("PUBLIC_KEY_PATH", "./keys/public.pem")
        
        self.private_key = None
        self.public_key = None
        
        self._load_or_generate_keys()

    def _load_or_generate_keys(self):
        """Load existing keys or generate new ones if they don't exist."""
        if os.path.exists(self.private_key_path) and os.path.exists(self.public_key_path):
            self._load_keys()
            logger.info("Loaded existing RSA keys")
        else:
            self._generate_keys()
            logger.info("Generated new RSA key pair")

    def _generate_keys(self, key_size: int = 2048):
        """Generate new RSA key pair."""
        os.makedirs(os.path.dirname(self.private_key_path) or ".", exist_ok=True)
        
        # Generate private key
        self.private_key = rsa.generate_private_key(
            public_exponent=65537,
            key_size=key_size,
            backend=default_backend()
        )
        
        # Extract public key
        self.public_key = self.private_key.public_key()
        
        # Save private key
        private_pem = self.private_key.private_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PrivateFormat.PKCS8,
            encryption_algorithm=serialization.NoEncryption()
        )
        with open(self.private_key_path, "wb") as f:
            f.write(private_pem)
        
        # Save public key
        public_pem = self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        )
        with open(self.public_key_path, "wb") as f:
            f.write(public_pem)

    def _load_keys(self):
        """Load RSA keys from disk."""
        with open(self.private_key_path, "rb") as f:
            self.private_key = serialization.load_pem_private_key(
                f.read(),
                password=None,
                backend=default_backend()
            )
        
        with open(self.public_key_path, "rb") as f:
            self.public_key = serialization.load_pem_public_key(
                f.read(),
                backend=default_backend()
            )

    def sign_webhook_token(self, data: dict, expiry_hours: int = 24) -> str:
        """
        Create a signed webhook token with expiry.
        
        Args:
            data: Dictionary to sign (merchant_id, transaction_id, amount, timestamp)
            expiry_hours: Token expiry in hours (default 24)
        
        Returns:
            Base64-encoded signed token with metadata
        """
        import base64
        
        # Add expiry timestamp
        payload = {
            "data": data,
            "issued_at": datetime.utcnow().isoformat(),
            "expires_at": (datetime.utcnow() + timedelta(hours=expiry_hours)).isoformat()
        }
        
        # Convert to JSON
        payload_json = json.dumps(payload).encode("utf-8")
        
        # Sign with private key
        signature = self.private_key.sign(
            payload_json,
            padding.PSS(
                mgf=padding.MGF1(hashes.SHA256()),
                salt_length=padding.PSS.MAX_LENGTH
            ),
            hashes.SHA256()
        )
        
        # Combine payload and signature
        combined = json.dumps({
            "payload": base64.b64encode(payload_json).decode("utf-8"),
            "signature": base64.b64encode(signature).decode("utf-8")
        }).encode("utf-8")
        
        return base64.b64encode(combined).decode("utf-8")

    def verify_webhook_token(self, token: str) -> Tuple[bool, Optional[dict]]:
        """
        Verify a signed webhook token and extract its data.
        
        Args:
            token: Base64-encoded signed token
        
        Returns:
            Tuple of (is_valid, data_dict_or_none)
        """
        import base64
        
        try:
            # Decode outer layer
            combined = json.loads(base64.b64decode(token).decode("utf-8"))
            
            # Extract payload and signature
            payload_json = base64.b64decode(combined["payload"])
            signature = base64.b64decode(combined["signature"])
            
            # Verify signature
            self.public_key.verify(
                signature,
                payload_json,
                padding.PSS(
                    mgf=padding.MGF1(hashes.SHA256()),
                    salt_length=padding.PSS.MAX_LENGTH
                ),
                hashes.SHA256()
            )
            
            # Parse payload
            payload = json.loads(payload_json.decode("utf-8"))
            
            # Check expiry
            expiry = datetime.fromisoformat(payload["expires_at"])
            if datetime.utcnow() > expiry:
                logger.warning("Webhook token has expired")
                return False, None
            
            return True, payload.get("data")
        
        except Exception as e:
            logger.error(f"Token verification failed: {e}")
            return False, None

    def export_public_key(self) -> str:
        """Export public key as PEM-formatted string."""
        return self.public_key.public_bytes(
            encoding=serialization.Encoding.PEM,
            format=serialization.PublicFormat.SubjectPublicKeyInfo
        ).decode("utf-8")


# Global crypto manager instance
_crypto_manager: Optional[CryptoManager] = None


def get_crypto_manager() -> CryptoManager:
    """Get or create the global crypto manager instance."""
    global _crypto_manager
    if _crypto_manager is None:
        _crypto_manager = CryptoManager()
    return _crypto_manager


def create_secure_webhook_token(data: dict, expiry_hours: int = 24) -> str:
    """Convenience function to create a signed webhook token."""
    manager = get_crypto_manager()
    return manager.sign_webhook_token(data, expiry_hours)


def verify_secure_webhook_token(token: str) -> Tuple[bool, Optional[dict]]:
    """Convenience function to verify a signed webhook token."""
    manager = get_crypto_manager()
    return manager.verify_webhook_token(token)
