"""Point d'entrée : python -m pia <commande>."""

import argparse
import sys
from datetime import date, timedelta
from pathlib import Path

import anthropic
import requests

from . import pipeline
from .agents import agent_prospection, agent_reponses, agent_validation
from .claude import RefusError
from .site import lire_site

FICHIER_DEFAUT = Path("data/prospects.csv")
CLE_MANQUANTE = "Clé API absente ou refusée. Crée une clé sur console.anthropic.com puis : export ANTHROPIC_API_KEY=..."


def _paquet_markdown(prospect: dict, paquet) -> str:
    lignes = [
        f"# {prospect['agence']} — {prospect['fondateur']}",
        f"Courriel : {prospect['email']}  |  LinkedIn : {prospect['linkedin']}",
        "",
        f"**Résumé :** {paquet.resume_agence}",
        f"**Client cible choisi :** {paquet.client_cible_choisi}",
        "",
        "## 1. Message à envoyer au dirigeant",
        f"**Objet :** {paquet.message_agence.objet}",
        "",
        paquet.message_agence.corps,
        "",
        "## 2. Note de connexion LinkedIn (à envoyer à la main)",
        paquet.note_linkedin,
        "",
        "## 3. Séquence cadeau (à joindre au message)",
    ]
    for i, c in enumerate(paquet.sequence_cadeau, 1):
        lignes += ["", f"### Courriel {i} — {c.objet}", "", c.corps]
    return "\n".join(lignes) + "\n"


def cmd_generer(args, client) -> int:
    lignes = pipeline.charger(args.fichier)
    a_faire = [l for l in lignes if l["statut"] == "a_contacter" and l["site"]][: args.nombre]
    if not a_faire:
        print("Aucun prospect « a_contacter » avec un site. Ajoute des lignes au fichier.")
        return 0
    dossier = args.sortie / date.today().isoformat()
    dossier.mkdir(parents=True, exist_ok=True)
    session = requests.Session()
    ok = 0
    for prospect in a_faire:
        nom = prospect["agence"]
        try:
            texte = lire_site(prospect["site"], session)
            paquet = agent_prospection(client, prospect, texte)
        except anthropic.AuthenticationError:
            raise
        except requests.RequestException as e:
            print(f"  ✗ {nom} : site illisible ({e.__class__.__name__}) — vérifie l'URL.")
            continue
        except (RefusError, anthropic.APIError, ValueError) as e:
            print(f"  ✗ {nom} : {e}")
            continue
        chemin = dossier / f"{pipeline.slug(nom)}.md"
        chemin.write_text(_paquet_markdown(prospect, paquet), encoding="utf-8")
        pipeline.marquer(prospect, "pret")
        pipeline.sauver(args.fichier, lignes)  # sauvegarde à chaque prospect : rien perdu si ça plante
        ok += 1
        print(f"  ✓ {nom} → {chemin}")
    print(f"\n{ok}/{len(a_faire)} paquets prêts. Relis-les, envoie-les à la main, puis : python -m pia marquer \"<agence>\" envoye")
    return 0


def cmd_repondre(args, client) -> int:
    lignes = pipeline.charger(args.fichier)
    prospect = pipeline.trouver(lignes, args.agence)
    texte = Path(args.texte).read_text(encoding="utf-8") if Path(args.texte).is_file() else args.texte
    analyse = agent_reponses(client, texte, f"{prospect['agence']}, {prospect['fondateur']}, statut {prospect['statut']}")
    statut = {
        "interesse": "repondu", "objection": "repondu", "pas_maintenant": "pas_maintenant",
        "pas_interesse": "perdu", "desabonnement": "desabonne",
    }.get(analyse.categorie)
    if statut:
        pipeline.marquer(prospect, statut)
    if analyse.relancer_dans_jours > 0:
        prospect["relance_le"] = (date.today() + timedelta(days=analyse.relancer_dans_jours)).isoformat()
    pipeline.sauver(args.fichier, lignes)
    print(f"Catégorie : {analyse.categorie}\nRésumé : {analyse.resume}")
    if prospect["relance_le"]:
        print(f"Relance prévue le : {prospect['relance_le']}")
    if analyse.reponse_suggeree:
        print(f"\n--- Réponse suggérée (à relire avant d'envoyer) ---\n{analyse.reponse_suggeree}")
    return 0


