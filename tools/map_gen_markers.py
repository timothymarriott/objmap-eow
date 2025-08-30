from pathlib import Path
from typing import Tuple
import requests
import json

def CreateMarker(icon: str, pos: Tuple[float, float, float], id: str) -> dict:
    res: dict = {}

    translate: dict = {}
    translate['X'] = pos[0]
    translate['Y'] = pos[1]
    translate['Z'] = pos[2]

    res['Icon'] = icon
    res['Translate'] = translate
    res['MessageID'] = id


    return res

def GetActorMarkers(q: str, icon: str = "Generic"):
    print(f"Fetching '{q}'...")
    SEARCH = f'http://127.0.0.1:3007/objs/Hyrule/?q={q}&withMapNames=false&limit=2000'

    response = requests.get(SEARCH)


    if not response.ok:
        print("Failed to search")
        exit()


    data = response.json()

    res: list[dict] = []

    for actor in data:
        res.append(CreateMarker(icon, (actor['translate']['x'], actor['translate']['y'], actor['translate']['z']), actor['actor']))

    return res;

def GetMightCrystalMarkers():
    SEARCH = 'https://restite.org/eow/piece_static.json'

    response = requests.get(SEARCH)


    if not response.ok:
        print("Failed to fetch")
        exit()


    data = response.json()

    res: list[dict] = []

    for actor in data:
        res.append(CreateMarker("MightCrystal", (actor['Translate']['X'], actor['Translate']['Y'], actor['Translate']['Z']), actor['data']['mCount']))

    return res;

def GetHeartContainerMarkers():
    SEARCH = 'https://restite.org/eow/heart_static.json'

    response = requests.get(SEARCH)


    if not response.ok:
        print("Failed to fetch")
        exit()


    data = response.json()

    res: list[dict] = []

    for actor in data:
        res.append(CreateMarker("HeartPiece", (actor['Translate']['X'], actor['Translate']['Y'], actor['Translate']['Z']), actor['Name']))

    return res;

def GetShopMarkers():
    SEARCH = 'https://restite.org/eow/Shop_static.json'

    response = requests.get(SEARCH)


    if not response.ok:
        print("Failed to fetch")
        exit()


    data = response.json()

    res: list[dict] = []

    for actor in data:
        res.append(CreateMarker("Shop", (actor['Translate']['X'], actor['Translate']['Y'], actor['Translate']['Z']), actor['data']['mLabelName']))

    return res;

def GetTownMarkers():
    SEARCH = 'https://restite.org/eow/City_static.json'

    response = requests.get(SEARCH)


    if not response.ok:
        print("Failed to fetch")
        exit()


    data = response.json()

    res: list[dict] = []

    for actor in data:
        res.append(CreateMarker("Town", (actor['Translate']['X'], actor['Translate']['Y'], actor['Translate']['Z']), actor['data']['mLabelName']))

    return res;

def GetLocations():
    locs = {
        "Eldin Volcano": [60, 50],
        "Eternal Forest": [205,110],
        "Hebra Mountain": [395, 80],
        "Hyrule Castle": [310, 180],
        "Jabul Waters": [586, 157],
        "Hyrule Field": [230, 287],
        "Eastern Hyrule Field": [420,225],
        "Faron Wetlands": [596, 401],
        "Suthorn Forest": [378, 427],
        "Gerudo Desert": [65, 380],
        "Suthorn Prairie": [310, 370],
        "Lake Hylia": [415, 303],
    }
    lv3_locs = {
        "Eldin Trail Volcano": [68, 157],
        "Kakariko Village": [95, 180],
        "Hyrule Ranch": [165, 288],
        "Gerudo Town": [11, 380],
        "Oasis": [110, 402],
        "Suthorn Beach": [191,460],
        "Suthorn Village": [295, 456],
        "Hyrule Castle Town": [315, 209],
        "Zora Cove": [587, 248],
        "Seesyde Village": [550, 230],
        "Zora River": [580, 111],
        "River Zora Village": [552, 83],
        "Crossflows Plaza": [605, 180],
        "Scrubtown": [621, 373],
    }

    res: list[dict] = []

    for k in locs.keys():
        print(k)
        loc = locs[k]

        res.append({
            "MessageID": k,
            "Translate": {
                "X": loc[0],
                "Z": loc[1],
                "Y": 0.0
            },
            "ShowLevel": 1,
            "Type": 5
        })

    for k in lv3_locs.keys():

        loc = lv3_locs[k]

        res.append({
            "MessageID": k,
            "Translate": {
                "X": loc[0],
                "Z": loc[1],
                "Y": 0.0
            },
            "ShowLevel": 2,
            "Type": 3
        })
    return res

data: dict = {}

data['markers'] = dict()
data['markers']['Location'] = GetLocations()
data['markers']['HeartPiece'] = GetHeartContainerMarkers()
data['markers']['Stamp'] = GetActorMarkers("actor:StampTable", "Stamp")
data['markers']['Warp'] = GetActorMarkers("actor:WarpOpener", "Warp")
data['markers']['MightCrystal'] = GetMightCrystalMarkers()
data['markers']['Town'] = []
data['markers']['Shop'] = GetShopMarkers()
data['markers']['SubArea'] = GetActorMarkers("SensorLevelOpen", "SubArea")
data['markers']['Rift'] = GetActorMarkers("BoundaryGate")
data['markers']['Minigame'] = GetActorMarkers("actor:HylianM032", "Minigame")
data['markers']['Smoothie'] = GetActorMarkers("DekuMerchant*", "Smoothie")

root = Path(__file__).parent.parent
game_files_dir = root / 'public' / 'game_files'

with open(game_files_dir / 'map_summary' / 'MainField' / 'static.json', "w") as out:
    out.write(json.dumps(data, indent=2))
