CREATE TABLE SuperAdminAccounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    superadmin_name VARCHAR(100),
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE AdminAccounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
	admin_name VARCHAR(100),
	age INT,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    address varchar(255) NOT NULL,
    gym_name VARCHAR(100),
    system_type VARCHAR(20) NOT NULL,
    session_fee INT,
    is_archived TINYINT(1) DEFAULT 0,
    status ENUM('active', 'inactive') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);
CREATE TABLE StaffAccounts (
    id INT AUTO_INCREMENT PRIMARY KEY,
    admin_id INT,
    staff_name VARCHAR(100),
    age INT,
    contact_number INT,
    address varchar(255) NOT NULL,
    email VARCHAR(255) UNIQUE,
    password VARCHAR(255),
    profile_image_url TEXT,
    status ENUM('active', 'inactive', 'archived', 'disabled') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (admin_id) REFERENCES AdminAccounts(id)
);

CREATE TABLE StaffSessionLogs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  staff_id INT NOT NULL,
  staff_name VARCHAR(255) NOT NULL,
  admin_id INT NOT NULL,
  system_type VARCHAR(50) NOT NULL,
  status ENUM('online', 'offline') DEFAULT 'online',
  login_time DATETIME DEFAULT CURRENT_TIMESTAMP,
  logout_time DATETIME
);

