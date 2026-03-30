import { ReviewsService } from './reviews.service';
import { ModerationStatus } from '../../schemas/review.schema';
export declare class ReviewsController {
    private readonly reviewsService;
    constructor(reviewsService: ReviewsService);
    getReviews(contentId: string, page?: number, limit?: number): Promise<{
        reviews: import("../../schemas/review.schema").ReviewDocument[];
        total: number;
    }>;
    createReview(userId: string, body: {
        contentId: string;
        rating: number;
        text?: string;
    }): Promise<import("../../schemas/review.schema").ReviewDocument>;
    getAllReviews(page?: number, limit?: number, status?: ModerationStatus): Promise<{
        reviews: import("../../schemas/review.schema").ReviewDocument[];
        total: number;
    }>;
    moderate(id: string, moderatorId: string, status: ModerationStatus): Promise<import("../../schemas/review.schema").ReviewDocument>;
    delete(id: string): Promise<{
        message: string;
    }>;
}
