#include <WiFi.h>
#include <WebSocketsClient.h>
#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 5
#define RST_PIN 22
#define RELAY_PIN 4

const char* ssid = "Galaxy A14";
const char* password = "10102022";
const char* websocketServer = "192.168.81.116"; // backend IP
const int websocketPort = 5000;

String location = "SUPERADMIN";

WebSocketsClient webSocket;
MFRC522 rfid(SS_PIN, RST_PIN);

unsigned long lastScanTime = 0;
const unsigned long scanCooldown = 3000; // 3 sec cooldown

void setup() {
  Serial.begin(115200);
  WiFi.begin(ssid, password);

  SPI.begin();
  rfid.PCD_Init();

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH); // Locked

  Serial.println("Connecting to Wi-Fi...");
  while (WiFi.status() != WL_CONNECTED) {
    delay(500);
    Serial.print(".");
  }
  Serial.println("\n✅ Wi-Fi Connected");

  webSocket.begin(websocketServer, websocketPort, "/");
  webSocket.onEvent(webSocketEvent);
  Serial.println("✅ WebSocket Initialized");
}

void loop() {
  webSocket.loop();
  scanRFID();
}

void scanRFID() {
  if (millis() - lastScanTime < scanCooldown) return;
  if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) return;

  lastScanTime = millis();

  String rfidTag = "";
  for (byte i = 0; i < rfid.uid.size; i++) {
    rfidTag += String(rfid.uid.uidByte[i] < 0x10 ? "0" : "") + String(rfid.uid.uidByte[i], HEX);
  }
  rfidTag.toUpperCase();

  Serial.print("Detected RFID: ");
  Serial.println(rfidTag);

  // Send minimal JSON: just rfid_tag + location
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
      Serial.println("✅ WebSocket Connected");
      break;
    case WStype_DISCONNECTED:
      Serial.println("⚠ WebSocket Disconnected");
      break;
  }
}
