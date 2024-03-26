import { Schema, model, connect, connection } from 'mongoose';
import * as dotenv from 'dotenv';
dotenv.config();

interface ISource {
  _id: string;
  type: string;
  model: string;
  page: string;
  data: any;
  harvesting: any;
  organization: any;
  organizationId: string;
}

const sourcesSchema = new Schema<ISource>({
  _id: { type: String },
  type: { type: String },
  model: { type: String },
  page: { type: String },
  data: { type: Object },
  harvesting: { type: Object },
  organization: { type: Object },
  organizationId: { type: String },
});

const Source = model<ISource>('sources', sourcesSchema);

interface IHarvest {
  fetchArtefacts: any;
}

const harvestSchema = new Schema<IHarvest>({
  fetchArtefacts: { type: Object },
});

const Harvest = model<IHarvest>('harvests', harvestSchema);

async function migrationSource() {
  // CREATE organizationId
  const sources = await Source.find();
  for (const s of sources) {
    await Source.updateOne(
      { _id: s._id },
      { organizationId: s.organization?.id || null },
    );
  }

  // DELETE useless fields Source
  await Source.updateMany(
    {},
    {
      $unset: {
        type: 1,
        model: 1,
        page: 1,
        data: 1,
        organization: 1,
        'harvesting.lastHarvestStatus': 1,
        'harvesting.lastHarvestUpdateStatus': 1,
        'harvesting.asked': 1,
      },
    },
  );
}

async function migrationHarvest() {
  await Harvest.updateMany(
    {},
    {
      $unset: {
        fetchArtefacts: 1,
      },
    },
  );
}

async function run() {
  await connect(`${process.env.MONGODB_URL}/${process.env.MONGODB_DBNAME}`);
  await migrationSource();
  await migrationHarvest();
  await connection.db.dropCollection('files');
  process.exit();
}

run().catch((err) => console.log(err));
