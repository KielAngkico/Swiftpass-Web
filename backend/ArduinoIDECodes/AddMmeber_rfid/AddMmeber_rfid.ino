


#include <WiFi.h>
#include <WebSocketsClient.h>
#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN  5   // Pin for RFID chip select
#define RST_PIN 22  // Pin for RFID reset

const char* ssid = "unsecured network";   
const char* password = "14151621";  

const char* websocket_server = "192.168.1.180"; // WebSocket server (your PC's IP)
const uint16_t websocket_port = 8080; // WebSocket port

MFRC522 mfrc522(SS_PIN, RST_PIN);
WebSocketsClient webSocket;

void setup() {
    Serial.begin(115200);
    SPI.begin();
    mfrc522.PCD_Init();

    // Connect to Wi-Fi
    WiFi.begin(ssid, password);
    while (WiFi.status() != WL_CONNECTED) {
        delay(1000);
        Serial.println("Connecting to WiFi...");
    }
    Serial.println("Connected to WiFi!");

    // Connect to WebSocket server
    webSocket.begin(websocket_server, websocket_port, "/");
    webSocket.onEvent(webSocketEvent);
}

void loop() {
    webSocket.loop(); // Keep WebSocket connection alive

    if (mfrc522.PICC_IsNewCardPresent() && mfrc522.PICC_ReadCardSerial()) {
        String rfid = "";
        for (byte i = 0; i < mfrc522.uid.size; i++) {
            rfid += String(mfrc522.uid.uidByte[i], HEX);
        }
        rfid.toUpperCase();

        // Send RFID data via WebSocket
        webSocket.sendTXT(rfid);
        Serial.println("RFID Sent: " + rfid);

        delay(1000);
    }
}

// WebSocket event handler
void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
    switch (type) {
        case WStype_CONNECTED:
            Serial.println("WebSocket Connected!");
            break;
        case WStype_DISCONNECTED:
            Serial.println("WebSocket Disconnected!");
            break;
        case WStype_TEXT:
            Serial.printf("Received from Server: %s\n", payload);
            break;
    }
}
