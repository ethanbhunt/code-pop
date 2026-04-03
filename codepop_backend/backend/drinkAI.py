# Credit to @sumanadhikari
# https://medium.com/@sumanadhikari/building-a-movie-recommendation-engine-using-scikit-learn-8dbb11c5aa4b

import random
import pandas as p
import csv
import numpy as n
from sklearn.feature_extraction.text import CountVectorizer
from sklearn.metrics.pairwise import cosine_similarity
import os

_BACKEND_DIR = os.path.dirname(os.path.abspath(__file__))


def _backend_data_dir():
    """Directory containing Syrups.csv / Sodas.csv / AddIns.csv."""
    override = os.environ.get("CODEPOP_DRINK_AI_BACKEND_DIR")
    if override:
        return os.path.abspath(override)
    try:
        from django.conf import settings
        if getattr(settings, "configured", False):
            return os.path.join(settings.BASE_DIR, "backend")
    except Exception:
        pass
    return _BACKEND_DIR


def _refresh_csv_paths():
    global syrup_file_path, soda_file_path, addin_file_path
    d = _backend_data_dir()
    syrup_file_path = os.path.join(d, "Syrups.csv")
    soda_file_path = os.path.join(d, "Sodas.csv")
    addin_file_path = os.path.join(d, "AddIns.csv")


_refresh_csv_paths()

# CSV related functions
def get_name_from_index(file, index):
    return file[file.index == index]["name"].values[0]

def get_index_from_name(file, name):
    return file[file.name == name]["index"].values[0]

def get_type_from_name(file, name):
    return file[file.name == name]["type"].values[0]


# Return a list of syrups most similar to user_preference
def generate_similar_syrup_preferences(user_preference):
    syrups = p.read_csv(syrup_file_path)

    cv = CountVectorizer()
    count_matrix = cv.fit_transform(syrups["type"])
    similarity = cosine_similarity(count_matrix)

    user_pref_index = get_index_from_name(syrups, user_preference)
    similar_preferences =  list(enumerate(similarity[user_pref_index]))
    sorted_similar_pref = sorted(similar_preferences,key=lambda x:x[1],reverse=True)

    i = 0
    top5_preferences = []
    for item in sorted_similar_pref:
        top5_preferences.append(get_name_from_index(syrups, item[0]))
        i += 1
        if i == 5:
            break

    return top5_preferences


