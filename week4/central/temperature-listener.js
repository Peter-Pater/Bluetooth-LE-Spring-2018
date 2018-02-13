const noble = require("noble");
noble.on("stateChange", state => {
    if (state === "poweredOn"){
        // scans "bbb0" so that we only look for thermometer services
        // 721b is the UUID of the combined peripheral
        noble.startScanning(["bbb0", "721b"]);
    }else{
        noble.stopScanning();
    }
});

noble.on("discover", peripheral => {
    const name = peripheral.advertisement.localName;
    if (name === "Foxtrot"){
        console.log(`connecting to '${name}' ${peripheral.id}`);
        noble.stopScanning();
        connectAndSetUp(peripheral);
    }else{
        console.log(`Skipping '${name}' ${peripheral.id}`);
    }
});

function connectAndSetUp(peripheral){
    peripheral.connect(error => {
        const serviceUUIDs = ['bbb0'];
        const characteristicUUIDs = ['bbb1'];

        peripheral.discoverSomeServicesAndCharacteristics(
            serviceUUIDs,
            characteristicUUIDs,
            onServicesAndCharacteristicsDiscovered
        );
    });
}

function onServicesAndCharacteristicsDiscovered(error, services, characteristics){
    const temperatureCharacteristic = characteristics[0];

    temperatureCharacteristic.on("data", (data, isNotification) => {
        const celsius = data.readFloatLE(0);
        const fahrenheit = (celsius * 1.8 + 32.0).toFixed(1);
        console.log("Temperture is", celsius.toFixed(1) + "°C", fahrenheit + "°F");
    });

    temperatureCharacteristic.read();
    temperatureCharacteristic.subscribe();
}
