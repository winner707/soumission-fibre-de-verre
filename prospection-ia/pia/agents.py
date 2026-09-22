"""Les agents : chacun = un prompt système + un schéma de sortie."""

from typing import Literal

import anthropic
from pydantic import BaseModel

from .claude import appeler

OFFRE = (
    "Offre « Pipeline 90 » : prospection sortante clé en main pour agences B2B. "
    "Mise en place 1 500 $ (750 $ pour les 5 premiers clients), puis 997 $/mois, engagement 3 mois. "
    "Garantie : 15 rendez-vous qualifiés en 90 jours après le lancement, sinon on travaille gratuitement "
    "jusqu'à les atteindre (condition : le client répond aux prospects en moins de 24 h)."
)


# ---------- Agent Prospection ----------

class Courriel(BaseModel):
    objet: str
    corps: str


class PaquetProspection(BaseModel):
    resume_agence: str
    client_cible_choisi: str
    sequence_cadeau: list[Courriel]
    message_agence: Courriel
    note_linkedin: str


SYSTEM_PROSPECTION = f"""Tu prépares la prospection d'une agence B2B pour le compte d'un fondateur qui vend ce service :
{OFFRE}

La tactique : on donne le résultat avant de demander quoi que ce soit. À partir du site de l'agence :
1. Résume en 2 phrases ce que fait l'agence, pour qui, et ce qui la distingue.
2. Choisis un type de client que l'agence veut clairement plus (utilise le client exemple s'il est fourni).
3. Écris `sequence_cadeau` : exactement 3 courriels que L'AGENCE pourrait envoyer à des entreprises de ce type
   pour vendre SES services. 80 mots max chacun, un seul appel à l'action, aucun jargon, pas de flatterie creuse.
   Le 2e et le 3e sont des relances courtes qui apportent un angle nouveau.
4. Écris `message_agence` : le courriel du fondateur au dirigeant de l'agence. 120 mots max. Il mentionne un fait
   précis tiré de son site, présente la séquence cadeau (jointe au message), propose le tarif fondateur avec la
   garantie, et demande 15 minutes. Termine par : « Pour ne plus recevoir de messages de ma part, répondez « stop ». »
5. Écris `note_linkedin` : une note de connexion de 280 caractères max, sans pitch.

Français québécois professionnel, vouvoiement. N'invente aucun fait, chiffre ou client absent du site : si une
information manque, reste général plutôt que d'inventer."""


def agent_prospection(client: anthropic.Anthropic, prospect: dict, texte_site: str) -> PaquetProspection:
    contenu = (
        f"Agence : {prospect.get('agence', '')}\n"
        f"Dirigeant : {prospect.get('fondateur', '')}\n"
        f"Ville : {prospect.get('ville', '')}\n"
        f"Client exemple (optionnel) : {prospect.get('client_exemple', '')}\n\n"
        f"<site>\n{texte_site}\n</site>"
    )
    return appeler(client, SYSTEM_PROSPECTION, contenu, PaquetProspection, effort="high")


# ---------- Skill Nurturing / Closing : traitement des réponses ----------

Categorie = Literal["interesse", "pas_maintenant", "objection", "pas_interesse", "desabonnement", "hors_sujet"]


class AnalyseReponse(BaseModel):
    categorie: Categorie
    resume: str
    reponse_suggeree: str
    relancer_dans_jours: int


SYSTEM_REPONSES = f"""Tu tries les réponses reçues par un fondateur qui prospecte des agences B2B avec cette offre :
{OFFRE}

Classe la réponse et rédige la réponse suggérée (90 mots max, vouvoiement, français québécois) :
- interesse : proposer 2 créneaux précis de 15 min cette semaine.
- pas_maintenant : remercier, demander quand revenir ; relancer_dans_jours = 14 par défaut ou la date donnée.
- objection : traiter l'objection avec la garantie ou un fait concret, puis reproposer 15 min.
- pas_interesse : remercier en une phrase, ne rien vendre ; relancer_dans_jours = 0.
- desabonnement : confirmer le retrait en une phrase ; relancer_dans_jours = 0. Ne jamais recontacter.
- hors_sujet : réponse automatique, absence, etc. ; reponse_suggeree vide.
Mets relancer_dans_jours = 0 quand aucune relance n'est prévue."""


def agent_reponses(client: anthropic.Anthropic, reponse_recue: str, contexte: str = "") -> AnalyseReponse:
    contenu = f"Contexte du prospect : {contexte}\n\n<reponse>\n{reponse_recue}\n</reponse>"
    return appeler(client, SYSTEM_REPONSES, contenu, AnalyseReponse, effort="low")


# ---------- Agent Validation : analyse d'un appel de découverte ----------

class AnalyseAppel(BaseModel):
    douleur_principale: str
    citation_exacte: str
    acquisition_actuelle: str
    valeur_client_dollars: str
    budget_evoque: str
    score_achat_sur_10: int
    objections: list[str]
    prochaine_etape: str
    conclusion_validation: str


SYSTEM_APPEL = f"""Tu es l'Agent Validation. On te donne les notes brutes d'un appel de découverte avec un dirigeant
d'agence. L'offre testée : {OFFRE}

Extrais les faits sans les embellir. `citation_exacte` : la phrase du prospect qui exprime le mieux sa douleur,
mot pour mot, ou vide si les notes n'en contiennent pas. `score_achat_sur_10` : 8+ seulement si le prospect a
parlé budget ou date de début. `conclusion_validation` : une phrase qui dit si cet appel confirme ou contredit
l'hypothèse « les agences B2B paieraient 997 $/mois pour des rendez-vous garantis », et pourquoi.
Écris « non mentionné » pour toute information absente des notes."""


def agent_validation(client: anthropic.Anthropic, notes: str) -> AnalyseAppel:
    return appeler(client, SYSTEM_APPEL, f"<notes>\n{notes}\n</notes>", AnalyseAppel, effort="medium")
