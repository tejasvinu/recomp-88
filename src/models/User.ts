import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string; // hashed, optional for OAuth users
  image?: string;
  weightUnit: "kg" | "lbs";
  providers: string[]; // e.g. ["credentials"], ["google"], ["credentials","google"]
  googleAccountId?: string;
  googleLinkNonce?: string;
  googleLinkExpiresAt?: Date;
  createdAt: Date;
  updatedAt: Date;
}

const UserSchema = new Schema<IUser>(
  {
    name: { type: String, required: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String }, // bcrypt hashed - omitted for OAuth users
    image: { type: String },
    weightUnit: { type: String, enum: ["kg", "lbs"], default: "kg" },
    providers: { type: [String], default: [] },
    googleAccountId: { type: String },
    googleLinkNonce: { type: String, select: false },
    googleLinkExpiresAt: { type: Date, select: false },
  },
  { timestamps: true }
);

// Prevent model re-declaration during hot reloads
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
