import { Model } from 'mongoose';
import { ReviewDocument, ModerationStatus } from '../../schemas/review.schema';
import { MovieDocument } from '../../schemas/movie.schema';
export declare class ReviewsService {
    private reviewModel;
    private movieModel;
    constructor(reviewModel: Model<ReviewDocument>, movieModel: Model<MovieDocument>);
    createReview(userId: string, contentId: string, rating: number, text?: string): Promise<ReviewDocument>;
    getReviews(contentId: string, page?: number, limit?: number): Promise<{
        reviews: ReviewDocument[];
        total: number;
    }>;
    getAllReviews(page?: number, limit?: number, status?: ModerationStatus): Promise<{
        reviews: ReviewDocument[];
        total: number;
    }>;
    moderateReview(reviewId: string, status: ModerationStatus, moderatorId: string): Promise<ReviewDocument>;
    deleteReview(reviewId: string): Promise<void>;
    private recalculateRating;
}
