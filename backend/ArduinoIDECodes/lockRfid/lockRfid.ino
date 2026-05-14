#include <WiFi.h>
#include <esp_now.h>
#include "esp_wifi.h"
#define RELAY_PIN 12
#define BUZZER_PIN 13

const char* ssid = "Galaxy A14";
const char* password = "10102022";

unsigned long lastConnectionCheck = 0;

typedef struct struct_message {
  char command[10];
  char rfid[20];
  bool authorized;
} struct_message;

struct_message incomingMessage;

// ============= BUZZER =============

void bootBeep() {
  for (int i = 0; i < 2; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(300);
    digitalWrite(BUZZER_PIN, LOW);
    delay(300);
  }
}

void wifiConnectedBeep() {
  int durations[] = {100, 150, 200};
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(durations[i]);
    digitalWrite(BUZZER_PIN, LOW);
    delay(100);
  }
}

void espNowReadyBeep() {
  for (int i = 0; i < 5; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(80);
    digitalWrite(BUZZER_PIN, LOW);
    delay(80);
  }
}

void espNowFailedBeep() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(1000);
  digitalWrite(BUZZER_PIN, LOW);
}

void unlockBeep() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(500);
  digitalWrite(BUZZER_PIN, LOW);
}

void deniedBeep() {
  for (int i = 0; i < 3; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(150);
    digitalWrite(BUZZER_PIN, LOW);
    delay(150);
  }
}

// ============= SETUP =============

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(BUZZER_PIN, LOW);

  Serial.println("SwiftPass Lock Controller");
  bootBeep();

  connectWiFi();
  initESPNow();
}

// ============= WIFI =============

void connectWiFi() {
  Serial.println("Connecting to WiFi for channel sync...");
  WiFi.mode(WIFI_STA);
  esp_wifi_set_channel(1, WIFI_SECOND_CHAN_NONE); 
  delay(500);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected | MAC: " + WiFi.macAddress());
    wifiConnectedBeep();
  } else {
    Serial.println("\nWiFi failed - ESP-NOW forced to channel 1");
    Serial.println("MAC: " + WiFi.macAddress());
  }
}

// ============= ESP-NOW =============

void initESPNow() {
  esp_now_deinit();
  delay(100);

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    espNowFailedBeep();
    return;
  }

  Serial.println("ESP-NOW initialized - ready to receive");
  esp_now_register_recv_cb(onDataReceived);
  espNowReadyBeep();
}

void onDataReceived(const esp_now_recv_info *recvInfo, const uint8_t *incomingData, int len) {
  memcpy(&incomingMessage, incomingData, sizeof(incomingMessage));

  char senderMac[18];
  snprintf(senderMac, sizeof(senderMac), "%02X:%02X:%02X:%02X:%02X:%02X",
           recvInfo->src_addr[0], recvInfo->src_addr[1], recvInfo->src_addr[2],
           recvInfo->src_addr[3], recvInfo->src_addr[4], recvInfo->src_addr[5]);

  Serial.println("ESP-NOW received from: " + String(senderMac));
  Serial.println("Command: " + String(incomingMessage.command));
  Serial.println("RFID: " + String(incomingMessage.rfid));
  Serial.println("Authorized: " + String(incomingMessage.authorized ? "YES" : "NO"));

  if (strcmp(incomingMessage.command, "UNLOCK") == 0 && incomingMessage.authorized) {
    Serial.println("Unlocking door");
    unlockDoor();
  } else {
    Serial.println("Access denied - door stays locked");
    deniedBeep();
  }
}

// ============= LOOP =============

void loop() {
  unsigned long now = millis();

  if (now - lastConnectionCheck > 5000) {
    lastConnectionCheck = now;
    if (WiFi.status() != WL_CONNECTED) {
      Serial.println("WiFi lost - reconnecting for channel sync");
      WiFi.begin(ssid, password);
    }
  }
}

// ============= RELAY =============

void unlockDoor() {
  unlockBeep();
  Serial.println("Relay ON - door unlocked");
  digitalWrite(RELAY_PIN, LOW);
  delay(5000);
  digitalWrite(RELAY_PIN, HIGH);
  Serial.println("Relay OFF - door locked");
}
