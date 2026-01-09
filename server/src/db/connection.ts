import mongoose from 'mongoose';

const connectDB = async (): Promise<void> => {
    const mongoUri = process.env.MONGODB_URI;

    if (!mongoUri) {
        console.error('❌ MONGODB_URI is not defined in environment variables');
        process.exit(1);
    }

    try {
        await mongoose.connect(mongoUri);
        console.log('✅ MongoDB connected successfully');
    } catch (error) {
        console.error('❌ MongoDB connection error:', error);
        process.exit(1);
    }

    mongoose.connection.on('error', (err) => {
        console.error('MongoDB connection error:', err);
    });

    mongoose.connection.on('disconnected', () => {
        console.log('MongoDB disconnected');
    });
};

export default connectDB;
