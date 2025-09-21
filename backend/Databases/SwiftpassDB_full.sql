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
  `system_type` varchar(20) NOT NULL,
  `session_fee` int DEFAULT NULL,
  `is_archived` tinyint DEFAULT '0',
  `status` enum('active','inactive') DEFAULT 'active',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminaccounts`
--

LOCK TABLES `adminaccounts` WRITE;
/*!40000 ALTER TABLE `adminaccounts` DISABLE KEYS */;
INSERT INTO `adminaccounts` VALUES (1,'KielAdminPrepaid',55,'kielangkicods@gmail.com','$2b$10$4KVk.pqVNbc1k0ggaQ3m0ewGiZ/kpWJswIQYWotAj2RzoO.byK1hK','Alfred','URBAN','prepaid_entry',100,0,'active','2025-09-13 18:39:35'),(2,'KielAdminSubscription',55,'shopquest06@gmail.com','$2b$10$oML4YAXfpKYhKRsvmkY2X.TxfvckYRUMH/ymD.ZLUlKInmJQ/L7dS','sta lucia','ShopQuest','subscription',0,0,'active','2025-09-13 18:47:51');
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
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminentrylogs`
--

LOCK TABLES `adminentrylogs` WRITE;
/*!40000 ALTER TABLE `adminentrylogs` DISABLE KEYS */;
INSERT INTO `adminentrylogs` VALUES (1,'93E133DF','Dailyguesy',2,'KielStaffPrepaid','Day Pass','prepaid_entry',100.00,NULL,NULL,'outside','2025-09-14 06:38:00','2025-09-14 06:38:05','EXIT'),(2,'23FE05E4','mizzy',2,'kielStaffSubscription','Member','subscription',NULL,0.00,'2027-03-31','outside','2025-09-14 06:38:10','2025-09-14 06:38:13','EXIT'),(4,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,4900.00,NULL,'outside','2025-09-14 22:22:33','2025-09-14 22:22:56','EXIT'),(5,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,4800.00,NULL,'outside','2025-09-15 02:36:07','2025-09-15 02:36:27','EXIT'),(6,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,4700.00,NULL,'outside','2025-09-15 02:39:58','2025-09-15 02:40:16','EXIT'),(7,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,4600.00,NULL,'outside','2025-09-15 02:40:33','2025-09-15 02:40:40','EXIT'),(8,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,4500.00,NULL,'outside','2025-09-15 02:40:47','2025-09-15 02:40:57','EXIT'),(9,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,4400.00,NULL,'outside','2025-09-15 02:41:04','2025-09-15 02:41:19','EXIT'),(10,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,4300.00,NULL,'outside','2025-09-15 02:43:00','2025-09-15 02:43:04','EXIT'),(11,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,4200.00,NULL,'outside','2025-09-15 02:43:10','2025-09-15 02:43:19','EXIT'),(12,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,4100.00,NULL,'outside','2025-09-15 02:43:25','2025-09-15 02:43:35','EXIT'),(13,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,4000.00,NULL,'outside','2025-09-15 02:45:11','2025-09-15 02:45:17','EXIT'),(14,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,3900.00,NULL,'outside','2025-09-15 02:45:30','2025-09-15 02:45:35','EXIT'),(15,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,3800.00,NULL,'outside','2025-09-15 02:47:06','2025-09-15 02:47:16','EXIT'),(16,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,3700.00,NULL,'outside','2025-09-15 02:48:58','2025-09-15 02:49:03','EXIT'),(17,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,3600.00,NULL,'outside','2025-09-15 02:49:11','2025-09-15 02:49:15','EXIT'),(18,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,3500.00,NULL,'outside','2025-09-15 02:52:50','2025-09-15 02:52:56','EXIT'),(19,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,3400.00,NULL,'outside','2025-09-15 02:53:00','2025-09-15 02:53:12','EXIT'),(20,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,3300.00,NULL,'outside','2025-09-15 02:53:19','2025-09-15 02:53:20','EXIT'),(21,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,3200.00,NULL,'outside','2025-09-15 02:53:41','2025-09-15 02:53:47','EXIT'),(22,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,3100.00,NULL,'outside','2025-09-15 02:53:52','2025-09-15 02:53:53','EXIT'),(23,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,3000.00,NULL,'outside','2025-09-15 02:54:53','2025-09-15 02:54:55','EXIT'),(24,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,2900.00,NULL,'outside','2025-09-15 02:54:59','2025-09-15 02:55:02','EXIT'),(25,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,2800.00,NULL,'outside','2025-09-15 02:55:11','2025-09-15 02:55:17','EXIT'),(26,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,2700.00,NULL,'outside','2025-09-15 02:57:34','2025-09-15 02:57:38','EXIT'),(27,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,2600.00,NULL,'outside','2025-09-15 02:58:38','2025-09-15 02:58:44','EXIT'),(28,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,2500.00,NULL,'outside','2025-09-15 02:58:51','2025-09-15 02:58:55','EXIT'),(29,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,2400.00,NULL,'outside','2025-09-15 03:02:41','2025-09-15 03:03:54','EXIT'),(30,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,2300.00,NULL,'outside','2025-09-15 03:03:58','2025-09-15 03:04:01','EXIT'),(31,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,2200.00,NULL,'outside','2025-09-15 03:04:06','2025-09-15 03:04:10','EXIT'),(32,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,2100.00,NULL,'outside','2025-09-15 03:04:14','2025-09-15 03:04:21','EXIT'),(33,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,2000.00,NULL,'outside','2025-09-15 03:06:55','2025-09-15 03:07:00','EXIT'),(34,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,1900.00,NULL,'outside','2025-09-15 03:08:45','2025-09-15 03:08:51','EXIT'),(35,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,1800.00,NULL,'outside','2025-09-15 03:10:32','2025-09-15 03:10:42','EXIT'),(36,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,1700.00,NULL,'outside','2025-09-15 03:11:42','2025-09-15 03:11:50','EXIT'),(37,'93E133DF','KielPrepaidMember',1,'KielStaffPrepaid','Member','prepaid_entry',NULL,1600.00,NULL,'outside','2025-09-15 03:12:56','2025-09-15 03:13:00','EXIT');
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
  CONSTRAINT `adminmembermealassessment_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminmembermealassessment`
