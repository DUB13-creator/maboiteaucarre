#!/bin/bash
# Copie le site dans le dépôt GitHub avec doctype + viewport (obligatoires hors Artifact)
python3 - <<'P'
s=open('/home/claude/landing/react/index.html',encoding='utf-8').read()
head='<!doctype html>\n<html lang="fr">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
open('/home/claude/maboiteaucarre/index.html','w',encoding='utf-8').write(head+s)
P
cp /home/claude/landing/react/rdv.html /home/claude/maboiteaucarre/rdv.html
