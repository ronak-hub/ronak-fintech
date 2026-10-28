import os
import instructor
from pydantic import ValidationError
from google import genai
from dotenv import load_dotenv
from models import TransactionAI
from nlp_parser import parse_sms_transaction
import logging

load_dotenv()
logger = logging.getLogger(__name__)

# Using the 2026 Stable Preview for Gemini 3
MODEL_NAME = "gemini-3-flash-preview" 

# Initialize the Instructor client
client = instructor.from_provider(
    f"google/{MODEL_NAME}", 
    api_key=os.getenv("GOOGLE_API_KEY")
)

def extract_transaction_info(sms_text: str) -> TransactionAI:
    """
    Takes raw SMS text and uses Gemini 3 to return a structured 
    TransactionAI object. Optimized for Indian Banking SMS patterns.
    Falls back to NLP-based parsing if Gemini API fails.
    """
    try:
        return client.chat.completions.create(
            model=MODEL_NAME, 
            response_model=TransactionAI,
            max_retries=2, # Increased retries for complex Indian SMS strings
            messages=[
                {
                    "role": "system", 
                    "content": (
                        "You are a specialized Indian Fintech Parser. "
                        "Identify if the transaction is a DEBIT (Spent) or CREDIT (Received). "
                        "Extract: Amount, Merchant (e.g., Zomato, Swiggy, Amazon), Bank (e.g., HDFC, ICICI, SBI), "
                        "and Category (Food, Travel, Bills, Shopping, Salary, Investment). "
                        "If the merchant is a person (UPI transfer), set is_personal_transfer to True."
                    )
                },
                {"role": "user", "content": f"SMS Text: {sms_text}"},
            ],
            validation_context={"sms": sms_text}
        )
    except Exception as e:
        logger.warning(f"Gemini parser failed: {e}. Falling back to NLP parser.")
        return _fallback_nlp_extraction(sms_text)


def _fallback_nlp_extraction(sms_text: str) -> TransactionAI:
    """
    Fallback NLP-based extraction when Gemini API is unavailable.
    Uses spaCy entity recognition and pattern matching.
    """
    try:
        amount, merchant, category, is_transfer = parse_sms_transaction(sms_text)
        
        # Map category to expected format
        category_mapping = {
            "Food & Dining": "Food",
            "Transport & Fuel": "Travel",
            "Bills & Utilities": "Bills",
            "Shopping": "Shopping",
            "Investment": "Investment",
            "Entertainment": "Entertainment",
            "Personal Transfer": "Transfer",
        }
        
        mapped_category = category_mapping.get(category, "Uncategorized")
        
        return TransactionAI(
            amount=amount,
            merchant=merchant,
            bank_name="Detected",
            category=mapped_category,
            is_personal_transfer=is_transfer
        )
    except Exception as nlp_error:
        logger.error(f"NLP parser also failed: {nlp_error}. Returning safe fallback.")
        return TransactionAI(
            amount=0.0, 
            merchant="Unknown", 
            bank_name="Unknown", 
            category="Uncategorized",
            is_personal_transfer=False
        )