CREATE TABLE AdminsAccounts_Archived (
    id INT PRIMARY KEY,
    admin_name VARCHAR(255) NOT NULL,
    age INT NOT NULL,
    email VARCHAR(255) NOT NULL,
    address VARCHAR(255),
    gym_name VARCHAR(255),
    system_type VARCHAR(20) NOT NULL,
    session_fee INT,
    archived_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE StaffAccounts_Archived (
  id int NOT NULL,
  admin_id int DEFAULT NULL,
  staff_name varchar(100) DEFAULT NULL,
  age int DEFAULT NULL,
  contact_number int DEFAULT NULL,
  address varchar(255) NOT NULL,
  email varchar(255) DEFAULT NULL,
  password varchar(255) DEFAULT NULL,
  status enum('active','inactive') DEFAULT 'inactive',
  created_at timestamp NULL,
  archived_at timestamp DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (`id`)
);

CREATE TABLE MembersAccounts (
    id INT NOT NULL AUTO_INCREMENT,
    rfid_tag VARCHAR(50) NOT NULL UNIQUE,
    full_name VARCHAR(100) NOT NULL,
    gender ENUM('male', 'female', 'other') NOT NULL,
    age INT,
    phone_number VARCHAR(15) NOT NULL,
    address VARCHAR(255),
    email VARCHAR(100),
    password VARCHAR(255) NOT NULL,
    profile_image_url TEXT,
    admin_id INT NOT NULL,
    staff_name VARCHAR(255) NOT NULL,
    initial_balance DECIMAL(10,2) DEFAULT 0.00,
    current_balance DECIMAL(10,2) DEFAULT 0.00,
    subscription_type varchar(55) DEFAULT NULL,
    subscription_fee DECIMAL(10,2) DEFAULT NULL,
    subscription_start DATE DEFAULT NULL,
    subscription_expiry DATE DEFAULT NULL,
    system_type ENUM('prepaid_entry', 'subscription') NOT NULL,
    payment DECIMAL(10,2) DEFAULT NULL,
    status ENUM('active','inactive','banned') DEFAULT 'active',
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (admin_id) REFERENCES AdminAccounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE AdminPricingOptions (
	id INT NOT NULL AUTO_INCREMENT,
	admin_id INT NOT NULL,                            
	system_type ENUM('prepaid_entry', 'subscription') NOT NULL,
	plan_name VARCHAR(100) NOT NULL,                       
	amount_to_pay DECIMAL(10,2) NOT NULL,                  
	amount_to_credit DECIMAL(10,2),                     
	duration_in_days INT,                                  
	created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
	updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
	is_active BOOLEAN DEFAULT TRUE,
	PRIMARY KEY (id),
	FOREIGN KEY (admin_id) REFERENCES AdminAccounts(id) ON DELETE CASCADE
	) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
    
CREATE TABLE AdminPaymentMethods (
    id INT NOT NULL AUTO_INCREMENT,
    admin_id INT NOT NULL,                    
    name VARCHAR(50) NOT NULL,           
    reference_number VARCHAR(100),
    is_default BOOLEAN DEFAULT 0,
    is_enabled BOOLEAN DEFAULT TRUE,           
    sort_order INT DEFAULT 0,              
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
    PRIMARY KEY (id),
    FOREIGN KEY (admin_id) REFERENCES AdminAccounts(id) ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE AdminTransactions (
    transaction_id INT NOT NULL AUTO_INCREMENT,
    admin_id INT NOT NULL,                       
    member_id INT,                               
    member_name VARCHAR(100) NOT NULL,
    rfid_tag VARCHAR(50) NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_method ENUM('Cash', 'GCash') NOT NULL,
    reference VARCHAR(100) DEFAULT NULL,
    staff_name VARCHAR(100) DEFAULT NULL,
    transaction_type ENUM('renewal','new_membership','trainer_session','Tapup','day_pass_session') NOT NULL,
    plan_name VARCHAR(100) DEFAULT NULL,
    transaction_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    PRIMARY KEY (transaction_id),
    FOREIGN KEY (admin_id) REFERENCES AdminAccounts(id) ON DELETE CASCADE,
    FOREIGN KEY (member_id) REFERENCES MembersAccounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE SuperAdminInventory (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(255) NOT NULL,
  type VARCHAR(100) NOT NULL, 
  quantity INT UNSIGNED DEFAULT 0 CHECK (quantity >= 0), 
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_type (type),
  INDEX idx_name (name)  
);

CREATE TABLE RegisteredRfid (
  id INT AUTO_INCREMENT PRIMARY KEY,
  rfid_tag VARCHAR(255) NOT NULL UNIQUE,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  INDEX idx_rfid_tag (rfid_tag) -- quick lookups when scanning
);

CREATE TABLE AdminEntryLogs (
  id INT NOT NULL AUTO_INCREMENT,
  rfid_tag VARCHAR(50) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  admin_id INT NOT NULL,           
  staff_name VARCHAR(255) DEFAULT NULL, 
  visitor_type ENUM('Member', 'Day Pass') NOT NULL DEFAULT 'Member',
  system_type ENUM('prepaid_entry', 'subscription') NOT NULL,
  deducted_amount DECIMAL(10,2) DEFAULT NULL,  
  remaining_balance DECIMAL(10,2) DEFAULT NULL, 
  subscription_expiry DATE DEFAULT NULL,       
  member_status ENUM('inside', 'outside') NOT NULL DEFAULT 'outside',
  entry_time DATETIME DEFAULT NULL,
  exit_time DATETIME DEFAULT NULL,
  location VARCHAR(100) DEFAULT NULL,         
  PRIMARY KEY (id),
  KEY admin_id (admin_id),
  CONSTRAINT entrylogs_ibfk_1 FOREIGN KEY (admin_id)
    REFERENCES AdminAccounts (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE DayPassGuests (
  id INT AUTO_INCREMENT PRIMARY KEY,
  guest_name VARCHAR(255),
  gender VARCHAR(20),
  rfid_tag VARCHAR(255) NOT NULL,
  admin_id INT NOT NULL,
  system_type ENUM('prepaid_entry', 'subscription') NOT NULL,
  staff_name VARCHAR(255) NOT NULL,
  paid_amount DECIMAL(10,2) NOT NULL,
  created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
  expires_at DATETIME NOT NULL,
  status ENUM('active', 'expired', 'returned') DEFAULT 'active',
  notes TEXT NULL
);

CREATE TABLE AdminMembersTransactions (
  id INT NOT NULL AUTO_INCREMENT,
  rfid_tag VARCHAR(50) NOT NULL,
  full_name VARCHAR(100) NOT NULL,
  admin_id INT NOT NULL,                         
  transaction_type ENUM('top_up', 'entry', 'refund', 'new_member', 'new_subscription','renew_subscription'  ) NOT NULL,
  amount DECIMAL(10,2) NOT NULL,              
  balance_added DECIMAL(10,2) DEFAULT NULL,      
  new_balance DECIMAL(10,2) DEFAULT NULL,         
  subscription_type VARCHAR(50) DEFAULT NULL,     
  subscription_start DATE DEFAULT NULL,
  subscription_expiry DATE DEFAULT NULL,
  payment_method ENUM('Cash', 'GCash', 'E-Wallet') NOT NULL,
  reference VARCHAR(100) DEFAULT NULL,
  tax DECIMAL(10,2) DEFAULT 0.00,                 
  processed_by VARCHAR(100),              
  timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
  PRIMARY KEY (id),
  KEY admin_id (admin_id),
  CONSTRAINT trans_admin_fk FOREIGN KEY (admin_id)
    REFERENCES AdminAccounts (id)
    ON DELETE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE InitialAssessment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  rfid_tag VARCHAR(50) NOT NULL,
  username varchar(50) NOT NULL,
  sex ENUM('male', 'female') NOT NULL,
  age INT NOT NULL,
  height_cm FLOAT NOT NULL,
  weight_kg FLOAT NOT NULL,
  activity_level ENUM('sedentary', 'light', 'moderate', 'active', 'very active'),
  body_goal ENUM('Lose Weight', 'Gain Weight', 'Body Recomp', 'Maintain Weight'),
  goal_type ENUM('Get Toned', 'Build Muscle', 'Build Endurance'),
  calorie_maintenance FLOAT NOT NULL, -- computed TDEE
  calories_target FLOAT NOT NULL,      -- after reduction or gain
  calorie_strategy ENUM('Maintain','Mild', 'Moderate', 'Extreme'),
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  
  FOREIGN KEY (member_id) REFERENCES MembersAccounts(id) ON DELETE CASCADE
);

CREATE TABLE ExerciseAssessments (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  rfid_tag VARCHAR(50) NOT NULL,
  admin_id INT DEFAULT NULL,
  fitness_level ENUM('beginner','intermediate','advanced') DEFAULT 'beginner',
  workout_days INT,
  assigned_split_name VARCHAR(50),
  coach_notes TEXT,
  status ENUM('pending','confirmed') DEFAULT 'pending',
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_member (member_id),
  FOREIGN KEY (member_id) REFERENCES MembersAccounts(id) ON DELETE CASCADE,
  FOREIGN KEY (admin_id) REFERENCES AdminAccounts(id) ON DELETE SET NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE ExerciseLibrary (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    level ENUM('beginner', 'intermediate', 'advanced') DEFAULT 'beginner',
    muscle_group VARCHAR(50) NOT NULL,         
    exercise_type ENUM('compound','isolation','hybrid'),
    sub_target VARCHAR(50),                    
    equipment VARCHAR(100),                   
    instructions TEXT,                     
    alt_exercise_ids JSON ,     
    image_url TEXT,                          
    created_by INT,                        
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE SplitLibrary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  split_name VARCHAR(50) NOT NULL,      
  workout_days INT NOT NULL,              
  target_gender ENUM('male', 'female', 'unisex') DEFAULT 'unisex',
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE SplitDays (
  id INT AUTO_INCREMENT PRIMARY KEY,
  split_id INT NOT NULL,           
  day_number INT NOT NULL,                  
  day_title VARCHAR(100) NOT NULL,       
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (split_id) REFERENCES SplitLibrary(id) ON DELETE CASCADE
);

CREATE TABLE SplitDayExercises (
  id INT AUTO_INCREMENT PRIMARY KEY,
  split_day_id INT NOT NULL,                
  exercise_id INT NOT NULL,           
  order_index INT DEFAULT 0,          
  sets INT DEFAULT 3,             
  reps VARCHAR(20) DEFAULT '8-12',     
  rest_time VARCHAR(10) DEFAULT '60',      
  notes VARCHAR(255) DEFAULT '',        
  FOREIGN KEY (split_day_id) REFERENCES SplitDays(id) ON DELETE CASCADE,
  FOREIGN KEY (exercise_id) REFERENCES ExerciseLibrary(id)
);

CREATE TABLE RepRanges (
  id INT AUTO_INCREMENT PRIMARY KEY,
  body_goal VARCHAR(50) NOT NULL,         
  gender ENUM('male', 'female', 'unisex') DEFAULT 'unisex',
  reps_low INT NOT NULL,            
  reps_high INT NOT NULL,            
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE ExerciseDayCompletions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  rfid_tag VARCHAR(50) NOT NULL,
  split_name VARCHAR(100) NOT NULL,
  completion_date DATE NOT NULL,
  completed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (member_id) REFERENCES MembersAccounts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_daily_completion (rfid_tag, split_name, completion_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;


CREATE TABLE MacroNutrientBreakdown (
  id INT AUTO_INCREMENT PRIMARY KEY,
  goal_type VARCHAR(50) NOT NULL,        
  protein_pct DECIMAL(5,2) NOT NULL,   
  carbs_pct DECIMAL(5,2) NOT NULL,
  fats_pct DECIMAL(5,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE NutritionAssessment (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  rfid_tag VARCHAR(50),
  allergens TEXT,
  protein_ids JSON,     
  carb_ids JSON,         
  fruit_ids JSON,      
  vegetable_ids JSON,   
  calories_target FLOAT NOT NULL,
  protein_grams INT,
  carbs_grams INT,
  fats_grams INT,
  macro_breakdown_id INT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (macro_breakdown_id) REFERENCES MacroNutrientBreakdown(id),
  FOREIGN KEY (member_id) REFERENCES MembersAccounts(id) ON DELETE CASCADE
);

CREATE TABLE FoodGroups (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,   
  category ENUM('Protein','Carb','Fruit','Vegetable') NOT NULL,
  is_meat BOOLEAN DEFAULT FALSE,   
  is_red_meat BOOLEAN DEFAULT FALSE  
);

CREATE TABLE FoodLibrary (
  id INT AUTO_INCREMENT PRIMARY KEY,
  group_id INT NOT NULL,   
  name VARCHAR(255) NOT NULL,         
  grams_reference INT DEFAULT 100,    
  calories DECIMAL(10,2),
  protein DECIMAL(10,2),
  carbs DECIMAL(10,2),
  fats DECIMAL(10,2),
  created_by VARCHAR(100) NOT NULL,    
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  FOREIGN KEY (group_id) REFERENCES FoodGroups(id) ON DELETE CASCADE,
  INDEX idx_group_id (group_id)
);

CREATE TABLE Allergens (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL UNIQUE 
);

CREATE TABLE FoodAllergens (
  food_id INT NOT NULL,
  allergen_id INT NOT NULL,
  PRIMARY KEY (food_id, allergen_id),
  FOREIGN KEY (food_id) REFERENCES FoodLibrary(id) ON DELETE CASCADE,
  FOREIGN KEY (allergen_id) REFERENCES Allergens(id) ON DELETE CASCADE
);

CREATE TABLE MemberFoodPreferences (
  id INT AUTO_INCREMENT PRIMARY KEY,
  member_id INT NOT NULL,
  food_group_name VARCHAR(100) NOT NULL,
  category ENUM('Protein','Carb','Fat') NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE MemberNutritionResult (
  id INT AUTO_INCREMENT PRIMARY KEY,
  assessment_id INT NOT NULL,
  member_id INT NOT NULL,
  food_id INT NOT NULL,
  food_name VARCHAR(255),
  group_id INT NOT NULL,
  macro_type VARCHAR(50),
  portion_grams DECIMAL(10,2) NOT NULL,
  calories DECIMAL(10,2) NOT NULL,
  protein DECIMAL(10,2) NOT NULL,
  carbs DECIMAL(10,2) NOT NULL,
  fats DECIMAL(10,2) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (assessment_id) REFERENCES NutritionAssessment(id) ON DELETE CASCADE,
  FOREIGN KEY (member_id) REFERENCES MembersAccounts(id) ON DELETE CASCADE,
  FOREIGN KEY (food_id) REFERENCES FoodLibrary(id),
  FOREIGN KEY (group_id) REFERENCES FoodGroups(id)
);

CREATE TABLE UserOtp (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  otp VARCHAR(6) NOT NULL,
  type ENUM('login','reset') NOT NULL DEFAULT 'login',
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES MembersAccounts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_type (user_id, type)  
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

CREATE TABLE TrustedDevices (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  device_id VARCHAR(255) NOT NULL,
  expires_at DATETIME NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES MembersAccounts(id) ON DELETE CASCADE,
  UNIQUE KEY unique_user_device (user_id, device_id) 
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;
















