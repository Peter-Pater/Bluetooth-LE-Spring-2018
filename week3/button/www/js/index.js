var LED_SERVICE = "FF10";
var SWITCH_CHARACTERISTIC = "FF11";
var BRIGHTNESS_CHARACTERISTIC ="FF12";

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
        this.showMainPage();
    },
    // Bind any events that are required on startup.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.addEventListener("backbutton", app.onBackButton, false);
        deviceList.addEventListener("click", this.connect, false);
        refreshButton.addEventListener("click", this.refreshDeviceList, false);
        onButton.addEventListener("click", this.switchOn, false);
        offButton.addEventListener("click", this.switchOff, false);
        brightness.addEventListener("change", this.setBrightness, false);
        disconnectButton.addEventListener("click", this.disconnect, false);
    },
    // deviceready Event Handler
    //
    // The scope of 'this' is the event. In order to call the 'refreshDeviceList'
    // function, we must explicitly call 'app.refreshDeviceList(...);'
    onDeviceReady: function() {
        // navigator.notification.alert("Device Ready!");
        app.refreshDeviceList();
    },
    refreshDeviceList: function(){
        deviceList.innerHTML = "";
        ble.scan([LED_SERVICE], 5, app.onDiscoverDevice, app.onError);
    },
    onDiscoverDevice: function(device){
        var listItem = document.createElement("li");
        listItem.innerHTML = device.name + "<br/>" +
            device.id + "<br/>" + "RSSI: " + device.rssi;
        listItem.dataset.deviceId = device.id;
        deviceList.appendChild(listItem);
    },
    connect: function(e){
        var deviceId = e.target.dataset.deviceId;
        ble.connect(deviceId, app.onConnect, app.onError);
    },
    onConnect: function(peripheral) {
        app.peripheral = peripheral;
        app.showDetailPage();
    },
    switchOn: function(){
        app.setSwitchValue(1);
    },
    switchOff: function(){
        app.setSwitchValue(0);
    },
    setSwitchValue: function(value){
        var success = function(){
            console.log("Set switch value to " + value);
        };

        if (app.peripheral && app.peripheral.id){
            var data = new Uint8Array(1);
            data[0] = value;
            ble.write(
                app.peripheral.id,
                LED_SERVICE,
                SWITCH_CHARACTERISTIC,
                data.buffer,
                success,
                app.onError
            )
        }
    },
    setBrightness: function(){
        var data = new Uint8Array(1);
        data[0] = brightness.value;

        var success = function(){
            console.log("Set brightness to " + data[0]);
        };

        if (app.peripheral && app.peripheral.id){
            ble.write(
                app.peripheral.id,
                LED_SERVICE,
                BRIGHTNESS_CHARACTERISTIC,
                data.buffer,
                success,
                app.onError
            )
        }
    },
    disconnect: function(e){
        if (app.peripheral && app.peripheral.id){
            ble.disconnect(app.peripheral.id, app.showMainPage, app.onError);
        }
    },
    showMainPage: function(){
        mainPage.hidden = false;
        detailPage.hidden = true;
    },
    showDetailPage: function(){
        mainPage.hidden = true;
        detailPage.hidden = false;
    },
    onBackButton: function(e){
        if (mainPage.hidden){
            app.disconnect();
        }else{
            navigator.app.exitApp();
        }
    },
    onError: function(reason){
        if (typeof reason === "object"){
            reason = JSON.stringify(reason);
        }
        navigator.notification.alert(reason, null, "Error");
    }
};

app.initialize();
