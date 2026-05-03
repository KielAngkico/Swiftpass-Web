-- MySQL dump 10.13  Distrib 8.0.41, for Win64 (x86_64)
--
-- Host: localhost    Database: swiftpassdb
-- ------------------------------------------------------
-- Server version	8.0.41

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
-- Table structure for table `adminaccounts`
--

DROP TABLE IF EXISTS `adminaccounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adminaccounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_name` varchar(100) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `address` varchar(255) NOT NULL,
  `gym_name` varchar(100) DEFAULT NULL,
  `gym_code` varchar(10) DEFAULT NULL,
  `system_type` varchar(20) NOT NULL,
  `profile_image_url` varchar(255) DEFAULT NULL,
  `session_fee` int DEFAULT NULL,
  `is_archived` tinyint DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `rfid_tag` varchar(50) DEFAULT NULL,
  `rfid_tag_2` varchar(50) DEFAULT NULL,
  `previous_rfid` varchar(50) DEFAULT NULL,
  `previous_rfid_2` varchar(50) DEFAULT NULL,
  `replaced_by` varchar(50) DEFAULT NULL,
  `replaced_at` timestamp NULL DEFAULT NULL,
  `package_id` int DEFAULT NULL,
  `subscription_start_date` datetime DEFAULT NULL,
  `subscription_end_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `gym_code` (`gym_code`)
) ENGINE=InnoDB AUTO_INCREMENT=19 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminaccounts`
--