def cmd_appel(args, client) -> int:
    notes = Path(args.notes).read_text(encoding="utf-8")
    a = agent_validation(client, notes)
    print(f"Douleur : {a.douleur_principale}\nCitation : « {a.citation_exacte} »")
    print(f"Acquisition actuelle : {a.acquisition_actuelle}\nValeur d'un client : {a.valeur_client_dollars}")
    print(f"Budget : {a.budget_evoque}\nScore d'achat : {a.score_achat_sur_10}/10")
    print("Objections : " + ("; ".join(a.objections) or "aucune"))
    print(f"Prochaine étape : {a.prochaine_etape}\n\nVerdict : {a.conclusion_validation}")
    if args.agence:
        lignes = pipeline.charger(args.fichier)
        prospect = pipeline.trouver(lignes, args.agence)
        pipeline.marquer(prospect, "appel_fait")
        prospect["notes"] = f"score {a.score_achat_sur_10}/10 — {a.douleur_principale}"
        pipeline.sauver(args.fichier, lignes)
    return 0


def cmd_marquer(args, _client) -> int:
    lignes = pipeline.charger(args.fichier)
    prospect = pipeline.trouver(lignes, args.agence)
    pipeline.marquer(prospect, args.statut)
    if args.relance:
        prospect["relance_le"] = (date.today() + timedelta(days=args.relance)).isoformat()
    pipeline.sauver(args.fichier, lignes)
    print(f"{prospect['agence']} → {args.statut}")
    return 0


def cmd_stats(args, _client) -> int:
    lignes = pipeline.charger(args.fichier)
    print(pipeline.rapport(lignes))
    for l in pipeline.relances_dues(lignes):
        print(f"  • relancer {l['agence']} ({l['fondateur']}, {l['email']})")
    return 0


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(prog="pia", description="Prospection IA : agents de prospection, réponses et validation.")
    p.add_argument("--fichier", type=Path, default=FICHIER_DEFAUT, help="CSV des prospects (défaut : data/prospects.csv)")
    sp = p.add_subparsers(dest="commande", required=True)

    g = sp.add_parser("generer", help="Agent Prospection : lit les sites et prépare les messages")
    g.add_argument("-n", "--nombre", type=int, default=10)
    g.add_argument("--sortie", type=Path, default=Path("sortie"))
    g.set_defaults(fn=cmd_generer, ia=True)

    r = sp.add_parser("repondre", help="Skill Nurturing/Closing : trie une réponse et propose la suivante")
    r.add_argument("agence")
    r.add_argument("texte", help="Le texte de la réponse, ou un fichier qui le contient")
    r.set_defaults(fn=cmd_repondre, ia=True)

    a = sp.add_parser("appel", help="Agent Validation : analyse les notes d'un appel de découverte")
    a.add_argument("notes", help="Fichier texte des notes d'appel")
    a.add_argument("--agence", help="Met aussi le prospect au statut appel_fait")
    a.set_defaults(fn=cmd_appel, ia=True)

    m = sp.add_parser("marquer", help="Change le statut d'un prospect")
    m.add_argument("agence")
    m.add_argument("statut", choices=pipeline.STATUTS)
    m.add_argument("--relance", type=int, help="Relancer dans N jours")
    m.set_defaults(fn=cmd_marquer, ia=False)

    s = sp.add_parser("stats", help="Entonnoir + écart avec les cibles du plan")
    s.set_defaults(fn=cmd_stats, ia=False)

    args = p.parse_args(argv)
    if not args.fichier.exists():
        print(f"Fichier introuvable : {args.fichier}. Copie data/prospects_exemple.csv vers {args.fichier}.")
        return 1
    try:
        return args.fn(args, anthropic.Anthropic() if args.ia else None)
    except TypeError as e:
        if "authentication" not in str(e):
            raise
        print(CLE_MANQUANTE)
        return 1
    except (KeyError, ValueError) as e:
        print(f"Erreur : {e}")
        return 1
    except anthropic.AuthenticationError:
        print(CLE_MANQUANTE)
        return 1
    except anthropic.AnthropicError as e:
        print(f"Erreur Claude : {e}")
        return 1


if __name__ == "__main__":
    sys.exit(main())
