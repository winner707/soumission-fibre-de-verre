"""Lecture du site web d'un prospect : page d'accueil + quelques pages clés."""

from urllib.parse import urljoin, urlparse

import requests
from bs4 import BeautifulSoup

MOTS_CLES = ("propos", "about", "service", "client", "realisation", "réalisation", "portfolio", "projet", "equipe", "équipe")
MAX_PAGES = 4
MAX_CARACTERES = 12000
ENTETES = {"User-Agent": "Mozilla/5.0 (compatible; prospection-ia/1.0)"}


def _texte(html: str) -> tuple[str, BeautifulSoup]:
    soup = BeautifulSoup(html, "html.parser")
    for balise in soup(["script", "style", "noscript", "svg", "nav", "footer"]):
        balise.decompose()
    lignes = (l.strip() for l in soup.get_text("\n").splitlines())
    return "\n".join(l for l in lignes if l), soup


def liens_internes(soup: BeautifulSoup, base: str) -> list[str]:
    domaine = urlparse(base).netloc
    trouves: list[str] = []
    for a in soup.find_all("a", href=True):
        url = urljoin(base, a["href"]).split("#")[0]
        if urlparse(url).netloc != domaine or url in trouves or url.rstrip("/") == base.rstrip("/"):
            continue
        if any(m in url.lower() for m in MOTS_CLES):
            trouves.append(url)
    return trouves


def lire_site(url: str, session: requests.Session | None = None) -> str:
    """Renvoie le texte du site (tronqué à MAX_CARACTERES), page par page."""
    session = session or requests.Session()
    if not url.startswith("http"):
        url = "https://" + url
    reponse = session.get(url, headers=ENTETES, timeout=15)
    reponse.raise_for_status()
    texte, soup = _texte(reponse.text)
    morceaux = [f"## {url}\n{texte}"]
    for lien in liens_internes(soup, url)[: MAX_PAGES - 1]:
        try:
            r = session.get(lien, headers=ENTETES, timeout=15)
            r.raise_for_status()
        except requests.RequestException:
            continue
        morceaux.append(f"## {lien}\n{_texte(r.text)[0]}")
    return "\n\n".join(morceaux)[:MAX_CARACTERES]
