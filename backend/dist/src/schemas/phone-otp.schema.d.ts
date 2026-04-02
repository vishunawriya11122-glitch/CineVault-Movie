import { Document } from 'mongoose';
export type PhoneOtpDocument = PhoneOtp & Document;
export declare class PhoneOtp {
    phone: string;
    otpHash: string;
    expiresAt: Date;
}
export declare const PhoneOtpSchema: import("mongoose").Schema<PhoneOtp, import("mongoose").Model<PhoneOtp, any, any, any, Document<unknown, any, PhoneOtp, any, {}> & PhoneOtp & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}, any>, {}, {}, {}, {}, import("mongoose").DefaultSchemaOptions, PhoneOtp, Document<unknown, {}, import("mongoose").FlatRecord<PhoneOtp>, {}, import("mongoose").DefaultSchemaOptions> & import("mongoose").FlatRecord<PhoneOtp> & {
    _id: import("mongoose").Types.ObjectId;
} & {
    __v: number;
}>;