# Generate best soda option based on chosen syrup flavors
def generate_best_soda(syrups, prefs):
    sodas = p.read_csv(soda_file_path)
    syrupList = p.read_csv(syrup_file_path)

    # Get types of each syrup and add to syrupTypes (only one entry per type)
    syrupTypes = []
    for syrup in syrups:
        syrupType = get_type_from_name(syrupList, syrup)
        syrupType = syrupType.split()
        for item in syrupType:
            if item not in syrupTypes:
                syrupTypes.append(item)

    syrupTypes = " ".join(syrupTypes)

    # Credit: chatgpt
    # Add a new row to the soda csv file -- need to do this since the AI can only compare things within the same file
    with open(soda_file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        rows = list(reader)  # Read all existing rows into a list
        file.close()

    # Array that we want to add as a new row
    new_row = [len(rows) - 1, 'syrupTypes', 'n/a', 'n/a', syrupTypes]

    rows.append(new_row)

    # Write all rows back to the file, including the new row
    with open(soda_file_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(rows)  # Write all rows back to the file
        file.close()
    # end of chatgpt section

    sodas = p.read_csv(soda_file_path) # Reread now that new row is added
    cv = CountVectorizer()
    count_matrix = cv.fit_transform(sodas["best-match-flavors"])
    similarity = cosine_similarity(count_matrix)

    best_sodas =  list(enumerate(similarity[len(rows) - 2]))
    sorted_best_sodas = sorted(best_sodas,key=lambda x:x[1],reverse=True)[1:]

    # Credit: chatgpt
    # Remove row we added to soda csv file, this way the sodas file wont get infinitely huge
    with open(soda_file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        rows = list(reader)
        file.close()

    # Remove the specified row
    if 0 <= len(rows) - 1 < len(rows):
        rows.pop(len(rows) - 1)  # Remove the row at the specified index

    with open(soda_file_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(rows)
        file.close()
    # end of chatgpt section

    i = 0
    top5_sodas = []
    # If user had no soda preferences, pick a random one from the top 5 sodas that best match the syrup flavors
    if len(prefs) == 0:
        for item in sorted_best_sodas:
            top5_sodas.append(get_name_from_index(sodas, item[0]))
            i += 1
            if i == 5:
                break
        return top5_sodas[random.randint(0, len(top5_sodas) - 1)]

    # If user had multiple soda preferences, pick the preference that best matches the syrup flavors
    else:
        for item in sorted_best_sodas:
            if get_name_from_index(sodas, item[0]) in prefs:
                return get_name_from_index(sodas, item[0])


# Generate best add-in options based on chosen soda and syrup flavors
def generate_best_addins(syrups, soda, prefs, num):
    sodaList = p.read_csv(soda_file_path)
    syrupList = p.read_csv(syrup_file_path)
    addins = p.read_csv(addin_file_path)

    # Get types of each syrup (only one entry per type)
    syrupTypes = []
    for syrup in syrups:
        syrupType = get_type_from_name(syrupList, syrup)
        syrupType = syrupType.split()
        for item in syrupType:
            if item not in syrupTypes:
                syrupTypes.append(item)

    syrupTypes = " ".join(syrupTypes)

    # Get type of the soda
    sodaType = get_type_from_name(sodaList, soda)

    # ----- Syrup Calculations -----
    # Credit: chatgpt
    # Add a new row to the soda csv file -- need to do this since the AI can only compare things within the same file
    with open(addin_file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        rows = list(reader)  # Read all existing rows into a list
        file.close()

    # Array that we want to add as a new row
    new_row = [len(rows) - 1, 'syrupTypes', 'n/a', syrupTypes, 'n/a']

    rows.append(new_row)

    # Write all rows back to the file, including the new row
    with open(addin_file_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(rows)  # Write all rows back to the file
        file.close()
    # end of chatgpt section

    addins = p.read_csv(addin_file_path) # Reread now that new row is added
    cv = CountVectorizer()
    count_matrix = cv.fit_transform(addins["best-match-syrup"])
    similarity = cosine_similarity(count_matrix)

    best_addins_from_syrup = list(enumerate(similarity[len(rows) - 2]))
    sorted_best_addins_from_syrup = sorted(best_addins_from_syrup,key=lambda x:x[1],reverse=True)[1:]

    # Credit: chatgpt
    # Remove row we added to soda csv file, this way the sodas file wont get infinitely huge
    with open(addin_file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        rows = list(reader)
        file.close()

    # Remove the specified row
    if 0 <= len(rows) - 1 < len(rows):
        rows.pop(len(rows) - 1)  # Remove the row at the specified index

    with open(addin_file_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(rows)
        file.close()
    # end of chatgpt section


    # ----- Soda Calculations -----
    # Credit: chatgpt
    # Add a new row to the soda csv file -- need to do this since the AI can only compare things within the same file
    with open(addin_file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        rows = list(reader)  # Read all existing rows into a list
        file.close()

    # Array that we want to add as a new row
    new_row = [len(rows) - 1, 'sodaType', 'n/a', 'n/a', sodaType]

    rows.append(new_row)

    # Write all rows back to the file, including the new row
    with open(addin_file_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(rows)  # Write all rows back to the file
        file.close()
    # end of chatgpt section

    addins = p.read_csv(addin_file_path) # Reread now that new row is added
    cv = CountVectorizer()
    count_matrix = cv.fit_transform(addins["best-match-soda"])
    similarity = cosine_similarity(count_matrix)

    best_addins_from_soda = list(enumerate(similarity[len(rows) - 2]))
    sorted_best_addins_from_soda = sorted(best_addins_from_soda,key=lambda x:x[1],reverse=True)[1:]

    # Credit: chatgpt
    # Remove row we added to soda csv file, this way the sodas file wont get infinitely huge
    with open(addin_file_path, mode='r', newline='') as file:
        reader = csv.reader(file)
        rows = list(reader)
        file.close()

    # Remove the specified row
    if 0 <= len(rows) - 1 < len(rows):
        rows.pop(len(rows) - 1)  # Remove the row at the specified index

    with open(addin_file_path, mode='w', newline='') as file:
        writer = csv.writer(file)
        writer.writerows(rows)
        file.close()
    # end of chatgpt section

    possibleAddins = []
    chosenAddins = []
    # If no addins in pref, get top5 best addins that are in both sorted lists
    # Choose num # of addins from that top5 to send back
    if len(prefs) == 0:
        for item1 in sorted_best_addins_from_syrup:
            if len(possibleAddins) >= 5:
                break
            for item2 in sorted_best_addins_from_soda:
                if get_name_from_index(addins, item1[0]) == get_name_from_index(addins, item2[0]):
                    possibleAddins.append(get_name_from_index(addins, item1[0]))
                    break
        
        for i in range(num):
            chosenAddins.append(possibleAddins[random.randint(0, len(possibleAddins) - 1)])
        
        return chosenAddins

    # If 2+ addins in pref
    else:
        # Pick best matching one in each sorted list
        for item in sorted_best_addins_from_syrup:
            if get_name_from_index(addins, item[0]) in prefs:
                possibleAddins.append(get_name_from_index(addins, item[0]))
                break

        for item in sorted_best_addins_from_soda:
            if get_name_from_index(addins, item[0]) in prefs:
                possibleAddins.append(get_name_from_index(addins, item[0]))
                break

        # If randNum is 1, randomly pick between them
        if num == 1:
            chosenAddins.append(possibleAddins[random.randint(0, len(possibleAddins) - 1)])
            return chosenAddins

        # If randNum is 2 and pref is length 2, pick both
        elif num == 2 and len(prefs) == 2:
            return prefs

        # Else pick 2 randomly from prefs
        else:
            for i in range(num):
                chosenAddins.append(possibleAddins[random.randint(0, len(possibleAddins) - 1)])
            
            return chosenAddins


# Credit: chatgpt
# Create list of all entries in the "name" column (column 2) of a csv file
def create_list(csv_file_name):
    names = []
    with open(csv_file_name, mode='r', newline='') as file:
        reader = csv.reader(file)
        next(reader)  # Skip the header row
        for row in reader:
            names.append(row[1])  # Assuming 'name' is in the second column (index 1)

        file.close()
    return names

# MAIN FUNCTION
# user_preferences is either
# a) list of the user's preferences
# b) list of (syrup) flavors, sodas, and add-ins from popular / highly rated drinks
def generate_soda(user_preferences):
    _refresh_csv_paths()
    drink = {}
    validSyrups = create_list(syrup_file_path)
    validSodas = create_list(soda_file_path)
    validAddIns = create_list(addin_file_path)

    syrupPrefs = []
    sodaPrefs = []
    addinPrefs = []
    for item in user_preferences:
        if item.lower() in validSyrups:
            syrupPrefs.append(item.lower())
        elif item.lower() in validSodas:
            sodaPrefs.append(item.lower())
        elif item.lower() in validAddIns:
            addinPrefs.append(item.lower())

    if len(syrupPrefs) == 0:
        syrupPrefs = random.sample(validSyrups, min(4, len(validSyrups)))

    chosenSyrupPrefs = []
    rand_pref_1 = random.randint(0, len(syrupPrefs) - 1)
    rand_pref_2 = random.randint(0, len(syrupPrefs) - 1)
    chosenSyrupPrefs.append(syrupPrefs[rand_pref_1])
    if not rand_pref_1 == rand_pref_2:
        chosenSyrupPrefs.append(syrupPrefs[rand_pref_2])

    syrupsToUse = []
    for pref in chosenSyrupPrefs:
        top5 = generate_similar_syrup_preferences(pref)
        rand_top5_1 = random.randint(0, len(top5) - 1)
        rand_top5_2 = random.randint(0, len(top5) - 1)
        syrupsToUse.append(top5[rand_top5_1])
        syrupsToUse.append(top5[rand_top5_2])

    drink["syrups"] = syrupsToUse

    # If the prompt (or profile) names a soda, always honor it. Discovery only when none given.
    if len(sodaPrefs) == 0:
        drink["soda"] = [generate_best_soda(syrupsToUse, [])]
    elif len(sodaPrefs) == 1:
        drink["soda"] = [sodaPrefs[0]]
    else:
        drink["soda"] = [generate_best_soda(syrupsToUse, sodaPrefs)]

    sodaToUse = drink['soda'][0]
    numAddIn = random.randint(0, 2)
    if numAddIn > 0:
        if len(addinPrefs) == 0:
            drink['addins'] = generate_best_addins(syrupsToUse, sodaToUse, [], numAddIn)
        elif len(addinPrefs) == 1:
            drink['addins'] = [addinPrefs[0]]
        else:
            drink['addins'] = generate_best_addins(syrupsToUse, sodaToUse, addinPrefs, numAddIn)
    else:
        drink['addins'] = []

    return drink

# Generate drinks based on user prompt
DESCRIPTOR_MAP = {
    "sweet": ["vanilla", "cupcake", "cotton candy", "salted caramel", "butterscotch", "white chocolate", "brown sugar cinnamon"],
    "fruity": ["mango", "strawberry", "peach", "pineapple", "watermelon", "raspberry", "kiwi"],
    "tropical": ["mango", "pineapple", "coconut", "passion fruit", "guava", "banana"],
    "sour": ["sour", "lemon", "lime", "grapefruit", "green apple", "sweetened lime"],
    "berry": ["strawberry", "raspberry", "blackberry", "pomegranate", "cranberry", "huckleberry", "grape"],
    "citrus": ["orange", "blood orange", "grapefruit", "lemon", "lime", "sweetened lime"],
    "dessert": ["vanilla", "salted caramel", "chocolate milano", "choc chip cookie dough", "hazelnut", "cupcake", "butterscotch"],
    "spicy": ["cinnamon", "pumpkin spice", "gingerbread", "peppermint", "irish cream"],
    "candy": ["blue raspberry", "bubble gum", "cotton candy", "blue curacao", "sour"],
    "creamy": ["vanilla", "salted caramel", "coconut", "cream", "coconut cream", "french vanilla creamer", "whip"],
    "refreshing": ["mojito", "cucumber", "lavender", "lime", "lemon", "peppermint"],
    "warm": ["cinnamon", "brown sugar cinnamon", "gingerbread", "pumpkin spice", "salted caramel", "irish cream", "butterbrew mix"],
    "chocolate": ["chocolate milano", "choc chip cookie dough", "white chocolate", "hazelnut"],
}

# Map common user phrases to names in Sodas.csv / ingredient lists (longest first).
_PROMPT_PHRASE_FIXUPS = (
    ("coca-cola", "coke"),
    ("coca cola", "coke"),
    ("mountain dew", "mtn. dew"),
    ("mtn dew", "mtn. dew"),
    ("diet mountain dew", "diet mtn. dew"),
    ("doctor pepper", "dr. pepper"),
)


def parse_prompt(prompt):
    """
    parse a user's natural langauge prompt into a list of ingredients preferences
    that generate_soda() can understand.
    """
    _refresh_csv_paths()
    prompt_lower = prompt.lower().strip()
    for alias, canonical in _PROMPT_PHRASE_FIXUPS:
        if alias in prompt_lower:
            prompt_lower = prompt_lower.replace(alias, canonical)
    preferences = []

    all_syrups = create_list(syrup_file_path)
    all_sodas = create_list(soda_file_path)
    all_addins = create_list(addin_file_path)
    all_ingredients = all_syrups + all_sodas + all_addins

    remaining = prompt_lower.replace(".", "")
    for ingredient in sorted(all_ingredients, key=len, reverse=True):
        normalized = ingredient.replace(".", "")
        if normalized in remaining:
            preferences.append(ingredient)
            remaining = remaining.replace(normalized, "")

    for descriptor, ingredients in DESCRIPTOR_MAP.items():
        if descriptor in prompt_lower:
            sample_size = min(random.randint(3, 5), len(ingredients))
            preferences.extend(random.sample(ingredients, sample_size))

    if len(preferences) == 0:
        preferences = ["mango", "peach", "vanilla", "salted caramel", "orange", "lavender", "peppermint", "blue raspberry"]

    # generate_soda() requires at least one valid syrup to work.
    # If the parsed preferences only contain sodas/add-ins, add some default syrups.
    valid_syrups = create_list(syrup_file_path)
    has_syrup = any(p in valid_syrups for p in preferences)
    if not has_syrup:
        default_syrups = ["mango", "peach", "vanilla", "salted caramel", "orange", "lavender"]
        preferences.extend(random.sample(default_syrups, min(3, len(default_syrups))))

    return preferences