--

LOCK TABLES `adminmembermealassessment` WRITE;
/*!40000 ALTER TABLE `adminmembermealassessment` DISABLE KEYS */;
INSERT INTO `adminmembermealassessment` VALUES (1,NULL,'F2CCAA31','Male','20',143.00,43.00,'Lightly Active (light exercise/sports 1-3 days​/week)','1940','High Protein',121,75,194,'2025-05-29 00:00:16');
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
  CONSTRAINT `trans_admin_fk` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=29 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminmemberstransactions`
--

LOCK TABLES `adminmemberstransactions` WRITE;
/*!40000 ALTER TABLE `adminmemberstransactions` DISABLE KEYS */;
INSERT INTO `adminmemberstransactions` VALUES (1,'123','pre',1,'new_member',4000.00,5000.00,5000.00,'PROMO 2',NULL,NULL,'Cash',NULL,1.00,'prepaidTesting','2025-07-07 04:22:35'),(2,'123','pre',1,'top_up',4000.00,5000.00,10000.00,'PROMO 2',NULL,NULL,'Cash',NULL,1.00,'prepaidTesting','2025-07-07 04:22:49'),(3,'12','subs',2,'new_subscription',211.00,0.00,0.00,'Monthly','2025-07-06','2025-08-25','Cash',NULL,1.00,'subscriptionTesting','2025-07-07 04:24:11'),(4,'12','subs',2,'renew_subscription',211.00,0.00,0.00,'Monthly','2025-07-06','2025-08-25','Cash',NULL,1.00,'subscriptionTesting','2025-07-07 04:24:23'),(5,'12','subs',2,'renew_subscription',211.00,0.00,0.00,'Monthly','2025-08-24','2025-10-13','Cash',NULL,1.00,'subscriptionTesting','2025-07-07 04:28:07'),(6,'1','kiel',1,'new_member',4000.00,5000.00,5000.00,'PROMO 2',NULL,NULL,'Cash',NULL,1.00,'prepaidTesting','2025-07-07 04:37:11'),(7,'D7681965','firstmember',1,'new_member',4000.00,5000.00,5000.00,'PROMO 2',NULL,NULL,'Cash',NULL,1.00,'prepaidTesting','2025-07-08 06:02:59'),(8,'D7681965','andrea mae angkico',4,'new_member',500.00,500.00,500.00,NULL,NULL,NULL,'Cash',NULL,1.00,'july','2025-07-09 05:14:28'),(9,'D7681965','andrea mae angkico',4,'top_up',500.00,700.00,700.00,'promo 1',NULL,NULL,'Cash',NULL,1.00,'july','2025-07-09 06:27:22'),(10,'93E133DF','aeryk angkico',2,'new_subscription',211.00,0.00,0.00,'Monthly','2025-07-08','2025-08-27','Cash',NULL,1.00,'subscriptionTesting','2025-07-09 06:41:09'),(11,'reafel2','Cavite',4,'new_member',500.00,700.00,700.00,'promo 1',NULL,NULL,'GCash','123456789',1.00,'july','2025-07-12 02:38:58'),(12,'93E133DF','Kiel',1,'renew_subscription',999.00,NULL,NULL,'monthly','2025-07-15','2025-08-15','GCash','GCASH-REF-1827',1.00,'prepaidTesting','2025-07-15 16:45:33'),(13,'D7681965','andrea mae angkico',4,'top_up',500.00,700.00,700.00,'promo 1',NULL,NULL,'Cash',NULL,1.00,'july','2025-07-24 07:54:49'),(14,'93E133DF','aeryk angkico',2,'renew_subscription',211.00,0.00,0.00,'Monthly','2025-08-26','2025-10-15','Cash',NULL,1.00,'subscriptionTesting','2025-07-24 08:03:42'),(15,'EDCDA201','qweqweqw',4,'new_member',500.00,700.00,700.00,'promo 1',NULL,NULL,'Cash',NULL,1.00,'july','2025-07-24 15:03:53'),(16,'23FE05E4','jaco',4,'new_member',500.00,700.00,700.00,'promo 1',NULL,NULL,'Cash',NULL,1.00,'july','2025-07-24 16:36:46'),(17,'23FE05E4','kiel',2,'new_subscription',15000.00,0.00,0.00,'6 months','2025-07-24','2026-02-09','Cash',NULL,1.00,'subscriptionTesting','2025-07-24 17:18:56'),(22,'93E133DF','prepaidlang',1,'new_member',4000.00,5000.00,5000.00,'PROMO 2',NULL,NULL,'GCash','09970821181',1.00,'kiel','2025-09-14 01:45:05'),(23,'23FE05E4','KielPrepaidMember',1,'new_member',4000.00,5000.00,5000.00,'PROMO 2',NULL,NULL,'Cash',NULL,1.00,'KielStaffPrepaid','2025-09-14 03:15:13'),(24,'23FE05E4','KielPrepaidMember',1,'top_up',4000.00,5000.00,5000.00,'PROMO 2',NULL,NULL,'Cash',NULL,1.00,'KielStaffPrepaid','2025-09-14 05:58:36'),(25,'23FE05E4','mizzy',2,'new_subscription',15000.00,0.00,0.00,'6 months','2025-09-13','2026-04-01','Cash',NULL,1.00,'kielStaffSubscription','2025-09-14 06:16:33'),(26,'23FE05E4','mizzy',2,'renew_subscription',1000.00,0.00,0.00,'yearly','2026-03-31','2027-03-31','GCash','0997082181',1.00,'kielStaffSubscription','2025-09-14 06:28:29'),(27,'93E133DF','KielPrepaidMember',1,'new_member',4000.00,5000.00,5000.00,'PROMO 2',NULL,NULL,'Cash',NULL,1.00,'KielStaffPrepaid','2025-09-14 22:19:19'),(28,'D7681965','PrepaidTestingAgain',1,'new_member',4000.00,5000.00,5000.00,'PROMO 2',NULL,NULL,'Cash',NULL,1.00,'KielStaffPrepaid','2025-09-15 00:36:24');
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
  CONSTRAINT `adminpaymentmethods_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=9 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminpaymentmethods`
--

LOCK TABLES `adminpaymentmethods` WRITE;
/*!40000 ALTER TABLE `adminpaymentmethods` DISABLE KEYS */;
INSERT INTO `adminpaymentmethods` VALUES (1,1,'GCASH',0,'09970821181',1,0,'2025-08-01 04:25:32','2025-08-01 04:25:32'),(2,7,'Cash',1,NULL,1,0,'2025-08-01 04:36:16','2025-08-01 04:36:16'),(3,2,'gcash 1',0,'09970821181',1,0,'2025-08-01 04:45:46','2025-08-01 04:45:46'),(4,1,'BPI',0,'6344566789',1,0,'2025-08-01 04:55:39','2025-08-01 04:55:39'),(6,2,'EastWest',0,NULL,1,0,'2025-09-07 20:37:51','2025-09-07 20:37:51'),(7,1,'Cash',1,NULL,1,0,'2025-09-13 18:39:35','2025-09-13 18:39:35'),(8,2,'Cash',1,NULL,1,0,'2025-09-13 18:47:51','2025-09-13 18:47:51');
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
  CONSTRAINT `adminpricingoptions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `adminpricingoptions`
