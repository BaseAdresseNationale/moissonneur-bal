import { Schema, model, connect, Types } from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

interface IRevision {
  _id: any;
  current: boolean;
  _created: Date;
}

const revisionsSchema = new Schema<IRevision>({
  _id: { type: Types.ObjectId },
  current: { type: Boolean },
});

const Revision = model<IRevision>('revisions', revisionsSchema);

async function migration() {
  // CREATE organizationId
  await Revision.updateMany({}, { $unset: { current: '' } });
}

async function run() {
  await connect(`${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}`);
  await migration();
  process.exit();
}

run().catch((err) => console.log(err));
