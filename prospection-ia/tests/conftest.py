import json
import sys
from pathlib import Path
from types import SimpleNamespace

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))


class FauxClient:
    """Imite anthropic.Anthropic : renvoie les réponses JSON prévues, dans l'ordre."""

    def __init__(self, *reponses, stop_reason="end_turn"):
        self.reponses = list(reponses)
        self.appels = []
        self.messages = SimpleNamespace(create=self._create)
        self.stop_reason = stop_reason

    def _create(self, **kwargs):
        self.appels.append(kwargs)
        texte = json.dumps(self.reponses.pop(0))
        return SimpleNamespace(
            stop_reason=self.stop_reason,
            content=[SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=texte)],
            _request_id="req_test",
        )
