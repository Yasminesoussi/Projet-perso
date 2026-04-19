// Service des reservations cote mobile.
// Il verifie et normalise les donnees avant de parler au backend.

import ReservationRepository from '../repositories/ReservationRepository';

class ReservationService {
  async createReservation({ dateISO, repas, creneau, typeRepas, groupSize, selectedSeats }) {
    if (!dateISO || !/^\d{4}-\d{2}-\d{2}$/.test(dateISO)) {
      throw new Error('dateISO invalide (YYYY-MM-DD)');
    }
    const meal = (repas || '').toLowerCase();
    if (!['dejeuner', 'diner', 'libre'].includes(meal)) {
      throw new Error('repas invalide');
    }
    const timeLabel = String(creneau || '').trim();
    if (!timeLabel) throw new Error('créneau requis');
    const typeNorm = typeRepas === 'àEmporter' ? 'aEmporter' : String(typeRepas || '').trim();
    // Le payload envoye au backend utilise toujours le meme format.
    const payload = { dateISO, repas: meal, creneau: timeLabel, typeRepas: typeNorm };
    if (typeof groupSize !== 'undefined') payload.groupSize = groupSize;
    if (Array.isArray(selectedSeats)) payload.selectedSeats = selectedSeats;
    return await ReservationRepository.create(payload);
  }
  async updateReservation(id, { creneau, typeRepas, groupSize, selectedSeats }) {
    if (!id) throw new Error('id requis');
    if (!creneau && !typeRepas && typeof groupSize === 'undefined' && !Array.isArray(selectedSeats)) throw new Error('aucune modification fournie');
    const typeNorm = typeof typeRepas !== 'undefined'
      ? (typeRepas === 'àEmporter' ? 'aEmporter' : String(typeRepas || '').trim())
      : undefined;
    const payload = {};
    if (creneau) payload.creneau = creneau;
    if (typeof typeNorm !== 'undefined') payload.typeRepas = typeNorm;
    if (typeof groupSize !== 'undefined') payload.groupSize = groupSize;
    if (Array.isArray(selectedSeats)) payload.selectedSeats = selectedSeats;
    // Une fois le payload prepare, le repository fait l'appel HTTP.
    return await ReservationRepository.update(id, payload);
  }
  async cancelReservation(id) {
    if (!id) throw new Error('id requis');
    return await ReservationRepository.cancel(id);
  }
  async getReservation(id) {
    if (!id) throw new Error('id requis');
    return await ReservationRepository.getById(id);
  }
  async getSeatMap({ dateISO, repas, creneau }) {
    if (!dateISO || !repas || !creneau) throw new Error('parametres requis');
    // Sert a afficher les places dispo avant une reservation sur place.
    return await ReservationRepository.getSeatMap({ dateISO, repas, creneau });
  }
  async leaveRestaurant(id) {
    if (!id) throw new Error('id requis');
    return await ReservationRepository.leave(id);
  }
  async submitServiceFeedback(id, { serviceRating, mealRating, ambianceRating, comment }) {
    if (!id) throw new Error('id requis');
    return await ReservationRepository.submitFeedback(id, {
      serviceRating,
      mealRating,
      ambianceRating,
      comment,
    });
  }
  async getMyReservations(scope) {
    const allowed = ['upcoming', 'history', 'cancelled'];
    const scopeVal = scope && allowed.includes(scope) ? scope : undefined;
    // scope permet de separer les reservations a venir, passees ou annulees.
    return await ReservationRepository.list(scopeVal);
  }
}

export default new ReservationService();
