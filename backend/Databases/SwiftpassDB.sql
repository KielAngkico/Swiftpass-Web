-- MySQL dump 10.13  Distrib 8.0.43, for Linux (x86_64)
--
-- Host: localhost    Database: swiftpassdb
-- ------------------------------------------------------
-- Server version	8.0.43-0ubuntu0.24.04.1

/*!40101 SET @OLD_CHARACTER_SET_CLIENT=@@CHARACTER_SET_CLIENT */;
/*!40101 SET @OLD_CHARACTER_SET_RESULTS=@@CHARACTER_SET_RESULTS */;
/*!40101 SET @OLD_COLLATION_CONNECTION=@@COLLATION_CONNECTION */;
/*!50503 SET NAMES utf8mb4 */;
/*!40103 SET @OLD_TIME_ZONE=@@TIME_ZONE */;
/*!40103 SET TIME_ZONE='+00:00' */;
/*!40014 SET @OLD_UNIQUE_CHECKS=@@UNIQUE_CHECKS, UNIQUE_CHECKS=0 */;
/*!40014 SET @OLD_FOREIGN_KEY_CHECKS=@@FOREIGN_KEY_CHECKS, FOREIGN_KEY_CHECKS=0 */;
/*!40101 SET @OLD_SQL_MODE=@@SQL_MODE, SQL_MODE='NO_AUTO_VALUE_ON_ZERO' */;
/*!40111 SET @OLD_SQL_NOTES=@@SQL_NOTES, SQL_NOTES=0 */;

--
-- Table structure for table `AdminAccounts`
--

DROP TABLE IF EXISTS `AdminAccounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AdminAccounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_name` varchar(100) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `address` varchar(255) NOT NULL,
  `gym_name` varchar(100) DEFAULT NULL,
  `system_type` varchar(20) NOT NULL,
  `session_fee` int DEFAULT NULL,
  `is_archived` tinyint(1) DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AdminAccounts`
--

LOCK TABLES `AdminAccounts` WRITE;
/*!40000 ALTER TABLE `AdminAccounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `AdminAccounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AdminEntryLogs`
--

DROP TABLE IF EXISTS `AdminEntryLogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AdminEntryLogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `admin_id` int NOT NULL,
  `staff_name` varchar(255) DEFAULT NULL,
  `visitor_type` enum('Member','Day Pass') NOT NULL DEFAULT 'Member',
  `system_type` enum('prepaid_entry','subscription') NOT NULL,
  `deducted_amount` decimal(10,2) DEFAULT NULL,
  `remaining_balance` decimal(10,2) DEFAULT NULL,
  `subscription_expiry` date DEFAULT NULL,
  `member_status` enum('inside','outside') NOT NULL DEFAULT 'outside',
  `entry_time` datetime DEFAULT NULL,
  `exit_time` datetime DEFAULT NULL,
  `location` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `entrylogs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `AdminAccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AdminEntryLogs`
--

