// Convertit un type de plat (entree/plat/dessert/boisson) en libellé lisible
export function labelFromType(typePlat) {
  const t = (typePlat || "").toLowerCase();
  if (t === "entree") return "Entrée";
  if (t === "plat") return "Plat";
  if (t === "dessert") return "Dessert";
  if (t === "boisson") return "Boisson";
  return "Élément";
}
