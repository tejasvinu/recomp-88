import mongoose, { Schema, Document, Model } from "mongoose";
import type {
  WorkoutTemplate,
  WorkoutProgress,
  SessionHistory,
  BodyWeightEntry,
  WorkoutSettings,
  ExerciseWiki,
} from "../types";

export interface IUserData extends Document {
  userId: mongoose.Types.ObjectId;
  workoutTemplate: WorkoutTemplate;
  progress: WorkoutProgress;
  sessions: SessionHistory;
  bodyWeightEntries: BodyWeightEntry[];
  exerciseNotes: Record<string, string>;
  settings: WorkoutSettings;
  customExercises: ExerciseWiki[];
  lastSyncedAt: Date;
}

const UserDataSchema = new Schema(
  {
    userId: { type: Schema.Types.ObjectId, ref: "User", required: true, unique: true, index: true },
    workoutTemplate: { type: Array, default: [] },
    progress: { type: Schema.Types.Mixed, default: {} },
    sessions: { type: Array, default: [] },
    bodyWeightEntries: { type: Array, default: [] },
    exerciseNotes: { type: Schema.Types.Mixed, default: {} },
    settings: {
      strengthRestDuration: { type: Number, default: 120 },
      hypertrophyRestDuration: { type: Number, default: 90 },
      soundEnabled: { type: Boolean, default: true },
      weightUnit: { type: String, enum: ["kg", "lbs"], default: "kg" },
    },
    customExercises: { type: Array, default: [] },
    lastSyncedAt: { type: Date, default: Date.now },
  },
  { timestamps: true }
);

const UserData: Model<IUserData> =
  (mongoose.models.UserData as Model<IUserData>) ||
  mongoose.model<IUserData>("UserData", UserDataSchema);

export default UserData;
