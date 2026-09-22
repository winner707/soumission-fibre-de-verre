import shutil
from datetime import date
from pathlib import Path

from pia import cli, pipeline

EXEMPLE = Path(__file__).resolve().parents[1] / "data" / "prospects_exemple.csv"


def test_marquer_et_entonnoir(tmp_path):
    f = tmp_path / "p.csv"
    shutil.copy(EXEMPLE, f)
    assert cli.main(["--fichier", str(f), "marquer", "agence exemple", "envoye"]) == 0
    lignes = pipeline.charger(f)
    assert lignes[0]["statut"] == "envoye" and lignes[0]["date_contact"]
    assert pipeline.entonnoir(lignes)["envoye"] == 1
    assert cli.main(["--fichier", str(f), "marquer", "Agence Exemple", "client"]) == 0
    e = pipeline.entonnoir(pipeline.charger(f))
    assert e == {"envoye": 1, "repondu": 1, "appel_reserve": 1, "appel_fait": 1, "client": 1}


def test_agence_inconnue(tmp_path, capsys):
    f = tmp_path / "p.csv"
    shutil.copy(EXEMPLE, f)
    assert cli.main(["--fichier", str(f), "marquer", "Nope", "envoye"]) == 1
    assert "Aucune agence" in capsys.readouterr().out


def test_relances_et_rapport():
    lignes = [
        {**dict.fromkeys(pipeline.COLONNES, ""), "agence": "A", "statut": "pas_maintenant", "date_contact": "2026-09-22", "relance_le": "2026-10-06"},
        {**dict.fromkeys(pipeline.COLONNES, ""), "agence": "B", "statut": "desabonne", "date_contact": "2026-09-22", "relance_le": "2026-10-06"},
    ]
    assert [l["agence"] for l in pipeline.relances_dues(lignes, date(2026, 10, 6))] == ["A"]
    assert pipeline.relances_dues(lignes, date(2026, 10, 5)) == []
    texte = pipeline.rapport(lignes, date(2026, 9, 23))
    assert "2026-09-28" in texte and "manque 98" in texte


def test_slug():
    assert pipeline.slug("Agence Élan & Cie") == "agence-elan-cie"
