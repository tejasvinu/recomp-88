import mongoose, { Schema, type Document, type Model } from "mongoose";
import { API_TOKEN_SCOPE, MAX_API_TOKENS, type ApiTokenScope } from "@/lib/tokenUtils";

export interface IApiToken extends Document {
  userId: mongoose.Types.ObjectId;
  name: string;
  tokenHash: string;
  prefix: string;
  scopes: ApiTokenScope[];
  createdAt: Date;
  lastUsedAt: Date | null;
  revokedAt: Date | null;
  // Internal capacity slot, never returned by the API.
  slot: number;
}

const ApiTokenSchema = new Schema<IApiToken>({
  userId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
  name: { type: String, required: true, trim: true, minlength: 1, maxlength: 60 },
  tokenHash: { type: String, required: true, unique: true, match: /^[a-f0-9]{64}$/ },
  prefix: { type: String, required: true, minlength: 8, maxlength: 8 },
  scopes: { type: [String], enum: [API_TOKEN_SCOPE], default: [API_TOKEN_SCOPE], required: true },
  createdAt: { type: Date, default: Date.now, immutable: true },
  lastUsedAt: { type: Date, default: null },
  revokedAt: { type: Date, default: null },
  slot: { type: Number, required: true, enum: Array.from({ length: MAX_API_TOKENS }, (_, i) => i) },
});

// Ten unique active slots enforce the cap across processes without transactions.
// Revoked records retain their hash for auditing, while releasing their slot.
ApiTokenSchema.index(
  { userId: 1, slot: 1 },
  { unique: true, partialFilterExpression: { revokedAt: null } }
);

const ApiToken: Model<IApiToken> =
  (mongoose.models.ApiToken as Model<IApiToken>) || mongoose.model<IApiToken>("ApiToken", ApiTokenSchema);

export default ApiToken;
