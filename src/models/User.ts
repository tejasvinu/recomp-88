import mongoose, { Schema, Document, Model } from "mongoose";

export interface IUser extends Document {
  _id: mongoose.Types.ObjectId;
  name: string;
  email: string;
  password?: string; // hashed, optional for OAuth users
  image?: string;
  weightUnit: "kg" | "lbs";
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
  },
  { timestamps: true }
);

// Prevent model re-declaration during hot reloads
const User: Model<IUser> =
  (mongoose.models.User as Model<IUser>) ||
  mongoose.model<IUser>("User", UserSchema);

export default User;
