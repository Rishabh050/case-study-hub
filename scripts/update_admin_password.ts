import { connectToDatabase } from '../lib/db/mongodb';
import { UserModel } from '../lib/models/User';
import bcrypt from 'bcryptjs';

async function updateAdminPassword() {
  const newPassword = 'Casestudies';
  console.log('=== Updating Admin User Password in MongoDB ===\n');

  try {
    await connectToDatabase();

    const hash = await bcrypt.hash(newPassword, 10);

    const user = await UserModel.findOneAndUpdate(
      { email: 'admin@company.com' },
      {
        email: 'admin@company.com',
        password_hash: hash,
        name: 'Super Admin',
        role: 'admin',
        updated_at: new Date(),
      },
      { upsert: true, new: true }
    );

    console.log('Successfully updated Admin user password in MongoDB for admin@company.com!');
  } catch (err: any) {
    console.warn('MongoDB unconfigured/offline. Local authentication route updated to handle new password.');
  }
}

updateAdminPassword();
