#!/usr/bin/env python3
"""
Génère la migration de seed de la bibliothèque d'exercices.

Le SQL est committé : ce script existe pour éviter les erreurs d'échappement
d'apostrophes à la main et pour garder la liste lisible et modifiable.

Usage : python3 scripts/generer-seed-exercices.py
"""
from __future__ import annotations
import os
import unicodedata

# (nom, groupe_principal, [groupes_secondaires], equipement, type, consigne)
EXERCICES: list[tuple[str, str, list[str], str, str, str]] = [
    # ── Pectoraux ──────────────────────────────────────────────────────────
    ("Développé couché", "pectoraux", ["triceps", "epaules"], "barre_olympique", "charge",
     "Omoplates serrées, barre au niveau des mamelons, coudes à 45° du buste."),
    ("Développé couché haltères", "pectoraux", ["triceps", "epaules"], "halteres", "charge",
     "Descends jusqu'à sentir l'étirement, poignets alignés au-dessus des coudes."),
    ("Développé incliné barre", "pectoraux", ["epaules", "triceps"], "barre_olympique", "charge",
     "Banc à 30°, au-delà c'est l'épaule qui travaille."),
    ("Développé incliné haltères", "pectoraux", ["epaules", "triceps"], "halteres", "charge",
     "Banc à 30°, haltères qui se rapprochent sans se toucher en haut."),
    ("Développé décliné haltères", "pectoraux", ["triceps"], "halteres", "charge",
     "Pieds bloqués, trajectoire vers le bas des pectoraux."),
    ("Écarté couché haltères", "pectoraux", [], "halteres", "charge",
     "Coudes légèrement fléchis et figés : le mouvement vient de l'épaule."),
    ("Écarté incliné haltères", "pectoraux", ["epaules"], "halteres", "charge",
     "Banc à 30°, arrête la descente quand l'épaule commence à rouler en avant."),
    ("Écarté à la poulie", "pectoraux", [], "poulie", "charge",
     "Buste légèrement penché, mains qui se croisent devant le nombril."),
    ("Pompes", "pectoraux", ["triceps", "abdominaux"], "poids_du_corps", "poids_du_corps",
     "Corps gainé d'une ligne, coudes à 45°, poitrine qui frôle le sol."),
    ("Pompes lestées", "pectoraux", ["triceps"], "poids_du_corps", "charge",
     "Disque posé au milieu du dos, même gainage qu'à vide."),
    ("Pompes pieds surélevés", "pectoraux", ["epaules", "triceps"], "banc", "poids_du_corps",
     "Pieds sur le banc : la charge se déplace vers le haut des pectoraux."),
    ("Dips pectoraux", "pectoraux", ["triceps", "epaules"], "poids_du_corps", "poids_du_corps",
     "Buste penché en avant, descente jusqu'à l'horizontale du bras."),
    ("Pull-over haltère", "pectoraux", ["dos"], "halteres", "charge",
     "Bras quasi tendus, haltère qui passe derrière la tête sans creuser les lombaires."),
    ("Écarté élastique debout", "pectoraux", ["epaules"], "elastique", "charge",
     "Élastique dans le dos, mains qui se rejoignent à hauteur de poitrine."),
    ("Développé au sol", "pectoraux", ["triceps"], "halteres", "charge",
     "Coudes qui touchent le sol : amplitude réduite, épaule protégée."),

    # ── Dos ────────────────────────────────────────────────────────────────
    ("Traction pronation", "dos", ["biceps"], "barre_traction", "poids_du_corps",
     "Mains plus larges que les épaules, menton au-dessus de la barre sans à-coup."),
    ("Traction supination", "dos", ["biceps"], "barre_traction", "poids_du_corps",
     "Paumes vers toi : plus de biceps, plus de charge possible."),
    ("Traction prise neutre", "dos", ["biceps", "avant_bras"], "barre_traction", "poids_du_corps",
     "Paumes face à face, la prise la plus douce pour l'épaule."),
    ("Traction lestée", "dos", ["biceps"], "barre_traction", "charge",
     "Ceinture de lest ou haltère entre les pieds, amplitude complète obligatoire."),
    ("Tirage horizontal barre basse", "dos", ["biceps"], "barre_traction", "poids_du_corps",
     "Corps gainé sous la barre, poitrine qui vient toucher."),
    ("Rowing barre", "dos", ["biceps", "lombaires"], "barre_olympique", "charge",
     "Buste à 45°, barre tirée vers le nombril, dos plat du début à la fin."),
    ("Rowing haltère un bras", "dos", ["biceps"], "halteres", "charge",
     "Appui main et genou sur le banc, coude qui longe le corps."),
    ("Rowing T barre", "dos", ["biceps"], "barre_olympique", "charge",
     "Une extrémité de barre calée dans un coin, tirage vers le sternum."),
    ("Rowing kettlebell", "dos", ["biceps"], "kettlebell", "charge",
     "Hanches hautes, tirage explosif, descente contrôlée."),
    ("Tirage vertical poulie", "dos", ["biceps"], "poulie", "charge",
     "Poitrine sortie, barre qui descend vers le haut des pectoraux."),
    ("Tirage horizontal poulie", "dos", ["biceps"], "poulie", "charge",
     "Buste fixe, omoplates qui se resserrent avant que les bras plient."),
    ("Tirage bras tendus poulie", "dos", [], "poulie", "charge",
     "Bras tendus, mouvement uniquement à l'épaule, on sent les grands dorsaux."),
    ("Rowing élastique", "dos", ["biceps"], "elastique", "charge",
     "Élastique ancré devant, coudes le long du corps."),
    ("Soulevé de terre", "dos", ["ischios", "fessiers", "lombaires"], "barre_olympique", "charge",
     "Barre contre les tibias, dos neutre, on pousse le sol avec les jambes."),
    ("Rack pull", "dos", ["lombaires", "ischios"], "rack", "charge",
     "Barre départ genoux : on charge lourd sur la partie haute du soulevé."),
    ("Shrugs barre", "dos", ["avant_bras"], "barre_olympique", "charge",
     "Épaules vers les oreilles, pas de rotation, pause en haut."),
    ("Shrugs haltères", "dos", ["avant_bras"], "halteres", "charge",
     "Bras relâchés, seules les épaules montent."),
    ("Face pull poulie", "dos", ["epaules"], "poulie", "charge",
     "Corde tirée vers le front, coudes hauts : l'exercice qui répare les épaules."),
    ("Good morning", "ischios", ["lombaires", "fessiers"], "barre_olympique", "charge",
     "Barre sur les trapèzes, hanches en arrière, genoux à peine fléchis."),

    # ── Épaules ────────────────────────────────────────────────────────────
    ("Développé militaire", "epaules", ["triceps"], "barre_olympique", "charge",
     "Debout, fessiers et abdos serrés, barre qui passe devant le front."),
    ("Développé haltères assis", "epaules", ["triceps"], "halteres", "charge",
     "Dossier vertical, haltères qui montent sans se cogner."),
    ("Développé Arnold", "epaules", ["triceps"], "halteres", "charge",
     "Rotation des poignets pendant la montée, paumes vers l'avant en haut."),
    ("Développé kettlebell un bras", "epaules", ["triceps", "abdominaux"], "kettlebell", "charge",
     "Poignet neutre, gainage anti-inclinaison sur le côté opposé."),
    ("Élévations latérales", "epaules", [], "halteres", "charge",
     "Montée jusqu'à l'horizontale, petits doigts légèrement plus hauts."),
    ("Élévations latérales élastique", "epaules", [], "elastique", "charge",
     "Tension dès le départ, descente freinée sur trois secondes."),
    ("Élévations frontales", "epaules", [], "halteres", "charge",
     "Un bras après l'autre, pas d'élan du bassin."),
    ("Oiseau haltères", "epaules", ["dos"], "halteres", "charge",
     "Buste penché à l'horizontale, coudes qui partent vers l'arrière."),
    ("Rotations externes élastique", "epaules", [], "elastique", "charge",
     "Coude collé au corps, mouvement lent : c'est de la prévention, pas de la force."),
    ("Tirage menton", "epaules", ["dos"], "barre_olympique", "charge",
     "Prise largeur d'épaules, coudes qui montent en premier, arrêt au sternum."),
    ("Pompes piquées", "epaules", ["triceps"], "poids_du_corps", "poids_du_corps",
     "Bassin haut, tête qui descend entre les mains."),
    ("Handstand push-up", "epaules", ["triceps"], "poids_du_corps", "poids_du_corps",
     "Contre un mur, gainage complet, descente jusqu'au contact du crâne."),

    # ── Biceps ─────────────────────────────────────────────────────────────
    ("Curl barre", "biceps", ["avant_bras"], "barre_olympique", "charge",
     "Coudes fixes contre les côtes, aucun balancement du buste."),
    ("Curl haltères alterné", "biceps", ["avant_bras"], "halteres", "charge",
     "Supination progressive pendant la montée."),
    ("Curl marteau", "biceps", ["avant_bras"], "halteres", "charge",
     "Prise neutre, on travaille le brachial et l'épaisseur du bras."),
    ("Curl incliné", "biceps", [], "halteres", "charge",
     "Banc à 45°, bras qui pendent derrière le corps : étirement maximal."),
    ("Curl concentré", "biceps", [], "halteres", "charge",
     "Coude calé sur la cuisse, contraction tenue une seconde en haut."),
    ("Curl araignée", "biceps", [], "halteres", "charge",
     "Buste sur banc incliné, bras à la verticale, zéro triche possible."),
    ("Curl poulie basse", "biceps", [], "poulie", "charge",
     "Tension continue du début à la fin, contrairement à la barre."),
    ("Curl élastique", "biceps", [], "elastique", "charge",
     "Pieds sur l'élastique, résistance croissante vers le haut."),
    ("Curl Zottman", "biceps", ["avant_bras"], "halteres", "charge",
     "Montée en supination, descente en pronation."),

    # ── Triceps ────────────────────────────────────────────────────────────
    ("Barre au front", "triceps", [], "barre_olympique", "charge",
     "Coudes fixes pointés au plafond, barre qui descend au-dessus du front."),
    ("Développé couché prise serrée", "triceps", ["pectoraux"], "barre_olympique", "charge",
     "Mains largeur d'épaules, coudes serrés le long du buste."),
    ("Extension nuque haltère", "triceps", [], "halteres", "charge",
     "Haltère à deux mains derrière la tête, coudes qui restent serrés."),
    ("Extension poulie corde", "triceps", [], "poulie", "charge",
     "Coudes collés, écartement de la corde en fin de mouvement."),
    ("Kickback haltère", "triceps", [], "halteres", "charge",
     "Bras parallèle au sol, seul l'avant-bras bouge."),
    ("Dips triceps sur banc", "triceps", ["epaules"], "banc", "poids_du_corps",
     "Mains derrière soi sur le banc, coudes vers l'arrière et non vers l'extérieur."),
    ("Pompes diamant", "triceps", ["pectoraux"], "poids_du_corps", "poids_du_corps",
     "Index et pouces en losange sous le sternum."),
    ("Extension élastique", "triceps", [], "elastique", "charge",
     "Élastique fixé en hauteur, coudes verrouillés le long du corps."),

    # ── Avant-bras ─────────────────────────────────────────────────────────
    ("Curl poignet", "avant_bras", [], "barre_olympique", "charge",
     "Avant-bras posés sur les cuisses, seules les mains bougent."),
    ("Curl poignet inversé", "avant_bras", [], "barre_olympique", "charge",
     "Paumes vers le bas, charge légère : les extenseurs sont fragiles."),
    ("Suspension à la barre", "avant_bras", ["dos"], "barre_traction", "temps",
     "Suspendu bras tendus, épaules actives, on tient le chrono."),
    ("Farmer's carry", "avant_bras", ["corps_entier", "abdominaux"], "kettlebell", "distance",
     "Charges lourdes dans chaque main, buste droit, pas réguliers."),

    # ── Quadriceps ─────────────────────────────────────────────────────────
    ("Squat barre", "quadriceps", ["fessiers", "lombaires"], "rack", "charge",
     "Descente jusqu'à la cuisse parallèle au sol minimum, genoux dans l'axe des pieds."),
    ("Front squat", "quadriceps", ["abdominaux", "fessiers"], "rack", "charge",
     "Coudes hauts, barre sur les deltoïdes avant, buste le plus vertical possible."),
    ("Squat gobelet", "quadriceps", ["fessiers"], "kettlebell", "charge",
     "Kettlebell contre la poitrine, coudes à l'intérieur des genoux en bas."),
    ("Fentes avant", "quadriceps", ["fessiers", "ischios"], "halteres", "charge",
     "Genou arrière qui frôle le sol, buste vertical."),
    ("Fentes marchées", "quadriceps", ["fessiers"], "halteres", "charge",
     "On avance à chaque répétition, pas de pause entre les pas."),
    ("Fentes bulgares", "quadriceps", ["fessiers"], "banc", "charge",
     "Pied arrière sur le banc, tout le poids sur la jambe avant."),
    ("Step-up sur banc", "quadriceps", ["fessiers"], "banc", "charge",
     "Poussée uniquement avec la jambe posée sur le banc, pas d'élan."),
    ("Squat sauté", "quadriceps", ["mollets", "cardio"], "poids_du_corps", "poids_du_corps",
     "Réception amortie, genoux souples, enchaînement rythmé."),
    ("Hack squat barre", "quadriceps", ["fessiers"], "barre_olympique", "charge",
     "Barre derrière les mollets, talons légèrement surélevés."),
    ("Sissy squat", "quadriceps", [], "poids_du_corps", "poids_du_corps",
     "Genoux qui avancent, bassin en ligne avec les épaules, très exigeant."),
    ("Chaise au mur", "quadriceps", [], "poids_du_corps", "temps",
     "Dos plaqué au mur, cuisses à l'horizontale, on tient."),
    ("Squat élastique", "quadriceps", ["fessiers"], "elastique", "charge",
     "Élastique sous les pieds et sur les épaules, tension maximale en haut."),
    ("Pistol squat", "quadriceps", ["fessiers", "abdominaux"], "poids_du_corps", "poids_du_corps",
     "Squat sur une jambe, l'autre tendue devant, contrôle total de la descente."),

    # ── Ischios & fessiers ─────────────────────────────────────────────────
    ("Soulevé de terre roumain", "ischios", ["fessiers", "lombaires"], "barre_olympique", "charge",
     "Barre qui glisse le long des cuisses, hanches loin en arrière."),
    ("Soulevé de terre jambes tendues", "ischios", ["lombaires"], "halteres", "charge",
     "Genoux très légèrement fléchis, descente jusqu'à l'étirement, pas plus bas."),
    ("Soulevé de terre sumo", "ischios", ["fessiers", "quadriceps"], "barre_olympique", "charge",
     "Pieds larges, mains à l'intérieur des genoux, buste plus vertical."),
    ("Leg curl nordique", "ischios", [], "tapis", "poids_du_corps",
     "Chevilles bloquées, descente freinée le plus longtemps possible."),
    ("Hip thrust", "fessiers", ["ischios"], "banc", "charge",
     "Omoplates sur le banc, menton rentré, extension complète des hanches en haut."),
    ("Hip thrust une jambe", "fessiers", ["ischios"], "banc", "poids_du_corps",
     "Une jambe en l'air, bassin qui reste horizontal."),
    ("Pont fessier au sol", "fessiers", ["ischios"], "tapis", "poids_du_corps",
     "Pression dans les talons, pause d'une seconde en haut."),
    ("Kettlebell swing", "fessiers", ["ischios", "dos", "cardio"], "kettlebell", "charge",
     "Mouvement de hanche, pas de squat : la kettlebell est projetée, pas soulevée."),
    ("Abduction élastique", "fessiers", [], "elastique", "charge",
     "Élastique au-dessus des genoux, ouverture lente et contrôlée."),
    ("Donkey kick élastique", "fessiers", [], "elastique", "charge",
     "Dos neutre, talon poussé vers le plafond."),
    ("Good morning élastique", "ischios", ["lombaires"], "elastique", "charge",
     "Version légère du good morning, idéale en échauffement."),

    # ── Mollets ────────────────────────────────────────────────────────────
    ("Mollets debout barre", "mollets", [], "barre_olympique", "charge",
     "Amplitude complète : étirement en bas, pause en haut."),
    ("Mollets debout haltères", "mollets", [], "halteres", "charge",
     "Avant-pieds sur un disque, talons qui descendent sous le niveau."),
    ("Mollets une jambe", "mollets", [], "poids_du_corps", "poids_du_corps",
     "Une jambe à la fois, l'autre repliée, pas d'appui pour tricher."),
    ("Mollets assis", "mollets", [], "banc", "charge",
     "Disque sur les genoux, on cible le soléaire."),

    # ── Abdominaux & lombaires ─────────────────────────────────────────────
    ("Gainage planche", "abdominaux", ["lombaires"], "tapis", "temps",
     "Coudes sous les épaules, fessiers serrés, aucune cambrure."),
    ("Gainage latéral", "abdominaux", [], "tapis", "temps",
     "Hanche haute, corps aligné vu de face."),
    ("Hollow hold", "abdominaux", [], "tapis", "temps",
     "Bas du dos plaqué au sol, bras et jambes tendus."),
    ("Relevé de jambes suspendu", "abdominaux", [], "barre_traction", "poids_du_corps",
     "Jambes tendues jusqu'à l'horizontale, pas de balancement."),
    ("Relevé de genoux suspendu", "abdominaux", [], "barre_traction", "poids_du_corps",
     "Genoux vers la poitrine, bassin qui s'enroule en fin de course."),
    ("Crunch au sol", "abdominaux", [], "tapis", "poids_du_corps",
     "On décolle les omoplates, pas tout le dos, nuque relâchée."),
    ("Crunch poulie haute", "abdominaux", [], "poulie", "charge",
     "À genoux, on enroule la colonne vertèbre par vertèbre."),
    ("Rollout à la barre", "abdominaux", ["lombaires"], "barre_olympique", "poids_du_corps",
     "À genoux, barre qui roule loin devant, dos qui ne creuse jamais."),
    ("Russian twist", "abdominaux", [], "kettlebell", "poids_du_corps",
     "Pieds décollés, rotation qui vient du buste et non des bras."),
    ("Mountain climber", "abdominaux", ["cardio"], "tapis", "temps",
     "Position de pompe, genoux qui alternent vite, bassin stable."),
    ("Dead bug", "abdominaux", [], "tapis", "poids_du_corps",
     "Bras et jambe opposés qui s'allongent, lombaires collées au sol."),
    ("Pallof press", "abdominaux", [], "elastique", "charge",
     "Élastique sur le côté, on résiste à la rotation : c'est un anti-mouvement."),
    ("V-ups", "abdominaux", [], "tapis", "poids_du_corps",
     "Bras et jambes qui se rejoignent au-dessus du bassin."),
    ("Extension lombaire au sol", "lombaires", ["fessiers"], "tapis", "poids_du_corps",
     "Buste décollé sans à-coup, regard vers le sol."),
    ("Superman", "lombaires", ["fessiers"], "tapis", "temps",
     "Bras et jambes décollés en même temps, tenue du chrono."),
    ("Bird dog", "lombaires", ["abdominaux"], "tapis", "poids_du_corps",
     "Bras et jambe opposés à l'horizontale, bassin qui ne bascule pas."),

    # ── Cardio, corps entier, Hyrox ────────────────────────────────────────
    ("Corde à sauter", "cardio", ["mollets"], "corde_a_sauter", "temps",
     "Sauts bas, poignets qui tournent, coudes près du corps."),
    ("Burpee", "cardio", ["corps_entier"], "poids_du_corps", "poids_du_corps",
     "Poitrine au sol, saut avec les mains au-dessus de la tête."),
    ("Burpee broad jump", "cardio", ["corps_entier"], "poids_du_corps", "distance",
     "Burpee suivi d'un saut en longueur, on compte la distance parcourue."),
    ("Wall balls", "corps_entier", ["quadriceps", "epaules"], "medecine_ball", "charge",
     "Squat complet puis lancer contre la cible, on rattrape en descendant."),
    ("Sled push", "corps_entier", ["quadriceps", "fessiers"], "traineau", "distance",
     "Bras tendus, buste incliné, petits pas rapides et continus."),
    ("Sled pull", "corps_entier", ["dos", "ischios"], "traineau", "distance",
     "Tirage à la corde, recul régulier, dos plat."),
    ("Sandbag lunges", "quadriceps", ["fessiers", "corps_entier"], "sac", "distance",
     "Sac sur les épaules, genou arrière au sol à chaque pas."),
    ("Ski erg", "cardio", ["dos", "abdominaux"], "ski_erg", "distance",
     "Extension complète de hanche à chaque tirage, bras qui finissent le long du corps."),
    ("Rameur", "cardio", ["dos", "quadriceps"], "rameur", "distance",
     "Jambes, buste, bras dans cet ordre ; retour dans l'ordre inverse."),
    ("Course à pied", "cardio", ["mollets", "ischios"], "poids_du_corps", "distance",
     "Allure régulière, foulée courte, cadence élevée."),
    ("Thruster", "corps_entier", ["quadriceps", "epaules"], "barre_olympique", "charge",
     "Front squat enchaîné à un développé, un seul mouvement fluide."),
    ("Épaulé", "corps_entier", ["quadriceps", "dos"], "barre_olympique", "charge",
     "Tirage explosif puis passage sous la barre, coudes projetés vers l'avant."),
    ("Épaulé-jeté", "corps_entier", ["epaules", "quadriceps"], "barre_olympique", "charge",
     "Épaulé, puis impulsion des jambes pour envoyer la barre au-dessus de la tête."),
    ("Arraché kettlebell", "corps_entier", ["epaules", "dos"], "kettlebell", "charge",
     "Un seul mouvement du sol au bras tendu, poignet qui pivote sans claquer."),
    ("Turkish get-up", "corps_entier", ["abdominaux", "epaules"], "kettlebell", "charge",
     "Du sol à debout, kettlebell toujours à la verticale, regard dessus."),
    ("Man maker", "corps_entier", ["pectoraux", "epaules"], "halteres", "charge",
     "Pompe, rowing des deux côtés, puis développé debout : une seule répétition."),
    ("Devil press", "corps_entier", ["epaules", "cardio"], "halteres", "charge",
     "Burpee haltères en main puis passage direct au-dessus de la tête."),
    ("Box jump", "quadriceps", ["mollets", "cardio"], "banc", "poids_du_corps",
     "Réception complète sur la box avant l'extension, descente en marchant."),
    ("Bear crawl", "corps_entier", ["abdominaux", "epaules"], "poids_du_corps", "distance",
     "Genoux à deux centimètres du sol, déplacement bras et jambe opposés."),
    ("Marche gobelet", "corps_entier", ["abdominaux", "quadriceps"], "kettlebell", "distance",
     "Kettlebell contre la poitrine, buste vertical, respiration régulière."),
]


