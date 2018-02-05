#include <CurieBLE.h>
#define LED_PIN 6
//#include <BLEPeripheral.h>

BLEPeripheral blePeripheral;
BLEService ledService = BLEService("FF10");
BLECharCharacteristic switchCharacteristic = BLECharCharacteristic("FF11", BLERead | BLEWrite);
BLEDescriptor switchDescriptor = BLEDescriptor("2901", "Switch");

void setup() {
  // put your setup code here, to run once:
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  blePeripheral.setLocalName("BLELED");
  blePeripheral.setDeviceName("BLELED");
  blePeripheral.addAttribute(ledService);
  blePeripheral.addAttribute(switchCharacteristic);
  blePeripheral.addAttribute(switchDescriptor);
  switchCharacteristic.setEventHandler(BLEWritten, switchCharacteristicWritten);
  blePeripheral.setAdvertisedServiceUuid(ledService.uuid());
  blePeripheral.begin();
}

void loop() {
  // put your main code here, to run repeatedly:
//  digitalWrite(LED_PIN, HIGH);
//  delay(1000);
//  digitalWrite(LED_PIN, LOW);
//  delay(1000);
  blePeripheral.poll();
}

void switchCharacteristicWritten(BLECentral& central, BLECharacteristic& characteristic) {
  if (switchCharacteristic.value()) {
    Serial.println(F("LED on"));
    digitalWrite(LED_PIN, HIGH);
  } else {
    Serial.println(F("LED off"));
    digitalWrite(LED_PIN, LOW);
  }
}


