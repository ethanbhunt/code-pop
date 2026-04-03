#!/usr/bin/env python3
"""JSON stdin/stdout bridge so the OrbitDB Node server can call drinkAI without Django."""
import json
import random
import sys

from drinkAI import create_list, generate_soda, parse_prompt


def main():
    req = json.load(sys.stdin)
    mode = req.get("mode", "general")

    if mode == "prompt":
        prefs = parse_prompt(req.get("prompt", ""))
        result = generate_soda(prefs)
    elif mode == "account":
        # Match GenerateAIDrink.generate_account_user (views.py)
        discovery_pool = [
            "mango",
            "peach",
            "vanilla",
            "salted caramel",
            "orange",
            "lavender",
            "peppermint",
            "blue raspberry",
            "strawberry",
            "coconut",
            "watermelon",
            "cherry",
            "grape",
            "kiwi",
            "hazelnut",
            "cinnamon",
            "guava",
            "passion fruit",
        ]
        raw_prefs = req.get("user_prefs") or []
        user_prefs = [str(p) for p in raw_prefs]

        if user_prefs:
            all_syrups = create_list(syrup_file_path)
            has_syrup = any(p.lower() in all_syrups for p in user_prefs)
            if not has_syrup:
                syrup_discovery = [s for s in discovery_pool if s.lower() in all_syrups]
                k = min(3, len(syrup_discovery))
                if k:
                    user_prefs.extend(random.sample(syrup_discovery, k))

            non_user = [
                item
                for item in discovery_pool
                if item.lower() not in [p.lower() for p in user_prefs]
            ]
            discovery_count = min(random.randint(2, 4), len(non_user))
            discovery_items = random.sample(non_user, discovery_count) if discovery_count else []

            preferences_list = user_prefs + discovery_items
        else:
            preferences_list = [
                "mango",
                "peach",
                "vanilla",
                "salted caramel",
                "orange",
                "lavender",
                "peppermint",
                "blue raspberry",
            ]

        result = generate_soda(preferences_list)
    else:
        preferences = [
            "mango",
            "peach",
            "vanilla",
            "salted caramel",
            "orange",
            "lavender",
            "peppermint",
            "blue raspberry",
        ]
        result = generate_soda(preferences)

    soda_val = result.get("soda") or []
    soda_first = soda_val[0] if isinstance(soda_val, list) and len(soda_val) > 0 else soda_val

    out = {
        "SyrupsUsed": result.get("syrups", []),
        "SodaUsed": soda_first,
        "AddIns": result.get("addins", []),
        "Size": "24oz",
        "Ice": "regular",
        "UserCreated": bool(req.get("user_created", mode == "account")),
    }
    json.dump(out, sys.stdout)


if __name__ == "__main__":
    main()
