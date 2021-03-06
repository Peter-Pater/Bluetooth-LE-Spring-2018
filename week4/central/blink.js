// Attach to a button peripheral 0xFFE0 and subscribe for button status notifications
const noble = require('noble');

noble.on('stateChange', state => {
  if (state === 'poweredOn') {
    console.log('Bluetooth is on. Starting Scan.');
    noble.startScanning(["ff10", "721b"]);
  } else {
    noble.stopScanning();
    console.log('Bluetooth is off. Stopped Scan.');
  }
});

noble.on('discover', peripheral => {
  const name = peripheral.advertisement.localName;
  if (name === 'Foxtrot') { // change to match name of your device
    console.log(`Connecting to '${name}' ${peripheral.id}`);
    connectAndSetUp(peripheral);
    noble.stopScanning();
  } else {
    console.log(`Skipping '${name}' ${peripheral.id}`);
  }
});

function connectAndSetUp(peripheral) {

  peripheral.connect(function (error) {
    console.log('Discovering services & characteristics');
    const serviceUUIDs = ["ff10"];
    const characteristicUUIDs = ["ff11"];
    peripheral.discoverSomeServicesAndCharacteristics(
        serviceUUIDs,
        characteristicUUIDs,
        onServicesAndCharacteristicsDiscovered
    );
  });

  peripheral.on('disconnect', () => console.log('disconnected'));
}

function onServicesAndCharacteristicsDiscovered(error, services, characteristics) {

  if (error) {
    console.log('Error discovering services and characteristics ' + error);
    return;
  }

  var switchCharacteristic = characteristics[0];

  function sendData(byte){
      var buffer = new Buffer(1);
      buffer[0] = byte;
      switchCharacteristic.write(buffer, false, (error) => {
          if (error){
              console.log(error);
          }else{
              console.log("wrote " + byte);
          }
      });
  }

  function on(){
      sendData(0x01);
      setTimeout(off, 1000);
  }

  function off(){
      sendData(0x00);
      setTimeout(on, 1000);
  }

  on();
}