--

LOCK TABLES `adminpricingoptions` WRITE;
/*!40000 ALTER TABLE `adminpricingoptions` DISABLE KEYS */;
INSERT INTO `adminpricingoptions` VALUES (2,1,'prepaid_entry','PROMO 1',400.00,NULL,NULL,'2025-07-06 16:20:59','2025-07-06 16:20:59',1,1),(3,1,'prepaid_entry','PROMO 2',4000.00,5000.00,NULL,'2025-07-06 16:23:56','2025-07-06 16:23:56',1,1),(4,2,'subscription','Monthly',211.00,NULL,50,'2025-07-06 16:24:12','2025-07-06 16:24:12',1,1),(6,4,'prepaid_entry','Daily Session',40.00,50.00,NULL,'2025-07-07 12:38:47','2025-07-24 08:50:44',1,0),(7,4,'prepaid_entry','promo 1',500.00,700.00,NULL,'2025-07-08 22:07:22','2025-07-08 22:07:22',1,1),(8,1,'prepaid_entry','promo 3',100.00,200.00,NULL,'2025-07-08 22:11:24','2025-07-08 22:11:24',1,1),(9,4,'prepaid_entry','promo 4',200.00,300.00,NULL,'2025-07-08 22:12:34','2025-07-08 22:12:34',1,1),(10,5,'prepaid_entry','Daily Session',50.00,NULL,NULL,'2025-07-22 21:30:53','2025-07-22 21:30:53',1,0),(11,6,'prepaid_entry','Daily Session',60.00,NULL,NULL,'2025-07-22 21:37:05','2025-07-22 21:37:05',1,0),(12,2,'subscription','yearly',1000.00,NULL,365,'2025-07-24 09:13:24','2025-07-24 09:13:24',1,1),(13,2,'subscription','6 months',15000.00,NULL,200,'2025-07-24 09:15:03','2025-07-24 09:15:03',1,1),(14,7,'prepaid_entry','Daily Session',50.00,NULL,NULL,'2025-08-01 04:36:16','2025-08-01 04:36:16',1,0),(16,1,'prepaid_entry','Daily Session',100.00,NULL,NULL,'2025-09-13 18:39:35','2025-09-13 18:39:35',1,0);
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
  `payment_method` enum('Cash','GCash','Cashless') DEFAULT NULL,
  `reference` varchar(100) DEFAULT NULL,
  `staff_name` varchar(100) DEFAULT NULL,
  `transaction_type` enum('renewal','new_membership','trainer_session','Tapup','day_pass_session') NOT NULL,
  `plan_name` varchar(100) DEFAULT NULL,
  `transaction_date` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`transaction_id`),
  KEY `admin_id` (`admin_id`),
  KEY `member_id` (`member_id`),
  CONSTRAINT `admintransactions_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `admintransactions_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=38 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `admintransactions`
--