def slugifier(nom: str) -> str:
    sans_accent = "".join(
        c for c in unicodedata.normalize("NFD", nom) if unicodedata.category(c) != "Mn"
    )
    garde = [c.lower() if c.isalnum() else "-" for c in sans_accent]
    slug = "".join(garde)
    while "--" in slug:
        slug = slug.replace("--", "-")
    return slug.strip("-")


def litteral(texte: str) -> str:
    return "'" + texte.replace("'", "''") + "'"


def tableau(valeurs: list[str]) -> str:
    if not valeurs:
        return "'{}'"
    return "array[" + ", ".join(litteral(v) for v in valeurs) + "]"


def main() -> None:
    slugs: set[str] = set()
    lignes: list[str] = []
    for nom, principal, secondaires, equipement, type_ex, consigne in EXERCICES:
        slug = slugifier(nom)
        if slug in slugs:
            raise SystemExit(f"slug en double : {slug}")
        slugs.add(slug)
        lignes.append(
            f"  ({litteral(nom)}, {litteral(slug)}, {litteral(principal)}, "
            f"{tableau(secondaires)}, {litteral(equipement)}, {litteral(type_ex)}::public.type_exercice, "
            f"{litteral(consigne)})"
        )

    entete = f"""-- ═══════════════════════════════════════════════════════════════════════
-- FONTE — bibliothèque d'exercices ({len(EXERCICES)} entrées)
--
-- FICHIER GÉNÉRÉ. Ne pas éditer à la main : modifier
-- scripts/generer-seed-exercices.py puis relancer le script.
--
-- Les exercices Hyrox référencent du matériel absent du garage (traîneau,
-- rameur, ski erg, medecine ball, sac). C'est volontaire : l'onboarding filtre
-- sur le matériel déclaré, ces mouvements n'apparaissent donc que pour qui les
-- coche. Voir DECISIONS.md.
-- ═══════════════════════════════════════════════════════════════════════

insert into public.exercices
  (nom, slug, groupe_principal, groupes_secondaires, equipement, type, instructions)
values
"""

    sql = entete + ",\n".join(lignes) + """
on conflict (slug) where owner_id is null do update
  set nom = excluded.nom,
      groupe_principal = excluded.groupe_principal,
      groupes_secondaires = excluded.groupes_secondaires,
      equipement = excluded.equipement,
      type = excluded.type,
      instructions = excluded.instructions;
"""

    cible = os.path.join(
        os.path.dirname(__file__), "..", "supabase", "migrations",
        "20260914090500_seed_exercices.sql",
    )
    with open(cible, "w", encoding="utf-8") as f:
        f.write(sql)
    print(f"{len(EXERCICES)} exercices écrits dans {os.path.normpath(cible)}")


if __name__ == "__main__":
    main()
