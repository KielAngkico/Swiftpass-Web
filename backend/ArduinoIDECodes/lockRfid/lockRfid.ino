#include <WiFi.h>
#include <WebSocketsClient.h>
#include "esp_wifi.h"

#define RELAY_PIN 12
#define BUZZER_PIN 13

const char* ssid = "Galaxy A14";
const char* password = "10102022";
const char* websocketServer = "swiftpasstech.com";
const int websocketPort = 443;

const String location = "LOCK";
const String ARDUINO_SECRET = "SwiftpassArduino";

WebSocketsClient webSocket;

unsigned long lastReconnectAttempt = 0;
unsigned long lastConnectionCheck = 0;
unsigned long lastOnlineCheck = 0;
bool isAuthenticated = false;
bool connectionInProgress = false;
bool offlineMode = false;

bool relayOpen = false;
unsigned long relayOpenTime = 0;
const unsigned long relayDuration = 5000;

bool buzzerOn = false;
unsigned long buzzerStartTime = 0;
unsigned long buzzerDuration = 0;
char wsMessage[1024];

void startBuzzer(unsigned long duration) {
  digitalWrite(BUZZER_PIN, HIGH);
  buzzerOn = true;
  buzzerStartTime = millis();
  buzzerDuration = duration;
}

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

void wifiFailedBeep() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(1000);
  digitalWrite(BUZZER_PIN, LOW);
}

void modeSwitchBeep() {
  for (int i = 0; i < 2; i++) {
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(80);
    digitalWrite(BUZZER_PIN, HIGH);
    delay(100);
    digitalWrite(BUZZER_PIN, LOW);
    delay(200);
  }
}

void wsAuthBeep() {
  digitalWrite(BUZZER_PIN, HIGH);
  delay(200);
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

void setup() {
  Serial.begin(115200);
  delay(1000);
  setCpuFrequencyMhz(240);

  pinMode(RELAY_PIN, OUTPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);
  digitalWrite(BUZZER_PIN, LOW);

Serial.println("SwiftPass Lock Controller");
  Serial.println("Free heap: " + String(ESP.getFreeHeap()));
  bootBeep();

  connectWiFi();

  if (!offlineMode) {
    connectWebSocket();
  }
}

void connectWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.disconnect(true);
  delay(1000);
WiFi.mode(WIFI_STA);
  WiFi.setTxPower(WIFI_POWER_8_5dBm);
  delay(500);
  WiFi.begin(ssid, password);

  int attempts = 0;
  while (WiFi.status() != WL_CONNECTED && attempts < 30) {
    delay(500);
    Serial.print(".");
    attempts++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\nWiFi connected | IP: " + WiFi.localIP().toString());
    offlineMode = false;
    wifiConnectedBeep();
  } else {
    Serial.println("\nWiFi failed - offline mode");
    offlineMode = true;
    wifiFailedBeep();
  }
}

void loop() {
  unsigned long now = millis();

  if (heap_caps_get_free_size(MALLOC_CAP_DEFAULT) < 10000) {
    Serial.println("Low memory - restarting");
    delay(500);
    ESP.restart();
  }

  if (buzzerOn && now - buzzerStartTime >= buzzerDuration) {
    digitalWrite(BUZZER_PIN, LOW);
    buzzerOn = false;
  }

  if (relayOpen && now - relayOpenTime >= relayDuration) {
    digitalWrite(RELAY_PIN, HIGH);
    relayOpen = false;
    Serial.println("Relay OFF - door locked");
  }

  if (now - lastOnlineCheck > 5000) {
    lastOnlineCheck = now;
    bool wifiUp = (WiFi.status() == WL_CONNECTED);

    if (!wifiUp && !offlineMode) {
      Serial.println("WiFi lost - offline mode");
      offlineMode = true;
      isAuthenticated = false;
      connectionInProgress = false;
      webSocket.disconnect();
      modeSwitchBeep();

    } else if (wifiUp && offlineMode) {
      Serial.println("WiFi restored - online mode");
      offlineMode = false;
      modeSwitchBeep();
      connectWebSocket();
    }
  }

  if (!offlineMode) {
    if (now - lastConnectionCheck > 10000) {
      lastConnectionCheck = now;
      if (WiFi.status() != WL_CONNECTED) {
        Serial.println("WiFi lost - reconnecting...");
        isAuthenticated = false;
        connectionInProgress = false;
        connectWiFi();
        return;
      }
    }

    if (!webSocket.isConnected() && !connectionInProgress) {
      if (now - lastReconnectAttempt > 5000) {
        Serial.println("WebSocket disconnected - reconnecting...");
        isAuthenticated = false;
        connectWebSocket();
        lastReconnectAttempt = now;
      }
      return;
    }

    webSocket.loop();
  }
}

