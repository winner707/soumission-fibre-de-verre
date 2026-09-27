// Faux serveur Anthropic pour les tests de bout en bout (aucun appel réel, aucun coût).
// Mots-clés dans le message du fan :
//   EXPLICITE → la réponse contient un mot interdit (teste la coupure en plein flux)
//   LENT      → réponse lente (teste le bouton Stop)
//   ZONE      → le classificateur renvoie "limite"
import http from "node:http";

const attendre = (ms) => new Promise((r) => setTimeout(r, ms));

export function demarrerMockAnthropic(port = 4010) {
  const appels = [];
  const serveur = http.createServer(async (req, res) => {
    let corps = "";
    for await (const c of req) corps += c;
    const b = JSON.parse(corps || "{}");
    const dernier = JSON.stringify(b.messages?.at(-1)?.content ?? "");
    appels.push({ stream: Boolean(b.stream), dernier, system: JSON.stringify(b.system ?? ""), output_config: b.output_config });

    if (!b.stream) {
      const json = JSON.stringify(b.system ?? "").includes("extrais")
        ? { prenom: "Alex", anniversaire: null, gouts: ["jazz"], sujetsAbordes: ["soirée"] }
        : { verdict: dernier.includes("ZONE") ? "limite" : "ok", categories: [], raison: "mock" };
      res.writeHead(200, { "content-type": "application/json" });
      return res.end(
        JSON.stringify({
          id: "msg_mock", type: "message", role: "assistant", model: b.model,
          content: [{ type: "text", text: JSON.stringify(json) }],
          stop_reason: "end_turn", stop_sequence: null, usage: { input_tokens: 1, output_tokens: 1 },
        }),
      );
    }

    res.writeHead(200, { "content-type": "text/event-stream" });
    const ev = (type, data) => res.write(`event: ${type}\ndata: ${JSON.stringify({ type, ...data })}\n\n`);
    const texte = dernier.includes("EXPLICITE")
      ? "Oh toi… tu veux voir du porno avec moi ? Non, voyons."
      : "Bonsoir toi… Je t'attendais, tu sais. Raconte-moi ta journée.";
    const delai = dernier.includes("LENT") ? 400 : 20;
    ev("message_start", { message: { id: "msg_mock", type: "message", role: "assistant", model: b.model, content: [], stop_reason: null, stop_sequence: null, usage: { input_tokens: 1, output_tokens: 0 } } });
    ev("content_block_start", { index: 0, content_block: { type: "text", text: "" } });
    for (const mot of texte.split(/(?<= )/)) {
      if (res.destroyed) return;
      ev("content_block_delta", { index: 0, delta: { type: "text_delta", text: mot } });
      await attendre(delai);
    }
    ev("content_block_stop", { index: 0 });
    ev("message_delta", { delta: { stop_reason: "end_turn", stop_sequence: null }, usage: { output_tokens: 20 } });
    ev("message_stop", {});
    res.end();
  });
  return new Promise((ok) => serveur.listen(port, () => ok({ serveur, appels })));
}
