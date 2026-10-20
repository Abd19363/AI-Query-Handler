import re
from typing import Dict, Any, Tuple, Optional, List
from backend.app.core.config import settings
from backend.app.core.logging import logger

class AnswerPolicyService:
    def extract_business_conditions(self, text: str) -> Dict[str, Any]:
        """
        Extract numerical and temporal conditions from query text:
        - Purchase timeframe (e.g., '10 days ago', '2 weeks ago')
        - Warranty timeframe (e.g., '30-day warranty', '1 year warranty')
        - Action keywords (return, refund, replacement, repair)
        """
        lower = text.lower()
        conditions = {}

        # 1. Detect purchase duration (e.g., "10 days ago", "purchased 15 days ago")
        purchase_match = re.search(r"(\d+)\s*(day|days|week|weeks|month|months)\s*(ago|prior|back)?", lower)
        if purchase_match:
            qty = int(purchase_match.group(1))
            unit = purchase_match.group(2)
            multiplier = 1
            if "week" in unit:
                multiplier = 7
            elif "month" in unit:
                multiplier = 30
            conditions["days_since_purchase"] = qty * multiplier

        # 2. Detect warranty duration (e.g., "30-day warranty", "warranty of 90 days", "1 year warranty")
        warranty_match = re.search(r"(\d+)\s*(-| )*(day|days|month|months|year|years)?\s*warranty", lower)
        if warranty_match:
            qty = int(warranty_match.group(1))
            unit = warranty_match.group(3) or "day"
            multiplier = 1
            if "week" in unit:
                multiplier = 7
            elif "month" in unit:
                multiplier = 30
            elif "year" in unit:
                multiplier = 365
            conditions["warranty_days"] = qty * multiplier

        # 3. Detect intent keywords
        intents = []
        for kw in ["refund", "replacement", "replace", "return", "repair", "defect", "broken", "exchange"]:
            if kw in lower:
                intents.append(kw)
        conditions["intents"] = sorted(list(set(intents)))

        return conditions

    def evaluate_reuse_safety(
        self,
        new_query: str,
        matched_record: Optional[Dict[str, Any]],
        is_exact_match: bool = False
    ) -> Tuple[bool, str]:
        """
        Step 5: Decide whether an answer is safe to reuse.
        Returns:
            - can_reuse: bool
            - reason: str explanation
        """
        if not matched_record:
            return False, "Case C: No similar historical record found in vector index"

        sim_score = matched_record.get("similarity_score", 0.0)
        threshold = settings.SIMILARITY_THRESHOLD

        # Case A: Exact canonical match
        if is_exact_match:
            return True, f"Case A: Exact query match with historical record #{matched_record['id']} (Similarity: 1.0)"

        # Check numerical similarity threshold
        if sim_score < threshold:
            return False, f"Case C: Best match #{matched_record['id']} similarity ({sim_score:.3f}) below threshold ({threshold})"

        # Case B: Evaluate business condition compatibility
        new_cond = self.extract_business_conditions(new_query)
        stored_cond = matched_record.get("conditions") or self.extract_business_conditions(matched_record.get("canonical_query", ""))

        # Check 1: Days since purchase conflict
        new_purchase = new_cond.get("days_since_purchase")
        stored_purchase = stored_cond.get("days_since_purchase")
        if new_purchase is not None and stored_purchase is not None:
            if new_purchase != stored_purchase:
                return False, (
                    f"Case B Rejected: Purchase timeframe conflict! "
                    f"Current query specifies {new_purchase} days vs historical {stored_purchase} days. "
                    f"Requires fresh LLM reasoning."
                )

        # Check 2: Warranty duration conflict
        new_warranty = new_cond.get("warranty_days")
        stored_warranty = stored_cond.get("warranty_days")
        if new_warranty is not None and stored_warranty is not None:
            if new_warranty != stored_warranty:
                return False, (
                    f"Case B Rejected: Warranty terms conflict! "
                    f"Current query specifies {new_warranty} days warranty vs historical {stored_warranty} days. "
                    f"Requires fresh LLM reasoning."
                )

        # If similarity is sufficiently high (>= 0.95), and no conditions conflict, safe to reuse
        if sim_score >= 0.95:
            return True, f"Case B: Near-identical query (Similarity: {sim_score:.3f}) with compatible business conditions"

        # Between threshold (e.g. 0.82) and 0.95:
        # Check if intents align
        new_intents = set(new_cond.get("intents", []))
        stored_intents = set(stored_cond.get("intents", []))
        if new_intents and stored_intents and not new_intents.intersection(stored_intents):
            return False, (
                f"Case B Rejected: Intent mismatch ({new_intents} vs {stored_intents}) despite similarity {sim_score:.3f}."
            )

        return True, f"Case B: Semantically similar query (Similarity: {sim_score:.3f}) with compatible conditions"

answer_policy_service = AnswerPolicyService()
