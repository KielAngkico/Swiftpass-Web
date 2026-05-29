const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require("cookie-parser");
const path = require("path");
require('dotenv').config();
require("./middleware/expiryHandler");
process.env.TZ = process.env.TZ;
const dbSuperAdmin = require('./db');

const profileRoute = require("./routes/profile");
const auditRoutes = require('./routes/auditRoutes');

const loginroute = require("./routes/login");
const authRoute = require("./routes/auth");
const PartnerRegistration = require("./routes/PartnerRegistration");
const memberRegistration = require("./routes/memberRegistration");

const partnerRfidsRoutes = require('./routes/partnerRfids');
const SuperAdminTransactions = require('./routes/SuperAdminTransactions');

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
const SubscriptionPackages = require ("./routes/SubscriptionPackages.js");
const RfidReplacementRoutes = require ("./routes/RfidReplacement");
const partnerOrdersRoutes = require("./routes/partnerOrders");

const viewDayPassGuestsRoute = require("./routes/ViewDayPassGuests");
const refundRoutes = require("./routes/refunds");

const app = express();


const allowedOrigins = process.env.CLIENT_ORIGINS
  ? process.env.CLIENT_ORIGINS.split(',')
  : [];

app.use(cors({
  origin: true, // allows all origins during development
  credentials: true,
  methods: ['GET','POST','PUT','DELETE','OPTIONS'],
  allowedHeaders: ['Content-Type','Authorization','X-Requested-With','Accept','Origin'],
}));



app.use(express.json({ limit: '50mb' }));
app.use(express.urlencoded({ limit: '50mb', extended: true }));
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

app.use("/uploads/partners", express.static(path.join(__dirname, "..", "public","uploads/partners")));
app.use("/uploads/staff", express.static(path.join(__dirname, "..","public" ,"uploads/staff")));
app.use("/uploads/members", express.static(path.join(__dirname, "..", "public","uploads/members")));
app.use("/uploads/daypass", express.static(path.join(__dirname, "..", "public","uploads/daypass")));
app.use("/uploads/exercises", express.static(path.join(__dirname, "..", "public","uploads/exercises")));
app.use("/uploads", express.static(path.join(__dirname, "..","public" ,"uploads")));



app.use("/api", profileRoute);
app.use("/api", loginroute);
app.use("/api", authRoute);
app.use("/api", PartnerRegistration);
app.use("/api", memberRegistration);

app.use("/api", viewDayPassGuestsRoute);

app.use("/api/partner-orders", partnerOrdersRoutes);
app.use('/api/partner-rfids', partnerRfidsRoutes);
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
app.use("/api", SubscriptionPackages);
app.use("/api", RfidReplacementRoutes);
app.use("/api", SuperAdminTransactions);

app.use("/api", auditRoutes);
app.use("/api", refundRoutes);

module.exports = app;
