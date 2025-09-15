const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require("cookie-parser");
const path = require("path");
require('dotenv').config();


const dbSuperAdmin = require('./db');

const loginroute = require("./routes/login");
const authRoute = require("./routes/auth");
const getExerciseLibrary = require("./routes/ExerciseLibrary");
const getSplitLibrary = require("./routes/WorkoutSplitRoutes");
const getRepRange = require("./routes/RepRangeRoutes");
const getFoodLibrary = require("./routes/FoodLibrary");
const allergensRoutes= require("./routes/AllergensRoutes");
const getAnalyticsRoutes = require("./routes/AdminAnalytical");
const addMemberRoutes = require("./routes/AddMember");
const getMembersRoute = require("./routes/ViewMembers");
const addPricingRoutes = require("./routes/PricingManagement");
const updateMembershipRoutes = require("./routes/MembershipTransactions");
const getTransactionsRoute = require("./routes/AdminTransactions");
const getActivitiesRoute = require("./routes/ActivityAnalytics");
const addDayPassGuestRoute = require("./routes/DayPassGuests");
const EntryLogsRoute = require("./routes/Entrylogs");
const PartnerManagementRoutes = require("./routes/PartnerManagement");
const EmployeeManagementRoutes = require("./routes/EmployeeManagement");
const SuperAdminInventory = require ("./routes/SuperAdminInventory");
const RfidVerification = require ("./routes/RfidVerification");


const app = express();


const allowedOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(',')
  : [];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error("Not allowed by CORS"));
    }
  },
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept','Origin'],
}));



app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());


app.use((req, res, next) => {
  if (req.path === '/api/me') {
    console.log('Cookies received:', req.cookies);
    console.log('Raw cookie header:', req.headers.cookie);
  }
  next();
});


app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));

app.use("/uploads/staff", express.static(path.join(__dirname, "..", "uploads/staff")));
app.use("/uploads/members", express.static(path.join(__dirname, "..", "uploads/members")));
app.use("/uploads/exercises", express.static(path.join(__dirname, "..", "uploads/exercises")));
app.use("/uploads", express.static(path.join(__dirname, "..", "uploads")));


app.use("/api", loginroute);
app.use("/api", authRoute);
app.use("/api", getExerciseLibrary);
app.use("/api", getSplitLibrary);
app.use("/api", getRepRange);
app.use("/api", getFoodLibrary);
app.use("/api", allergensRoutes);
app.use("/api", getAnalyticsRoutes);
app.use("/api", addMemberRoutes);
app.use("/api", getMembersRoute);
app.use("/api", addPricingRoutes);
app.use("/api", updateMembershipRoutes);
app.use("/api", getTransactionsRoute);
app.use("/api", getActivitiesRoute);
app.use("/api", addDayPassGuestRoute);
app.use("/api", EntryLogsRoute);
app.use("/api", PartnerManagementRoutes);
app.use("/api", EmployeeManagementRoutes);
app.use("/api", SuperAdminInventory);
app.use("/api", RfidVerification);


module.exports = app;