void connectWebSocket() {
  if (WiFi.status() != WL_CONNECTED) return;

  connectionInProgress = true;
  webSocket.disconnect();
  delay(2000);

  webSocket.beginSSL(websocketServer, websocketPort, "/arduino-ws");
  webSocket.onEvent(webSocketEvent);
  webSocket.setReconnectInterval(5000);
  webSocket.enableHeartbeat(15000, 3000, 2);
}

void authenticateArduino() {
  if (!webSocket.isConnected()) return;

  String authMessage = "{\"type\":\"auth-arduino\""
                       ",\"location\":\"" + location +
                       "\",\"secret\":\"" + ARDUINO_SECRET + "\"}";
  webSocket.sendTXT(authMessage);
  Serial.println("Auth sent");
}

void webSocketEvent(WStype_t type, uint8_t* payload, size_t length) {
  switch (type) {

    case WStype_DISCONNECTED:
      isAuthenticated = false;
      connectionInProgress = false;
      Serial.println("WebSocket disconnected");
      break;

    case WStype_CONNECTED:
      connectionInProgress = false;
      isAuthenticated = false;
      Serial.println("WebSocket connected");
      delay(1000);
      authenticateArduino();
      break;

case WStype_TEXT: {
      memset(wsMessage, 0, sizeof(wsMessage));
      memcpy(wsMessage, payload, min((size_t)1023, length));

if (strstr(wsMessage, "auth-success") != NULL) {
        isAuthenticated = true;
        Serial.println("Authenticated");
        wsAuthBeep();
      } else if (strstr(wsMessage, "auth-failed") != NULL) {
        isAuthenticated = false;
        Serial.println("Auth failed");
        deniedBeep();
      }

      if (strstr(wsMessage, "\"status\":\"inside\"") != NULL ||
          strstr(wsMessage, "\"status\":\"outside\"") != NULL ||
          strstr(wsMessage, "\"status\":\"staff_granted\"") != NULL ||
          strstr(wsMessage, "\"status\":\"admin_granted\"") != NULL ||
          strstr(wsMessage, "\"status\":\"member_granted\"") != NULL ||
          strstr(wsMessage, "\"status\":\"daypass_granted\"") != NULL) {

        Serial.println("ONLINE: access granted - opening relay");
        openRelay();
      }
      else if (strstr(wsMessage, "\"status\":\"denied\"") != NULL ||
               strstr(wsMessage, "\"status\":\"unregistered\"") != NULL) {
        Serial.println("ONLINE: access denied");
        deniedBeep();
      }
      break;
    }

    case WStype_ERROR:
      connectionInProgress = false;
      Serial.println("WebSocket error");
      break;

    default: break;
  }
}

void openRelay() {
  if (relayOpen) {
    relayOpenTime = millis();
    Serial.println("Relay timer reset - door stays open");
    return;
  }

  startBuzzer(500);
  digitalWrite(RELAY_PIN, LOW);
  relayOpen = true;
  relayOpenTime = millis();
  Serial.println("Relay ON - door unlocked");
}