LOCK TABLES `admintransactions` WRITE;
/*!40000 ALTER TABLE `admintransactions` DISABLE KEYS */;
INSERT INTO `admintransactions` VALUES (1,1,1,'pre','123',4000.00,'Cash',NULL,'prepaidTesting','new_membership','PROMO 2','2025-07-06 20:22:35'),(2,1,1,'pre','123',4000.00,'Cash',NULL,'prepaidTesting','Tapup','PROMO 2','2025-07-06 20:22:49'),(3,2,NULL,'subs','12',211.00,'Cash',NULL,'subscriptionTesting','new_membership','Monthly','2025-07-06 20:24:11'),(4,2,NULL,'subs','12',211.00,'Cash',NULL,'subscriptionTesting','renewal','Monthly','2025-07-06 20:24:23'),(5,2,NULL,'subs','12',211.00,'Cash',NULL,'subscriptionTesting','renewal','Monthly','2025-07-06 20:28:07'),(6,1,NULL,'kiel','1',4000.00,'Cash',NULL,'prepaidTesting','new_membership','PROMO 2','2025-07-06 20:37:11'),(7,1,NULL,'firstmember','D7681965',4000.00,'Cash',NULL,'prepaidTesting','new_membership','PROMO 2','2025-07-07 22:02:59'),(8,4,1,'andrea mae angkico','D7681965',500.00,'Cash',NULL,'july','new_membership',NULL,'2025-07-08 21:14:28'),(9,4,1,'andrea mae angkico','D7681965',500.00,'Cash',NULL,'july','Tapup','promo 1','2025-07-08 22:27:22'),(10,2,NULL,'aeryk angkico','93E133DF',211.00,'Cash',NULL,'subscriptionTesting','new_membership','Monthly','2025-07-08 22:41:09'),(11,4,NULL,'Cavite','reafel2',500.00,'GCash','123456789','july','new_membership','promo 1','2025-07-11 18:38:58'),(12,4,NULL,'123','D7681965',50.00,'Cash',NULL,'','day_pass_session',NULL,'2025-07-23 03:39:17'),(13,4,NULL,'Kiel Angkico','D7681965',50.00,'Cash',NULL,'','day_pass_session',NULL,'2025-07-23 03:45:05'),(14,4,NULL,'kiel','D7681965',50.00,'Cash',NULL,'','day_pass_session',NULL,'2025-07-23 04:25:09'),(15,4,NULL,'kiel','D7681965',50.00,'Cash',NULL,'july','day_pass_session',NULL,'2025-07-23 04:28:22'),(16,4,NULL,'ARLONG','EDCDA201',50.00,'Cash',NULL,'july','day_pass_session',NULL,'2025-07-23 06:33:35'),(17,4,NULL,'Andre garfield','EDCDA201',50.00,'Cashless',NULL,'july','day_pass_session',NULL,'2025-07-23 22:58:02'),(18,4,1,'andrea mae angkico','D7681965',500.00,'Cash',NULL,'july','Tapup','promo 1','2025-07-23 23:54:49'),(19,2,NULL,'aeryk angkico','93E133DF',211.00,'Cash',NULL,'subscriptionTesting','renewal','Monthly','2025-07-24 00:03:42'),(20,4,NULL,'andres','EDCDA201',50.00,'Cash',NULL,'july','day_pass_session',NULL,'2025-07-24 00:24:49'),(21,4,17,'qweqweqw','EDCDA201',500.00,'Cash',NULL,'july','new_membership','promo 1','2025-07-24 07:03:53'),(22,4,1,'jaco','23FE05E4',500.00,'Cash',NULL,'july','new_membership','promo 1','2025-07-24 08:36:46'),(23,4,NULL,'Mizzy','EDCDA201',50.00,'Cash',NULL,'july','day_pass_session',NULL,'2025-07-24 08:57:11'),(24,2,1,'kiel','23FE05E4',15000.00,'Cash',NULL,'subscriptionTesting','new_membership','6 months','2025-07-24 09:18:56'),(29,1,6,'prepaidlang','93E133DF',4000.00,'GCash','09970821181','kiel','new_membership','PROMO 2','2025-09-13 17:45:05'),(30,1,1,'KielPrepaidMember','23FE05E4',4000.00,'Cash',NULL,'KielStaffPrepaid','new_membership','PROMO 2','2025-09-13 19:15:13'),(31,1,NULL,'Dailyguesy','93E133DF',100.00,'Cash',NULL,'KielStaffPrepaid','day_pass_session',NULL,'2025-09-13 21:35:44'),(32,1,1,'KielPrepaidMember','23FE05E4',4000.00,'Cash',NULL,'KielStaffPrepaid','Tapup','PROMO 2','2025-09-13 21:58:36'),(33,2,1,'mizzy','23FE05E4',15000.00,'Cash',NULL,'kielStaffSubscription','new_membership','6 months','2025-09-13 22:16:33'),(34,2,1,'mizzy','23FE05E4',1000.00,'GCash','0997082181','kielStaffSubscription','renewal','yearly','2025-09-13 22:28:29'),(35,2,NULL,'gustsubscription','93E133DF',0.00,'Cash',NULL,'kielStaffSubscription','day_pass_session',NULL,'2025-09-13 22:37:10'),(36,1,2,'KielPrepaidMember','93E133DF',4000.00,'Cash',NULL,'KielStaffPrepaid','new_membership','PROMO 2','2025-09-14 14:19:19'),(37,1,3,'PrepaidTestingAgain','D7681965',4000.00,'Cash',NULL,'KielStaffPrepaid','new_membership','PROMO 2','2025-09-14 16:36:24');
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
) ENGINE=InnoDB AUTO_INCREMENT=11 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `allergens`
--

