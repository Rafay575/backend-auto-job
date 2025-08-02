const express = require('express');
const cors = require('cors');
const bodyParser = require('body-parser');
const dotenv = require('dotenv');
const authRoutes = require('./routes/authRoutes');
const  userRoutes  = require('./routes/userRoutes');
const profileRoutes = require('./routes/profileRoutes');
const uploadsRoutes = require('./routes/uploadsRoutes');
const jobRoutes = require('./routes/jobRoutes');
const path = require('path');
const paymentsRoutes = require('./routes/payments');
const dashboardRoutes = require('./routes/dashboard');
const ordersRoutes = require('./routes/orders');

dotenv.config();

const app = express();

// ✅ CORRECT CORS SETUP
const CLIENT_URL = process.env.CLIENT_URL || 'http://localhost:5173';

app.use(cors({
  origin: CLIENT_URL,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization'],
  credentials: true       // if you plan to send cookies or auth headers
}));

// still allow preflight:
app.options('*', cors());

app.use(bodyParser.json());
app.use(express.urlencoded({ extended: true }));

// ... your other middleware (body-parser, auth setup, etc.)

app.use('/api', dashboardRoutes);

app.use('/api', uploadsRoutes);
app.use('/api', authRoutes); // now routes are under /api/signup, etc.
app.use('/api', userRoutes);
app.use('/api/profile', profileRoutes);  // ⬅️  add this
app.use('/api/jobs', jobRoutes);
app.use('/api/payments', paymentsRoutes);
app.use('/api', ordersRoutes);
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
