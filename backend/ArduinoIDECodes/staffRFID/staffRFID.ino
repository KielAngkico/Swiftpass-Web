#include <WiFi.h>
#include <WebSocketsClient.h>
#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 5
#define SCK_PIN 18
#define MOSI_PIN 23
#define MISO_PIN 19
#define RST_PIN 22

const char* ssid = "Galaxy A14";
const char* password = "10102022";
const char* websocketServer = "192.168.223.116";
const int websocketPort = 8080;

String location = "STAFF"; 

WebSocketsClient webSocket;
MFRC522 rfid(SS_PIN, RST_PIN);

void setup() {
    Serial.begin(115200);
    WiFi.begin(ssid, password);
    SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
    rfid.PCD_Init();

    Serial.println("Connecting to Wi-Fi...");
    while (WiFi.status() != WL_CONNECTED) {
        delay(500);
        Serial.print(".");
    }
    Serial.println("\n✅ Wi-Fi Connected.");

    webSocket.begin(websocketServer, websocketPort, "/");
    webSocket.onEvent(webSocketEvent);
    Serial.println("✅ WebSocket Initialized.");
}

void loop() {
    webSocket.loop();
    scanRFID();
}

void scanRFID() {
    if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
        return;
    }

    String rfidTag = "";
    for (byte i = 0; i < rfid.uid.size; i++) {
        rfidTag += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "") + String(rfid.uid.uidByte[i], HEX);
    }

    rfidTag.toUpperCase();

    Serial.print("Scanned at: ");
    Serial.print(location);
    Serial.print(" | UID: ");
    Serial.println(rfidTag);

    // ✅ Send RFID with location as STAFF
    String jsonData = "{\"rfid_tag\":\"" + rfidTag + "\", \"location\":\"" + location + "\"}";
    webSocket.sendTXT(jsonData);

    rfid.PICC_HaltA();
    delay(500);
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_TEXT:
            Serial.println("📡 Server Response: " + String((char*)payload));
            break;

        case WStype_CONNECTED:
            Serial.println("✅ WebSocket Connected.");
            break;

        case WStype_DISCONNECTED:
            Serial.println("⚠ WebSocket Disconnected.");
            break;
    }
}
