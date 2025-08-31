
from pathlib import Path
from os import listdir
from os.path import isfile, join


res = []

ROMFS = "E:\\Games\\Switch\\Dumps\\The Legend of Zelda Echoes Of Wisdom\\romfs\\region_common\\level"

onlyfiles = [f for f in listdir(ROMFS) if isfile(join(ROMFS, f))]

for f in onlyfiles:

  f = f.replace(".elo", "")

  res.append("{ value: '" + f + "', text: '" + f + "' },\n")

with open(Path(__file__).parent / "map_options.txt", "w") as out:
  out.writelines(res)
