"""Le CRM : un fichier CSV + les cibles du plan 12 semaines."""

import csv
import io
import re
import unicodedata
from datetime import date
from pathlib import Path

COLONNES = [
    "agence", "site", "fondateur", "email", "linkedin", "ville",
    "client_exemple", "statut", "date_contact", "relance_le", "notes",
]

# Ordre = progression dans l'entonnoir. Les 3 derniers sont des sorties.
STATUTS = [
    "a_contacter", "pret", "envoye", "repondu", "appel_reserve", "appel_fait", "client",
    "pas_maintenant", "perdu", "desabonne",
]
ETAPES_ENTONNOIR = ["envoye", "repondu", "appel_reserve", "appel_fait", "client"]

# (date limite, cumul d'envois, cumul d'appels faits, cumul de clients) — tiré du plan.
CIBLES = [
    (date(2026, 9, 28), 100, 8, 0),
    (date(2026, 10, 5), 250, 20, 2),
    (date(2026, 10, 12), 400, 25, 3),
    (date(2026, 11, 16), 1200, 45, 6),
    (date(2026, 11, 30), 1600, 60, 8),
    (date(2026, 12, 14), 2000, 75, 10),
]


def slug(texte: str) -> str:
    texte = unicodedata.normalize("NFKD", texte).encode("ascii", "ignore").decode()
    return re.sub(r"[^a-z0-9]+", "-", texte.lower()).strip("-") or "prospect"


def _lire_texte(chemin: Path) -> str:
    """UTF-8 (avec ou sans BOM), sinon Windows-1252 : un CSV enregistré par Excel sous Windows."""
    brut = chemin.read_bytes()
    try:
        return brut.decode("utf-8-sig")
    except UnicodeDecodeError:
        return brut.decode("cp1252")


def _separateur(texte: str) -> str:
    """Excel en français enregistre les CSV avec des points-virgules."""
    entete = texte.split("\n", 1)[0]
    return ";" if entete.count(";") > entete.count(",") else ","


def charger(chemin: Path) -> list[dict]:
    texte = _lire_texte(chemin)
    lignes = list(csv.DictReader(io.StringIO(texte, newline=""), delimiter=_separateur(texte)))
    for ligne in lignes:
        ligne.pop(None, None)  # cellules en trop sur une ligne
        for col in COLONNES:
            ligne[col] = (ligne.get(col) or "").strip()
        ligne["statut"] = ligne["statut"] or "a_contacter"
    return [l for l in lignes if l["agence"]]


def sauver(chemin: Path, lignes: list[dict]) -> None:
    """Réécrit le fichier avec le même séparateur, en UTF-8 avec BOM pour qu'Excel garde les accents."""
    separateur = _separateur(_lire_texte(chemin)) if chemin.exists() else ","
    colonnes = COLONNES + [c for l in lignes for c in l if c not in COLONNES]
    colonnes = list(dict.fromkeys(colonnes))
    tmp = chemin.with_suffix(".tmp")
    with tmp.open("w", newline="", encoding="utf-8-sig") as f:
        writer = csv.DictWriter(f, fieldnames=colonnes, delimiter=separateur)
        writer.writeheader()
        writer.writerows(lignes)
    tmp.replace(chemin)


def trouver(lignes: list[dict], nom: str) -> dict:
    cible = slug(nom)
    for ligne in lignes:
        if slug(ligne["agence"]) == cible:
            return ligne
    raise KeyError(f"Aucune agence nommée « {nom} » dans le fichier.")


def marquer(ligne: dict, statut: str, aujourd_hui: date | None = None) -> None:
    if statut not in STATUTS:
        raise ValueError(f"Statut inconnu : {statut}. Choix : {', '.join(STATUTS)}")
    aujourd_hui = aujourd_hui or date.today()
    ligne["statut"] = statut
    if statut == "envoye" and not ligne["date_contact"]:
        ligne["date_contact"] = aujourd_hui.isoformat()
    if statut in ("perdu", "desabonne", "client"):
        ligne["relance_le"] = ""


def relances_dues(lignes: list[dict], aujourd_hui: date | None = None) -> list[dict]:
    aujourd_hui = (aujourd_hui or date.today()).isoformat()
    return [l for l in lignes if l["relance_le"] and l["relance_le"] <= aujourd_hui and l["statut"] != "desabonne"]


def entonnoir(lignes: list[dict]) -> dict[str, int]:
    """Nombre de prospects ayant atteint au moins chaque étape."""
    rang = {s: i for i, s in enumerate(ETAPES_ENTONNOIR)}
    comptes = dict.fromkeys(ETAPES_ENTONNOIR, 0)
    for ligne in lignes:
        statut = ligne["statut"]
        if statut in rang:
            atteint = rang[statut]
        elif statut in ("pas_maintenant", "perdu", "desabonne") and ligne["date_contact"]:
            # Une sortie compte comme une réponse : on ne sait pas jusqu'où le prospect est allé.
            atteint = rang["repondu"]
        else:
            continue
        for etape in ETAPES_ENTONNOIR[: atteint + 1]:
            comptes[etape] += 1
    return comptes


def prochaine_cible(aujourd_hui: date | None = None):
    aujourd_hui = aujourd_hui or date.today()
    for cible in CIBLES:
        if cible[0] >= aujourd_hui:
            return cible
    return CIBLES[-1]


def rapport(lignes: list[dict], aujourd_hui: date | None = None) -> str:
    e = entonnoir(lignes)
    limite, envois, appels, clients = prochaine_cible(aujourd_hui)
    jours = (limite - (aujourd_hui or date.today())).days

    def pct(a: int, b: int) -> str:
        return f"{100 * a / b:.0f} %" if b else "—"

    def barre(fait: int, cible: int) -> str:
        return "OK" if fait >= cible else f"manque {cible - fait}"

    return "\n".join([
        f"Prospects dans le fichier : {len(lignes)} (à contacter : {sum(l['statut'] == 'a_contacter' for l in lignes)}, prêts : {sum(l['statut'] == 'pret' for l in lignes)})",
        "",
        "Entonnoir",
        f"  Envoyés        {e['envoye']:>5}",
        f"  Réponses       {e['repondu']:>5}   ({pct(e['repondu'], e['envoye'])} des envois, cible 5 %)",
        f"  Appels réservés{e['appel_reserve']:>5}   ({pct(e['appel_reserve'], e['envoye'])} des envois, cible 2 %)",
        f"  Appels faits   {e['appel_fait']:>5}",
        f"  Clients        {e['client']:>5}   ({pct(e['client'], e['appel_fait'])} des appels, cible 25 %)",
        "",
        f"Prochaine échéance : {limite.isoformat()} (dans {jours} j)",
        f"  Envois  {e['envoye']:>5} / {envois:<5} {barre(e['envoye'], envois)}",
        f"  Appels  {e['appel_fait']:>5} / {appels:<5} {barre(e['appel_fait'], appels)}",
        f"  Clients {e['client']:>5} / {clients:<5} {barre(e['client'], clients)}",
        f"Relances dues aujourd'hui : {len(relances_dues(lignes, aujourd_hui))}",
    ])
