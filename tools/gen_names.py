import csv
import json
from pathlib import Path

def csv_to_json(csv_file, json_file):
    data = {}

    with open(csv_file, newline='', encoding='utf-8') as f:
        reader = csv.DictReader(f)
        for row in reader:
            print(row)
            key = row['Actor']
            value = row['Name']
            if len(row['Name']) == 0:
                value = key
            data[key] = value

    with open(json_file, 'w', encoding='utf-8') as f:
        json.dump(data, f, indent=4, ensure_ascii=False)

# Example usage
root = Path(__file__).parent.parent
game_files_dir = root / 'public' / 'game_files'
csv_to_json("names.csv", game_files_dir / 'names.json')