LOCK TABLES `adminaccounts` WRITE;
/*!40000 ALTER TABLE `adminaccounts` DISABLE KEYS */;
INSERT INTO `adminaccounts` VALUES (17,'prepaidowner',NULL,'prepaidowner@gmail.com','$2b$10$3GJUmb.PBo01jeOdc8VJQ.4Dml77Bjvx4gJAhZhGSJCaMtkZ/Btae','Novaliches','PrepaidGym','PG1','prepaid_entry','/uploads/partners/partner_new_1776695315184.png',NULL,0,'active','2026-04-20 14:28:35',NULL,NULL,NULL,NULL,NULL,NULL,12,'2026-04-20 22:28:35','2027-06-14 22:28:35'),(18,'subscriptionowner',NULL,'subscriptionowner@gmail.com','$2b$10$3bnRmAmlG/cyqRIo65InrOcwIVWB.G4ujhlFdMj.AfBvjca33kDmu','TSORA','SubscriptionGym','SG1','subscription','/uploads/partners/admin_18_1776844221018.jpg',NULL,0,'active','2026-04-20 14:30:41',NULL,NULL,NULL,NULL,NULL,NULL,1,'2026-04-20 22:30:41','2027-04-15 22:30:41');
/*!40000 ALTER TABLE `adminaccounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `adminentrylogs`
--

DROP TABLE IF EXISTS `adminentrylogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adminentrylogs` (
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
  CONSTRAINT `entrylogs_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=58 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminentrylogs`
--

LOCK TABLES `adminentrylogs` WRITE;
/*!40000 ALTER TABLE `adminentrylogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `adminentrylogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `adminmembermealassessment`
--

DROP TABLE IF EXISTS `adminmembermealassessment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adminmembermealassessment` (
  `id` int NOT NULL AUTO_INCREMENT,
  `member_id` int DEFAULT NULL,
  `rfid_tag` varchar(50) NOT NULL,
  `gender` enum('Male','Female') NOT NULL,
  `age` varchar(10) NOT NULL,
  `height_cm` decimal(5,2) NOT NULL,
  `weight_lbs` decimal(5,2) NOT NULL,
  `activity_level` varchar(100) NOT NULL,
  `calorie_plan` varchar(100) NOT NULL,
  `meal_type` varchar(100) NOT NULL,
  `carbs_grams` int DEFAULT NULL,
  `fats_grams` int DEFAULT NULL,
  `protein_grams` int DEFAULT NULL,
  `assessment_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfid_tag` (`rfid_tag`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `AdminMemberMealAssessment_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminmembermealassessment`
--

LOCK TABLES `adminmembermealassessment` WRITE;
/*!40000 ALTER TABLE `adminmembermealassessment` DISABLE KEYS */;
INSERT INTO `adminmembermealassessment` VALUES (1,NULL,'F2CCAA31','Male','20',143.00,43.00,'Lightly Active (light exercise/sports 1-3 days???/week)','1940','High Protein',121,75,194,'2025-05-29 00:00:16');
/*!40000 ALTER TABLE `adminmembermealassessment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `adminmemberstransactions`
--

DROP TABLE IF EXISTS `adminmemberstransactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adminmemberstransactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(50) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `admin_id` int NOT NULL,
  `transaction_type` enum('top_up','entry','refund','new_member','new_subscription','renew_subscription','rfid_replacement') NOT NULL,
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
  CONSTRAINT `trans_admin_fk` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminmemberstransactions`
--

LOCK TABLES `adminmemberstransactions` WRITE;
/*!40000 ALTER TABLE `adminmemberstransactions` DISABLE KEYS */;
INSERT INTO `adminmemberstransactions` VALUES (8,'D7681965','andrea mae angkico',4,'new_member',500.00,500.00,500.00,NULL,NULL,NULL,'Cash',NULL,1.00,'july','2025-07-09 05:14:28'),(9,'D7681965','andrea mae angkico',4,'top_up',500.00,700.00,700.00,'promo 1',NULL,NULL,'Cash',NULL,1.00,'july','2025-07-09 06:27:22'),(11,'reafel2','Cavite',4,'new_member',500.00,700.00,700.00,'promo 1',NULL,NULL,'GCash','123456789',1.00,'july','2025-07-12 02:38:58'),(13,'D7681965','andrea mae angkico',4,'top_up',500.00,700.00,700.00,'promo 1',NULL,NULL,'Cash',NULL,1.00,'july','2025-07-24 07:54:49'),(15,'EDCDA201','qweqweqw',4,'new_member',500.00,700.00,700.00,'promo 1',NULL,NULL,'Cash',NULL,1.00,'july','2025-07-24 15:03:53'),(16,'23FE05E4','jaco',4,'new_member',500.00,700.00,700.00,'promo 1',NULL,NULL,'Cash',NULL,1.00,'july','2025-07-24 16:36:46'),(35,'Member1','subscriptioMember',18,'new_member',1000.00,0.00,0.00,'Membership Fee',NULL,NULL,'GCash','20240423',1.00,'subscriptionstaff','2026-04-23 23:38:19'),(36,'Member1','subscriptioMember',18,'renew_subscription',600.00,0.00,0.00,'Monthly','2026-04-23','2026-05-23','Cash',NULL,1.00,'subscriptionstaff','2026-04-23 23:38:44'),(37,'Member3','subscriptioMember',18,'rfid_replacement',150.00,0.00,0.00,'Monthly',NULL,NULL,'Cash',NULL,1.00,'subscriptionstaff','2026-04-23 23:48:14');
/*!40000 ALTER TABLE `adminmemberstransactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `adminpaymentmethods`
--

DROP TABLE IF EXISTS `adminpaymentmethods`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adminpaymentmethods` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `name` varchar(50) NOT NULL,
  `is_default` tinyint(1) DEFAULT '0',
  `reference_number` varchar(100) DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT '1',
  `sort_order` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `AdminPaymentMethods_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminpaymentmethods`
--

LOCK TABLES `adminpaymentmethods` WRITE;
/*!40000 ALTER TABLE `adminpaymentmethods` DISABLE KEYS */;
INSERT INTO `adminpaymentmethods` VALUES (2,7,'Cash',1,NULL,1,0,'2025-08-01 04:36:16','2025-08-01 04:36:16'),(26,17,'Cash',1,NULL,1,0,'2026-04-20 14:28:35','2026-04-20 14:28:35'),(27,18,'Cash',1,NULL,1,0,'2026-04-20 14:30:41','2026-04-20 14:30:41'),(28,18,'Gcash',0,'09970821181',1,0,'2026-04-23 15:32:13','2026-04-23 15:32:13');
/*!40000 ALTER TABLE `adminpaymentmethods` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `adminpricingoptions`
--

DROP TABLE IF EXISTS `adminpricingoptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adminpricingoptions` (
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
  `is_deletable` tinyint(1) DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `AdminPricingOptions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=86 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminpricingoptions`
--

LOCK TABLES `adminpricingoptions` WRITE;
/*!40000 ALTER TABLE `adminpricingoptions` DISABLE KEYS */;
INSERT INTO `adminpricingoptions` VALUES (6,4,'prepaid_entry','Daily Session',40.00,50.00,NULL,'2025-07-07 12:38:47','2025-07-24 08:50:44',1,0),(7,4,'prepaid_entry','promo 1',500.00,700.00,NULL,'2025-07-08 22:07:22','2025-07-08 22:07:22',1,1),(9,4,'prepaid_entry','promo 4',200.00,300.00,NULL,'2025-07-08 22:12:34','2025-07-08 22:12:34',1,1),(10,5,'prepaid_entry','Daily Session',50.00,NULL,NULL,'2025-07-22 21:30:53','2025-07-22 21:30:53',1,0),(11,6,'prepaid_entry','Daily Session',60.00,NULL,NULL,'2025-07-22 21:37:05','2025-07-22 21:37:05',1,0),(14,7,'prepaid_entry','Daily Session',50.00,NULL,NULL,'2025-08-01 04:36:16','2025-08-01 04:36:16',1,0),(77,17,'prepaid_entry','Daily Session',0.00,NULL,NULL,'2026-04-20 14:28:35','2026-04-20 14:28:35',1,0),(78,17,'prepaid_entry','Key Fob',0.00,NULL,NULL,'2026-04-20 14:28:35','2026-04-20 14:28:35',1,0),(79,17,'prepaid_entry','Replacement Fee',0.00,NULL,NULL,'2026-04-20 14:28:35','2026-04-20 14:28:35',1,0),(80,17,'prepaid_entry','Membership Fee',0.00,NULL,NULL,'2026-04-20 14:28:35','2026-04-20 14:28:35',1,0),(81,18,'subscription','Daily Session',60.00,NULL,NULL,'2026-04-20 14:30:41','2026-04-23 15:31:19',1,0),(82,18,'subscription','Key Fob',100.00,NULL,NULL,'2026-04-20 14:30:41','2026-04-23 15:31:26',1,0),(83,18,'subscription','Replacement Fee',150.00,NULL,NULL,'2026-04-20 14:30:41','2026-04-23 15:31:41',1,0),(84,18,'subscription','Membership Fee',1000.00,NULL,NULL,'2026-04-20 14:30:41','2026-04-23 15:31:36',1,0),(85,18,'subscription','Monthly',600.00,NULL,30,'2026-04-23 15:32:00','2026-04-23 15:32:00',1,1);
/*!40000 ALTER TABLE `adminpricingoptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `adminsaccounts_archived`
--

DROP TABLE IF EXISTS `adminsaccounts_archived`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `adminsaccounts_archived` (
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
-- Dumping data for table `adminsaccounts_archived`
--

LOCK TABLES `adminsaccounts_archived` WRITE;
/*!40000 ALTER TABLE `adminsaccounts_archived` DISABLE KEYS */;
INSERT INTO `adminsaccounts_archived` VALUES (3,'Session',21,'session@gmail.com','Quirino Highway','Ripped Fitness Gym','prepaid_entry',NULL,'2025-07-07 12:52:15');
/*!40000 ALTER TABLE `adminsaccounts_archived` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `admintransactions`
--

DROP TABLE IF EXISTS `admintransactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `admintransactions` (
  `transaction_id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `member_id` int DEFAULT NULL,
  `member_name` varchar(100) NOT NULL,
  `rfid_tag` varchar(50) NOT NULL,
  `amount` decimal(10,2) NOT NULL,
  `payment_method` varchar(50) DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `staff_name` varchar(100) DEFAULT NULL,
  `transaction_type` enum('renewal','new_membership','trainer_session','Tapup','day_pass_session','rfid_replacement','day_pass_renewal') NOT NULL,
  `plan_name` varchar(100) DEFAULT NULL,
  `transaction_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `cashless_reference` varchar(100) DEFAULT NULL,
  PRIMARY KEY (`transaction_id`),
  KEY `admin_id` (`admin_id`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `AdminTransactions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `AdminTransactions_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=54 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admintransactions`
--

LOCK TABLES `admintransactions` WRITE;
/*!40000 ALTER TABLE `admintransactions` DISABLE KEYS */;
INSERT INTO `admintransactions` VALUES (8,4,NULL,'andrea mae angkico','D7681965',500.00,'Cash',NULL,'july','new_membership',NULL,'2025-07-08 21:14:28',NULL),(9,4,NULL,'andrea mae angkico','D7681965',500.00,'Cash',NULL,'july','Tapup','promo 1','2025-07-08 22:27:22',NULL),(11,4,NULL,'Cavite','reafel2',500.00,'GCash','123456789','july','new_membership','promo 1','2025-07-11 18:38:58',NULL),(12,4,NULL,'123','D7681965',50.00,'Cash',NULL,'','day_pass_session',NULL,'2025-07-23 03:39:17',NULL),(13,4,NULL,'Kiel Angkico','D7681965',50.00,'Cash',NULL,'','day_pass_session',NULL,'2025-07-23 03:45:05',NULL),(14,4,NULL,'kiel','D7681965',50.00,'Cash',NULL,'','day_pass_session',NULL,'2025-07-23 04:25:09',NULL),(15,4,NULL,'kiel','D7681965',50.00,'Cash',NULL,'july','day_pass_session',NULL,'2025-07-23 04:28:22',NULL),(16,4,NULL,'ARLONG','EDCDA201',50.00,'Cash',NULL,'july','day_pass_session',NULL,'2025-07-23 06:33:35',NULL),(17,4,NULL,'Andre garfield','EDCDA201',50.00,'Cashless',NULL,'july','day_pass_session',NULL,'2025-07-23 22:58:02',NULL),(18,4,NULL,'andrea mae angkico','D7681965',500.00,'Cash',NULL,'july','Tapup','promo 1','2025-07-23 23:54:49',NULL),(20,4,NULL,'andres','EDCDA201',50.00,'Cash',NULL,'july','day_pass_session',NULL,'2025-07-24 00:24:49',NULL),(21,4,17,'qweqweqw','EDCDA201',500.00,'Cash',NULL,'july','new_membership','promo 1','2025-07-24 07:03:53',NULL),(22,4,NULL,'jaco','23FE05E4',500.00,'Cash',NULL,'july','new_membership','promo 1','2025-07-24 08:36:46',NULL),(23,4,NULL,'Mizzy','EDCDA201',50.00,'Cash',NULL,'july','day_pass_session',NULL,'2025-07-24 08:57:11',NULL),(47,18,8,'subscriptioMember','Member1',1000.00,'Gcash','20240423','subscriptionstaff','new_membership','Membership Fee','2026-04-23 15:38:19',NULL),(48,18,8,'subscriptioMember','Member1',600.00,'Cash',NULL,'subscriptionstaff','renewal','Monthly','2026-04-23 15:38:44',NULL),(49,18,8,'subscriptioMember','Member1',150.00,'cash',NULL,'subscriptionstaff','rfid_replacement','RFID Replacement','2026-04-23 15:43:28',NULL),(50,18,8,'subscriptioMember','Member3',150.00,'cash',NULL,'subscriptionstaff','rfid_replacement','RFID Replacement','2026-04-23 15:48:14',NULL),(51,18,NULL,'subscriptiondaypass','DayPass1',160.00,'Gcash',NULL,'subscriptionstaff','day_pass_session',NULL,'2026-04-23 15:50:14','2024092131'),(52,18,NULL,'subdaypass2','Daypass3',160.00,'Cash',NULL,'subscriptionstaff','day_pass_session',NULL,'2026-04-23 15:56:58',NULL),(53,18,NULL,'subdaypass2','Daypass3',60.00,'Cash',NULL,'subscriptionstaff','day_pass_renewal',NULL,'2026-04-23 16:09:14',NULL);
/*!40000 ALTER TABLE `admintransactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `allergens`
--

DROP TABLE IF EXISTS `allergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `allergens` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `name` (`name`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `allergens`
--

LOCK TABLES `allergens` WRITE;
/*!40000 ALTER TABLE `allergens` DISABLE KEYS */;
INSERT INTO `allergens` VALUES (8,'Beef'),(7,'chicken'),(11,'Fish'),(1,'gluten'),(9,'Pork'),(12,'test'),(15,'test 3'),(16,'test 4'),(17,'test 5'),(13,'test1'),(14,'test2');
/*!40000 ALTER TABLE `allergens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `audit_logs`
--

DROP TABLE IF EXISTS `audit_logs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `audit_logs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int DEFAULT NULL,
  `user_name` varchar(100) DEFAULT NULL,
  `user_role` varchar(20) DEFAULT NULL,
  `admin_id` int DEFAULT NULL,
  `action` varchar(50) DEFAULT NULL,
  `module` varchar(100) DEFAULT NULL,
  `target` varchar(255) DEFAULT NULL,
  `target_id` int DEFAULT NULL,
  `description` text,
  `payload` json DEFAULT NULL,
  `ip_address` varchar(45) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=144 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `audit_logs`
--

LOCK TABLES `audit_logs` WRITE;
/*!40000 ALTER TABLE `audit_logs` DISABLE KEYS */;
INSERT INTO `audit_logs` VALUES (1,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','subscriptionowner@gmail.com',NULL,'Failed login attempt for subscriptionowner@gmail.com','{\"email\": \"subscriptionowner@gmail.com\"}','127.0.0.1','2026-04-26 11:18:23'),(2,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','subscriptionowner@gmail.com',NULL,'Failed login attempt for subscriptionowner@gmail.com','{\"email\": \"subscriptionowner@gmail.com\"}','127.0.0.1','2026-04-26 11:18:25'),(3,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','subscriptionowner@gmail.com',NULL,'Failed login attempt for subscriptionowner@gmail.com','{\"email\": \"subscriptionowner@gmail.com\"}','127.0.0.1','2026-04-26 11:18:28'),(4,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','subscriptionowner@gmail.com',NULL,'Failed login attempt for subscriptionowner@gmail.com','{\"email\": \"subscriptionowner@gmail.com\"}','127.0.0.1','2026-04-26 11:18:29'),(5,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','subscriptionowner@gmail.com',18,'subscriptionowner logged in successfully','{\"role\": \"admin\", \"email\": \"subscriptionowner@gmail.com\"}','127.0.0.1','2026-04-26 11:18:34'),(6,18,'subscriptionowner','admin',18,'PAGE_VISIT','Navigation','Sales Report',NULL,'subscriptionowner visited Sales Report','{\"page\": \"Sales Report\"}','127.0.0.1','2026-04-26 11:18:38'),(7,18,'subscriptionowner','admin',18,'PAGE_VISIT','Navigation','RFID Inventory',NULL,'subscriptionowner visited RFID Inventory','{\"page\": \"RFID Inventory\"}','127.0.0.1','2026-04-26 11:18:39'),(8,18,'subscriptionowner','admin',18,'PAGE_VISIT','Navigation','Activity Analytics',NULL,'subscriptionowner visited Activity Analytics','{\"page\": \"Activity Analytics\"}','127.0.0.1','2026-04-26 11:18:41'),(9,18,'subscriptionowner','admin',18,'PAGE_VISIT','Navigation','Members Directory',NULL,'subscriptionowner visited Members Directory','{\"page\": \"Members Directory\"}','127.0.0.1','2026-04-26 11:18:42'),(10,18,'subscriptionowner','admin',18,'PAGE_VISIT','Navigation','Day Pass Guests',NULL,'subscriptionowner visited Day Pass Guests','{\"page\": \"Day Pass Guests\"}','127.0.0.1','2026-04-26 11:18:43'),(11,18,'subscriptionowner','admin',18,'PAGE_VISIT','Navigation','Pricing',NULL,'subscriptionowner visited Pricing','{\"page\": \"Pricing\"}','127.0.0.1','2026-04-26 11:18:44'),(12,18,'subscriptionowner','admin',18,'PAGE_VISIT','Navigation','Employees Management',NULL,'subscriptionowner visited Employees Management','{\"page\": \"Employees Management\"}','127.0.0.1','2026-04-26 11:18:45'),(13,18,'subscriptionowner','admin',18,'PAGE_VISIT','Navigation','Employees Activity',NULL,'subscriptionowner visited Employees Activity','{\"page\": \"Employees Activity\"}','127.0.0.1','2026-04-26 11:18:46'),(14,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','aerykangkico@gmail.com',NULL,'Failed login attempt for aerykangkico@gmail.com','{\"email\": \"aerykangkico@gmail.com\"}','127.0.0.1','2026-04-26 11:19:15'),(15,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','aerykangkico@gmail.com',3,'KielSuperadmin logged in successfully','{\"role\": \"superadmin\", \"email\": \"aerykangkico@gmail.com\"}','127.0.0.1','2026-04-26 11:19:18'),(16,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Audit Trails',NULL,'KielSuperadmin visited Audit Trails','{\"page\": \"Audit Trails\"}','127.0.0.1','2026-04-26 11:19:43'),(17,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','aerykangkico@gmail.com',3,'KielSuperadmin logged in successfully','{\"role\": \"superadmin\", \"email\": \"aerykangkico@gmail.com\"}','127.0.0.1','2026-04-26 12:51:02'),(18,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Orders',NULL,'KielSuperadmin visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-26 12:51:04'),(19,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Transactions',NULL,'KielSuperadmin visited Transactions','{\"page\": \"Transactions\"}','127.0.0.1','2026-04-26 12:51:06'),(20,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Exercise Library',NULL,'KielSuperadmin visited Exercise Library','{\"page\": \"Exercise Library\"}','127.0.0.1','2026-04-26 12:51:07'),(21,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Workout Split Library',NULL,'KielSuperadmin visited Workout Split Library','{\"page\": \"Workout Split Library\"}','127.0.0.1','2026-04-26 12:51:09'),(22,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Food Library',NULL,'KielSuperadmin visited Food Library','{\"page\": \"Food Library\"}','127.0.0.1','2026-04-26 12:51:10'),(23,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Inventory',NULL,'KielSuperadmin visited Inventory','{\"page\": \"Inventory\"}','127.0.0.1','2026-04-26 12:51:11'),(24,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Pricing Management',NULL,'KielSuperadmin visited Pricing Management','{\"page\": \"Pricing Management\"}','127.0.0.1','2026-04-26 12:51:13'),(25,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Audit Trails',NULL,'KielSuperadmin visited Audit Trails','{\"page\": \"Audit Trails\"}','127.0.0.1','2026-04-26 12:51:14'),(26,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','aerykangkico@gmail.com',3,'KielSuperadmin logged in successfully','{\"role\": \"superadmin\", \"email\": \"aerykangkico@gmail.com\"}','127.0.0.1','2026-04-26 20:40:16'),(27,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Pricing Management',NULL,'KielSuperadmin visited Pricing Management','{\"page\": \"Pricing Management\"}','127.0.0.1','2026-04-26 20:40:18'),(28,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Inventory',NULL,'KielSuperadmin visited Inventory','{\"page\": \"Inventory\"}','127.0.0.1','2026-04-26 20:40:55'),(29,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Pricing Management',NULL,'KielSuperadmin visited Pricing Management','{\"page\": \"Pricing Management\"}','127.0.0.1','2026-04-26 20:45:22'),(30,3,'KielSuperadmin','superadmin',NULL,'DELETE','Packages','Admin RFID Module',4,'Deleted package Admin RFID Module','{}','127.0.0.1','2026-04-26 20:51:20'),(31,3,'KielSuperadmin','superadmin',NULL,'CREATE','Packages','Magnetic Lock Controller',6,'Added package Magnetic Lock Controller (hardware_module)','{\"name\": \"Magnetic Lock Controller\", \"items\": [{\"quantity\": 1, \"item_name\": \"ESP32 Module\"}, {\"quantity\": 1, \"item_name\": \"Type C Cable\"}, {\"quantity\": 1, \"item_name\": \"Relay\"}, {\"quantity\": 1, \"item_name\": \"Wires\"}, {\"quantity\": 1, \"item_name\": \"Magnetic Lock\"}, {\"quantity\": 1, \"item_name\": \"Power Supply\"}], \"price\": \"1800\", \"package_type\": \"hardware_module\", \"duration_days\": \"\"}','127.0.0.1','2026-04-26 21:05:54'),(32,3,'KielSuperadmin','superadmin',NULL,'CREATE','Packages','Entry Module',7,'Added package Entry Module (hardware_module)','{\"name\": \"Entry Module\", \"items\": [{\"quantity\": 1, \"item_name\": \"ESP32 Module\"}, {\"quantity\": 1, \"item_name\": \"RFID Reader\"}, {\"quantity\": 1, \"item_name\": \"Active Buzzer\"}, {\"quantity\": 1, \"item_name\": \"Type C Cable\"}, {\"quantity\": 1, \"item_name\": \"Wires\"}], \"price\": \"670\", \"package_type\": \"hardware_module\", \"duration_days\": \"\"}','127.0.0.1','2026-04-26 21:06:47'),(33,3,'KielSuperadmin','superadmin',NULL,'CREATE','Packages','Exit Module',8,'Added package Exit Module (hardware_module)','{\"name\": \"Exit Module\", \"items\": [], \"price\": \"670\", \"package_type\": \"hardware_module\", \"duration_days\": \"\"}','127.0.0.1','2026-04-26 21:07:14'),(34,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Packages','Exit Module',8,'Edited package Exit Module (hardware_module)','{\"name\": \"Exit Module\", \"items\": [{\"quantity\": 1, \"item_name\": \"ESP32 Module\"}, {\"quantity\": 1, \"item_name\": \"RFID Reader\"}, {\"quantity\": 1, \"item_name\": \"Active Buzzer\"}, {\"quantity\": 1, \"item_name\": \"Type C Cable\"}, {\"quantity\": 1, \"item_name\": \"Wires\"}], \"price\": \"670.00\", \"package_type\": \"hardware_module\", \"duration_days\": 0}','127.0.0.1','2026-04-26 21:08:00'),(35,3,'KielSuperadmin','superadmin',NULL,'CREATE','Packages','Access Control Box',9,'Added package Access Control Box (hardware_module)','{\"name\": \"Access Control Box\", \"items\": [{\"quantity\": 1, \"item_name\": \"Access Control Casing\"}, {\"quantity\": 1, \"item_name\": \"Emergency Button\"}], \"price\": \"1070\", \"package_type\": \"hardware_module\", \"duration_days\": \"\"}','127.0.0.1','2026-04-26 21:08:23'),(36,3,'KielSuperadmin','superadmin',NULL,'CREATE','Packages','Hardware Components',10,'Added package Hardware Components (hardware_module)','{\"name\": \"Hardware Components\", \"items\": [{\"quantity\": 1, \"item_name\": null, \"sub_package_id\": 5, \"sub_package_name\": \"Admin RFID Module\", \"sub_package_type\": \"hardware_module\"}, {\"quantity\": 1, \"item_name\": null, \"sub_package_id\": 6, \"sub_package_name\": \"Magnetic Lock Controller\", \"sub_package_type\": \"hardware_module\"}, {\"quantity\": 1, \"item_name\": null, \"sub_package_id\": 7, \"sub_package_name\": \"Entry Module\", \"sub_package_type\": \"hardware_module\"}, {\"quantity\": 1, \"item_name\": null, \"sub_package_id\": 8, \"sub_package_name\": \"Exit Module\", \"sub_package_type\": \"hardware_module\"}, {\"quantity\": 1, \"item_name\": null, \"sub_package_id\": 9, \"sub_package_name\": \"Access Control Box\", \"sub_package_type\": \"hardware_module\"}], \"price\": \"7189\", \"package_type\": \"hardware_module\", \"duration_days\": \"\"}','127.0.0.1','2026-04-26 21:09:36'),(37,3,'KielSuperadmin','superadmin',NULL,'CREATE','Packages','Onboarding Package',11,'Added package Onboarding Package (onboarding)','{\"name\": \"Onboarding Package\", \"items\": [{\"quantity\": 1, \"item_name\": null, \"sub_package_id\": 10, \"sub_package_name\": \"Hardware Components\", \"sub_package_type\": \"hardware_module\"}, {\"quantity\": 1, \"item_name\": \"Partner/Staff - Card\"}, {\"quantity\": 1, \"item_name\": \"Member - Wristband\"}, {\"quantity\": 1, \"item_name\": \"Day Pass - KeyFob\"}], \"price\": \"34999\", \"package_type\": \"onboarding\", \"duration_days\": \"365\"}','127.0.0.1','2026-04-26 21:11:03'),(38,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Inventory',NULL,'KielSuperadmin visited Inventory','{\"page\": \"Inventory\"}','127.0.0.1','2026-04-26 21:11:30'),(39,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Inventory','Magnetic Lock',10,'Edited inventory item Magnetic Lock','{\"name\": \"Magnetic Lock\", \"quantity\": \"2\", \"selling_price\": \"1400.00\", \"purchase_price\": \"1000.00\"}','127.0.0.1','2026-04-26 21:11:41'),(40,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Inventory','Relay',9,'Edited inventory item Relay','{\"name\": \"Relay\", \"quantity\": \"5\", \"selling_price\": \"70.00\", \"purchase_price\": \"50.00\"}','127.0.0.1','2026-04-26 21:11:50'),(41,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Inventory','Wires',8,'Edited inventory item Wires','{\"name\": \"Wires\", \"quantity\": \"10\", \"selling_price\": \"50\", \"purchase_price\": \"20.00\"}','127.0.0.1','2026-04-26 21:11:58'),(42,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Inventory','Type C Cable',7,'Edited inventory item Type C Cable','{\"name\": \"Type C Cable\", \"quantity\": \"5\", \"selling_price\": \"210.00\", \"purchase_price\": \"150.00\"}','127.0.0.1','2026-04-26 21:12:03'),(43,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Inventory','Active Buzzer',6,'Edited inventory item Active Buzzer','{\"name\": \"Active Buzzer\", \"quantity\": \"1\", \"selling_price\": \"45.00\", \"purchase_price\": \"30.00\"}','127.0.0.1','2026-04-26 21:12:06'),(44,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Inventory','RFID Reader',5,'Edited inventory item RFID Reader','{\"name\": \"RFID Reader\", \"quantity\": \"5\", \"selling_price\": \"130.00\", \"purchase_price\": \"90.00\"}','127.0.0.1','2026-04-26 21:12:15'),(45,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Inventory','ESP32 Module',4,'Edited inventory item ESP32 Module','{\"name\": \"ESP32 Module\", \"quantity\": \"5\", \"selling_price\": \"500.00\", \"purchase_price\": \"350.00\"}','127.0.0.1','2026-04-26 21:12:18'),(46,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','gymadmin@gmail.com',NULL,'Failed login attempt for gymadmin@gmail.com','{\"email\": \"gymadmin@gmail.com\"}','127.0.0.1','2026-04-26 21:23:56'),(47,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','gymadmin@gmail.com',NULL,'Failed login attempt for gymadmin@gmail.com','{\"email\": \"gymadmin@gmail.com\"}','127.0.0.1','2026-04-26 21:24:00'),(48,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','gymadmin@gmail.com',NULL,'Failed login attempt for gymadmin@gmail.com','{\"email\": \"gymadmin@gmail.com\"}','127.0.0.1','2026-04-26 21:24:03'),(49,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','gymadmin@gmail.com',NULL,'Failed login attempt for gymadmin@gmail.com','{\"email\": \"gymadmin@gmail.com\"}','127.0.0.1','2026-04-26 21:24:04'),(50,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','gymadmin@gmail.com',NULL,'Failed login attempt for gymadmin@gmail.com','{\"email\": \"gymadmin@gmail.com\"}','127.0.0.1','2026-04-26 21:24:06'),(51,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','aerykangkico@gmail.com',3,'KielSuperadmin logged in successfully','{\"role\": \"superadmin\", \"email\": \"aerykangkico@gmail.com\"}','127.0.0.1','2026-04-26 21:24:17'),(52,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','prepaidowner@gmail.com',17,'prepaidowner logged in successfully','{\"role\": \"admin\", \"email\": \"prepaidowner@gmail.com\"}','127.0.0.1','2026-04-26 21:24:32'),(53,17,'prepaidowner','admin',17,'PAGE_VISIT','Navigation','My Orders',NULL,'prepaidowner visited My Orders','{\"page\": \"My Orders\"}','127.0.0.1','2026-04-26 21:24:33'),(54,17,'prepaidowner','admin',NULL,'CREATE','Orders','ORD-38883857048',15,'Created package_order order ORD-38883857048 for package \"Access Control Box\"','{\"notes\": null, \"admin_id\": 17, \"package_id\": 9}','127.0.0.1','2026-04-26 21:28:03'),(55,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','aerykangkico@gmail.com',3,'KielSuperadmin logged in successfully','{\"role\": \"superadmin\", \"email\": \"aerykangkico@gmail.com\"}','127.0.0.1','2026-04-26 21:28:15'),(56,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Orders',NULL,'KielSuperadmin visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-26 21:28:17'),(57,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Orders','ORD-38883857048',15,'Processed order ORD-38883857048','{}','127.0.0.1','2026-04-26 21:28:19'),(58,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Food Library',NULL,'KielSuperadmin visited Food Library','{\"page\": \"Food Library\"}','127.0.0.1','2026-04-26 21:28:32'),(59,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Inventory',NULL,'KielSuperadmin visited Inventory','{\"page\": \"Inventory\"}','127.0.0.1','2026-04-26 21:28:33'),(60,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Transactions',NULL,'KielSuperadmin visited Transactions','{\"page\": \"Transactions\"}','127.0.0.1','2026-04-26 21:29:00'),(61,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Exercise Library',NULL,'KielSuperadmin visited Exercise Library','{\"page\": \"Exercise Library\"}','127.0.0.1','2026-04-26 21:30:27'),(62,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Inventory',NULL,'KielSuperadmin visited Inventory','{\"page\": \"Inventory\"}','127.0.0.1','2026-04-26 21:30:30'),(63,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','prepaidowner@gmail.com',17,'prepaidowner logged in successfully','{\"role\": \"admin\", \"email\": \"prepaidowner@gmail.com\"}','127.0.0.1','2026-04-26 21:31:24'),(64,17,'prepaidowner','admin',17,'PAGE_VISIT','Navigation','My Orders',NULL,'prepaidowner visited My Orders','{\"page\": \"My Orders\"}','127.0.0.1','2026-04-26 21:31:26'),(65,17,'prepaidowner','admin',17,'CREATE','Orders','ORD-39093909833',16,'Created package_order order ORD-39093909833 for package \"Admin RFID Module\"','{\"notes\": null, \"admin_id\": 17, \"package_id\": 5}','127.0.0.1','2026-04-26 21:31:33'),(66,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Orders',NULL,'KielSuperadmin visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-26 21:31:49'),(67,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Orders','ORD-38883857048',15,'Completed order ORD-38883857048 with payment','{\"payment_method\": \"cash\", \"reference_number\": \"\"}','127.0.0.1','2026-04-26 21:31:57'),(68,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Transactions',NULL,'KielSuperadmin visited Transactions','{\"page\": \"Transactions\"}','127.0.0.1','2026-04-26 21:32:02'),(69,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Inventory',NULL,'KielSuperadmin visited Inventory','{\"page\": \"Inventory\"}','127.0.0.1','2026-04-26 21:32:06'),(70,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Orders',NULL,'KielSuperadmin visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-26 21:32:14'),(71,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Orders','ORD-39093909833',16,'Processed order ORD-39093909833','{}','127.0.0.1','2026-04-26 21:32:21'),(72,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Orders','ORD-39093909833',16,'Completed order ORD-39093909833 with payment','{\"payment_method\": \"cash\", \"reference_number\": \"\"}','127.0.0.1','2026-04-26 21:32:31'),(73,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Inventory',NULL,'KielSuperadmin visited Inventory','{\"page\": \"Inventory\"}','127.0.0.1','2026-04-26 21:32:33'),(74,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Inventory','Admin Casing',13,'Edited inventory item Admin Casing','{\"name\": \"Admin Casing\", \"quantity\": \"1\", \"selling_price\": \"350.00\", \"purchase_price\": \"250.00\"}','127.0.0.1','2026-04-26 21:33:29'),(75,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Inventory','Access Control Casing',14,'Edited inventory item Access Control Casing','{\"name\": \"Access Control Casing\", \"quantity\": \"1\", \"selling_price\": \"1400.00\", \"purchase_price\": \"1000.00\"}','127.0.0.1','2026-04-26 21:33:33'),(76,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Inventory','Emergency Button',12,'Edited inventory item Emergency Button','{\"name\": \"Emergency Button\", \"quantity\": \"1\", \"selling_price\": \"100.00\", \"purchase_price\": \"70.00\"}','127.0.0.1','2026-04-26 21:33:37'),(77,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Inventory','Power Supply',11,'Edited inventory item Power Supply','{\"name\": \"Power Supply\", \"quantity\": \"1\", \"selling_price\": \"280.00\", \"purchase_price\": \"200.00\"}','127.0.0.1','2026-04-26 21:33:40'),(78,17,'prepaidowner','admin',NULL,'CREATE','Orders','ORD-39230037223',17,'Created package_order order ORD-39230037223 for package \"Access Control Box\"','{\"notes\": null, \"admin_id\": 17, \"package_id\": 9}','127.0.0.1','2026-04-26 21:33:50'),(79,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Orders',NULL,'KielSuperadmin visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-26 21:33:52'),(80,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Orders','ORD-39230037223',17,'Processed order ORD-39230037223','{}','127.0.0.1','2026-04-26 21:33:54'),(81,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Orders','ORD-39230037223',17,'Completed order ORD-39230037223 with payment','{\"payment_method\": \"cash\", \"reference_number\": \"\"}','127.0.0.1','2026-04-26 21:33:56'),(82,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Transactions',NULL,'KielSuperadmin visited Transactions','{\"page\": \"Transactions\"}','127.0.0.1','2026-04-26 21:33:59'),(83,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Pricing Management',NULL,'KielSuperadmin visited Pricing Management','{\"page\": \"Pricing Management\"}','127.0.0.1','2026-04-26 21:35:09'),(84,3,'KielSuperadmin','superadmin',NULL,'CREATE','Packages','Monthly',12,'Added package Monthly (subscription)','{\"name\": \"Monthly\", \"items\": [], \"price\": \"2950\", \"package_type\": \"subscription\", \"duration_days\": \"30\"}','127.0.0.1','2026-04-26 21:35:39'),(85,3,'KielSuperadmin','superadmin',NULL,'CREATE','Packages','Yearly',13,'Added package Yearly (subscription)','{\"name\": \"Yearly\", \"items\": [], \"price\": \"16700\", \"package_type\": \"subscription\", \"duration_days\": \"365\"}','127.0.0.1','2026-04-26 21:35:56'),(86,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Partners Management',NULL,'KielSuperadmin visited Partners Management','{\"page\": \"Partners Management\"}','127.0.0.1','2026-04-26 21:45:47'),(87,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Orders',NULL,'KielSuperadmin visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-26 21:45:51'),(88,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Partners Management',NULL,'KielSuperadmin visited Partners Management','{\"page\": \"Partners Management\"}','127.0.0.1','2026-04-26 21:45:51'),(89,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','prepaidowner@gmail.com',17,'prepaidowner logged in successfully','{\"role\": \"admin\", \"email\": \"prepaidowner@gmail.com\"}','127.0.0.1','2026-04-26 21:46:36'),(90,17,'prepaidowner','admin',17,'PAGE_VISIT','Navigation','My Orders',NULL,'prepaidowner visited My Orders','{\"page\": \"My Orders\"}','127.0.0.1','2026-04-26 21:46:39'),(91,17,'prepaidowner','admin',17,'CREATE','Orders','ORD-40015143784',18,'Created renewal order ORD-40015143784 for package \"Monthly\"','{\"notes\": null, \"admin_id\": 17, \"package_id\": 12}','127.0.0.1','2026-04-26 21:46:55'),(92,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Orders',NULL,'Unknown visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-26 21:46:58'),(93,NULL,NULL,NULL,NULL,'UPDATE','Orders','ORD-40015143784',18,'Processed renewal order ORD-40015143784 — subscription extended','{\"payment_method\": \"cash\", \"reference_number\": \"\"}','127.0.0.1','2026-04-26 21:47:02'),(94,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Partners Management',NULL,'Unknown visited Partners Management','{\"page\": \"Partners Management\"}','127.0.0.1','2026-04-26 21:47:04'),(95,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Transactions',NULL,'Unknown visited Transactions','{\"page\": \"Transactions\"}','127.0.0.1','2026-04-26 21:47:09'),(96,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Partners Management',NULL,'Unknown visited Partners Management','{\"page\": \"Partners Management\"}','127.0.0.1','2026-04-26 21:47:23'),(97,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Audit Trails',NULL,'KielSuperadmin visited Audit Trails','{\"page\": \"Audit Trails\"}','127.0.0.1','2026-04-26 21:47:49'),(98,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Orders',NULL,'Unknown visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-26 22:02:37'),(99,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Transactions',NULL,'Unknown visited Transactions','{\"page\": \"Transactions\"}','127.0.0.1','2026-04-26 22:02:38'),(100,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Workout Split Library',NULL,'Unknown visited Workout Split Library','{\"page\": \"Workout Split Library\"}','127.0.0.1','2026-04-26 22:02:39'),(101,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Inventory',NULL,'Unknown visited Inventory','{\"page\": \"Inventory\"}','127.0.0.1','2026-04-26 22:02:41'),(102,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Pricing Management',NULL,'Unknown visited Pricing Management','{\"page\": \"Pricing Management\"}','127.0.0.1','2026-04-26 22:02:42'),(103,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Partners Management',NULL,'Unknown visited Partners Management','{\"page\": \"Partners Management\"}','127.0.0.1','2026-04-26 22:04:09'),(104,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','prepaidowner@gmail.com',17,'prepaidowner logged in successfully','{\"role\": \"admin\", \"email\": \"prepaidowner@gmail.com\"}','127.0.0.1','2026-04-26 22:10:13'),(105,17,'prepaidowner','admin',17,'PAGE_VISIT','Navigation','My Orders',NULL,'prepaidowner visited My Orders','{\"page\": \"My Orders\"}','127.0.0.1','2026-04-26 22:10:14'),(106,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','aerykangkico@gmail.com',3,'KielSuperadmin logged in successfully','{\"role\": \"superadmin\", \"email\": \"aerykangkico@gmail.com\"}','127.0.0.1','2026-04-26 22:11:51'),(107,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Orders',NULL,'KielSuperadmin visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-26 22:11:53'),(108,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Transactions',NULL,'KielSuperadmin visited Transactions','{\"page\": \"Transactions\"}','127.0.0.1','2026-04-26 22:11:56'),(109,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Inventory',NULL,'KielSuperadmin visited Inventory','{\"page\": \"Inventory\"}','127.0.0.1','2026-04-26 22:11:57'),(110,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Pricing Management',NULL,'KielSuperadmin visited Pricing Management','{\"page\": \"Pricing Management\"}','127.0.0.1','2026-04-26 22:11:58'),(111,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Orders',NULL,'KielSuperadmin visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-26 22:12:57'),(112,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Pricing Management',NULL,'Unknown visited Pricing Management','{\"page\": \"Pricing Management\"}','127.0.0.1','2026-04-27 07:01:51'),(113,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Inventory',NULL,'Unknown visited Inventory','{\"page\": \"Inventory\"}','127.0.0.1','2026-04-27 07:02:48'),(114,NULL,NULL,NULL,NULL,'PAGE_VISIT','Navigation','Pricing Management',NULL,'Unknown visited Pricing Management','{\"page\": \"Pricing Management\"}','127.0.0.1','2026-04-27 07:02:52'),(115,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Orders',NULL,'KielSuperadmin visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-27 07:04:44'),(116,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Transactions',NULL,'KielSuperadmin visited Transactions','{\"page\": \"Transactions\"}','127.0.0.1','2026-04-27 07:05:01'),(117,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Pricing Management',NULL,'KielSuperadmin visited Pricing Management','{\"page\": \"Pricing Management\"}','127.0.0.1','2026-04-27 07:05:24'),(118,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Audit Trails',NULL,'KielSuperadmin visited Audit Trails','{\"page\": \"Audit Trails\"}','127.0.0.1','2026-04-27 07:05:24'),(119,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','aerykangkico@gmail.com',NULL,'Failed login attempt for aerykangkico@gmail.com','{\"email\": \"aerykangkico@gmail.com\"}','127.0.0.1','2026-04-27 07:06:10'),(120,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Pricing Management',NULL,'KielSuperadmin visited Pricing Management','{\"page\": \"Pricing Management\"}','127.0.0.1','2026-04-27 07:40:54'),(121,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Exercise Library',NULL,'KielSuperadmin visited Exercise Library','{\"page\": \"Exercise Library\"}','127.0.0.1','2026-04-27 07:55:30'),(122,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Food Library',NULL,'KielSuperadmin visited Food Library','{\"page\": \"Food Library\"}','127.0.0.1','2026-04-27 07:55:54'),(123,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Workout Split Library',NULL,'KielSuperadmin visited Workout Split Library','{\"page\": \"Workout Split Library\"}','127.0.0.1','2026-04-27 07:55:56'),(124,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Orders',NULL,'KielSuperadmin visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-27 07:55:57'),(125,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Partners Management',NULL,'KielSuperadmin visited Partners Management','{\"page\": \"Partners Management\"}','127.0.0.1','2026-04-27 07:55:58'),(126,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','prepaidowner@gmail.com',17,'prepaidowner logged in successfully','{\"role\": \"admin\", \"email\": \"prepaidowner@gmail.com\"}','127.0.0.1','2026-04-27 07:57:47'),(127,17,'prepaidowner','admin',17,'PAGE_VISIT','Navigation','Sales Report',NULL,'prepaidowner visited Sales Report','{\"page\": \"Sales Report\"}','127.0.0.1','2026-04-27 07:58:49'),(128,17,'prepaidowner','admin',17,'PAGE_VISIT','Navigation','My Orders',NULL,'prepaidowner visited My Orders','{\"page\": \"My Orders\"}','127.0.0.1','2026-04-27 07:58:50'),(129,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','aerykangkico@gmail.com',3,'KielSuperadmin logged in successfully','{\"role\": \"superadmin\", \"email\": \"aerykangkico@gmail.com\"}','127.0.0.1','2026-04-27 07:59:24'),(130,17,'prepaidowner','admin',17,'CREATE','Orders','ORD-76776120172',19,'Created renewal order ORD-76776120172 for package \"Monthly\"','{\"notes\": null, \"admin_id\": 17, \"package_id\": 12}','127.0.0.1','2026-04-27 07:59:36'),(131,NULL,NULL,NULL,NULL,'LOGIN_FAILED','Auth','aerykangkico@gmail.com',NULL,'Failed login attempt for aerykangkico@gmail.com','{\"email\": \"aerykangkico@gmail.com\"}','127.0.0.1','2026-04-27 07:59:48'),(132,NULL,NULL,NULL,NULL,'LOGIN_SUCCESS','Auth','aerykangkico@gmail.com',3,'KielSuperadmin logged in successfully','{\"role\": \"superadmin\", \"email\": \"aerykangkico@gmail.com\"}','127.0.0.1','2026-04-27 07:59:51'),(133,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Orders',NULL,'KielSuperadmin visited Orders','{\"page\": \"Orders\"}','127.0.0.1','2026-04-27 08:00:01'),(134,3,'KielSuperadmin','superadmin',NULL,'UPDATE','Orders','ORD-76776120172',19,'Processed renewal order ORD-76776120172 — subscription extended','{\"payment_method\": \"cash\", \"reference_number\": \"\"}','127.0.0.1','2026-04-27 08:00:09'),(135,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Partners Management',NULL,'KielSuperadmin visited Partners Management','{\"page\": \"Partners Management\"}','127.0.0.1','2026-04-27 08:00:13'),(136,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Transactions',NULL,'KielSuperadmin visited Transactions','{\"page\": \"Transactions\"}','127.0.0.1','2026-04-27 08:00:18'),(137,3,'KielSuperadmin','superadmin',NULL,'PAGE_VISIT','Navigation','Audit Trails',NULL,'KielSuperadmin visited Audit Trails','{\"page\": \"Audit Trails\"}','127.0.0.1','2026-04-27 08:00:32'),(138,17,'prepaidowner','admin',NULL,'PAGE_VISIT','Navigation','Dashboard',NULL,'prepaidowner visited Dashboard','{\"page\": \"Dashboard\"}','127.0.0.1','2026-04-27 08:03:01'),(139,17,'prepaidowner','admin',NULL,'PAGE_VISIT','Navigation','My Orders',NULL,'prepaidowner visited My Orders','{\"page\": \"My Orders\"}','127.0.0.1','2026-04-27 08:03:02'),(140,17,'prepaidowner','admin',NULL,'PAGE_VISIT','Navigation','My Orders',NULL,'prepaidowner visited My Orders','{\"page\": \"My Orders\"}','127.0.0.1','2026-04-27 08:03:04'),(141,17,'prepaidowner','admin',NULL,'PAGE_VISIT','Navigation','RFID Inventory',NULL,'prepaidowner visited RFID Inventory','{\"page\": \"RFID Inventory\"}','127.0.0.1','2026-04-27 08:03:05'),(142,17,'prepaidowner','admin',NULL,'PAGE_VISIT','Navigation','Activity Analytics',NULL,'prepaidowner visited Activity Analytics','{\"page\": \"Activity Analytics\"}','127.0.0.1','2026-04-27 08:03:06'),(143,17,'prepaidowner','admin',NULL,'PAGE_VISIT','Navigation','Dashboard',NULL,'prepaidowner visited Dashboard','{\"page\": \"Dashboard\"}','127.0.0.1','2026-04-27 08:03:07');
/*!40000 ALTER TABLE `audit_logs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `daypassguests`
--

DROP TABLE IF EXISTS `daypassguests`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `daypassguests` (
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
  `profile_image_url` text,
  `mobile_number` varchar(20) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `renewed_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daypassguests`
--

LOCK TABLES `daypassguests` WRITE;
/*!40000 ALTER TABLE `daypassguests` DISABLE KEYS */;
INSERT INTO `daypassguests` VALUES (1,'Mizzy','male','EDCDA201',4,'prepaid_entry','july',50.00,'2025-07-24 16:57:11','2025-07-24 23:59:59','expired',NULL,NULL,NULL,NULL,NULL),(8,'subscriptiondaypass','male','DayPass1',18,'subscription','subscriptionstaff',160.00,'2026-04-23 23:50:14','2026-04-23 23:59:59','expired',NULL,'https://swiftpasstech.com/uploads/daypass/captured-photo-1776959414953-604672582.jpg','09970821181','subdaypass@gmail.com',NULL),(9,'subdaypass2','male','Daypass3',18,'subscription','subscriptionstaff',160.00,'2026-04-23 23:56:58','2026-04-24 23:59:59','expired',NULL,'/uploads/daypass/captured-photo-1776959818621-835703660.jpg','0992123892','subdaypass2@gmail.com','2026-04-24 00:09:15');
/*!40000 ALTER TABLE `daypassguests` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exerciseassessments`
--

DROP TABLE IF EXISTS `exerciseassessments`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exerciseassessments` (
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
  CONSTRAINT `ExerciseAssessments_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `ExerciseAssessments_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exerciseassessments`
--

LOCK TABLES `exerciseassessments` WRITE;
/*!40000 ALTER TABLE `exerciseassessments` DISABLE KEYS */;
INSERT INTO `exerciseassessments` VALUES (5,8,'Member3',NULL,'beginner',2,'PPL3',NULL,'confirmed','2026-04-23 16:57:16');
/*!40000 ALTER TABLE `exerciseassessments` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exercisedaycompletions`
--

DROP TABLE IF EXISTS `exercisedaycompletions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exercisedaycompletions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `member_id` int NOT NULL,
  `rfid_tag` varchar(50) NOT NULL,
  `split_name` varchar(100) NOT NULL,
  `completion_date` date NOT NULL,
  `completed_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_daily_completion` (`rfid_tag`,`split_name`,`completion_date`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `ExerciseDayCompletions_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exercisedaycompletions`
--

LOCK TABLES `exercisedaycompletions` WRITE;
/*!40000 ALTER TABLE `exercisedaycompletions` DISABLE KEYS */;
/*!40000 ALTER TABLE `exercisedaycompletions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exerciselibrary`
--

DROP TABLE IF EXISTS `exerciselibrary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exerciselibrary` (
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
) ENGINE=InnoDB AUTO_INCREMENT=7 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exerciselibrary`
--

LOCK TABLES `exerciselibrary` WRITE;
/*!40000 ALTER TABLE `exerciselibrary` DISABLE KEYS */;
INSERT INTO `exerciselibrary` VALUES (1,'Dumbbell Bench Press','beginner','Chest','compound','Triceps','Dumbbell','Step 1 set up the bench press','[]','/uploads/exercises/1776957692073-FlatDumbbellBP.gif',1,'2025-07-18 03:13:24'),(2,'T Bar Row','beginner','Back','compound','Traps','Machine','Step in T bar Row','[]','/uploads/exercises/1776957681285-CableSeatedRowVbar.gif',1,'2025-07-18 03:32:11'),(3,'Barbell Squats','beginner','Quads','compound','Hamstrings','Barbell','STEP 1','[]','/uploads/exercises/1776957669217-SumoSquat.gif',1,'2025-07-18 03:48:18'),(4,'Hex Press','beginner','Chest','compound','Tricep','Dumbbell','Lay on the Bench','[]','/uploads/exercises/1776957656488-InclineDumbbellBP.gif',1,'2025-09-07 11:05:58'),(5,'test1','beginner','tricep','compound','bicep','dumbbells','ytr','[]','/uploads/exercises/1776957700592-AlternateBicepsCurl.gif',1,'2025-09-15 13:42:03'),(6,'Lat Pull Down','beginner','Back','compound','','Machine','step 1','[5]','/uploads/exercises/1776957639373-CableLateralPD.gif',1,'2026-03-14 04:50:05');
/*!40000 ALTER TABLE `exerciselibrary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `exercises`
--

DROP TABLE IF EXISTS `exercises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `exercises` (
  `exercise_id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `body_part` varchar(100) NOT NULL,
  `sets` int DEFAULT NULL,
  `reps` varchar(10) DEFAULT NULL,
  `description` text,
  `media_url` varchar(255) DEFAULT NULL,
  PRIMARY KEY (`exercise_id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exercises`
--

LOCK TABLES `exercises` WRITE;
/*!40000 ALTER TABLE `exercises` DISABLE KEYS */;
INSERT INTO `exercises` VALUES (1,'Bench Press','chest',2,'8-12','Barbell bench press for chest strength','http://example.com/bench.jpg'),(2,'Overhead Press','shoulder',2,'8-12','Dumbbell shoulder press','http://example.com/ohp.jpg'),(3,'Tricep Dips','triceps',2,'8-12','Bodyweight tricep dips','http://example.com/dips.jpg'),(4,'Barbell Row','back',2,'8-12','Barbell bent-over row','http://example.com/row.jpg'),(5,'Bicep Curl','biceps',2,'8-12','Dumbbell curls','http://example.com/curl.jpg'),(6,'Squats','quads',2,'8-12','Barbell squats','http://example.com/squats.jpg'),(7,'Hamstring Curl','hamstring',2,'8-12','Machine hamstring curls','http://example.com/hamstring.jpg'),(8,'Calf Raises','calves',2,'8-12','Standing calf raises','http://example.com/calf.jpg'),(9,'Crunches','abs',2,'8-12','Basic crunches','http://example.com/crunch.jpg');
/*!40000 ALTER TABLE `exercises` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `foodallergens`
--

DROP TABLE IF EXISTS `foodallergens`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `foodallergens` (
  `food_id` int NOT NULL,
  `allergen_id` int NOT NULL,
  PRIMARY KEY (`food_id`,`allergen_id`),
  KEY `allergen_id` (`allergen_id`),
  CONSTRAINT `FoodAllergens_ibfk_1` FOREIGN KEY (`food_id`) REFERENCES `foodlibrary` (`id`) ON DELETE CASCADE,
  CONSTRAINT `FoodAllergens_ibfk_2` FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `foodallergens`
--

LOCK TABLES `foodallergens` WRITE;
/*!40000 ALTER TABLE `foodallergens` DISABLE KEYS */;
INSERT INTO `foodallergens` VALUES (6,1),(11,1),(13,1),(2,7),(5,7),(9,7),(10,7),(4,8),(7,8),(8,8),(24,8);
/*!40000 ALTER TABLE `foodallergens` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `fooddatabase`
--

DROP TABLE IF EXISTS `fooddatabase`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `fooddatabase` (
  `id` int NOT NULL AUTO_INCREMENT,
  `food_name` varchar(255) NOT NULL,
  `meal_time` enum('Breakfast','Lunch','Dinner','Snack') NOT NULL,
  `calories` int NOT NULL,
  `protein` int NOT NULL,
  `carbs` int NOT NULL,
  `fats` int NOT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `fooddatabase`
--

LOCK TABLES `fooddatabase` WRITE;
/*!40000 ALTER TABLE `fooddatabase` DISABLE KEYS */;
INSERT INTO `fooddatabase` VALUES (1,'Protein Pancakes with Eggs','Breakfast',550,30,40,20),(2,'Mass Gainer Smoothie','Breakfast',600,40,50,20),(3,'Breakfast Burrito','Breakfast',700,35,45,30),(4,'Steak with Mashed Potatoes','Lunch',800,50,40,30),(5,'Grilled Chicken Pasta','Lunch',750,40,50,25),(6,'Pork Chop with Rice & Veggies','Lunch',850,45,50,35),(7,'Salmon with Brown Rice & Avocado','Dinner',750,40,40,30),(8,'Roast Beef with Sweet Potatoes','Dinner',800,50,30,30),(9,'High-Protein Chicken Alfredo','Dinner',900,50,50,40);
/*!40000 ALTER TABLE `fooddatabase` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `foodgroups`
--

DROP TABLE IF EXISTS `foodgroups`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `foodgroups` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `category` enum('Protein','Carb','Fruit','Vegetable') NOT NULL,
  `is_meat` tinyint(1) DEFAULT '0',
  `is_red_meat` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `foodgroups`
--

LOCK TABLES `foodgroups` WRITE;
/*!40000 ALTER TABLE `foodgroups` DISABLE KEYS */;
INSERT INTO `foodgroups` VALUES (1,'Pork','Protein',0,0),(2,'Beef','Protein',0,0),(3,'Chicken','Protein',0,0),(4,'Eggs','Protein',0,0),(5,'Rice','Carb',0,0),(6,'Bread','Carb',0,0),(7,'Broccoli','Vegetable',0,0),(8,'Cabbage','Vegetable',0,0),(10,'Potato','Carb',0,0),(11,'Mango','Fruit',0,0),(12,'Banana','Fruit',0,0),(16,'Turkey','Protein',1,0);
/*!40000 ALTER TABLE `foodgroups` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `foodlibrary`
--

DROP TABLE IF EXISTS `foodlibrary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `foodlibrary` (
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
  CONSTRAINT `FoodLibrary_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `foodgroups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=26 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `foodlibrary`
--

LOCK TABLES `foodlibrary` WRITE;
/*!40000 ALTER TABLE `foodlibrary` DISABLE KEYS */;
INSERT INTO `foodlibrary` VALUES (1,2,'Bread, white, commercially prepared',100,1130.00,9.43,44.80,3.59,'SuperAdmin','2025-08-25 20:09:53','2025-08-25 20:09:53'),(2,1,'Chicken, ground, with additives, raw',100,138.00,17.90,NULL,7.16,'SuperAdmin','2025-08-25 20:15:11','2025-08-25 20:15:11'),(3,3,'Avocado',100,160.00,2.00,9.00,15.00,'superadmin','2025-08-30 12:44:36','2025-08-30 12:44:36'),(4,4,'Beef,??tenderloin steak, raw',100,149.00,21.10,0.18,6.46,'SuperAdmin','2025-09-01 13:13:39','2025-09-01 13:13:39'),(5,1,'Chicken, drumstick, meat and skin, raw',100,130.00,18.40,-0.48,5.94,'SuperAdmin','2025-09-01 13:25:55','2025-09-01 13:25:55'),(6,1,'Pork, ground, raw',100,233.00,17.80,NULL,17.50,'SuperAdmin','2025-09-03 18:38:28','2025-09-03 18:38:28'),(7,2,'Beef, ground, 80% lean meat / 20% fat, raw',100,248.00,17.50,NULL,19.40,'SuperAdmin','2025-09-03 18:39:35','2025-09-03 18:39:35'),(8,2,'Beef,??tenderloin steak, raw',100,149.00,21.10,0.18,6.46,'SuperAdmin','2025-09-03 18:39:52','2025-09-03 18:39:52'),(9,3,'Chicken, breast, boneless, skinless, raw',100,112.00,22.50,NULL,1.93,'SuperAdmin','2025-09-03 18:40:15','2025-09-03 18:40:15'),(10,3,'Chicken, thigh, boneless, skinless, raw',100,149.00,18.60,NULL,7.92,'SuperAdmin','2025-09-03 18:40:40','2025-09-03 18:40:40'),(11,4,'Eggs, Grade A, Large, egg whole',100,617.00,12.40,0.20,9.96,'SuperAdmin','2025-09-03 18:43:05','2025-09-03 18:43:05'),(12,5,'Rice, white, long grain, unenriched, raw',100,370.00,7.04,80.30,1.03,'SuperAdmin','2025-09-03 18:43:40','2025-09-03 18:43:40'),(13,6,'Bread, whole-wheat, commercially prepared',100,1060.00,12.30,39.20,3.55,'SuperAdmin','2025-09-03 18:44:05','2025-09-03 18:44:05'),(14,7,'Broccoli, raw',100,31.00,2.57,3.80,0.34,'SuperAdmin','2025-09-03 18:51:12','2025-09-03 18:51:12'),(15,8,'Cabbage, green, raw',100,27.90,0.96,6.38,0.23,'SuperAdmin','2025-09-03 18:51:36','2025-09-03 18:51:36'),(17,10,'Potatoes, gold, without skin, raw',100,71.60,1.81,16.00,0.26,'SuperAdmin','2025-09-03 18:54:37','2025-09-03 18:54:37'),(18,11,'Mango, Tommy Atkins, peeled, raw',100,61.60,0.56,15.30,0.57,'SuperAdmin','2025-09-03 18:54:57','2025-09-03 18:54:57'),(19,12,'Bananas, overripe, raw',100,357.00,0.73,18.00,0.22,'SuperAdmin','2025-09-03 18:55:16','2025-09-03 18:55:16'),(23,16,'Turkey, ground, 93% lean/ 7% fat, raw',100,158.00,17.30,NULL,9.59,'SuperAdmin','2025-09-03 19:18:42','2025-09-03 19:18:42'),(24,2,'Beef, top sirloin steak, raw',100,146.00,22.00,0.22,5.71,'SuperAdmin','2025-09-05 06:36:07','2025-09-05 06:36:07'),(25,3,'Chicken, broiler or fryers, breast, skinless, boneless, meat only, cooked, braised',100,695.00,32.10,NULL,3.24,'Unknown','2026-02-10 09:15:45','2026-04-19 15:14:27');
/*!40000 ALTER TABLE `foodlibrary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `initialassessment`
--

DROP TABLE IF EXISTS `initialassessment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `initialassessment` (
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
  CONSTRAINT `InitialAssessment_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `initialassessment`
--

LOCK TABLES `initialassessment` WRITE;
/*!40000 ALTER TABLE `initialassessment` DISABLE KEYS */;
INSERT INTO `initialassessment` VALUES (5,8,'Member3','Kiel Angkico','male',21,161,76,'light','Gain Weight','Get Toned',2291,2575,'Mild','2026-04-23 16:56:38');
/*!40000 ALTER TABLE `initialassessment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `macronutrientbreakdown`
--

DROP TABLE IF EXISTS `macronutrientbreakdown`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `macronutrientbreakdown` (
  `id` int NOT NULL AUTO_INCREMENT,
  `goal_type` varchar(50) NOT NULL,
  `protein_pct` decimal(5,2) NOT NULL,
  `carbs_pct` decimal(5,2) NOT NULL,
  `fats_pct` decimal(5,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `macronutrientbreakdown`
--

LOCK TABLES `macronutrientbreakdown` WRITE;
/*!40000 ALTER TABLE `macronutrientbreakdown` DISABLE KEYS */;
INSERT INTO `macronutrientbreakdown` VALUES (1,'Get Toned',35.00,40.00,25.00,'2025-08-31 09:27:12'),(2,'Build Muscle',40.00,35.00,25.00,'2025-08-31 09:27:12'),(3,'Build Endurance',30.00,50.00,20.00,'2025-08-31 09:27:12');
/*!40000 ALTER TABLE `macronutrientbreakdown` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `mealplans`
--

DROP TABLE IF EXISTS `mealplans`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `mealplans` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(50) NOT NULL,
  `meal_type` varchar(50) NOT NULL,
  `food_name` varchar(255) NOT NULL,
  `calories` int NOT NULL,
  `protein` int NOT NULL,
  `carbs` int NOT NULL,
  `fats` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `rfid_tag` (`rfid_tag`),
  CONSTRAINT `MealPlans_ibfk_1` FOREIGN KEY (`rfid_tag`) REFERENCES `adminmembermealassessment` (`rfid_tag`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `mealplans`
--

LOCK TABLES `mealplans` WRITE;
/*!40000 ALTER TABLE `mealplans` DISABLE KEYS */;
INSERT INTO `mealplans` VALUES (1,'F2CCAA31','Dinner','High-Protein Chicken Alfredo',900,50,50,40,'2025-05-29 00:00:16'),(2,'F2CCAA31','Lunch','Pork Chop with Rice & Veggies',850,45,50,35,'2025-05-29 00:00:16'),(3,'F2CCAA31','Dinner','Roast Beef with Sweet Potatoes',800,50,30,30,'2025-05-29 00:00:16'),(4,'F2CCAA31','Lunch','Steak with Mashed Potatoes',800,50,40,30,'2025-05-29 00:00:16'),(5,'F2CCAA31','Breakfast','Protein Pancakes with Eggs',550,30,40,20,'2025-05-29 00:00:16'),(6,'F2CCAA31','Breakfast','Mass Gainer Smoothie',600,40,50,20,'2025-05-29 00:00:16'),(7,'F2CCAA31','Breakfast','Breakfast Burrito',700,35,45,30,'2025-05-29 00:00:16'),(8,'F2CCAA31','Dinner','Salmon with Brown Rice & Avocado',750,40,40,30,'2025-05-29 00:00:16'),(9,'F2CCAA31','Lunch','Grilled Chicken Pasta',750,40,50,25,'2025-05-29 00:00:16');
/*!40000 ALTER TABLE `mealplans` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `member_registrations`
--

DROP TABLE IF EXISTS `member_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `member_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `registration_number` varchar(20) NOT NULL,
  `full_name` varchar(100) NOT NULL,
  `gender` varchar(20) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `phone_number` varchar(20) DEFAULT NULL,
  `email` varchar(255) NOT NULL,
  `password` varchar(255) DEFAULT NULL,
  `emergency_contact_person` varchar(100) DEFAULT NULL,
  `emergency_contact_number` varchar(20) DEFAULT NULL,
  `emergency_contact_relationship` varchar(50) DEFAULT NULL,
  `admin_id` int NOT NULL,
  `status` enum('pending','approved','rejected') DEFAULT 'pending',
  `created_at` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `registration_number` (`registration_number`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_email` (`email`),
  KEY `idx_status` (`status`)
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `member_registrations`
--

LOCK TABLES `member_registrations` WRITE;
/*!40000 ALTER TABLE `member_registrations` DISABLE KEYS */;
INSERT INTO `member_registrations` VALUES (1,'MEM075410303','subMem','Male',21,'asd','andrea@gmail.com','123','asd','123','asd',13,'pending','2026-04-17 14:07:55'),(2,'MEM317525448','asd','Male',21,'09970821181','aerykangkico@gmail.com','123','asd','123','asd',14,'pending','2026-04-17 14:11:57'),(3,'MEM347711708','prep2','Female',21,'09970821181','angkico@gmail.com','123','asd','123','asd',15,'pending','2026-04-17 14:12:27'),(4,'MEM308310261','mizzy','Male',21,'09970821181','aerykangkico@gmail.com','pass123','Crumel Queen Mirzie B Bautista','09970821181','Mother',12,'pending','2026-04-20 05:31:48');
/*!40000 ALTER TABLE `member_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `membernutritionresult`
--

DROP TABLE IF EXISTS `membernutritionresult`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `membernutritionresult` (
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
  CONSTRAINT `MemberNutritionResult_ibfk_1` FOREIGN KEY (`assessment_id`) REFERENCES `nutritionassessment` (`id`) ON DELETE CASCADE,
  CONSTRAINT `MemberNutritionResult_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `MemberNutritionResult_ibfk_3` FOREIGN KEY (`food_id`) REFERENCES `foodlibrary` (`id`),
  CONSTRAINT `MemberNutritionResult_ibfk_4` FOREIGN KEY (`group_id`) REFERENCES `foodgroups` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `membernutritionresult`
--

LOCK TABLES `membernutritionresult` WRITE;
/*!40000 ALTER TABLE `membernutritionresult` DISABLE KEYS */;
/*!40000 ALTER TABLE `membernutritionresult` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `membersaccounts`
--

DROP TABLE IF EXISTS `membersaccounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `membersaccounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(50) NOT NULL,
  `previous_rfid` varchar(50) DEFAULT NULL,
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
  `lastOtpVerified` datetime DEFAULT NULL,
  `emergency_contact_person` varchar(100) DEFAULT NULL,
  `emergency_contact_number` varchar(20) DEFAULT NULL,
  `emergency_contact_relationship` varchar(50) DEFAULT NULL,
  `replaced_by` varchar(255) DEFAULT NULL,
  `replaced_at` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfid_tag` (`rfid_tag`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `MembersAccounts_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `membersaccounts`
--

LOCK TABLES `membersaccounts` WRITE;
/*!40000 ALTER TABLE `membersaccounts` DISABLE KEYS */;
INSERT INTO `membersaccounts` VALUES (8,'Member3','Member1','subscriptioMember','male',21,'09970821181','Novaliches','kielangkicods@gmail.com','$2b$10$SzC3erkCwRU0A.3yS4k.4.bkdrZnxSPzgO40L0xFOwdK7ScU6apDS','uploads/members/captured-photo.jpg',18,'subscriptionstaff',0.00,0.00,'Monthly',600.00,'2026-04-23','2026-05-23','subscription',1000.00,'active','2026-04-23 15:38:19','2026-04-23 17:07:02','2026-04-24 00:56:19','Mizzy Narciso','09934063602','Wife','subscriptionstaff','2026-04-23 23:48:14');
/*!40000 ALTER TABLE `membersaccounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `membersmeallogs`
--

DROP TABLE IF EXISTS `membersmeallogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `membersmeallogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(50) DEFAULT NULL,
  `meal_id` int DEFAULT NULL,
  `meal_type` varchar(50) DEFAULT NULL,
  `log_date` date DEFAULT NULL,
  `completed` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `membersmeallogs`
--

LOCK TABLES `membersmeallogs` WRITE;
/*!40000 ALTER TABLE `membersmeallogs` DISABLE KEYS */;
INSERT INTO `membersmeallogs` VALUES (1,'F2CCAA31',1,'Dinner','2025-05-29',1),(2,'F2CCAA31',2,'Lunch','2025-05-29',1),(3,'F2CCAA31',5,'Breakfast','2025-05-29',1);
/*!40000 ALTER TABLE `membersmeallogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `membersworkoutprogress`
--

DROP TABLE IF EXISTS `membersworkoutprogress`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `membersworkoutprogress` (
  `progress_id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(255) NOT NULL,
  `split_id` int NOT NULL,
  `current_day_number` int NOT NULL DEFAULT '1',
  `last_updated` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`progress_id`),
  UNIQUE KEY `rfid_tag` (`rfid_tag`,`split_id`),
  KEY `split_id` (`split_id`),
  CONSTRAINT `MembersWorkoutProgress_ibfk_1` FOREIGN KEY (`split_id`) REFERENCES `workoutsplits` (`split_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `membersworkoutprogress`
--

LOCK TABLES `membersworkoutprogress` WRITE;
/*!40000 ALTER TABLE `membersworkoutprogress` DISABLE KEYS */;
/*!40000 ALTER TABLE `membersworkoutprogress` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `membersworkoutsessionlogs`
--

DROP TABLE IF EXISTS `membersworkoutsessionlogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `membersworkoutsessionlogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(50) DEFAULT NULL,
  `exercise_id` int DEFAULT NULL,
  `set_number` int DEFAULT NULL,
  `weight` decimal(5,2) DEFAULT NULL,
  `reps` int DEFAULT NULL,
  `session_date` date DEFAULT NULL,
  `completed` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `membersworkoutsessionlogs`
--

LOCK TABLES `membersworkoutsessionlogs` WRITE;
/*!40000 ALTER TABLE `membersworkoutsessionlogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `membersworkoutsessionlogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `nutritionassessment`
--

DROP TABLE IF EXISTS `nutritionassessment`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `nutritionassessment` (
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
  CONSTRAINT `NutritionAssessment_ibfk_1` FOREIGN KEY (`macro_breakdown_id`) REFERENCES `macronutrientbreakdown` (`id`),
  CONSTRAINT `NutritionAssessment_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nutritionassessment`
--

LOCK TABLES `nutritionassessment` WRITE;
/*!40000 ALTER TABLE `nutritionassessment` DISABLE KEYS */;
/*!40000 ALTER TABLE `nutritionassessment` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `packageitems`
--

DROP TABLE IF EXISTS `packageitems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `packageitems` (
  `id` int NOT NULL AUTO_INCREMENT,
  `package_id` int NOT NULL,
  `item_name` varchar(255) DEFAULT NULL,
  `quantity` int NOT NULL DEFAULT '1',
  `sub_package_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `package_id` (`package_id`),
  CONSTRAINT `PackageItems_ibfk_1` FOREIGN KEY (`package_id`) REFERENCES `subscriptionpackages` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=70 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `packageitems`
--

LOCK TABLES `packageitems` WRITE;
/*!40000 ALTER TABLE `packageitems` DISABLE KEYS */;
INSERT INTO `packageitems` VALUES (14,1,'RELAY',1,NULL),(15,1,'DOOR',1,NULL),(16,1,'Member - Wristband',1,NULL),(17,1,'Day Pass - KeyFob',1,NULL),(18,1,'Partner/Staff - Card',3,NULL),(37,5,'ESP32 Module',1,NULL),(38,5,'RFID Reader',1,NULL),(39,5,'Active Buzzer',1,NULL),(40,5,'Type C Cable',1,NULL),(41,5,'Wires',1,NULL),(42,5,'Admin Casing',1,NULL),(43,6,'ESP32 Module',1,NULL),(44,6,'Type C Cable',1,NULL),(45,6,'Relay',1,NULL),(46,6,'Wires',1,NULL),(47,6,'Magnetic Lock',1,NULL),(48,6,'Power Supply',1,NULL),(49,7,'ESP32 Module',1,NULL),(50,7,'RFID Reader',1,NULL),(51,7,'Active Buzzer',1,NULL),(52,7,'Type C Cable',1,NULL),(53,7,'Wires',1,NULL),(54,8,'ESP32 Module',1,NULL),(55,8,'RFID Reader',1,NULL),(56,8,'Active Buzzer',1,NULL),(57,8,'Type C Cable',1,NULL),(58,8,'Wires',1,NULL),(59,9,'Access Control Casing',1,NULL),(60,9,'Emergency Button',1,NULL),(61,10,NULL,1,5),(62,10,NULL,1,6),(63,10,NULL,1,7),(64,10,NULL,1,8),(65,10,NULL,1,9),(66,11,NULL,1,10),(67,11,'Partner/Staff - Card',1,NULL),(68,11,'Member - Wristband',1,NULL),(69,11,'Day Pass - KeyFob',1,NULL);
/*!40000 ALTER TABLE `packageitems` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partner_registrations`
--

DROP TABLE IF EXISTS `partner_registrations`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partner_registrations` (
  `id` int NOT NULL AUTO_INCREMENT,
  `registration_number` varchar(50) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `gym_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `admin_name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `address` text CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `system_type` enum('subscription','prepaid_entry') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci NOT NULL,
  `profile_image_url` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT NULL,
  `status` enum('pending','approved','rejected') CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci DEFAULT 'pending',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `approved_at` timestamp NULL DEFAULT NULL,
  `package_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `registration_number` (`registration_number`),
  KEY `idx_registration_number` (`registration_number`),
  KEY `idx_email` (`email`),
  KEY `idx_status` (`status`),
  KEY `idx_created_at` (`created_at`)
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partner_registrations`
--

LOCK TABLES `partner_registrations` WRITE;
/*!40000 ALTER TABLE `partner_registrations` DISABLE KEYS */;
INSERT INTO `partner_registrations` VALUES (1,'REG623264825','TestRegistration','KIEL','testregistration@gmail.com','123','Dunkin','subscription','/uploads/partners/partner_new_1771931623259.png','pending','2026-02-24 11:13:43',NULL,NULL),(2,'REG697102466','Kings2','123','shopquest06@gmail.com','123','123','subscription','/uploads/partners/partner_new_1774201697090.jpg','pending','2026-03-22 17:48:17',NULL,NULL),(3,'REG141889072','AGAINTESTINGPREPAID','13','akimochi1010@gmail.com','123','123','subscription','/uploads/partners/partner_new_1774203141881.png','pending','2026-03-22 18:12:21',NULL,NULL),(4,'REG114912460','test4','test','test@gmail.com','123','test','subscription','/uploads/partners/partner_new_1775714114868.png','pending','2026-04-09 05:55:14',NULL,NULL);
/*!40000 ALTER TABLE `partner_registrations` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partnerorderitems`
--

DROP TABLE IF EXISTS `partnerorderitems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partnerorderitems` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_id` int NOT NULL,
  `item_name` varchar(100) NOT NULL,
  `item_type` enum('partner_rfid','member_rfid','daypass_rfid','other') DEFAULT 'other',
  `quantity` int NOT NULL,
  `unit_price` decimal(10,2) NOT NULL,
  `subtotal` decimal(10,2) NOT NULL,
  `allocated_quantity` int DEFAULT '0',
  `status` enum('pending','partially_allocated','fully_allocated') DEFAULT 'pending',
  PRIMARY KEY (`id`),
  KEY `order_id` (`order_id`),
  CONSTRAINT `PartnerOrderItems_ibfk_1` FOREIGN KEY (`order_id`) REFERENCES `partnerorders` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=67 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partnerorderitems`
--

LOCK TABLES `partnerorderitems` WRITE;
/*!40000 ALTER TABLE `partnerorderitems` DISABLE KEYS */;
INSERT INTO `partnerorderitems` VALUES (43,11,'RELAY','other',1,50.00,50.00,0,'pending'),(44,11,'DOOR','other',1,10.00,10.00,0,'pending'),(45,11,'Member - Wristband','member_rfid',1,50.00,50.00,1,'fully_allocated'),(46,11,'Day Pass - KeyFob','daypass_rfid',1,50.00,50.00,1,'fully_allocated'),(47,11,'Partner/Staff - Card','partner_rfid',3,50.00,150.00,3,'fully_allocated'),(48,12,'RELAY','other',1,50.00,50.00,1,'fully_allocated'),(49,12,'DOOR','other',1,10.00,10.00,0,'pending'),(50,12,'Member - Wristband','member_rfid',1,50.00,50.00,1,'fully_allocated'),(51,12,'Day Pass - KeyFob','daypass_rfid',1,50.00,50.00,1,'fully_allocated'),(52,12,'Partner/Staff - Card','partner_rfid',3,50.00,150.00,3,'fully_allocated'),(53,13,'Day Pass - KeyFob','daypass_rfid',1,50.00,50.00,1,'fully_allocated'),(54,13,'Member - Wristband','member_rfid',1,50.00,50.00,1,'fully_allocated'),(55,14,'Day Pass - KeyFob','daypass_rfid',1,50.00,50.00,1,'fully_allocated'),(56,14,'Member - Wristband','member_rfid',1,50.00,50.00,1,'fully_allocated'),(57,15,'Access Control Casing','other',1,0.00,0.00,0,'pending'),(58,15,'Emergency Button','other',1,0.00,0.00,0,'pending'),(59,16,'ESP32 Module','other',1,0.00,0.00,1,'fully_allocated'),(60,16,'RFID Reader','other',1,0.00,0.00,1,'fully_allocated'),(61,16,'Active Buzzer','other',1,0.00,0.00,1,'fully_allocated'),(62,16,'Type C Cable','other',1,0.00,0.00,1,'fully_allocated'),(63,16,'Wires','other',1,0.00,0.00,1,'fully_allocated'),(64,16,'Admin Casing','other',1,0.00,0.00,0,'pending'),(65,17,'Access Control Casing','other',1,0.00,0.00,1,'fully_allocated'),(66,17,'Emergency Button','other',1,0.00,0.00,1,'fully_allocated');
/*!40000 ALTER TABLE `partnerorderitems` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `partnerorders`
--

DROP TABLE IF EXISTS `partnerorders`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `partnerorders` (
  `id` int NOT NULL AUTO_INCREMENT,
  `order_number` varchar(50) NOT NULL,
  `admin_id` int NOT NULL,
  `order_type` enum('initial_package','reorder','package_order','renewal') DEFAULT 'reorder',
  `order_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `status` enum('pending','processing','delivering','completed','cancelled') DEFAULT 'pending',
  `total_amount` decimal(10,2) NOT NULL,
  `payment_status` enum('paid','unpaid') DEFAULT 'unpaid',
  `notes` text,
  `processed_at` timestamp NULL DEFAULT NULL,
  `shipped_at` timestamp NULL DEFAULT NULL,
  `completed_at` timestamp NULL DEFAULT NULL,
  `cancelled_at` timestamp NULL DEFAULT NULL,
  `package_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `order_number` (`order_number`),
  KEY `admin_id` (`admin_id`),
  CONSTRAINT `PartnerOrders_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=20 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `partnerorders`
--

LOCK TABLES `partnerorders` WRITE;
/*!40000 ALTER TABLE `partnerorders` DISABLE KEYS */;
INSERT INTO `partnerorders` VALUES (11,'ORD-95315362540',17,'initial_package','2026-04-20 14:28:35','completed',310.00,'paid',NULL,'2026-04-20 14:31:06',NULL,'2026-04-20 14:31:07',NULL,NULL),(12,'ORD-95441121163',18,'initial_package','2026-04-20 14:30:41','completed',310.00,'paid',NULL,'2026-04-20 14:31:05',NULL,'2026-04-20 14:31:09',NULL,NULL),(13,'ORD-95515413462',17,'reorder','2026-04-20 14:31:55','completed',100.00,'paid',NULL,'2026-04-20 14:32:40',NULL,'2026-04-20 14:34:35',NULL,NULL),(14,'ORD-95532672730',18,'reorder','2026-04-20 14:32:12','completed',100.00,'paid',NULL,'2026-04-20 14:32:33',NULL,'2026-04-20 14:34:37',NULL,NULL),(15,'ORD-38883857048',17,'package_order','2026-04-26 21:28:03','completed',1070.00,'paid',NULL,'2026-04-26 21:28:19',NULL,'2026-04-26 21:31:57',NULL,9),(16,'ORD-39093909833',17,'package_order','2026-04-26 21:31:33','completed',920.00,'paid',NULL,'2026-04-26 21:32:21',NULL,'2026-04-26 21:32:31',NULL,5),(17,'ORD-39230037223',17,'package_order','2026-04-26 21:33:50','completed',1070.00,'paid',NULL,'2026-04-26 21:33:54',NULL,'2026-04-26 21:33:56',NULL,9),(18,'ORD-40015143784',17,'renewal','2026-04-26 21:46:55','completed',2950.00,'paid',NULL,'2026-04-26 21:47:02',NULL,'2026-04-26 21:47:02',NULL,12),(19,'ORD-76776120172',17,'renewal','2026-04-27 07:59:36','completed',2950.00,'paid',NULL,'2026-04-27 08:00:09',NULL,'2026-04-27 08:00:09',NULL,12);
/*!40000 ALTER TABLE `partnerorders` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `registeredrfid`
--

DROP TABLE IF EXISTS `registeredrfid`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `registeredrfid` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(255) NOT NULL,
  `warehouse_number` varchar(20) DEFAULT NULL,
  `rfid_type` varchar(50) DEFAULT NULL,
  `role` varchar(50) DEFAULT NULL,
  `status` varchar(50) DEFAULT 'in_stock',
  `allocated_to_admin` int DEFAULT NULL,
  `assigned_to_id` int DEFAULT NULL,
  `assigned_to_name` varchar(255) DEFAULT NULL,
  `assignment_date` datetime DEFAULT NULL,
  `assigned_to_type` enum('Admin','Staff','Member','DayPass') DEFAULT NULL,
  `customer_number` int DEFAULT NULL,
  `customer_number_display` varchar(30) DEFAULT NULL,
  `order_id` int DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `allocation_date` datetime DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `idx_warehouse_number` (`warehouse_number`),
  KEY `idx_customer_allocation` (`allocated_to_admin`,`role`,`customer_number`),
  KEY `idx_assignment` (`assigned_to_id`,`assigned_to_type`),
  KEY `idx_assigned_to` (`assigned_to_id`,`role`)
) ENGINE=InnoDB AUTO_INCREMENT=31 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registeredrfid`
--

LOCK TABLES `registeredrfid` WRITE;
/*!40000 ALTER TABLE `registeredrfid` DISABLE KEYS */;
INSERT INTO `registeredrfid` VALUES (1,'Partner1','PARTNER-0001','card','Partner','in_use',18,9,'subscriptionstaff','2026-04-20 22:35:41','Staff',NULL,NULL,12,'2026-04-20 14:08:57','2026-04-20 22:31:05'),(2,'Partner2','PARTNER-0002','card','Partner','allocated',18,NULL,NULL,NULL,NULL,NULL,NULL,12,'2026-04-20 14:08:57','2026-04-20 22:31:05'),(3,'Partner3','PARTNER-0003','card','Partner','allocated',18,NULL,NULL,NULL,NULL,NULL,NULL,12,'2026-04-20 14:08:57','2026-04-20 22:31:05'),(4,'Partner4','PARTNER-0004','card','Partner','in_use',17,10,'prepaidstaff','2026-04-20 22:36:49','Staff',NULL,NULL,11,'2026-04-20 14:08:57','2026-04-20 22:31:06'),(5,'Partner5','PARTNER-0005','card','Partner','allocated',17,NULL,NULL,NULL,NULL,NULL,NULL,11,'2026-04-20 14:08:57','2026-04-20 22:31:06'),(6,'Partner6','PARTNER-0006','card','Partner','allocated',17,NULL,NULL,NULL,NULL,NULL,NULL,11,'2026-04-20 14:08:57','2026-04-20 22:31:06'),(7,'Partner7','PARTNER-0007','card','Partner','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(8,'Partner8','PARTNER-0008','card','Partner','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(9,'Partner9','PARTNER-0009','card','Partner','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(10,'Partner10','PARTNER-0010','card','Partner','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(11,'DayPass1','DAYPASS-0001','key_fob','DayPass','in_use',18,8,'subscriptiondaypass','2026-04-23 23:50:14','DayPass',NULL,NULL,12,'2026-04-20 14:08:57','2026-04-20 22:31:05'),(12,'DayPass2','DAYPASS-0002','key_fob','DayPass','allocated',17,NULL,NULL,NULL,NULL,NULL,NULL,11,'2026-04-20 14:08:57','2026-04-20 22:31:06'),(13,'DayPass3','DAYPASS-0003','key_fob','DayPass','in_use',18,9,'subdaypass2','2026-04-23 23:56:58','DayPass',NULL,NULL,14,'2026-04-20 14:08:57','2026-04-20 22:32:33'),(14,'DayPass4','DAYPASS-0004','key_fob','DayPass','in_use',17,NULL,NULL,NULL,NULL,NULL,NULL,13,'2026-04-20 14:08:57','2026-04-20 22:32:40'),(15,'DayPass5','DAYPASS-0005','key_fob','DayPass','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(16,'DayPass6','DAYPASS-0006','key_fob','DayPass','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(17,'DayPass7','DAYPASS-0007','key_fob','DayPass','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(18,'DayPass8','DAYPASS-0008','key_fob','DayPass','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(19,'DayPass9','DAYPASS-0009','key_fob','DayPass','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(20,'DayPass10','DAYPASS-0010','key_fob','DayPass','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(21,'Member1','MEMBER-0001','wristband','Member','in_use',18,8,'subscriptioMember','2026-04-23 23:38:19','Member',NULL,NULL,12,'2026-04-20 14:08:57','2026-04-20 22:31:05'),(22,'Member2','MEMBER-0002','wristband','Member','allocated',17,NULL,NULL,NULL,NULL,NULL,NULL,11,'2026-04-20 14:08:57','2026-04-20 22:31:06'),(23,'Member3','MEMBER-0003','wristband','Member','in_use',18,NULL,NULL,NULL,NULL,NULL,NULL,14,'2026-04-20 14:08:57','2026-04-20 22:32:33'),(24,'Member4','MEMBER-0004','wristband','Member','in_use',17,NULL,NULL,NULL,NULL,NULL,NULL,13,'2026-04-20 14:08:57','2026-04-20 22:32:40'),(25,'Member5','MEMBER-0005','wristband','Member','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(26,'Member6','MEMBER-0006','wristband','Member','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(27,'Member7','MEMBER-0007','wristband','Member','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(28,'Member8','MEMBER-0008','wristband','Member','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(29,'Member9','MEMBER-0009','wristband','Member','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL),(30,'Member10','MEMBER-0010','wristband','Member','in_stock',NULL,NULL,NULL,NULL,NULL,NULL,NULL,NULL,'2026-04-20 14:08:57',NULL);
/*!40000 ALTER TABLE `registeredrfid` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `repranges`
--

DROP TABLE IF EXISTS `repranges`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `repranges` (
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
-- Dumping data for table `repranges`
--

LOCK TABLES `repranges` WRITE;
/*!40000 ALTER TABLE `repranges` DISABLE KEYS */;
/*!40000 ALTER TABLE `repranges` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `sessions`
--

DROP TABLE IF EXISTS `sessions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int unsigned NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin,
  PRIMARY KEY (`session_id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `sessions`
--

LOCK TABLES `sessions` WRITE;
/*!40000 ALTER TABLE `sessions` DISABLE KEYS */;
INSERT INTO `sessions` VALUES ('k31EAc3SeY9cPm_jJaMqbx8304_SvmBz',1757586006,'{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-09-11T10:20:05.554Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"userId\":8,\"role\":\"staff\",\"systemType\":\"prepaid_entry\",\"adminId\":1,\"name\":\"kiel\"}');
/*!40000 ALTER TABLE `sessions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `splitdayexercises`
--

DROP TABLE IF EXISTS `splitdayexercises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `splitdayexercises` (
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
  CONSTRAINT `SplitDayExercises_ibfk_1` FOREIGN KEY (`split_day_id`) REFERENCES `splitdays` (`id`) ON DELETE CASCADE,
  CONSTRAINT `SplitDayExercises_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `exerciselibrary` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `splitdayexercises`
--

LOCK TABLES `splitdayexercises` WRITE;
/*!40000 ALTER TABLE `splitdayexercises` DISABLE KEYS */;
INSERT INTO `splitdayexercises` VALUES (1,1,3,0,3,'8-12','60',''),(2,1,2,0,3,'8-12','60',''),(3,1,1,0,3,'8-12','60',''),(4,2,5,0,3,'8-12','60',''),(5,2,4,0,3,'8-12','60',''),(10,5,6,0,3,'8-12','60',''),(27,20,6,0,3,'8-12','60',''),(28,20,5,0,3,'8-12','60',''),(29,21,6,0,3,'8-12','60','');
/*!40000 ALTER TABLE `splitdayexercises` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `splitdays`
--

DROP TABLE IF EXISTS `splitdays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `splitdays` (
  `id` int NOT NULL AUTO_INCREMENT,
  `split_id` int NOT NULL,
  `day_number` int NOT NULL,
  `day_title` varchar(100) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `split_id` (`split_id`),
  CONSTRAINT `SplitDays_ibfk_1` FOREIGN KEY (`split_id`) REFERENCES `splitlibrary` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `splitdays`
--

LOCK TABLES `splitdays` WRITE;
/*!40000 ALTER TABLE `splitdays` DISABLE KEYS */;
INSERT INTO `splitdays` VALUES (1,1,1,'Day 1','2025-09-07 02:48:37'),(2,2,1,'Day 1','2026-02-10 09:15:09'),(5,3,1,'Day 1','2026-04-19 15:44:38'),(20,4,1,'Day 1','2026-04-19 16:04:49'),(21,4,2,'Day 2','2026-04-19 16:04:49');
/*!40000 ALTER TABLE `splitdays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `splitlibrary`
--

DROP TABLE IF EXISTS `splitlibrary`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `splitlibrary` (
  `id` int NOT NULL AUTO_INCREMENT,
  `split_name` varchar(50) NOT NULL,
  `workout_days` int NOT NULL,
  `target_gender` enum('male','female','unisex') DEFAULT 'unisex',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=5 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `splitlibrary`
--

LOCK TABLES `splitlibrary` WRITE;
/*!40000 ALTER TABLE `splitlibrary` DISABLE KEYS */;
INSERT INTO `splitlibrary` VALUES (1,'ppl',1,'unisex','2025-09-07 02:48:37'),(2,'UPPER / LOWER / FULLBODY',1,'male','2026-02-10 09:15:09'),(3,'UPPER / LOWER',2,'male','2026-03-14 04:50:41'),(4,'PPL3',2,'male','2026-04-19 15:45:38');
/*!40000 ALTER TABLE `splitlibrary` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staffaccounts`
--

DROP TABLE IF EXISTS `staffaccounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staffaccounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int DEFAULT NULL,
  `staff_name` varchar(100) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `contact_number` varchar(15) DEFAULT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `profile_image_url` text,
  `status` enum('active','inactive','archived','disabled') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `rfid_tag` varchar(50) DEFAULT NULL,
  `rfid_type` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_admin` (`admin_id`),
  CONSTRAINT `fk_admin` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `StaffAccounts_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staffaccounts`
--

LOCK TABLES `staffaccounts` WRITE;
/*!40000 ALTER TABLE `staffaccounts` DISABLE KEYS */;
INSERT INTO `staffaccounts` VALUES (9,18,'subscriptionstaff',21,'09970821181','NOVA','subscriptionstaff@gmail.com','$2b$10$9M2sGyiXcrWrexU7PTrFHu.luGXCXsqZgu5LiDgnG3GjIG6lNlWF6','staff_new_1776695741650.jpg','active','2026-04-20 14:35:41','partner1',NULL),(10,17,'prepaidstafff',21,'09970821181','tsora','prepaidstaff@gmail.com','$2b$10$l4178Al2XpG9P4Rd8KpEuO4KlSSXNLUgtnMBXlWyq2tljlWSp92Li','staff_new_1776695809682.jpg','active','2026-04-20 14:36:49','partner4',NULL);
/*!40000 ALTER TABLE `staffaccounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staffaccounts_archived`
--

DROP TABLE IF EXISTS `staffaccounts_archived`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staffaccounts_archived` (
  `id` int NOT NULL,
  `admin_id` int DEFAULT NULL,
  `staff_name` varchar(100) DEFAULT NULL,
  `age` int DEFAULT NULL,
  `contact_number` varchar(15) DEFAULT NULL,
  `address` varchar(255) NOT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `status` enum('active','inactive','archived') DEFAULT 'archived',
  `created_at` timestamp NULL DEFAULT NULL,
  `archived_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `profile_image_url` text,
  `rfid_tag` varchar(50) DEFAULT NULL,
  `rfid_type` varchar(20) DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staffaccounts_archived`
--

LOCK TABLES `staffaccounts_archived` WRITE;
/*!40000 ALTER TABLE `staffaccounts_archived` DISABLE KEYS */;
INSERT INTO `staffaccounts_archived` VALUES (2,1,'try',21,'21','tes','tryy@gmail.com','$2b$10$YiNzcoSA7wNltLgNTMSp..LK8WNXxYPkCEh8LMmW7//VoDNRFEloK','inactive','2025-05-14 17:32:42','2025-05-15 01:54:19',NULL,NULL,NULL);
/*!40000 ALTER TABLE `staffaccounts_archived` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staffactivitylogs`
--

DROP TABLE IF EXISTS `staffactivitylogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staffactivitylogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(50) DEFAULT NULL,
  `staff_id` int DEFAULT NULL,
  `staff_name` varchar(100) DEFAULT NULL,
  `admin_id` int DEFAULT NULL,
  `location` varchar(50) DEFAULT NULL,
  `activity_type` varchar(50) DEFAULT NULL,
  `timestamp` datetime DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_admin_id` (`admin_id`),
  KEY `idx_rfid_tag` (`rfid_tag`),
  KEY `idx_timestamp` (`timestamp`)
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staffactivitylogs`
--

LOCK TABLES `staffactivitylogs` WRITE;
/*!40000 ALTER TABLE `staffactivitylogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `staffactivitylogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `staffsessionlogs`
--

DROP TABLE IF EXISTS `staffsessionlogs`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `staffsessionlogs` (
  `id` int NOT NULL AUTO_INCREMENT,
  `staff_id` int NOT NULL,
  `staff_name` varchar(255) NOT NULL,
  `admin_id` int NOT NULL,
  `system_type` varchar(50) NOT NULL,
  `status` enum('online','offline') DEFAULT 'online',
  `login_time` datetime DEFAULT CURRENT_TIMESTAMP,
  `logout_time` datetime DEFAULT NULL,
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=34 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staffsessionlogs`
--

LOCK TABLES `staffsessionlogs` WRITE;
/*!40000 ALTER TABLE `staffsessionlogs` DISABLE KEYS */;
/*!40000 ALTER TABLE `staffsessionlogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `subscriptionpackages`
--

DROP TABLE IF EXISTS `subscriptionpackages`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `subscriptionpackages` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(100) NOT NULL,
  `description` text,
  `price` decimal(10,2) NOT NULL,
  `duration_days` int NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `package_type` varchar(50) NOT NULL DEFAULT 'subscription',
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=14 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `subscriptionpackages`
--

LOCK TABLES `subscriptionpackages` WRITE;
/*!40000 ALTER TABLE `subscriptionpackages` DISABLE KEYS */;
INSERT INTO `subscriptionpackages` VALUES (1,'Package 1',NULL,50000.00,360,'2026-02-24 09:21:07','subscription'),(5,'Admin RFID Module',NULL,920.00,0,'2026-04-26 20:48:37','hardware_module'),(6,'Magnetic Lock Controller',NULL,1800.00,0,'2026-04-26 21:05:54','hardware_module'),(7,'Entry Module',NULL,670.00,0,'2026-04-26 21:06:47','hardware_module'),(8,'Exit Module',NULL,670.00,0,'2026-04-26 21:07:14','hardware_module'),(9,'Access Control Box',NULL,1070.00,0,'2026-04-26 21:08:23','hardware_module'),(10,'Hardware Components',NULL,7189.00,0,'2026-04-26 21:09:36','hardware_module'),(11,'Onboarding Package',NULL,34999.00,365,'2026-04-26 21:11:03','onboarding'),(12,'Monthly',NULL,2950.00,30,'2026-04-26 21:35:39','subscription'),(13,'Yearly',NULL,16700.00,365,'2026-04-26 21:35:56','subscription');
/*!40000 ALTER TABLE `subscriptionpackages` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `superadminaccounts`
--

DROP TABLE IF EXISTS `superadminaccounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `superadminaccounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `rfid_tag` varchar(100) DEFAULT NULL,
  `superadmin_name` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  UNIQUE KEY `rfid_tag` (`rfid_tag`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `superadminaccounts`
--

LOCK TABLES `superadminaccounts` WRITE;
/*!40000 ALTER TABLE `superadminaccounts` DISABLE KEYS */;
INSERT INTO `superadminaccounts` VALUES (1,NULL,'SuperAdmin','SuperAdmin@gmail.com','$2b$10$tnp5Gv/hKR52a7wv1ktGz.WP80Vs57YXlmgwbHx/kytlvpRrfXl0m','2025-05-12 18:19:45'),(2,NULL,'Mizzy','serenemixxy@gmail.com','$2b$10$Ne.LRXUr9fManNwVPV6Zx.8d0/vqBkIF4xXpU3UFHI6/nOVfnT/l6','2025-09-08 11:22:09'),(3,'148DC2B9','KielSuperadmin','aerykangkico@gmail.com','$2b$10$d4ciNoWclxRiKfx7/ViJbuui1WAfsFzWbiclukbl6RfGf2lmdEBMa','2025-09-13 18:37:58');
/*!40000 ALTER TABLE `superadminaccounts` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `superadmininventory`
--

DROP TABLE IF EXISTS `superadmininventory`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `superadmininventory` (
  `id` int NOT NULL AUTO_INCREMENT,
  `name` varchar(255) NOT NULL,
  `purchase_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `selling_price` decimal(10,2) NOT NULL DEFAULT '0.00',
  `type` varchar(100) DEFAULT NULL,
  `quantity` int DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  `is_deletable` tinyint(1) DEFAULT '1',
  `item_category` varchar(50) NOT NULL DEFAULT 'general',
  `is_internal` tinyint(1) NOT NULL DEFAULT '0',
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_name` (`name`),
  CONSTRAINT `SuperAdminInventory_chk_1` CHECK ((`quantity` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=15 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `superadmininventory`
--

LOCK TABLES `superadmininventory` WRITE;
/*!40000 ALTER TABLE `superadmininventory` DISABLE KEYS */;
INSERT INTO `superadmininventory` VALUES (1,'Partner/Staff - Card',10.00,50.00,NULL,0,'2026-04-26 20:13:32','2026-04-26 20:13:32',0,'rfid',0),(2,'Member - Wristband',10.00,50.00,NULL,0,'2026-04-26 20:13:32','2026-04-26 20:13:32',0,'rfid',0),(3,'Day Pass - KeyFob',10.00,50.00,NULL,0,'2026-04-26 20:13:32','2026-04-26 20:13:32',0,'rfid',0),(4,'ESP32 Module',350.00,500.00,NULL,4,'2026-04-26 20:13:32','2026-04-26 21:32:21',1,'hardware',0),(5,'RFID Reader',90.00,130.00,NULL,4,'2026-04-26 20:13:32','2026-04-26 21:32:21',1,'hardware',0),(6,'Active Buzzer',30.00,45.00,NULL,0,'2026-04-26 20:13:32','2026-04-26 21:32:21',1,'hardware',0),(7,'Type C Cable',150.00,210.00,NULL,4,'2026-04-26 20:13:32','2026-04-26 21:32:21',1,'hardware',0),(8,'Wires',20.00,50.00,NULL,9,'2026-04-26 20:13:32','2026-04-26 21:32:21',1,'hardware',1),(9,'Relay',50.00,70.00,NULL,5,'2026-04-26 20:13:32','2026-04-26 21:11:50',1,'hardware',0),(10,'Magnetic Lock',1000.00,1400.00,NULL,2,'2026-04-26 20:13:32','2026-04-26 21:11:40',1,'hardware',0),(11,'Power Supply',200.00,280.00,NULL,1,'2026-04-26 20:13:32','2026-04-26 21:33:40',1,'hardware',0),(12,'Emergency Button',70.00,100.00,NULL,0,'2026-04-26 20:13:32','2026-04-26 21:33:54',1,'hardware',0),(13,'Admin Casing',250.00,350.00,NULL,1,'2026-04-26 20:13:32','2026-04-26 21:33:29',1,'hardware',0),(14,'Access Control Casing',1000.00,1400.00,NULL,0,'2026-04-26 20:13:32','2026-04-26 21:33:54',1,'hardware',0);
/*!40000 ALTER TABLE `superadmininventory` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `superadminpaymentoptions`
--

DROP TABLE IF EXISTS `superadminpaymentoptions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `superadminpaymentoptions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `payment_method` varchar(100) NOT NULL,
  `account_name` varchar(255) DEFAULT NULL,
  `account_number` varchar(100) DEFAULT NULL,
  `is_enabled` tinyint(1) DEFAULT '1',
  `is_default` tinyint(1) DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_payment_method` (`payment_method`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `superadminpaymentoptions`
--

LOCK TABLES `superadminpaymentoptions` WRITE;
/*!40000 ALTER TABLE `superadminpaymentoptions` DISABLE KEYS */;
INSERT INTO `superadminpaymentoptions` VALUES (1,'cash','kiel angkico','09970821181',1,1,'2026-02-27 05:46:51','2026-04-19 13:53:02'),(2,'PayMaya','Aeryk Kiel Angkico','09970821181',1,0,'2026-04-19 13:52:53','2026-04-19 13:52:53');
/*!40000 ALTER TABLE `superadminpaymentoptions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `superadmintransactionitems`
--

DROP TABLE IF EXISTS `superadmintransactionitems`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `superadmintransactionitems` (
  `id` int NOT NULL AUTO_INCREMENT,
  `transaction_id` int NOT NULL,
  `item_name` varchar(150) NOT NULL,
  `quantity` int NOT NULL,
  `unit_price` decimal(15,2) NOT NULL,
  `total_price` decimal(15,2) NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `transaction_id` (`transaction_id`),
  CONSTRAINT `SuperAdminTransactionItems_ibfk_1` FOREIGN KEY (`transaction_id`) REFERENCES `superadmintransactions` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=30 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `superadmintransactionitems`
--

LOCK TABLES `superadmintransactionitems` WRITE;
/*!40000 ALTER TABLE `superadmintransactionitems` DISABLE KEYS */;
INSERT INTO `superadmintransactionitems` VALUES (12,13,'Package 1',1,50000.00,50000.00,'2026-04-20 14:28:35'),(13,14,'Package 1',1,50000.00,50000.00,'2026-04-20 14:30:41'),(14,15,'Day Pass - KeyFob',1,50.00,50.00,'2026-04-20 14:34:35'),(15,15,'Member - Wristband',1,50.00,50.00,'2026-04-20 14:34:35'),(16,16,'Day Pass - KeyFob',1,50.00,50.00,'2026-04-20 14:34:37'),(17,16,'Member - Wristband',1,50.00,50.00,'2026-04-20 14:34:37'),(18,17,'Access Control Casing',1,0.00,0.00,'2026-04-26 21:31:57'),(19,17,'Emergency Button',1,0.00,0.00,'2026-04-26 21:31:57'),(20,18,'ESP32 Module',1,0.00,0.00,'2026-04-26 21:32:31'),(21,18,'RFID Reader',1,0.00,0.00,'2026-04-26 21:32:31'),(22,18,'Active Buzzer',1,0.00,0.00,'2026-04-26 21:32:31'),(23,18,'Type C Cable',1,0.00,0.00,'2026-04-26 21:32:31'),(24,18,'Wires',1,0.00,0.00,'2026-04-26 21:32:31'),(25,18,'Admin Casing',1,0.00,0.00,'2026-04-26 21:32:31'),(26,19,'Access Control Casing',1,0.00,0.00,'2026-04-26 21:33:56'),(27,19,'Emergency Button',1,0.00,0.00,'2026-04-26 21:33:56'),(28,20,'Subscription Renewal',1,2950.00,2950.00,'2026-04-26 21:47:02'),(29,21,'Subscription Renewal',1,2950.00,2950.00,'2026-04-27 08:00:09');
/*!40000 ALTER TABLE `superadmintransactionitems` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `superadmintransactions`
--

DROP TABLE IF EXISTS `superadmintransactions`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `superadmintransactions` (
  `id` int NOT NULL AUTO_INCREMENT,
  `admin_id` int NOT NULL,
  `transaction_type` varchar(100) NOT NULL,
  `amount` decimal(15,2) NOT NULL,
  `payment_method` varchar(50) NOT NULL,
  `reference_number` varchar(100) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `order_id` int DEFAULT NULL,
  PRIMARY KEY (`id`),
  KEY `admin_id` (`admin_id`),
  KEY `idx_order_id` (`order_id`),
  CONSTRAINT `SuperAdminTransactions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=22 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `superadmintransactions`
--

LOCK TABLES `superadmintransactions` WRITE;
/*!40000 ALTER TABLE `superadmintransactions` DISABLE KEYS */;
INSERT INTO `superadmintransactions` VALUES (13,17,'Package Purchase',50000.00,'Cash',NULL,'2026-04-20 14:28:35',NULL),(14,18,'Package Purchase',50000.00,'Cash',NULL,'2026-04-20 14:30:41',NULL),(15,17,'Order Payment',100.00,'cash',NULL,'2026-04-20 14:34:35',13),(16,18,'Order Payment',100.00,'cash',NULL,'2026-04-20 14:34:37',14),(17,17,'Order Payment',1070.00,'cash',NULL,'2026-04-26 21:31:57',15),(18,17,'Order Payment',920.00,'cash',NULL,'2026-04-26 21:32:31',16),(19,17,'Order Payment',1070.00,'cash',NULL,'2026-04-26 21:33:56',17),(20,17,'Renewal Payment',2950.00,'cash',NULL,'2026-04-26 21:47:02',18),(21,17,'Renewal Payment',2950.00,'cash',NULL,'2026-04-27 08:00:09',19);
/*!40000 ALTER TABLE `superadmintransactions` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `trusteddevices`
--

DROP TABLE IF EXISTS `trusteddevices`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `trusteddevices` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `device_id` varchar(255) NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_device` (`user_id`,`device_id`),
  CONSTRAINT `TrustedDevices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trusteddevices`
--

LOCK TABLES `trusteddevices` WRITE;
/*!40000 ALTER TABLE `trusteddevices` DISABLE KEYS */;
INSERT INTO `trusteddevices` VALUES (7,8,'mobile-temp-id','2026-04-25 00:56:19','2026-04-23 16:56:19');
/*!40000 ALTER TABLE `trusteddevices` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `userotp`
--

DROP TABLE IF EXISTS `userotp`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `userotp` (
  `id` int NOT NULL AUTO_INCREMENT,
  `user_id` int NOT NULL,
  `user_type` enum('member','admin','staff','superadmin') NOT NULL,
  `otp` varchar(10) NOT NULL,
  `type` enum('reset_password','verify_email','verify_phone','login','reset') NOT NULL,
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `used` tinyint(1) DEFAULT '0',
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_type_otp` (`user_id`,`user_type`,`type`),
  KEY `idx_user_id` (`user_id`),
  KEY `idx_expires_at` (`expires_at`)
) ENGINE=InnoDB AUTO_INCREMENT=18 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `userotp`
--

LOCK TABLES `userotp` WRITE;
/*!40000 ALTER TABLE `userotp` DISABLE KEYS */;
INSERT INTO `userotp` VALUES (1,4,'member','164075','reset','2026-02-20 05:41:14','2026-02-20 05:31:14',0),(12,4,'member','800034','login','2026-02-20 05:46:31','2026-02-20 05:36:31',0),(13,5,'member','203085','login','2026-03-02 03:12:57','2026-03-02 03:02:57',0),(14,7,'member','237395','login','2026-03-20 07:58:03','2026-03-20 07:48:03',0),(15,8,'member','141483','login','2026-04-24 01:05:54','2026-04-23 16:55:54',0),(17,8,'member','606516','reset','2026-04-24 01:16:37','2026-04-23 17:06:37',0);
/*!40000 ALTER TABLE `userotp` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workoutsplitdays`
--

DROP TABLE IF EXISTS `workoutsplitdays`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workoutsplitdays` (
  `day_id` int NOT NULL AUTO_INCREMENT,
  `split_id` int NOT NULL,
  `day_number` int NOT NULL,
  `day_name` varchar(100) NOT NULL,
  PRIMARY KEY (`day_id`),
  KEY `split_id` (`split_id`),
  CONSTRAINT `WorkoutSplitDays_ibfk_1` FOREIGN KEY (`split_id`) REFERENCES `workoutsplits` (`split_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=21 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workoutsplitdays`
--

LOCK TABLES `workoutsplitdays` WRITE;
/*!40000 ALTER TABLE `workoutsplitdays` DISABLE KEYS */;
INSERT INTO `workoutsplitdays` VALUES (1,2,1,'Push'),(2,2,2,'Pull'),(3,2,3,'Legs'),(4,1,1,'Upper'),(5,1,2,'Lower'),(6,1,3,'FullBody'),(7,4,1,'Upper A'),(8,4,2,'Lower A'),(9,4,3,'FullBody A'),(10,4,4,'Upper B'),(11,4,5,'Lower B'),(12,4,6,'FullBody B'),(13,5,1,'Push A'),(14,5,2,'Pull A'),(15,5,3,'Legs A'),(16,5,4,'Push B'),(17,5,5,'Pull B'),(18,5,6,'Legs B'),(19,6,1,'Upper'),(20,6,2,'Lower');
/*!40000 ALTER TABLE `workoutsplitdays` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `workoutsplitexercises`
--

DROP TABLE IF EXISTS `workoutsplitexercises`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `workoutsplitexercises` (
  `id` int NOT NULL AUTO_INCREMENT,
  `day_id` int NOT NULL,
  `exercise_id` int NOT NULL,
  `sort_order` int DEFAULT '1',
  PRIMARY KEY (`id`),
  KEY `day_id` (`day_id`),
  KEY `exercise_id` (`exercise_id`),
  CONSTRAINT `WorkoutSplitExercises_ibfk_1` FOREIGN KEY (`day_id`) REFERENCES `workoutsplitdays` (`day_id`) ON DELETE CASCADE,
  CONSTRAINT `WorkoutSplitExercises_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`exercise_id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=10 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `workoutsplitexercises`
--

LOCK TABLES `workoutsplitexercises` WRITE;
/*!40000 ALTER TABLE `workoutsplitexercises` DISABLE KEYS */;
INSERT INTO `workoutsplitexercises` VALUES (1,1,1,1),(2,1,2,2),(3,1,3,3),(4,2,4,1),(5,2,5,2),(6,3,6,1),(7,3,7,2),(8,3,8,3),(9,3,9,4);
/*!40000 ALTER TABLE `workoutsplitexercises` ENABLE KEYS */;
UNLOCK TABLES;
/*!40103 SET TIME_ZONE=@OLD_TIME_ZONE */;

/*!40101 SET SQL_MODE=@OLD_SQL_MODE */;
/*!40014 SET FOREIGN_KEY_CHECKS=@OLD_FOREIGN_KEY_CHECKS */;
/*!40014 SET UNIQUE_CHECKS=@OLD_UNIQUE_CHECKS */;
/*!40101 SET CHARACTER_SET_CLIENT=@OLD_CHARACTER_SET_CLIENT */;
/*!40101 SET CHARACTER_SET_RESULTS=@OLD_CHARACTER_SET_RESULTS */;
/*!40101 SET COLLATION_CONNECTION=@OLD_COLLATION_CONNECTION */;
/*!40111 SET SQL_NOTES=@OLD_SQL_NOTES */;

-- Dump completed on 2026-05-03 16:03:28