LOCK TABLES `allergens` WRITE;
/*!40000 ALTER TABLE `allergens` DISABLE KEYS */;
INSERT INTO `allergens` VALUES (8,'beef'),(7,'chicken'),(1,'gluten'),(10,'NUTS'),(9,'Pork');
/*!40000 ALTER TABLE `allergens` ENABLE KEYS */;
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
  PRIMARY KEY (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `daypassguests`
--

LOCK TABLES `daypassguests` WRITE;
/*!40000 ALTER TABLE `daypassguests` DISABLE KEYS */;
INSERT INTO `daypassguests` VALUES (1,'Mizzy','male','EDCDA201',4,'prepaid_entry','july',50.00,'2025-07-24 16:57:11','2025-07-24 23:59:59','active',NULL),(2,'Dailyguesy','male','93E133DF',2,'prepaid_entry','KielStaffPrepaid',100.00,'2025-09-14 05:35:44','2025-09-14 23:59:59','active',NULL);
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
  CONSTRAINT `exerciseassessments_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `exerciseassessments_ibfk_2` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE SET NULL
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exerciseassessments`
--

LOCK TABLES `exerciseassessments` WRITE;
/*!40000 ALTER TABLE `exerciseassessments` DISABLE KEYS */;
INSERT INTO `exerciseassessments` VALUES (1,1,'23FE05E4',NULL,'beginner',1,'ppl',NULL,'confirmed','2025-09-11 15:35:01');
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
  CONSTRAINT `exercisedaycompletions_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
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
) ENGINE=InnoDB AUTO_INCREMENT=6 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `exerciselibrary`
--

LOCK TABLES `exerciselibrary` WRITE;
/*!40000 ALTER TABLE `exerciselibrary` DISABLE KEYS */;
INSERT INTO `exerciselibrary` VALUES (1,'Dumbbell Bench Press','beginner','Chest','compound','Triceps','Dumbbell','Step 1 set up the bench press',NULL,'/uploads/exercises/1752808404560-coming-soon.jpg',1,'2025-07-18 03:13:24'),(2,'T Bar Row','beginner','Back','compound','Traps','Machine','Step in T bar Row',NULL,'/uploads/exercises/1752809531596-1752808404560-coming-soon.jpg',1,'2025-07-18 03:32:11'),(3,'Barbell Squats','beginner','Quads','compound','Hamstrings','Barbell','STEP 1',NULL,'/uploads/exercises/1752810498257-1752808404560-coming-soon.jpg',1,'2025-07-18 03:48:18'),(4,'Hex Press','beginner','Chest','compound','Tricep','Dumbbell','Lay on the Bench',NULL,'/uploads/exercises/1757243158264-MigoysLogo.png',1,'2025-09-07 11:05:58'),(5,'test','beginner','tricep','compound','bicep','dumbbells','ytr',NULL,'/uploads/exercises/1757943723173-Evaluation.png',1,'2025-09-15 13:42:03');
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
  CONSTRAINT `foodallergens_ibfk_1` FOREIGN KEY (`food_id`) REFERENCES `foodlibrary` (`id`) ON DELETE CASCADE,
  CONSTRAINT `foodallergens_ibfk_2` FOREIGN KEY (`allergen_id`) REFERENCES `allergens` (`id`) ON DELETE CASCADE
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
  CONSTRAINT `foodlibrary_ibfk_1` FOREIGN KEY (`group_id`) REFERENCES `foodgroups` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=25 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `foodlibrary`
--

LOCK TABLES `foodlibrary` WRITE;
/*!40000 ALTER TABLE `foodlibrary` DISABLE KEYS */;
INSERT INTO `foodlibrary` VALUES (1,2,'Bread, white, commercially prepared',100,1130.00,9.43,44.80,3.59,'SuperAdmin','2025-08-25 20:09:53','2025-08-25 20:09:53'),(2,1,'Chicken, ground, with additives, raw',100,138.00,17.90,NULL,7.16,'SuperAdmin','2025-08-25 20:15:11','2025-08-25 20:15:11'),(3,3,'Avocado',100,160.00,2.00,9.00,15.00,'superadmin','2025-08-30 12:44:36','2025-08-30 12:44:36'),(4,4,'Beef, tenderloin steak, raw',100,149.00,21.10,0.18,6.46,'SuperAdmin','2025-09-01 13:13:39','2025-09-01 13:13:39'),(5,1,'Chicken, drumstick, meat and skin, raw',100,130.00,18.40,-0.48,5.94,'SuperAdmin','2025-09-01 13:25:55','2025-09-01 13:25:55'),(6,1,'Pork, ground, raw',100,233.00,17.80,NULL,17.50,'SuperAdmin','2025-09-03 18:38:28','2025-09-03 18:38:28'),(7,2,'Beef, ground, 80% lean meat / 20% fat, raw',100,248.00,17.50,NULL,19.40,'SuperAdmin','2025-09-03 18:39:35','2025-09-03 18:39:35'),(8,2,'Beef, tenderloin steak, raw',100,149.00,21.10,0.18,6.46,'SuperAdmin','2025-09-03 18:39:52','2025-09-03 18:39:52'),(9,3,'Chicken, breast, boneless, skinless, raw',100,112.00,22.50,NULL,1.93,'SuperAdmin','2025-09-03 18:40:15','2025-09-03 18:40:15'),(10,3,'Chicken, thigh, boneless, skinless, raw',100,149.00,18.60,NULL,7.92,'SuperAdmin','2025-09-03 18:40:40','2025-09-03 18:40:40'),(11,4,'Eggs, Grade A, Large, egg whole',100,617.00,12.40,0.20,9.96,'SuperAdmin','2025-09-03 18:43:05','2025-09-03 18:43:05'),(12,5,'Rice, white, long grain, unenriched, raw',100,370.00,7.04,80.30,1.03,'SuperAdmin','2025-09-03 18:43:40','2025-09-03 18:43:40'),(13,6,'Bread, whole-wheat, commercially prepared',100,1060.00,12.30,39.20,3.55,'SuperAdmin','2025-09-03 18:44:05','2025-09-03 18:44:05'),(14,7,'Broccoli, raw',100,31.00,2.57,3.80,0.34,'SuperAdmin','2025-09-03 18:51:12','2025-09-03 18:51:12'),(15,8,'Cabbage, green, raw',100,27.90,0.96,6.38,0.23,'SuperAdmin','2025-09-03 18:51:36','2025-09-03 18:51:36'),(17,10,'Potatoes, gold, without skin, raw',100,71.60,1.81,16.00,0.26,'SuperAdmin','2025-09-03 18:54:37','2025-09-03 18:54:37'),(18,11,'Mango, Tommy Atkins, peeled, raw',100,61.60,0.56,15.30,0.57,'SuperAdmin','2025-09-03 18:54:57','2025-09-03 18:54:57'),(19,12,'Bananas, overripe, raw',100,357.00,0.73,18.00,0.22,'SuperAdmin','2025-09-03 18:55:16','2025-09-03 18:55:16'),(23,16,'Turkey, ground, 93% lean/ 7% fat, raw',100,158.00,17.30,NULL,9.59,'SuperAdmin','2025-09-03 19:18:42','2025-09-03 19:18:42'),(24,2,'Beef, top sirloin steak, raw',100,146.00,22.00,0.22,5.71,'SuperAdmin','2025-09-05 06:36:07','2025-09-05 06:36:07');
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
  CONSTRAINT `initialassessment_ibfk_1` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `initialassessment`
--

LOCK TABLES `initialassessment` WRITE;
/*!40000 ALTER TABLE `initialassessment` DISABLE KEYS */;
INSERT INTO `initialassessment` VALUES (1,1,'23FE05E4','Kiel','male',21,170,70,'light','Lose Weight','Get Toned',2286,2000,'Mild','2025-09-11 15:34:38');
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
  CONSTRAINT `mealplans_ibfk_1` FOREIGN KEY (`rfid_tag`) REFERENCES `adminmembermealassessment` (`rfid_tag`) ON DELETE CASCADE
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
  CONSTRAINT `membernutritionresult_ibfk_1` FOREIGN KEY (`assessment_id`) REFERENCES `nutritionassessment` (`id`) ON DELETE CASCADE,
  CONSTRAINT `membernutritionresult_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE,
  CONSTRAINT `membernutritionresult_ibfk_3` FOREIGN KEY (`food_id`) REFERENCES `foodlibrary` (`id`),
  CONSTRAINT `membernutritionresult_ibfk_4` FOREIGN KEY (`group_id`) REFERENCES `foodgroups` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=17 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `membernutritionresult`
--

LOCK TABLES `membernutritionresult` WRITE;
/*!40000 ALTER TABLE `membernutritionresult` DISABLE KEYS */;
INSERT INTO `membernutritionresult` VALUES (13,1,1,24,'Beef, top sirloin steak, raw',2,'Protein',750.00,1076.47,162.21,1.58,42.13,'2025-09-11 15:35:15'),(14,1,1,17,'Potatoes, gold, without skin, raw',10,'Carb',950.00,663.68,16.75,148.30,2.42,'2025-09-11 15:35:15'),(15,1,1,18,'Mango, Tommy Atkins, peeled, raw',11,'Fruit',270.00,168.74,1.58,41.92,1.58,'2025-09-11 15:35:15'),(16,1,1,15,'Cabbage, green, raw',8,'Vegetable',250.00,91.11,3.16,20.86,0.74,'2025-09-11 15:35:15');
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
  CONSTRAINT `membersaccounts_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `membersaccounts`
--

LOCK TABLES `membersaccounts` WRITE;
/*!40000 ALTER TABLE `membersaccounts` DISABLE KEYS */;
INSERT INTO `membersaccounts` VALUES (1,'23FE05E4','mizzy','male',21,'0997082181','p6','mizzy@gmail.com','$2b$10$XGeiJoJ1AOekMzp.TuVOQeYLxk/0rRStXolwt0nExdMhLloQMDOgG','uploads/members/kiel.jpg',2,'kielStaffSubscription',0.00,0.00,'yearly',1000.00,'2026-03-31','2027-03-31','subscription',15000.00,'active','2025-09-13 22:16:33','2025-09-13 22:28:29'),(2,'93E133DF','KielPrepaidMember','male',21,'09970821181','Princess Homes','kielprepaidmember@gmail.com','$2b$10$eolhuIhvIAyuXwbPe.uhX.X/h3QX2Ap8BDno4/CkdJVgbPjhpHnj.','uploads/members/kiel.jpg',1,'KielStaffPrepaid',5000.00,1600.00,'PROMO 2',NULL,NULL,NULL,'prepaid_entry',4000.00,'active','2025-09-14 14:19:19','2025-09-14 19:12:56'),(3,'D7681965','PrepaidTestingAgain','male',21,'09970821181','qwe','prepaidtestingagain@gmail.com','$2b$10$VR8tOdE4YpfoEpnWC4uyYOnGy86OP/j27GbagmFrn9ikOiVTc2.PG',NULL,1,'KielStaffPrepaid',5000.00,5000.00,'PROMO 2',NULL,NULL,NULL,'prepaid_entry',4000.00,'active','2025-09-14 16:36:24','2025-09-14 16:36:24');
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
  CONSTRAINT `membersworkoutprogress_ibfk_1` FOREIGN KEY (`split_id`) REFERENCES `workoutsplits` (`split_id`)
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
  CONSTRAINT `nutritionassessment_ibfk_1` FOREIGN KEY (`macro_breakdown_id`) REFERENCES `macronutrientbreakdown` (`id`),
  CONSTRAINT `nutritionassessment_ibfk_2` FOREIGN KEY (`member_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `nutritionassessment`
--

LOCK TABLES `nutritionassessment` WRITE;
/*!40000 ALTER TABLE `nutritionassessment` DISABLE KEYS */;
INSERT INTO `nutritionassessment` VALUES (1,1,'23FE05E4','[9]','[2]','[10]','[11]','[8]',2000,175,200,56,1,'2025-09-11 15:35:15');
/*!40000 ALTER TABLE `nutritionassessment` ENABLE KEYS */;
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
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `rfid_tag` (`rfid_tag`),
  KEY `idx_rfid_tag` (`rfid_tag`)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `registeredrfid`
--

LOCK TABLES `registeredrfid` WRITE;
/*!40000 ALTER TABLE `registeredrfid` DISABLE KEYS */;
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
  CONSTRAINT `splitdayexercises_ibfk_1` FOREIGN KEY (`split_day_id`) REFERENCES `splitdays` (`id`) ON DELETE CASCADE,
  CONSTRAINT `splitdayexercises_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `exerciselibrary` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `splitdayexercises`
--

LOCK TABLES `splitdayexercises` WRITE;
/*!40000 ALTER TABLE `splitdayexercises` DISABLE KEYS */;
INSERT INTO `splitdayexercises` VALUES (1,1,3,0,3,'8-12','60',''),(2,1,2,0,3,'8-12','60',''),(3,1,1,0,3,'8-12','60','');
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
  CONSTRAINT `splitdays_ibfk_1` FOREIGN KEY (`split_id`) REFERENCES `splitlibrary` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `splitdays`
--

LOCK TABLES `splitdays` WRITE;
/*!40000 ALTER TABLE `splitdays` DISABLE KEYS */;
INSERT INTO `splitdays` VALUES (1,1,1,'Day 1','2025-09-07 02:48:37');
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
) ENGINE=InnoDB AUTO_INCREMENT=2 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `splitlibrary`
--

LOCK TABLES `splitlibrary` WRITE;
/*!40000 ALTER TABLE `splitlibrary` DISABLE KEYS */;
INSERT INTO `splitlibrary` VALUES (1,'ppl',1,'unisex','2025-09-07 02:48:37');
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
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`),
  KEY `fk_admin` (`admin_id`),
  CONSTRAINT `fk_admin` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`) ON DELETE SET NULL,
  CONSTRAINT `staffaccounts_ibfk_1` FOREIGN KEY (`admin_id`) REFERENCES `adminaccounts` (`id`)
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staffaccounts`
--

