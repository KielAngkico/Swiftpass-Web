#include <SPI.h>
#include <MFRC522.h>

#define SS_PIN 5   // SDA (SS) for RFID
#define SCK_PIN 18
#define MOSI_PIN 23
#define MISO_PIN 19
#define RST_PIN 22  // Reset

MFRC522 rfid(SS_PIN, RST_PIN);
String location = "ENTRY";  // Marks this ESP as the entry scanner

void setup() {
    Serial.begin(115200);
    SPI.begin(SCK_PIN, MISO_PIN, MOSI_PIN, SS_PIN);
    rfid.PCD_Init();
    Serial.println("RFID Entry Scanner Ready.");
}

void loop() {
    if (!rfid.PICC_IsNewCardPresent() || !rfid.PICC_ReadCardSerial()) {
        return;  // No card detected
    }

    Serial.print("Detected at: ");
    Serial.print(location);
    Serial.print(" | UID: ");

    for (byte i = 0; i < rfid.uid.size; i++) {
        Serial.print(rfid.uid.uidByte[i] < 0x10 ? "0" : "");
        Serial.print(rfid.uid.uidByte[i], HEX);
    }
    Serial.println();

    rfid.PICC_HaltA();  // Stop scanning temporarily
    delay(500);
}
