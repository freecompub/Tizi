export const manquants = d => (d.pieces.includes('justificatif_domicile') ? [] : ['justificatif_domicile']);
export const transmettre = d => { const m = manquants(d); return m.length ? { ok: false, motif: m[0] } : { ok: true }; };
export const jeton = req => req.headers.authorization?.split(" ")[1];
