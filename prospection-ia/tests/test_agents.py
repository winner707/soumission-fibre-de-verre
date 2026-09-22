import pytest
from conftest import FauxClient

from pia.agents import agent_prospection, agent_reponses
from pia.claude import RefusError

PAQUET = {
    "resume_agence": "Agence web B2B.",
    "client_cible_choisi": "Boulangeries",
    "sequence_cadeau": [{"objet": f"o{i}", "corps": f"c{i}"} for i in range(3)],
    "message_agence": {"objet": "3 courriels", "corps": "Bonjour"},
    "note_linkedin": "Salut",
}


def test_prospection_valide_et_envoie_schema_strict():
    client = FauxClient(PAQUET)
    paquet = agent_prospection(client, {"agence": "A", "client_exemple": "Boulangerie"}, "texte du site")
    assert len(paquet.sequence_cadeau) == 3
    appel = client.appels[0]
    schema = appel["output_config"]["format"]["schema"]
    assert schema["additionalProperties"] is False
    assert all(d["additionalProperties"] is False for d in schema["$defs"].values())
    assert appel["extra_body"] == {"fallbacks": "default"}
    assert "Boulangerie" in appel["messages"][0]["content"]


def test_refus_leve_une_erreur():
    client = FauxClient({"categorie": "interesse"}, stop_reason="refusal")
    with pytest.raises(RefusError):
        agent_reponses(client, "oui")


def test_categorie_inconnue_rejetee():
    client = FauxClient({"categorie": "peut-etre", "resume": "", "reponse_suggeree": "", "relancer_dans_jours": 0})
    with pytest.raises(ValueError):
        agent_reponses(client, "bof")
