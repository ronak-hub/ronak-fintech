"""
Advanced NLP Pattern Ingestion Parser for SMS transaction extraction.
Migrates from regex-based parsing to entity recognition and classification.
"""

import re
import logging
from typing import Tuple, Optional
from enum import Enum

try:
    import spacy
    SPACY_AVAILABLE = True
except ImportError:
    SPACY_AVAILABLE = False

logger = logging.getLogger(__name__)


class TransactionCategory(str, Enum):
    """Transaction category enumeration."""
    FOOD_DINING = "Food & Dining"
    SHOPPING = "Shopping"
    TRANSPORT_FUEL = "Transport & Fuel"
    BILLS_UTILITIES = "Bills & Utilities"
    ENTERTAINMENT = "Entertainment"
    INVESTMENT = "Investment"
    PERSONAL_TRANSFER = "Personal Transfer"
    OTHER = "Other"


class NPLSMSParser:
    """
    NLP-based SMS transaction parser using spaCy for entity recognition.
    Falls back to regex-based parsing if spaCy is unavailable.
    """

    def __init__(self, use_spacy: bool = True):
        """Initialize parser with optional spaCy model."""
        self.use_spacy = use_spacy and SPACY_AVAILABLE
        self.nlp = None

        if self.use_spacy:
            try:
                self.nlp = spacy.load("en_core_web_sm")
                logger.info("spaCy model loaded successfully")
            except OSError:
                logger.warning("spaCy model not found. Using fallback regex parser.")
                self.use_spacy = False

        # Merchant name patterns (curated list for Indian banking)
        self.merchant_patterns = {
            "Food & Dining": [
                r"swiggy", r"zomato", r"starbucks", r"mcdonalds", r"kfc",
                r"dominos", r"pizza", r"burger", r"restaurant", r"cafe",
                r"dunkin", r"subway", r"biryani", r"dosa", r"chinese"
            ],
            "Shopping": [
                r"amazon", r"flipkart", r"myntra", r"zara", r"h&m",
                r"uniqlo", r"forever 21", r"shein", r"retail", r"store",
                r"mall", r"shopping", r"market", r"bazaar", r"blinkit", r"zepto"
            ],
            "Transport & Fuel": [
                r"uber", r"ola", r"rapido", r"fuel", r"petrol", r"diesel",
                r"hpcl", r"bpcl", r"shell", r"metro", r"railway", r"irctc",
                r"bus", r"taxi", r"parking", r"toll"
            ],
            "Bills & Utilities": [
                r"electricity", r"jio", r"airtel", r"vodafone", r"bsnl",
                r"recharge", r"broadband", r"insurance", r"premium",
                r"bescom", r"municipal", r"water", r"gas", r"property tax"
            ],
            "Entertainment": [
                r"netflix", r"spotify", r"amazon prime", r"hotstar",
                r"bookmyshow", r"pvr", r"inox", r"steam", r"playstation",
                r"gaming", r"movie", r"concert", r"ticket"
            ],
            "Investment": [
                r"zerodha", r"groww", r"upstox", r"motilal", r"sbi",
                r"mutual fund", r"stock", r"investment", r"portfolio",
                r"broker", r"exchange"
            ]
        }

    def extract_amount(self, text: str) -> Optional[float]:
        """Extract transaction amount from SMS text."""
        # Look for common Indian currency patterns
        patterns = [
            r"(?:Rs\.?|INR|₹)\s*([\d,]+\.?\d*)",  # Rs. 1,234.56
            r"([\d,]+\.?\d*)\s*(?:Rs\.?|INR|₹)",  # 1,234.56 Rs.
            r"(?:spent|paid|debited?|charged?|transferred?|sent|amount)\s+(?:Rs\.?|INR|₹)?\s*([\d,]+\.?\d*)",
            r"(?:you\s+)?(?:have\s+)?(?:been\s+)?([\d,]+\.?\d*)\s*(?:INR|Rs\.?|₹)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                try:
                    amount_str = match.group(1).replace(",", "")
                    return float(amount_str)
                except ValueError:
                    continue

        return None

    def extract_merchant(self, text: str) -> str:
        """Extract merchant name using NLP or regex fallback."""
        if self.use_spacy and self.nlp:
            return self._extract_merchant_spacy(text)
        else:
            return self._extract_merchant_regex(text)

    def _extract_merchant_spacy(self, text: str) -> str:
        """Extract merchant using spaCy NER."""
        doc = self.nlp(text)

        # Look for PERSON, ORG, or GPE entities as potential merchants
        for ent in doc.ents:
            if ent.label_ in ("ORG", "PRODUCT"):
                return ent.text.strip()

        # Fallback to regex if no entities found
        return self._extract_merchant_regex(text)

    def _extract_merchant_regex(self, text: str) -> str:
        """Extract merchant using regex patterns."""
        # Try specific patterns first
        patterns = [
            r"(?:at|spent on|to|merchant|vendor)\s+([A-Za-z0-9\s\*&\._-]+?)(?:\s+on|\s+using|\s+balance|\s+for|valid|₹|Rs|$|\.)",
            r"([A-Za-z0-9\s\*&\._-]+?)\s+(?:transaction|debit|charge|payment)",
        ]

        for pattern in patterns:
            match = re.search(pattern, text, re.IGNORECASE)
            if match:
                merchant = match.group(1).strip()
                if len(merchant) > 2 and len(merchant) < 100:  # Reasonable length
                    return merchant

        return "Unknown Merchant"

    def classify_category(self, text: str, merchant: str) -> TransactionCategory:
        """Classify transaction category using pattern matching and NLP."""
        text_lower = text.lower()
        merchant_lower = merchant.lower()

        # Check merchant name against patterns
        for category, patterns in self.merchant_patterns.items():
            for pattern in patterns:
                if re.search(pattern, merchant_lower):
                    return TransactionCategory[category.replace(" ", "_").replace("&", "").upper()]

        # Check transaction text for keywords
        for category, patterns in self.merchant_patterns.items():
            for pattern in patterns:
                if re.search(pattern, text_lower):
                    return TransactionCategory[category.replace(" ", "_").replace("&", "").upper()]

        # Use spaCy for context analysis if available
        if self.use_spacy and self.nlp:
            doc = self.nlp(text)
            for token in doc:
                token_text = token.text.lower()
                for category, patterns in self.merchant_patterns.items():
                    for pattern in patterns:
                        if re.search(pattern, token_text):
                            return TransactionCategory[category.replace(" ", "_").replace("&", "").upper()]

        return TransactionCategory.OTHER

    def is_personal_transfer(self, text: str) -> bool:
        """Detect if transaction is a personal transfer (VPA, UPI, etc.)."""
        transfer_indicators = [
            r"transfer", r"vpa", r"upi", r"neft", r"rtgs", r"imps",
            r"sent\s+to", r"received\s+from", r"person\s+to\s+person"
        ]

        for indicator in transfer_indicators:
            if re.search(indicator, text, re.IGNORECASE):
                return True

        return False

    def parse_sms(self, sms_text: str, bank_name: str = "Detected") -> Tuple[float, str, str, bool]:
        """
        Parse SMS and extract transaction details.

        Returns: (amount, merchant, category, is_transfer)
        """
        amount = self.extract_amount(sms_text)
        merchant = self.extract_merchant(sms_text)
        category = self.classify_category(sms_text, merchant)
        is_transfer = self.is_personal_transfer(sms_text)

        logger.info(f"Parsed SMS: {amount} INR from {merchant} ({category.value})")

        return float(amount) if amount else 0.0, merchant, category.value, is_transfer


# Global parser instance
_parser_instance: Optional[NPLSMSParser] = None


def get_sms_parser(use_spacy: bool = True) -> NPLSMSParser:
    """Get or create the global SMS parser instance."""
    global _parser_instance
    if _parser_instance is None:
        _parser_instance = NPLSMSParser(use_spacy=use_spacy)
    return _parser_instance


def parse_sms_transaction(text: str, bank_name: str = "Detected") -> Tuple[float, str, str, bool]:
    """
    Convenience function to parse SMS using the global parser.
    """
    parser = get_sms_parser()
    return parser.parse_sms(text, bank_name)
