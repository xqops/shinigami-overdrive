#!/bin/sh
# Crops the 80 ability icons out of the design sheet ("20 poderes.png", 1536x1024).
# Usage: sh tools/crop-icons.sh <sheet.png>   -> assets/icons/<id>.jpg (80x80)
# Each line: school rowY  then the 4 panels' x ranges (skill 1..3, ultimate)
SHEET="$1"; OUT="$(dirname "$0")/../assets/icons"; mkdir -p "$OUT"
while read s y p1 p2 p3 p4; do
  [ -z "$s" ] && continue
  n=1
  for p in $p1 $p2 $p3 $p4; do
    a=${p%-*}; b=${p#*-}; w=$((b - a - 6)); [ $w -gt 118 ] && w=118
    x=$(( (a + b) / 2 - w / 2 )); yy=$(( y + 118 - w / 2 ))
    [ $n -eq 4 ] && id="${s}_ult" || id="${s}_$n"
    ffmpeg -y -loglevel error -i "$SHEET" -vf "crop=$w:$w:$x:$yy,scale=80:80:flags=lanczos" -q:v 5 "$OUT/$id.jpg"
    n=$((n + 1))
  done
done <<'T'
souls 0 5-100 100-195 195-290 290-385
void 0 393-485 485-578 578-668 668-765
demon 0 775-870 870-965 965-1055 1055-1150
summon 0 1158-1253 1253-1348 1348-1440 1440-1532
aegis 250 5-95 95-185 185-275 275-368
meteor 250 378-452 455-530 530-605 605-670
fire 250 680-745 745-820 820-868 870-932
plasma 250 938-1012 1012-1090 1090-1165 1165-1240
ice 250 1245-1315 1315-1390 1390-1460 1460-1532
gravity 500 5-88 88-180 180-262 262-348
bullets 500 355-428 428-508 508-582 582-652
spear 500 660-728 728-798 798-868 868-932
shadow 500 938-1008 1008-1085 1085-1158 1158-1230
wind 500 1238-1308 1308-1380 1380-1455 1455-1532
regen 750 5-88 88-162 162-232 232-318
thunder 750 325-398 398-468 468-548 548-628
dark 750 633-705 705-770 770-840 840-908
chaos 750 915-990 990-1070 1070-1150 1150-1218
elemental 750 1225-1305 1305-1380 1380-1455 1455-1532
T
