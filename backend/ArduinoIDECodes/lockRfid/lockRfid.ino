#include <WiFi.h>
#include <WebSocketsClient.h>
#include <esp_now.h>

#define RELAY_PIN 12  // Magnetic lock relay

const char* ssid = "Galaxy A14";
const char* password = "10102022";
const char* websocketServer = "swiftpasstech.com";
const int websocketPort = 443;

const String location = "LOCK";
const String ARDUINO_SECRET = "SwiftpassArduino";

WebSocketsClient webSocket;

unsigned long lastReconnectAttempt = 0;
unsigned long lastConnectionCheck = 0;
bool isAuthenticated = false;
bool connectionInProgress = false;
bool offlineMode = false;

// ✅ ESP-NOW message structure (must match Entry Arduino)
typedef struct struct_message {
  char command[10];  // "UNLOCK" or "DENIED"
  char rfid[20];
  bool authorized;
} struct_message;

struct_message incomingMessage;

void setup() {
    Serial.begin(115200);
    delay(1000);

    Serial.println("\n=== SwiftPass LOCK Controller (Allocation Routing) ===");
    Serial.println("🔒 Location: " + location);
    Serial.println("📡 Using server-side admin routing");

    pinMode(RELAY_PIN, OUTPUT);
    digitalWrite(RELAY_PIN, HIGH);  // Lock engaged (HIGH = locked)

    WiFi.mode(WIFI_STA);
    
    // Print MAC address for pairing
    Serial.print("📍 My MAC Address: ");
    Serial.println(WiFi.macAddress());
    Serial.println("⚠️ Copy this MAC to Entry Arduino's lockMacAddress[]");

    initESPNow();
    connectWiFi();
    
    if (!offlineMode) {
        connectWebSocket();
    }
}

void connectWiFi() {
    Serial.println("📶 Connecting to WiFi...");
    WiFi.disconnect(true);
    delay(1000);
    WiFi.begin(ssid, password);

    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 30) {
        delay(500);
        Serial.print(".");
        attempts++;
    }

    if (WiFi.status() == WL_CONNECTED) {
        Serial.println("\n✅ WiFi Connected | IP: " + WiFi.localIP().toString());
        offlineMode = false;
    } else {
        Serial.println("\n⚠️ WiFi Failed - OFFLINE MODE (ESP-NOW only)");
        offlineMode = true;
    }
}

// ✅ Initialize ESP-NOW
void initESPNow() {
    if (esp_now_init() != ESP_OK) {
        Serial.println("❌ ESP-NOW Init Failed");
        return;
    }
    
    Serial.println("✅ ESP-NOW Initialized - Ready to receive");
    
    // Register receive callback
    esp_now_register_recv_cb(onDataReceived);
}

// ✅ ESP-NOW receive callback (for ESP-IDF v5+)
void onDataReceived(const esp_now_recv_info *recvInfo, const uint8_t *incomingData, int len) {
    memcpy(&incomingMessage, incomingData, sizeof(incomingMessage));
    
    Serial.println("\n📥 ESP-NOW Message Received:");
    Serial.print("   Command: ");
    Serial.println(incomingMessage.command);
    Serial.print("   RFID: ");
    Serial.println(incomingMessage.rfid);
    Serial.print("   Authorized: ");
    Serial.println(incomingMessage.authorized ? "YES" : "NO");

    if (strcmp(incomingMessage.command, "UNLOCK") == 0 && incomingMessage.authorized) {
        Serial.println("🔓 OFFLINE MODE: Unlocking door via ESP-NOW");
        unlockDoor();
    } else {
        Serial.println("🔒 OFFLINE MODE: Access denied via ESP-NOW");
    }
}

void loop() {
    unsigned long now = millis();

    // ✅ Check WiFi status periodically
    if (now - lastConnectionCheck > 30000) {
        lastConnectionCheck = now;
        if (WiFi.status() != WL_CONNECTED && !offlineMode) {
            Serial.println("⚠️ WiFi lost - ESP-NOW fallback active");
            offlineMode = true;
        } else if (WiFi.status() == WL_CONNECTED && offlineMode) {
            Serial.println("✅ WiFi restored - Reconnecting WebSocket");
            offlineMode = false;
            connectWebSocket();
        }
    }

    // ✅ Only handle WebSocket if online
    if (!offlineMode) {
        if (!webSocket.isConnected() && !connectionInProgress) {
            if (now - lastReconnectAttempt > 5000) {
                Serial.println("🔄 WebSocket disconnected. Reconnecting...");
                isAuthenticated = false;
                connectWebSocket();
                lastReconnectAttempt = now;
            }
            return;
        }

        webSocket.loop();
    }
    // If offline, ESP-NOW callback handles everything
}

void connectWebSocket() {
    if (WiFi.status() != WL_CONNECTED) return;

    connectionInProgress = true;
    webSocket.disconnect();
    delay(500);

    webSocket.beginSSL(websocketServer, websocketPort, "/arduino-ws");
    webSocket.onEvent(webSocketEvent);
    webSocket.setReconnectInterval(5000);
    webSocket.enableHeartbeat(15000, 3000, 2);
}

void authenticateArduino() {
    if (!webSocket.isConnected()) return;

    // ✅ NO ADMIN_ID - Server will use allocation routing
    String authMessage = "{\"type\":\"auth-arduino\""
                         ",\"location\":\"" + location + 
                         "\",\"secret\":\"" + ARDUINO_SECRET + "\"}";
    webSocket.sendTXT(authMessage);
    Serial.println("📤 Sent auth (no admin_id - using allocation routing)");
}

void unlockDoor() {
    Serial.println("🔓 Unlocking door...");
    digitalWrite(RELAY_PIN, LOW);  // Unlock
    delay(5000);  // Keep unlocked for 5 seconds
    digitalWrite(RELAY_PIN, HIGH);  // Lock again
    Serial.println("🔒 Door locked");
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            Serial.println("❌ WebSocket Disconnected");
            isAuthenticated = false;
            connectionInProgress = false;
            break;

        case WStype_CONNECTED:
            Serial.println("✅ WebSocket Connected");
            connectionInProgress = false;
            isAuthenticated = false;
            delay(1000);
            authenticateArduino();
            break;

        case WStype_TEXT: {
            String message = String((char*)payload);

            if (message.indexOf("auth-success") != -1) {
                isAuthenticated = true;
                Serial.println("✅ Authenticated! Monitoring access...");
            } else if (message.indexOf("auth-failed") != -1) {
                isAuthenticated = false;
                Serial.println("❌ Auth Failed");
            }

            // ✅ ONLINE MODE: Unlock via WebSocket
            if (message.indexOf("\"status\":\"inside\"") != -1 ||
                message.indexOf("\"status\":\"outside\"") != -1 ||
                message.indexOf("\"status\":\"staff_granted\"") != -1 ||
                message.indexOf("\"status\":\"admin_granted\"") != -1) {
                
                Serial.println("🔓 ONLINE MODE: Unlocking via WebSocket");
                unlockDoor();
            }
            break;
        }

        case WStype_ERROR:
            Serial.println("❌ WebSocket Error");
            connectionInProgress = false;
            break;

        default: break;
    }
}