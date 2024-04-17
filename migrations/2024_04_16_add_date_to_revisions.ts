import { Schema, model, connect, Types } from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

interface IRevision {
  _id: any;
  harvestId: any;
  _created: Date;
}

const revisionsSchema = new Schema<IRevision>({
  _id: { type: Types.ObjectId },
  harvestId: { type: Types.ObjectId },
  _created: { type: Date },
});

const Revision = model<IRevision>('revisions', revisionsSchema);

interface IHarvest {
  startedAt: Date;
}

const harvestsSchema = new Schema<IHarvest>({
  startedAt: { type: Date },
});

const Harvest = model<IHarvest>('harvests', harvestsSchema);

async function migrationBlockedRevisions() {
  // CREATE organizationId
  const revisions = await Revision.find();

  let i = 0;
  for (const r of revisions) {
    const harvest = await Harvest.findOne({ _id: r.harvestId });
    if (harvest !== null) {
      await Revision.updateOne({ _id: r._id }, { _created: harvest.startedAt });
    }
    i++;
    if (i % 1000 === 0) {
      console.log(`${i}/${revisions.length}`);
    }
  }
}

async function run() {
  await connect(`${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}`);
  await migrationBlockedRevisions();
  process.exit();
}

run().catch((err) => console.log(err));