LOCK TABLES `staffaccounts` WRITE;
/*!40000 ALTER TABLE `staffaccounts` DISABLE KEYS */;
INSERT INTO `staffaccounts` VALUES (1,1,'KielStaffPrepaid',21,'09970821181','princesshomes','kiellappy@gmail.com','$2b$10$SnUelafpJ/uLr9i2v4.7s.yPuOXZOzzFpWcBhQ5aICL.7Qsr0SWh6','staff_new_1757789412815.jpg','active','2025-09-13 18:50:12'),(2,2,'kielStaffSubscription',21,'09970821181','Project 6','mixxymizakiro@gmail.com','$2b$10$A.eEINzFl7pi3oUe9VA3G.iUOnVRopYz2kuZPTOIbqs2Ikc.n2PMS','staff_new_1757789594076.jpg','active','2025-09-13 18:53:14');
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
-- Dumping data for table `staffaccounts_archived`
--

LOCK TABLES `staffaccounts_archived` WRITE;
/*!40000 ALTER TABLE `staffaccounts_archived` DISABLE KEYS */;
INSERT INTO `staffaccounts_archived` VALUES (2,1,'try',21,21,'tes','tryy@gmail.com','$2b$10$YiNzcoSA7wNltLgNTMSp..LK8WNXxYPkCEh8LMmW7//VoDNRFEloK','inactive','2025-05-14 17:32:42','2025-05-15 01:54:19');
/*!40000 ALTER TABLE `staffaccounts_archived` ENABLE KEYS */;
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
) ENGINE=InnoDB AUTO_INCREMENT=27 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `staffsessionlogs`
--

