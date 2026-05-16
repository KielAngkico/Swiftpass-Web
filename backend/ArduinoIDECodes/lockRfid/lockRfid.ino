#include <WiFi.h>
#include <WebSocketsClient.h>
#include <esp_now.h>
#include "esp_wifi.h"

#define RELAY_PIN 12

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

bool pendingUnlock = false;
bool pendingDenied = false;

typedef struct struct_message {
  char command[10];
  char rfid[20];
  bool authorized;
} struct_message;

struct_message incomingMessage;


// ============= SETUP =============

void setup() {
  Serial.begin(115200);
  delay(1000);

  pinMode(RELAY_PIN, OUTPUT);
  digitalWrite(RELAY_PIN, HIGH);

  Serial.println("SwiftPass Lock Controller");

  connectWiFi();
  initESPNow();

  if (!offlineMode) {
    connectWebSocket();
  }
}

// ============= WIFI =============

void connectWiFi() {
  Serial.println("Connecting to WiFi...");
  WiFi.disconnect(true);
  delay(1000);
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
    Serial.println("\nWiFi connected | IP: " + WiFi.localIP().toString());
    offlineMode = false;
  } else {
    Serial.println("\nWiFi failed - entering offline mode");
    offlineMode = true;
  }
}

// ============= ESP-NOW =============

void initESPNow() {
  esp_now_deinit();
  delay(100);

  if (esp_now_init() != ESP_OK) {
    Serial.println("ESP-NOW init failed");
    return;
  }

  Serial.println("ESP-NOW initialized - ready to receive");
  esp_now_register_recv_cb(onDataReceived);
}

void onDataReceived(const esp_now_recv_info *recvInfo, const uint8_t *incomingData, int len) {
  memcpy(&incomingMessage, incomingData, sizeof(incomingMessage));

  if (strcmp(incomingMessage.command, "UNLOCK") == 0 && incomingMessage.authorized) {
    pendingUnlock = true;
  } else {
    pendingDenied = true;
  }
}

// ============= LOOP =============

void loop() {
  unsigned long now = millis();

  if (pendingUnlock) {
    pendingUnlock = false;
    Serial.println("ESP-NOW: unlock received");
    openRelay();
  }

  if (pendingDenied) {
    pendingDenied = false;
    Serial.println("ESP-NOW: denied received");
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
      Serial.println("WiFi lost - switching to offline mode");
      offlineMode = true;
      isAuthenticated = false;
      connectionInProgress = false;
      webSocket.disconnect();
esp_now_deinit();
      delay(100);
      initESPNow();

    } else if (wifiUp && offlineMode) {
      Serial.println("WiFi restored - switching to online mode");
      offlineMode = false;
      esp_now_deinit();
      delay(100);
      initESPNow();
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

// ============= WEBSOCKET =============

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
      String message = String((char*)payload);

      if (message.indexOf("auth-success") != -1) {
        isAuthenticated = true;
        Serial.println("Authenticated");
      } else if (message.indexOf("auth-failed") != -1) {
        isAuthenticated = false;
        Serial.println("Auth failed");
      }

      if (message.indexOf("\"status\":\"inside\"") != -1 ||
          message.indexOf("\"status\":\"outside\"") != -1 ||
          message.indexOf("\"status\":\"staff_granted\"") != -1 ||
          message.indexOf("\"status\":\"admin_granted\"") != -1 ||
          message.indexOf("\"status\":\"member_granted\"") != -1 ||
          message.indexOf("\"status\":\"daypass_granted\"") != -1) {

        Serial.println("ONLINE: access granted - opening relay");
        openRelay();
      }
      else if (message.indexOf("\"status\":\"denied\"") != -1 ||
               message.indexOf("\"status\":\"unregistered\"") != -1) {
        Serial.println("ONLINE: access denied");
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

// ============= RELAY =============

void openRelay() {
  if (relayOpen) {
    relayOpenTime = millis();
    Serial.println("Relay timer reset - door stays open");
    return;
  }

  digitalWrite(RELAY_PIN, LOW);
  relayOpen = true;
  relayOpenTime = millis();
  Serial.println("Relay ON - door unlocked");
}
