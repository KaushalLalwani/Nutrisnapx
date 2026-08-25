CATEGORIES = [
    {
        "slug": "fresh-vegetables",
        "label": "Fresh Vegetables",
        "icon": "🥦",
        "items": ["tomato", "onion", "potato", "green chilli", "capsicum", "cucumber"],
    },
    {
        "slug": "fresh-fruits",
        "label": "Fresh Fruits",
        "icon": "🍌",
        "items": ["banana", "apple", "orange", "grapes", "papaya"],
    },
    {
        "slug": "dairy-bread-eggs",
        "label": "Dairy, Bread & Eggs",
        "icon": "🥛",
        "items": ["milk", "bread", "eggs", "paneer", "curd", "butter"],
    },
    {
        "slug": "rice-atta-dal",
        "label": "Rice, Atta & Dal",
        "icon": "🌾",
        "items": ["atta", "basmati rice", "toor dal", "moong dal", "besan"],
    },
    {
        "slug": "oils-ghee-masala",
        "label": "Oils, Ghee & Masala",
        "icon": "🧈",
        "items": ["sunflower oil", "ghee", "turmeric powder", "salt", "garam masala"],
    },
    {
        "slug": "chicken-meat-fish",
        "label": "Chicken, Meat & Fish",
        "icon": "🍗",
        "items": ["chicken", "fish", "mutton"],
    },
]

FREQUENT_ITEMS = ["milk", "bread", "eggs", "onion", "tomato", "potato", "banana", "atta", "rice", "toor dal"]


def find(slug: str):
    return next((c for c in CATEGORIES if c["slug"] == slug), None)
