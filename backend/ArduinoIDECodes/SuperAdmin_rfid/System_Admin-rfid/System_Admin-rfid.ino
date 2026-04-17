#include <WiFi.h>
#include <WebSocketsClient.h>
#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 5
#define SCK_PIN 18
#define MOSI_PIN 23
#define MISO_PIN 19
#define RST_PIN 22
#define BUZZER_PIN 13

const char* ssid = "unsecured network";
const char* password = "14151621";

const char* websocketServer = "swiftpasstech.com"; 
const int websocketPort = 443;
const String location = "SYSTEM_ADMIN";
const int ADMIN_ID = 0;
const String ARDUINO_SECRET = "SwiftpassArduino";

WebSocketsClient webSocket;
MFRC522 rfid(SS_PIN, RST_PIN);

unsigned long lastReconnectAttempt = 0;
unsigned long lastConnectionCheck = 0;
bool isAuthenticated = false;
bool connectionInProgress = false;

void setup() {
    Serial.begin(115200);
    delay(1000);
    pinMode(BUZZER_PIN, OUTPUT);
    digitalWrite(BUZZER_PIN, LOW);
    SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
    rfid.PCD_Init();
    connectWiFi();
    connectWebSocket();
}

void connectWiFi() {
    WiFi.disconnect(true);
    delay(1000);
    WiFi.mode(WIFI_STA);
    delay(500);
    WiFi.begin(ssid, password);
    int attempts = 0;
    while (WiFi.status() != WL_CONNECTED && attempts < 60) {
        delay(500);
        attempts++;
    }
}

void loop() {
    unsigned long now = millis();
    if (now - lastConnectionCheck > 10000) {
        lastConnectionCheck = now;
        if (WiFi.status() != WL_CONNECTED) {
            isAuthenticated = false;
            connectionInProgress = false;
            connectWiFi();
            return;
        }
    }
    if (!webSocket.isConnected() && !connectionInProgress) {
        if (now - lastReconnectAttempt > 5000) {
            isAuthenticated = false;
            connectWebSocket();
            lastReconnectAttempt = now;
        }
        return;
    }
    webSocket.loop();
    if (isAuthenticated && webSocket.isConnected()) {
        scanRFID();
    } else if (!connectionInProgress) {
        static unsigned long lastWaitMsg = 0;
        if (now - lastWaitMsg > 5000) lastWaitMsg = now;
        delay(1000);
    }
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
    String authMessage = "{\"type\":\"auth-arduino\",\"admin_id\":" + String(ADMIN_ID) + ",\"secret\":\"" + ARDUINO_SECRET + "\"}";
    webSocket.sendTXT(authMessage);
}

void scanRFID() {
    if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;
    String rfidTag = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
        rfidTag += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "") + String(rfid.uid.uidByte[i], HEX);
    }
    rfidTag.toUpperCase();
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    String jsonData = "{\"rfid_tag\":\"" + rfidTag + "\", \"location\":\"" + location + "\"}";
    webSocket.sendTXT(jsonData);
    rfid.PICC_HaltA();
    delay(500);
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_DISCONNECTED:
            isAuthenticated = false;
            connectionInProgress = false;
            break;
        case WStype_CONNECTED:
            connectionInProgress = false;
            isAuthenticated = false;
            delay(1000);
            authenticateArduino();
            break;
        case WStype_TEXT: {
            String message = String((char*)payload);
            if (message.indexOf("auth-success") != -1) isAuthenticated = true;
            else if (message.indexOf("auth-failed") != -1) isAuthenticated = false;
            break;
        }
        case WStype_ERROR:
            connectionInProgress = false;
            break;
        default:
            break;
    }
}
