"""Optional Gemini enrichment for locally parsed bank SMS messages."""

import re

import requests

from config import settings
from models import TransactionAI

GEMINI_CATEGORIES = [
    "Food & Dining",
    "Shopping",
    "Transport & Fuel",
    "Bills & Utilities",
    "Entertainment",
    "Healthcare",
    "Investment",
    "Personal Transfer",
    "Other",
]


def extract_transaction_info(sms_text: str) -> TransactionAI:
    """Extract merchant/category hints with Gemini after explicit user opt-in.

    Amount, date, and debit/credit classification remain grounded in the local
    parser, even when Gemini returns additional transaction fields.
    """
    if not settings.GOOGLE_API_KEY:
        raise RuntimeError("Gemini enrichment is not configured on this server.")

    model = settings.GEMINI_MODEL_NAME.strip()
    if not re.fullmatch(r"[A-Za-z0-9.-]{1,100}", model):
        raise RuntimeError("GEMINI_MODEL_NAME contains invalid characters.")

    response = requests.post(
        f"https://generativelanguage.googleapis.com/v1beta/models/{model}:generateContent",
        headers={"x-goog-api-key": settings.GOOGLE_API_KEY},
        json={
            "systemInstruction": {
                "parts": [{
                    "text": (
                        "Extract the merchant, bank, and one category from this bank SMS. "
                        "Do not infer missing details. For a person-to-person transfer, "
                        "set is_personal_transfer to true."
                    )
                }]
            },
            "contents": [{"parts": [{"text": sms_text}]}],
            "generationConfig": {
                "temperature": 0,
                "maxOutputTokens": 256,
                "responseMimeType": "application/json",
                "responseSchema": {
                    "type": "OBJECT",
                    "properties": {
                        "amount": {"type": "NUMBER"},
                        "merchant": {"type": "STRING"},
                        "bank_name": {"type": "STRING"},
                        "category": {"type": "STRING", "enum": GEMINI_CATEGORIES},
                        "is_personal_transfer": {"type": "BOOLEAN"},
                    },
                    "required": [
                        "amount",
                        "merchant",
                        "bank_name",
                        "category",
                        "is_personal_transfer",
                    ],
                },
            },
        },
        timeout=(3, 15),
    )
    response.raise_for_status()

    candidates = response.json().get("candidates", [])
    try:
        result_text = candidates[0]["content"]["parts"][0]["text"]
    except (IndexError, KeyError, TypeError) as error:
        raise ValueError("Gemini returned no structured transaction result.") from error
    return TransactionAI.model_validate_json(result_text)
