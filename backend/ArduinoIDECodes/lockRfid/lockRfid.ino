#include <WiFi.h>
#include <esp_now.h>

#define RELAY_PIN 12  // Magnetic lock relay

// ✅ WiFi credentials — for channel sync ONLY, no WebSocket
const char* ssid = "Galaxy A14";
const char* password = "10102022";

unsigned long lastConnectionCheck = 0;

// ✅ ESP-NOW message structure (must match Entry and Exit)
typedef struct struct_message {
  char command[10];  // "UNLOCK" or "DENIED"
  char rfid[20];
  bool authorized;
} struct_message;

struct_message incomingMessage;

// ============= SETUP =============
void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n=== SwiftPass LOCK Controller ===");
    Serial.println("🔒 ESP-NOW only — no WebSocket");

    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, HIGH);  // Lock engaged (HIGH = locked)

    // ✅ Connect to WiFi for channel sync only
    connectWiFi();

    // ✅ Init ESP-NOW AFTER WiFi so channel is synced
    initESPNow();
}

// ============= WIFI (channel sync only) =============
void connectWiFi() {
    Serial.println("📶 Connecting to WiFi for channel sync...");
    WiFi.mode(WIFI_STA);
    delay(500);
    WiFi.begin(ssid, password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi Connected (channel synced) | IP: " + WiFi.localIP().toString());
        Serial.print("📍 My MAC Address: ");
        Serial.println(WiFi.macAddress());
    } else {
        Serial.println("\n⚠️ WiFi Failed - ESP-NOW will use default channel");
        Serial.println("   (Make sure Entry/Exit are also offline for channel to match)");
        WiFi.mode(WIFI_STA);  // keep STA mode even if not connected
        delay(500);
        Serial.print("📍 My MAC Address: ");
        Serial.println(WiFi.macAddress());
    }
}

// ============= ESP-NOW =============
void initESPNow() {
    if (esp_now_init() != ESP_OK) {
        Serial.println("❌ ESP-NOW Init Failed");
        return;
    }

    Serial.println("✅ ESP-NOW Initialized - Ready to receive from Entry and Exit");

    // ✅ Accept from ANY sender — no need to register peers for receive-only
    esp_now_register_recv_cb(onDataReceived);
}

// ✅ Receives from both Entry and Exit
void onDataReceived(const esp_now_recv_info *recvInfo, const uint8_t *incomingData, int len) {
    memcpy(&incomingMessage, incomingData, sizeof(incomingMessage));

    // Print sender MAC
    char senderMac[18];
    snprintf(senderMac, sizeof(senderMac), "%02X:%02X:%02X:%02X:%02X:%02X",
             recvInfo->src_addr[0], recvInfo->src_addr[1], recvInfo->src_addr[2],
             recvInfo->src_addr[3], recvInfo->src_addr[4], recvInfo->src_addr[5]);

    Serial.println("\n📥 ESP-NOW Message Received:");
    Serial.print("   From: ");
    Serial.println(senderMac);
    Serial.print("   Command: ");
    Serial.println(incomingMessage.command);
    Serial.print("   RFID: ");
    Serial.println(incomingMessage.rfid);
    Serial.print("   Authorized: ");
    Serial.println(incomingMessage.authorized ? "YES" : "NO");

    if (strcmp(incomingMessage.command, "UNLOCK") == 0 && incomingMessage.authorized) {
        Serial.println("🔓 Unlocking door");
        unlockDoor();
    } else {
        Serial.println("🔒 Access denied - door stays locked");
    }
}

// ============= LOOP =============
void loop() {
    unsigned long now = millis();

    // ✅ Periodically check WiFi — reconnect if dropped (for channel sync)
    if (now - lastConnectionCheck > 30000) {
        lastConnectionCheck = now;
        if (WiFi.status() != WL_CONNECTED) {
            Serial.println("⚠️ WiFi lost - attempting reconnect for channel sync");
            WiFi.begin(ssid, password);
        }
    }

    // ✅ Nothing else needed — ESP-NOW callback handles everything
}

// ============= RELAY =============
void unlockDoor() {
    Serial.println("🔓 Relay ON - Door unlocked");
    digitalWrite(RELAY_PIN, LOW);   // Unlock
    delay(5000);                     // Keep unlocked 5 seconds
    digitalWrite(RELAY_PIN, HIGH);  // Lock again
    Serial.println("🔒 Relay OFF - Door locked");
}
