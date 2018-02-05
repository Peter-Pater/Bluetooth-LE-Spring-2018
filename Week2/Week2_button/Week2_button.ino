#include <CurieBLE.h>
#define BUTTON_PIN 7
//#include <BLEPeripheral.h>

BLEPeripheral blePeripheral;
BLEService buttonService = BLEService("FFE0");
BLECharCharacteristic buttonCharacteristic = BLECharCharacteristic("FFE1", BLENotify);
BLEDescriptor buttonDescriptor = BLEDescriptor("2901", "Button State");

void setup() {
  Serial.begin(9600);
  
  blePeripheral.setLocalName("BLEBUTTON");
  blePeripheral.setDeviceName("BLEBUTTON");
  blePeripheral.setAdvertisedServiceUuid(buttonService.uuid());
  
  blePeripheral.addAttribute(buttonService);
  blePeripheral.addAttribute(buttonCharacteristic);
  blePeripheral.addAttribute(buttonDescriptor);
 
  blePeripheral.begin();

  Serial.println("Bluetooth Button");
}

void loop() {
  blePeripheral.poll();

  char buttonValue = digitalRead(BUTTON_PIN);

  if (buttonCharacteristic.value() != buttonValue){
    Serial.print("Button ");
    Serial.println(buttonValue, HEX);
    buttonCharacteristic.setValue(buttonValue);
  }
}
