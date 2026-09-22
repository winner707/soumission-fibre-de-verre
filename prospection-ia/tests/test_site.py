from types import SimpleNamespace

from pia.site import lire_site

PAGES = {
    "https://agence.test": '<html><body><nav>menu</nav><h1>Agence Test</h1><script>x()</script>'
    '<a href="/a-propos">À propos</a><a href="/blog">Blog</a><a href="https://autre.com/services">ext</a></body></html>',
    "https://agence.test/a-propos": "<p>Fondée en 2015 à Laval.</p>",
}


class FausseSession:
    def get(self, url, **_):
        return SimpleNamespace(text=PAGES[url], raise_for_status=lambda: None)


def test_lire_site_suit_les_pages_cles_du_meme_domaine():
    texte = lire_site("agence.test", FausseSession())
    assert "Agence Test" in texte and "Fondée en 2015" in texte
    assert "menu" not in texte and "x()" not in texte and "autre.com" not in texte