LOCK TABLES `staffsessionlogs` WRITE;
/*!40000 ALTER TABLE `staffsessionlogs` DISABLE KEYS */;
INSERT INTO `staffsessionlogs` VALUES (1,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 02:53:59',NULL),(2,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 03:14:18',NULL),(3,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 03:32:21',NULL),(4,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 03:49:39',NULL),(5,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 04:06:52',NULL),(6,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 04:25:39',NULL),(7,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 04:30:19',NULL),(8,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 04:49:45',NULL),(9,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 05:07:11',NULL),(10,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 05:26:16',NULL),(11,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 05:45:20',NULL),(12,2,'kielStaffSubscription',2,'subscription','online','2025-09-14 06:01:58',NULL),(13,2,'kielStaffSubscription',2,'subscription','online','2025-09-14 06:21:04',NULL),(14,2,'kielStaffSubscription',2,'subscription','online','2025-09-14 06:37:50',NULL),(15,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-14 22:18:10',NULL),(16,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-15 00:18:56',NULL),(17,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-15 00:35:38',NULL),(18,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-15 02:19:43',NULL),(19,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-15 02:21:47',NULL),(20,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-15 02:27:09',NULL),(21,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-15 02:39:50',NULL),(22,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-15 02:52:41',NULL),(23,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-15 03:03:42',NULL),(24,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-15 04:11:33',NULL),(25,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-15 20:20:50',NULL),(26,1,'KielStaffPrepaid',1,'prepaid_entry','online','2025-09-15 20:33:17',NULL);
/*!40000 ALTER TABLE `staffsessionlogs` ENABLE KEYS */;
UNLOCK TABLES;

