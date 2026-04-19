import ReviewRepository from '../repositories/ReviewRepository';

class ReviewService {
  async list(platId) {
    const data = await ReviewRepository.listByPlatId(platId);
    return Array.isArray(data?.reviews) ? data.reviews : [];
  }
  async create(platId, rating, text) {
    if (!platId) throw new Error('platId requis');
    if (!rating || rating < 1 || rating > 5) throw new Error('Note invalide');
    const data = await ReviewRepository.create(platId, { rating, text });
    return data;
  }
}

export default new ReviewService();
