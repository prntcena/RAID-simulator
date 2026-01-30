import express from 'express';
import bodyParser from 'body-parser';
import cors from 'cors';
import raidRoutes from './routes/raidRoutes';

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors()); // Enable CORS for all routes
app.use(bodyParser.json());
app.use('/api/raid', raidRoutes);

app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
