#include <CurieBLE.h>
#define LED_PIN 6
//#include <BLEPeripheral.h>

BLEPeripheral blePeripheral;
BLEService ledService = BLEService("FF10");
BLECharCharacteristic switchCharacteristic = BLECharCharacteristic("FF11", BLERead | BLEWrite);
BLEDescriptor switchDescriptor = BLEDescriptor("2901", "Switch");
BLEUnsignedCharCharacteristic dimmerCharacteristic = BLEUnsignedCharCharacteristic("FF12", BLERead | BLEWrite);
BLEDescriptor dimmerDescriptor = BLEDescriptor("2901", "Dimmer");

void setup() {
  Serial.begin(9600);
  pinMode(LED_PIN, OUTPUT);
  
  blePeripheral.setLocalName("BLELED");
  blePeripheral.setDeviceName("BLELED");
  
  blePeripheral.addAttribute(ledService);
  
  blePeripheral.addAttribute(switchCharacteristic);
  blePeripheral.addAttribute(switchDescriptor);
  blePeripheral.addAttribute(dimmerCharacteristic);
  blePeripheral.addAttribute(dimmerDescriptor);
  
  switchCharacteristic.setEventHandler(BLEWritten, switchCharacteristicWritten);
  dimmerCharacteristic.setEventHandler(BLEWritten, dimmerCharacteristicWritten);
  
  blePeripheral.setAdvertisedServiceUuid(ledService.uuid());
  blePeripheral.begin();
}

void loop() {
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

void dimmerCharacteristicWritten(BLECentral& central, BLECharacteristic& characteristic) {
    Serial.println(F("Dimmer set to:"));
    Serial.println(dimmerCharacteristic.value());
    analogWrite(LED_PIN, dimmerCharacteristic.value());
}