LOCK TABLES `AdminEntryLogs` WRITE;
/*!40000 ALTER TABLE `AdminEntryLogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `AdminEntryLogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AdminMembersTransactions`
--

DROP TABLE IF EXISTS `AdminMembersTransactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AdminMembersTransactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `admin_id` int NOT NULL,
  `transaction_type` enum('top_up','entry','refund','new_member','new_subscription','renew_subscription') NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `balance_added` decimal(10,2) DEFAULT NULL,
  `new_balance` decimal(10,2) DEFAULT NULL,
  `subscription_type` varchar(50) DEFAULT NULL,
  `subscription_start` date DEFAULT NULL,
  `subscription_expiry` date DEFAULT NULL,
  `payment_method` enum('Cash','GCash','E-Wallet') NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `tax` decimal(10,2) DEFAULT '0.00',
  `processed_by` varchar(100) DEFAULT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `trans_admin_fk` FOREIGN KEY (`admin_id`) REFERENCES `AdminAccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AdminMembersTransactions`
--

LOCK TABLES `AdminMembersTransactions` WRITE;
/*!40000 ALTER TABLE `AdminMembersTransactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `AdminMembersTransactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AdminPaymentMethods`
--

DROP TABLE IF EXISTS `AdminPaymentMethods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AdminPaymentMethods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `is_enabled` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `AdminPaymentMethods_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `AdminAccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AdminPaymentMethods`
--

LOCK TABLES `AdminPaymentMethods` WRITE;
/*!40000 ALTER TABLE `AdminPaymentMethods` DISABLE KEYS */;
/*!40000 ALTER TABLE `AdminPaymentMethods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AdminPricingOptions`
--

DROP TABLE IF EXISTS `AdminPricingOptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AdminPricingOptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `system_type` enum('prepaid_entry','subscription') NOT NULL,
  `plan_name` varchar(100) NOT NULL,
  `amount_to_pay` decimal(10,2) NOT NULL,
  `amount_to_credit` decimal(10,2) DEFAULT NULL,
  `duration_in_days` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_active` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `AdminPricingOptions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `AdminAccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AdminPricingOptions`
--

LOCK TABLES `AdminPricingOptions` WRITE;
/*!40000 ALTER TABLE `AdminPricingOptions` DISABLE KEYS */;
/*!40000 ALTER TABLE `AdminPricingOptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AdminTransactions`
--

DROP TABLE IF EXISTS `AdminTransactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AdminTransactions` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `member_id` int DEFAULT NULL,
  `member_name` varchar(100) NOT NULL,
  `rfid_tag` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` enum('Cash','GCash') NOT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `staff_name` varchar(100) DEFAULT NULL,
  `transaction_type` enum('renewal','new_membership','trainer_session','Tapup','day_pass_session') NOT NULL,
  `plan_name` varchar(100) DEFAULT NULL,
  `transaction_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  KEY `admin_id` (`admin_id`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `AdminTransactions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `AdminAccounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `AdminTransactions_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `MembersAccounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AdminTransactions`
--

LOCK TABLES `AdminTransactions` WRITE;
/*!40000 ALTER TABLE `AdminTransactions` DISABLE KEYS */;
/*!40000 ALTER TABLE `AdminTransactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `AdminsAccounts_Archived`
--

DROP TABLE IF EXISTS `AdminsAccounts_Archived`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `AdminsAccounts_Archived` (
  `id` int NOT NULL,
  `admin_name` varchar(255) NOT NULL,
  `age` int NOT NULL,
  `email` varchar(255) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `gym_name` varchar(255) DEFAULT NULL,
  `system_type` varchar(20) NOT NULL,
  `session_fee` int DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `AdminsAccounts_Archived`
--

LOCK TABLES `AdminsAccounts_Archived` WRITE;
/*!40000 ALTER TABLE `AdminsAccounts_Archived` DISABLE KEYS */;
/*!40000 ALTER TABLE `AdminsAccounts_Archived` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `Allergens`
--

DROP TABLE IF EXISTS `Allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `Allergens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `Allergens`
--

LOCK TABLES `Allergens` WRITE;
/*!40000 ALTER TABLE `Allergens` DISABLE KEYS */;
/*!40000 ALTER TABLE `Allergens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `DayPassGuests`
--

DROP TABLE IF EXISTS `DayPassGuests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `DayPassGuests` (
  `id` int NOT NULL AUTO_INCREMENT,
  `guest_name` varchar(255) DEFAULT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `rfid_tag` varchar(255) NOT NULL,
  `admin_id` int NOT NULL,
  `system_type` enum('prepaid_entry','subscription') NOT NULL,
  `staff_name` varchar(255) NOT NULL,
  `paid_amount` decimal(10,2) NOT NULL,
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  `expires_at` datetime NOT NULL,
  `status` enum('active','expired','returned') DEFAULT 'active',
  `notes` text,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `DayPassGuests`
--

LOCK TABLES `DayPassGuests` WRITE;
/*!40000 ALTER TABLE `DayPassGuests` DISABLE KEYS */;
/*!40000 ALTER TABLE `DayPassGuests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ExerciseAssessments`
--

DROP TABLE IF EXISTS `ExerciseAssessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ExerciseAssessments` (
  `id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `rfid_tag` varchar(50) NOT NULL,
  `admin_id` int DEFAULT NULL,
  `fitness_level` enum('beginner','intermediate','advanced') DEFAULT 'beginner',
  `workout_days` int DEFAULT NULL,
  `assigned_split_name` varchar(50) DEFAULT NULL,
  `coach_notes` text,
  `status` enum('pending','confirmed') DEFAULT 'pending',
  `completed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_member` (`member_id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `ExerciseAssessments_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `MembersAccounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ExerciseAssessments_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `AdminAccounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ExerciseAssessments`
--

LOCK TABLES `ExerciseAssessments` WRITE;
/*!40000 ALTER TABLE `ExerciseAssessments` DISABLE KEYS */;
/*!40000 ALTER TABLE `ExerciseAssessments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ExerciseDayCompletions`
--

DROP TABLE IF EXISTS `ExerciseDayCompletions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ExerciseDayCompletions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `rfid_tag` varchar(50) NOT NULL,
  `split_name` varchar(100) NOT NULL,
  `completion_date` date NOT NULL,
  `completed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_daily_completion` (`rfid_tag`,`split_name`,`completion_date`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `ExerciseDayCompletions_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `MembersAccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ExerciseDayCompletions`
--

LOCK TABLES `ExerciseDayCompletions` WRITE;
/*!40000 ALTER TABLE `ExerciseDayCompletions` DISABLE KEYS */;
/*!40000 ALTER TABLE `ExerciseDayCompletions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `ExerciseLibrary`
--

DROP TABLE IF EXISTS `ExerciseLibrary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `ExerciseLibrary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `level` enum('beginner','intermediate','advanced') DEFAULT 'beginner',
  `muscle_group` varchar(50) NOT NULL,
  `exercise_type` enum('compound','isolation','hybrid') DEFAULT NULL,
  `sub_target` varchar(50) DEFAULT NULL,
  `equipment` varchar(100) DEFAULT NULL,
  `instructions` text,
  `alt_exercise_ids` json DEFAULT NULL,
  `image_url` text,
  `created_by` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `ExerciseLibrary`
--

LOCK TABLES `ExerciseLibrary` WRITE;
/*!40000 ALTER TABLE `ExerciseLibrary` DISABLE KEYS */;
/*!40000 ALTER TABLE `ExerciseLibrary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FoodAllergens`
--

DROP TABLE IF EXISTS `FoodAllergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FoodAllergens` (
  `food_id` int NOT NULL,
  `allergen_id` int NOT NULL,
  PRIMARY KEY (`food_id`,`allergen_id`),
  KEY `allergen_id` (`allergen_id`),
  CONSTRAINT `FoodAllergens_ibfk_1` FOREIGN KEY (`food_id`) REFERENCES `FoodLibrary` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FoodAllergens_ibfk_2` FOREIGN KEY (`allergen_id`) REFERENCES `Allergens` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FoodAllergens`
--

LOCK TABLES `FoodAllergens` WRITE;
/*!40000 ALTER TABLE `FoodAllergens` DISABLE KEYS */;
/*!40000 ALTER TABLE `FoodAllergens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FoodGroups`
--

DROP TABLE IF EXISTS `FoodGroups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FoodGroups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `category` enum('Protein','Carb','Fruit','Vegetable') NOT NULL,
  `is_meat` tinyint(1) DEFAULT '0',
  `is_red_meat` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FoodGroups`
--

LOCK TABLES `FoodGroups` WRITE;
/*!40000 ALTER TABLE `FoodGroups` DISABLE KEYS */;
/*!40000 ALTER TABLE `FoodGroups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `FoodLibrary`
--

DROP TABLE IF EXISTS `FoodLibrary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `FoodLibrary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `group_id` int NOT NULL,
  `name` varchar(255) NOT NULL,
  `grams_reference` int DEFAULT '100',
  `calories` decimal(10,2) DEFAULT NULL,
  `protein` decimal(10,2) DEFAULT NULL,
  `carbs` decimal(10,2) DEFAULT NULL,
  `fats` decimal(10,2) DEFAULT NULL,
  `created_by` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_group_id` (`group_id`),
  CONSTRAINT `FoodLibrary_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `FoodGroups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `FoodLibrary`
--

LOCK TABLES `FoodLibrary` WRITE;
/*!40000 ALTER TABLE `FoodLibrary` DISABLE KEYS */;
/*!40000 ALTER TABLE `FoodLibrary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `InitialAssessment`
--

DROP TABLE IF EXISTS `InitialAssessment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `InitialAssessment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `rfid_tag` varchar(50) NOT NULL,
  `username` varchar(50) NOT NULL,
  `sex` enum('male','female') NOT NULL,
  `age` int NOT NULL,
  `height_cm` float NOT NULL,
  `weight_kg` float NOT NULL,
  `activity_level` enum('sedentary','light','moderate','active','very active') DEFAULT NULL,
  `body_goal` enum('Lose Weight','Gain Weight','Body Recomp','Maintain Weight') DEFAULT NULL,
  `goal_type` enum('Get Toned','Build Muscle','Build Endurance') DEFAULT NULL,
  `calorie_maintenance` float NOT NULL,
  `calories_target` float NOT NULL,
  `calorie_strategy` enum('Maintain','Mild','Moderate','Extreme') DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `InitialAssessment_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `MembersAccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `InitialAssessment`
--

LOCK TABLES `InitialAssessment` WRITE;
/*!40000 ALTER TABLE `InitialAssessment` DISABLE KEYS */;
/*!40000 ALTER TABLE `InitialAssessment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `MacroNutrientBreakdown`
--

DROP TABLE IF EXISTS `MacroNutrientBreakdown`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MacroNutrientBreakdown` (
  `id` int NOT NULL AUTO_INCREMENT,
  `goal_type` varchar(50) NOT NULL,
  `protein_pct` decimal(5,2) NOT NULL,
  `carbs_pct` decimal(5,2) NOT NULL,
  `fats_pct` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `MacroNutrientBreakdown`
--

LOCK TABLES `MacroNutrientBreakdown` WRITE;
/*!40000 ALTER TABLE `MacroNutrientBreakdown` DISABLE KEYS */;
/*!40000 ALTER TABLE `MacroNutrientBreakdown` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `MemberFoodPreferences`
--

DROP TABLE IF EXISTS `MemberFoodPreferences`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MemberFoodPreferences` (
  `id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `food_group_name` varchar(100) NOT NULL,
  `category` enum('Protein','Carb','Fat') NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `MemberFoodPreferences`
--

LOCK TABLES `MemberFoodPreferences` WRITE;
/*!40000 ALTER TABLE `MemberFoodPreferences` DISABLE KEYS */;
/*!40000 ALTER TABLE `MemberFoodPreferences` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `MemberNutritionResult`
--

DROP TABLE IF EXISTS `MemberNutritionResult`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MemberNutritionResult` (
  `id` int NOT NULL AUTO_INCREMENT,
  `assessment_id` int NOT NULL,
  `member_id` int NOT NULL,
  `food_id` int NOT NULL,
  `food_name` varchar(255) DEFAULT NULL,
  `group_id` int NOT NULL,
  `macro_type` varchar(50) DEFAULT NULL,
  `portion_grams` decimal(10,2) NOT NULL,
  `calories` decimal(10,2) NOT NULL,
  `protein` decimal(10,2) NOT NULL,
  `carbs` decimal(10,2) NOT NULL,
  `fats` decimal(10,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `assessment_id` (`assessment_id`),
  KEY `member_id` (`member_id`),
  KEY `food_id` (`food_id`),
  KEY `group_id` (`group_id`),
  CONSTRAINT `MemberNutritionResult_ibfk_1` FOREIGN KEY (`assessment_id`) REFERENCES `NutritionAssessment` (`id`) ON DELETE CASCADE,
  CONSTRAINT `MemberNutritionResult_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `MembersAccounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `MemberNutritionResult_ibfk_3` FOREIGN KEY (`food_id`) REFERENCES `FoodLibrary` (`id`),
  CONSTRAINT `MemberNutritionResult_ibfk_4` FOREIGN KEY (`group_id`) REFERENCES `FoodGroups` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `MemberNutritionResult`
--

LOCK TABLES `MemberNutritionResult` WRITE;
/*!40000 ALTER TABLE `MemberNutritionResult` DISABLE KEYS */;
/*!40000 ALTER TABLE `MemberNutritionResult` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `MembersAccounts`
--

DROP TABLE IF EXISTS `MembersAccounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `MembersAccounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `gender` enum('male','female','other') NOT NULL,
  `age` int DEFAULT NULL,
  `phone_number` varchar(15) NOT NULL,
  `address` varchar(255) DEFAULT NULL,
  `email` varchar(100) DEFAULT NULL,
  `password` varchar(255) NOT NULL,
  `profile_image_url` text,
  `admin_id` int NOT NULL,
  `staff_name` varchar(255) NOT NULL,
  `initial_balance` decimal(10,2) DEFAULT '0.00',
  `current_balance` decimal(10,2) DEFAULT '0.00',
  `subscription_type` varchar(55) DEFAULT NULL,
  `subscription_fee` decimal(10,2) DEFAULT NULL,
  `subscription_start` date DEFAULT NULL,
  `subscription_expiry` date DEFAULT NULL,
  `system_type` enum('prepaid_entry','subscription') NOT NULL,
  `payment` decimal(10,2) DEFAULT NULL,
  `status` enum('active','inactive','banned') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfid_tag` (`rfid_tag`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `MembersAccounts_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `AdminAccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `MembersAccounts`
--

LOCK TABLES `MembersAccounts` WRITE;
/*!40000 ALTER TABLE `MembersAccounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `MembersAccounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `NutritionAssessment`
--

DROP TABLE IF EXISTS `NutritionAssessment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `NutritionAssessment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `rfid_tag` varchar(50) DEFAULT NULL,
  `allergens` text,
  `protein_ids` json DEFAULT NULL,
  `carb_ids` json DEFAULT NULL,
  `fruit_ids` json DEFAULT NULL,
  `vegetable_ids` json DEFAULT NULL,
  `calories_target` float NOT NULL,
  `protein_grams` int DEFAULT NULL,
  `carbs_grams` int DEFAULT NULL,
  `fats_grams` int DEFAULT NULL,
  `macro_breakdown_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `macro_breakdown_id` (`macro_breakdown_id`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `NutritionAssessment_ibfk_1` FOREIGN KEY (`macro_breakdown_id`) REFERENCES `MacroNutrientBreakdown` (`id`),
  CONSTRAINT `NutritionAssessment_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `MembersAccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `NutritionAssessment`
--

LOCK TABLES `NutritionAssessment` WRITE;
/*!40000 ALTER TABLE `NutritionAssessment` DISABLE KEYS */;
/*!40000 ALTER TABLE `NutritionAssessment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RegisteredRfid`
--

DROP TABLE IF EXISTS `RegisteredRfid`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RegisteredRfid` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(255) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfid_tag` (`rfid_tag`),
  KEY `idx_rfid_tag` (`rfid_tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RegisteredRfid`
--

LOCK TABLES `RegisteredRfid` WRITE;
/*!40000 ALTER TABLE `RegisteredRfid` DISABLE KEYS */;
/*!40000 ALTER TABLE `RegisteredRfid` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `RepRanges`
--

DROP TABLE IF EXISTS `RepRanges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `RepRanges` (
  `id` int NOT NULL AUTO_INCREMENT,
  `body_goal` varchar(50) NOT NULL,
  `gender` enum('male','female','unisex') DEFAULT 'unisex',
  `reps_low` int NOT NULL,
  `reps_high` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `RepRanges`
--

LOCK TABLES `RepRanges` WRITE;
/*!40000 ALTER TABLE `RepRanges` DISABLE KEYS */;
/*!40000 ALTER TABLE `RepRanges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SplitDayExercises`
--

DROP TABLE IF EXISTS `SplitDayExercises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SplitDayExercises` (
  `id` int NOT NULL AUTO_INCREMENT,
  `split_day_id` int NOT NULL,
  `exercise_id` int NOT NULL,
  `order_index` int DEFAULT '0',
  `sets` int DEFAULT '3',
  `reps` varchar(20) DEFAULT '8-12',
  `rest_time` varchar(10) DEFAULT '60',
  `notes` varchar(255) DEFAULT '',
  PRIMARY KEY (`id`),
  KEY `split_day_id` (`split_day_id`),
  KEY `exercise_id` (`exercise_id`),
  CONSTRAINT `SplitDayExercises_ibfk_1` FOREIGN KEY (`split_day_id`) REFERENCES `SplitDays` (`id`) ON DELETE CASCADE,
  CONSTRAINT `SplitDayExercises_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `ExerciseLibrary` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SplitDayExercises`
--

LOCK TABLES `SplitDayExercises` WRITE;
/*!40000 ALTER TABLE `SplitDayExercises` DISABLE KEYS */;
/*!40000 ALTER TABLE `SplitDayExercises` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SplitDays`
--

DROP TABLE IF EXISTS `SplitDays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SplitDays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `split_id` int NOT NULL,
  `day_number` int NOT NULL,
  `day_title` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `split_id` (`split_id`),
  CONSTRAINT `SplitDays_ibfk_1` FOREIGN KEY (`split_id`) REFERENCES `SplitLibrary` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SplitDays`
--

LOCK TABLES `SplitDays` WRITE;
/*!40000 ALTER TABLE `SplitDays` DISABLE KEYS */;
/*!40000 ALTER TABLE `SplitDays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SplitLibrary`
--

DROP TABLE IF EXISTS `SplitLibrary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SplitLibrary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `split_name` varchar(50) NOT NULL,
  `workout_days` int NOT NULL,
  `target_gender` enum('male','female','unisex') DEFAULT 'unisex',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SplitLibrary`
--

LOCK TABLES `SplitLibrary` WRITE;
/*!40000 ALTER TABLE `SplitLibrary` DISABLE KEYS */;
/*!40000 ALTER TABLE `SplitLibrary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `StaffAccounts`
--

DROP TABLE IF EXISTS `StaffAccounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StaffAccounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int DEFAULT NULL,
  `staff_name` varchar(100) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `contact_number` int DEFAULT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `profile_image_url` text,
  `status` enum('active','inactive','archived','disabled') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `StaffAccounts_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `AdminAccounts` (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `StaffAccounts`
--

LOCK TABLES `StaffAccounts` WRITE;
/*!40000 ALTER TABLE `StaffAccounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `StaffAccounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `StaffAccounts_Archived`
--

DROP TABLE IF EXISTS `StaffAccounts_Archived`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StaffAccounts_Archived` (
  `id` int NOT NULL,
  `admin_id` int DEFAULT NULL,
  `staff_name` varchar(100) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `contact_number` int DEFAULT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive') DEFAULT 'inactive',
  `created_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `StaffAccounts_Archived`
--

LOCK TABLES `StaffAccounts_Archived` WRITE;
/*!40000 ALTER TABLE `StaffAccounts_Archived` DISABLE KEYS */;
/*!40000 ALTER TABLE `StaffAccounts_Archived` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `StaffSessionLogs`
--

DROP TABLE IF EXISTS `StaffSessionLogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `StaffSessionLogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int NOT NULL,
  `staff_name` varchar(255) NOT NULL,
  `admin_id` int NOT NULL,
  `system_type` varchar(50) NOT NULL,
  `status` enum('online','offline') DEFAULT 'online',
  `login_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `logout_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `StaffSessionLogs`
--

LOCK TABLES `StaffSessionLogs` WRITE;
/*!40000 ALTER TABLE `StaffSessionLogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `StaffSessionLogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SuperAdminAccounts`
--

DROP TABLE IF EXISTS `SuperAdminAccounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SuperAdminAccounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `superadmin_name` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SuperAdminAccounts`
--

LOCK TABLES `SuperAdminAccounts` WRITE;
/*!40000 ALTER TABLE `SuperAdminAccounts` DISABLE KEYS */;
/*!40000 ALTER TABLE `SuperAdminAccounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `SuperAdminInventory`
--

DROP TABLE IF EXISTS `SuperAdminInventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `SuperAdminInventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `type` varchar(100) NOT NULL,
  `quantity` int unsigned DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_name` (`name`),
  CONSTRAINT `SuperAdminInventory_chk_1` CHECK ((`quantity` >= 0))
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `SuperAdminInventory`
--

LOCK TABLES `SuperAdminInventory` WRITE;
/*!40000 ALTER TABLE `SuperAdminInventory` DISABLE KEYS */;
/*!40000 ALTER TABLE `SuperAdminInventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `TrustedDevices`
--

DROP TABLE IF EXISTS `TrustedDevices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `TrustedDevices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `device_id` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_device` (`user_id`,`device_id`),
  CONSTRAINT `TrustedDevices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `MembersAccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `TrustedDevices`
--

LOCK TABLES `TrustedDevices` WRITE;
/*!40000 ALTER TABLE `TrustedDevices` DISABLE KEYS */;
/*!40000 ALTER TABLE `TrustedDevices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `UserOtp`
--

DROP TABLE IF EXISTS `UserOtp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `UserOtp` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `otp` varchar(6) NOT NULL,
  `type` enum('login','reset') NOT NULL DEFAULT 'login',
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_type` (`user_id`,`type`),
  CONSTRAINT `UserOtp_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `MembersAccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `UserOtp`
--

LOCK TABLES `UserOtp` WRITE;
/*!40000 ALTER TABLE `UserOtp` DISABLE KEYS */;
/*!40000 ALTER TABLE `UserOtp` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2025-09-15 17:00:48
