"""Appel unique à Claude qui renvoie un objet Pydantic validé."""

import json
import os
from typing import TypeVar

import anthropic
from pydantic import BaseModel

MODEL = os.environ.get("PIA_MODEL", "claude-opus-5")
T = TypeVar("T", bound=BaseModel)


class RefusError(RuntimeError):
    """Claude a refusé la requête (stop_reason == "refusal")."""


def _schema_strict(schema: dict) -> dict:
    """Ajoute additionalProperties: false partout (exigé par les sorties structurées)."""
    if isinstance(schema, dict):
        if schema.get("type") == "object":
            schema["additionalProperties"] = False
        for value in schema.values():
            _schema_strict(value)
    elif isinstance(schema, list):
        for item in schema:
            _schema_strict(item)
    return schema


def appeler(client: anthropic.Anthropic, system: str, contenu: str, modele: type[T], effort: str = "medium") -> T:
    """Envoie `contenu` à Claude et valide la réponse JSON contre `modele`.

    Le repli côté serveur (`fallbacks: "default"`) relance la requête sur un autre
    modèle si le premier la décline, au lieu de renvoyer un refus.
    """
    reponse = client.messages.create(
        model=MODEL,
        max_tokens=16000,
        system=system,
        messages=[{"role": "user", "content": contenu}],
        thinking={"type": "adaptive"},
        output_config={
            "effort": effort,
            "format": {"type": "json_schema", "schema": _schema_strict(modele.model_json_schema())},
        },
        extra_headers={"anthropic-beta": "server-side-fallback-2026-07-01"},
        extra_body={"fallbacks": "default"},
    )
    if reponse.stop_reason == "refusal":
        raise RefusError(f"Requête refusée par Claude (id {reponse._request_id}).")
    if reponse.stop_reason == "max_tokens":
        raise RuntimeError("Réponse tronquée (max_tokens atteint).")
    texte = "".join(b.text for b in reponse.content if b.type == "text")
    return modele.model_validate(json.loads(texte))
