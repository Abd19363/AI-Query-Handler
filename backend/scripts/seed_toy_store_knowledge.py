import sys
import os
from pathlib import Path

# Setup paths
repo_root = Path(__file__).resolve().parent.parent.parent
backend_dir = Path(__file__).resolve().parent.parent
for p in (repo_root, backend_dir):
    p_str = str(p)
    if p_str not in sys.path:
        sys.path.insert(0, p_str)

import asyncio
from backend.app.core.database import AsyncSessionLocal
from backend.app.models.schema_models import QueryKnowledge
from backend.app.services.embedding_service import embedding_service
from backend.app.services.answer_policy import answer_policy_service
from backend.app.services.normalizer import normalize_query_text
from backend.app.core.config import settings
from sqlalchemy import delete

TOY_STORE_KNOWLEDGE_SEED = [
    {
        "query": "I bought a remote control car 3 days ago, but the steering wheels stopped turning. Can I get a replacement?",
        "category": "replacement",
        "answer": "We would be delighted to replace your remote control car! Because you purchased it just 3 days ago, please bring the car and your sales receipt to our customer service desk, and our team will issue an immediate brand-new replacement."
    },
    {
        "query": "I bought a remote-control car for my child, but when I opened the packing, the remote and the user manual was missing. What should I do ? Would you give those missing things or replace the toy with other one",
        "category": "missing_parts",
        "answer": "We apologize for the missing remote control and user manual! Please bring the car and your sales receipt to our customer service desk, and our team will gladly provide the missing remote and manual from our stock or replace the toy with a brand-new complete set."
    },
    {
        "query": "My child opened a Lego building set and found 2 missing bricks in the sealed bags. How can I get the missing pieces?",
        "category": "missing_parts",
        "answer": "We apologize for the missing pieces in the building set! Bring your receipt to our customer service counter for immediate loose replacement bricks, or we will gladly exchange the box for a complete new set."
    },
    {
        "query": "What is your return policy if my son didn't like the board game we bought yesterday, and the box is still unopened?",
        "category": "return",
        "answer": "Unopened board games in their original shrink-wrap are eligible for a 100% refund or store credit within 30 days of purchase. Simply present your receipt or order confirmation at any cashier counter."
    },
    {
        "query": "Is this wooden baby rattle toy safe, non-toxic, and paint-free for a 6-month-old infant?",
        "category": "safety",
        "answer": "Yes, all our infant wooden rattles are made from 100% organic, splinter-free beechwood with non-toxic, food-grade finishes. They are rigorously tested and certified 100% safe for babies 0 months and older."
    },
    {
        "query": "Does the interactive robotic dinosaur toy come with batteries included, or do I need to purchase them separately?",
        "category": "product_inquiry",
        "answer": "The robotic dinosaur requires 4 AA batteries which are not included in the retail box. We keep both standard and rechargeable AA battery packs available right at the checkout counter for your convenience."
    },
    {
        "query": "I bought a drone toy 10 days ago with a 30-day warranty, and one propeller motor stopped spinning. Can I get a refund or fix?",
        "category": "warranty",
        "answer": "Yes, your drone is fully covered under our 30-day electronic warranty against motor failures. Please bring the drone and receipt to our store, and we will offer you a free repair, new replacement, or full refund."
    },
    {
        "query": "Can I exchange an unopened plush teddy bear for a larger plush animal and pay the price difference?",
        "category": "exchange",
        "answer": "Yes, absolutely! As long as the teddy bear is in pristine condition with its original tags attached, you can exchange it for any larger plush toy within 30 days and simply pay the difference at checkout."
    },
    {
        "query": "I purchased an outdoor kids water slide last week, but our backyard is too small for it. Can I return it for a refund?",
        "category": "return",
        "answer": "Unused outdoor toys in their original packaging can be returned for a full refund within 14 days of purchase. Just bring the boxed slide and your sales receipt to our customer service desk."
    },
    {
        "query": "What age group is the magnetic building tiles set recommended for?",
        "category": "recommendation",
        "answer": "Our magnetic building tile sets are recommended for children ages 3 years and up due to small magnetic components. They are ideal for developing spatial reasoning, creativity, and fine motor skills in young builders."
    },
    {
        "query": "The talking doll repeats the same distorted phrase after 2 days of play. Can I exchange it for a working one?",
        "category": "defect",
        "answer": "We are so sorry about the audio issue with the talking doll! Please bring the doll and your receipt to our store within 30 days, and our staff will gladly test and exchange it for a brand-new working doll on the spot."
    }
]

async def seed():
    print("Starting Toy Store knowledge base seeding...")
    async with AsyncSessionLocal() as session:
        # Clear previous knowledge entries
        await session.execute(delete(QueryKnowledge))
        await session.commit()
        print("Cleared previous knowledge records.")

        for idx, item in enumerate(TOY_STORE_KNOWLEDGE_SEED, 1):
            normalized = normalize_query_text(item["query"])
            print(f"[{idx}/10] Generating embedding for: {item['query'][:50]}...")
            embedding = await embedding_service.get_embedding(normalized)
            conditions = answer_policy_service.extract_business_conditions(normalized)

            record = QueryKnowledge(
                canonical_query=normalized,
                answer=item["answer"],
                embedding=embedding,
                embedding_model=settings.EMBEDDING_MODEL,
                category=item["category"],
                conditions=conditions,
                answer_version=1
            )
            session.add(record)

        await session.commit()
        print("Successfully seeded all 10 Toy Store queries and concise 2-3 line answers!")

if __name__ == "__main__":
    asyncio.run(seed())
