import { connect } from 'mongoose';

export async function run() {
  // 4. Connect to MongoDB
  await connect('mongodb://localhost:27017/Quiz');
}
