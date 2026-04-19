// Service des menus cote mobile.
// Il prepare des donnees faciles a afficher pour les ecrans.

import MenuRepository from '../repositories/MenuRepository';
import { getTodayISODate } from '../utils/date';
import { getImageUri } from '../utils/image';
import { labelFromType } from '../utils/label';
import { formatISODateLocal } from '../utils/dateLocal';

function matchMenuByRepas(list, repas) {
    // Ce helper retrouve le bon menu meme si les libelles changent un peu.
    const mealReq = String(repas || "").toLowerCase();
    return (Array.isArray(list) ? list : []).find((m) => {
        const meal = (m?.repas || m?.creneau || "").toLowerCase();
        const typeMenu = (m?.typeMenu || "").toLowerCase();
        if (mealReq === "libre") {
            return (m?.repas || "").toLowerCase() === "libre" || typeMenu === "evenement";
        }
        if (mealReq === "dejeuner") {
            return meal.includes("dejeuner") || meal.includes("déjeuner") || meal === "dejeuner";
        }
        return meal.includes("diner") || meal.includes("dîner") || meal === "diner" || typeMenu === "ramadan";
    }) || null;
}

class MenuService {
    async getDailyMenus(date) {
        // Valide la date avant de parler a l'API.
        if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            throw new Error("date invalide (YYYY-MM-DD)");
        }
        // Recupere tous les menus du jour choisi.
        const menus = await MenuRepository.getMenusByDate(date);
        // Si reserve manque, on ajoute une valeur de secours pour l'interface.
        return menus.map((m) => ({
            ...m,
            reserve: m.reserve !== undefined ? m.reserve : Math.floor(m.capacite * 0.8),
        }));
    }

    async addMenu(menuData) {
        // Valide les champs essentiels côté client (repas + creneau + capacite)
        if (!menuData?.repas || !menuData?.creneau || menuData?.capacite == null) {
            throw new Error("Missing required fields");
        }
        // Délègue la création au repository
        return await MenuRepository.createMenu(menuData);
    }

    async deleteMenu(menuId) {
        // Supprime un menu par identifiant
        if (!menuId) throw new Error("menuId requis");
        return await MenuRepository.deleteMenu(menuId);
    }

    // Les methodes suivantes retournent des donnees deja prêtes pour les ecrans.
    async getTodayLunchMenuView() {
        const today = getTodayISODate();
        const data = await this.getDailyMenus(today);
        const list = Array.isArray(data) ? data : [];
        const lunch = list.find((m) => {
            const c = (m?.creneau || "").toLowerCase();
            return c.includes("dejeuner") || c.includes("déjeuner") || c === "dejeuner";
        });
        if (!lunch) return null;
        const items = (lunch.plats || []).map((p) => ({
            name: p?.nom || "",
            label: labelFromType(p?.typePlat),
            imageUri: getImageUri(p?.photo),
        }));
        return { items };
    }

    async getDailyMenuByRepasView(repas) {
        const today = getTodayISODate();
        const data = await this.getDailyMenus(today);
        const list = Array.isArray(data) ? data : [];
        const match = matchMenuByRepas(list, repas);
        if (!match) return null;
        const items = (match.plats || []).map((p) => ({
            name: p?.nom || "",
            label: labelFromType(p?.typePlat),
            imageUri: getImageUri(p?.photo),
        }));
        return { items, typeMenu: match?.typeMenu || null, repas: match?.repas || null, creneau: match?.creneau || null };
    }

    async getWeekMenusByRepasView(repas) {
        const days = Array.from({ length: 7 }).map((_, offset) => {
            const d = new Date();
            d.setDate(d.getDate() + offset);
            return d;
        });
        const results = await Promise.all(
            days.map(async (d) => {
                const isoLocal = formatISODateLocal(d);
                const data = await this.getDailyMenus(isoLocal);
                const list = Array.isArray(data) ? data : [];
                const match = matchMenuByRepas(list, repas);
                const labelDay = d.toLocaleDateString("fr-FR", { weekday: "short" });
                const labelDate = d.toLocaleDateString("fr-FR", { day: "2-digit" });
                const items = match ? (match.plats || []).map((p) => ({
                    name: p?.nom || "",
                    label: labelFromType(p?.typePlat),
                    imageUri: getImageUri(p?.photo),
                })) : [];
                return {
                    dayLabel: labelDay.charAt(0).toUpperCase() + labelDay.slice(1),
                    dateLabel: labelDate,
                    dateISO: isoLocal,
                    items,
                    typeMenu: match?.typeMenu || null,
                    repas: match?.repas || null,
                    creneau: match?.creneau || null,
                };
            })
        );
        return results;
    }

    async getMenuForReservationView(dateISO, repas) {
        // Cette vue sert a afficher un menu simple pendant la reservation.
        const data = await this.getDailyMenus(dateISO);
        const list = Array.isArray(data) ? data : [];
        const selected = matchMenuByRepas(list, repas);
        const plats = selected?.plats || [];
        const order = { entree: 1, plat: 2, dessert: 3, boisson: 4 };
        const sorted = [...plats].sort(
            (a, b) =>
                (order[(a.typePlat || "").toLowerCase()] || 99) -
                (order[(b.typePlat || "").toLowerCase()] || 99)
        );
        return sorted.map((p) => ({
            label: labelFromType(p?.typePlat),
            name: p?.nom || "",
        }));
    }
}

export default new MenuService();
