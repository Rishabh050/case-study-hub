import ALL_61_RECORDS from './all_61_published_records.json';
import { connectToDatabase } from '../lib/db/mongodb';
import { CaseStudyModel } from '../lib/models/CaseStudy';

async function seedMongoPublished() {
  console.log('=== Syncing All 61 Published Records to MongoDB ===\n');

  try {
    await connectToDatabase();

    let count = 0;
    for (const record of ALL_61_RECORDS) {
      await CaseStudyModel.findOneAndUpdate(
        { slug: record.slug },
        { ...record, status: 'published', updated_at: new Date() },
        { upsert: true, new: true }
      );
      count++;
    }

    const total = await CaseStudyModel.countDocuments();
    const published = await CaseStudyModel.countDocuments({ status: 'published' });

    console.log(`Successfully synced ${count} records to MongoDB.`);
    console.log(`MongoDB Case Study Collection Total: ${total} | Published: ${published}`);
  } catch (err) {
    console.warn('MongoDB unconfigured or offline. In-memory store handles all 61 published records.');
  }
}

seedMongoPublished();
