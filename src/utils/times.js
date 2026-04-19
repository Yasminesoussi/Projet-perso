// Fournit les créneaux horaires disponibles en fonction du repas
export function getTimesForRepas(repas) {
  return repas === "dejeuner"
    ? [
        { time: "12h00 → 13h15", status: "Disponible" },
        { time: "13h30 → 14h30", status: "Disponible" }
      ]
    : [
        { time: "18h30 → 20h00", status: "Disponible" },
        { time: "20h15 → 21h30", status: "Disponible" }
      ];
}