--
-- Table structure for table `superadminaccounts`
--

DROP TABLE IF EXISTS `superadminaccounts`;
/*!40101 SET @saved_cs_client     = @@character_set_client */;
/*!50503 SET character_set_client = utf8mb4 */;
CREATE TABLE `superadminaccounts` (
  `id` int NOT NULL AUTO_INCREMENT,
  `superadmin_name` varchar(100) DEFAULT NULL,
  `email` varchar(255) DEFAULT NULL,
  `password` varchar(255) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `email` (`email`)
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `superadminaccounts`
--

LOCK TABLES `superadminaccounts` WRITE;
/*!40000 ALTER TABLE `superadminaccounts` DISABLE KEYS */;
INSERT INTO `superadminaccounts` VALUES (1,'SuperAdmin','SuperAdmin@gmail.com','$2b$10$tnp5Gv/hKR52a7wv1ktGz.WP80Vs57YXlmgwbHx/kytlvpRrfXl0m','2025-05-12 18:19:45'),(2,'Mizzy','serenemixxy@gmail.com','$2b$10$Ne.LRXUr9fManNwVPV6Zx.8d0/vqBkIF4xXpU3UFHI6/nOVfnT/l6','2025-09-08 11:22:09'),(3,'KielSuperadmin','aerykangkico@gmail.com','$2b$10$Ne.LRXUr9fManNwVPV6Zx.8d0/vqBkIF4xXpU3UFHI6/nOVfnT/l6','2025-09-13 18:37:58');
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
  `type` varchar(100) NOT NULL,
  `quantity` int unsigned DEFAULT '0',
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  KEY `idx_type` (`type`),
  KEY `idx_name` (`name`),
  CONSTRAINT `superadmininventory_chk_1` CHECK ((`quantity` >= 0))
) ENGINE=InnoDB AUTO_INCREMENT=3 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `superadmininventory`
--

LOCK TABLES `superadmininventory` WRITE;
/*!40000 ALTER TABLE `superadmininventory` DISABLE KEYS */;
INSERT INTO `superadmininventory` VALUES (1,'RFID','RFID Kit',2,'2025-09-13 09:56:24','2025-09-13 09:56:35'),(2,'RELAY','',4,'2025-09-13 10:25:01','2025-09-13 10:25:07');
/*!40000 ALTER TABLE `superadmininventory` ENABLE KEYS */;
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
  CONSTRAINT `trusteddevices_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=4 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `trusteddevices`
--

LOCK TABLES `trusteddevices` WRITE;
/*!40000 ALTER TABLE `trusteddevices` DISABLE KEYS */;
INSERT INTO `trusteddevices` VALUES (1,1,'mobile-temp-id','2025-09-13 02:34:04','2025-09-11 18:34:04');
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
  `otp` varchar(6) NOT NULL,
  `type` enum('login','reset') NOT NULL DEFAULT 'login',
  `expires_at` datetime NOT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`),
  UNIQUE KEY `unique_user_type` (`user_id`,`type`),
  CONSTRAINT `userotp_ibfk_1` FOREIGN KEY (`user_id`) REFERENCES `membersaccounts` (`id`) ON DELETE CASCADE
) ENGINE=InnoDB AUTO_INCREMENT=8 DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
/*!40101 SET character_set_client = @saved_cs_client */;

--
-- Dumping data for table `userotp`
--

LOCK TABLES `userotp` WRITE;
/*!40000 ALTER TABLE `userotp` DISABLE KEYS */;
INSERT INTO `userotp` VALUES (1,1,'688818','login','2025-09-12 02:39:11','2025-09-11 18:29:11'),(4,1,'632512','reset','2025-09-12 17:49:36','2025-09-12 09:39:36');
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
  CONSTRAINT `workoutsplitdays_ibfk_1` FOREIGN KEY (`split_id`) REFERENCES `workoutsplits` (`split_id`) ON DELETE CASCADE
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
  CONSTRAINT `workoutsplitexercises_ibfk_1` FOREIGN KEY (`day_id`) REFERENCES `workoutsplitdays` (`day_id`) ON DELETE CASCADE,
  CONSTRAINT `workoutsplitexercises_ibfk_2` FOREIGN KEY (`exercise_id`) REFERENCES `exercises` (`exercise_id`) ON DELETE CASCADE
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

-- Dump completed on 2025-09-16  1:07:26
