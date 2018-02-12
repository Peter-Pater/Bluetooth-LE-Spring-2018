var GAME_SERVICE = "FF20";
var MOVE_CHARACTERISTIC = "FF21";
var START_CHARACTERISTIC ="FF22";
var STATUS_CHARACTERISTIC = "FF23";
var COMPUTER_CHARACTERISTIC = "FF24";
const values = [160, 161, 162, 176, 177, 178, 192, 193, 194];

var app = {
    // Application Constructor
    initialize: function() {
        this.bindEvents();
        this.showMainPage();
        play.hidden = true;
    },
    // Bind any events that are required on startup.
    bindEvents: function() {
        document.addEventListener('deviceready', this.onDeviceReady, false);
        document.addEventListener("backbutton", app.onBackButton, false);
        deviceList.addEventListener("click", this.connect, false);
        refreshButton.addEventListener("click", this.refreshDeviceList, false);
        startButton.addEventListener("click", this.start, false);
        moveButton.addEventListener("click", this.setMoveValue, false);
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
        ble.scan([GAME_SERVICE], 5, app.onDiscoverDevice, app.onError);
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

        var failure = function(reason) {
            navigator.notification.alert(reason, null, 'read error');
        };

        ble.startNotification(
            peripheral.id,
            GAME_SERVICE,
            STATUS_CHARACTERISTIC,
            app.onStatusChange,
            failure
        );

        ble.read(
            peripheral.id,
            GAME_SERVICE,
            STATUS_CHARACTERISTIC,
            app.onStatusChange,
            failure
        );

        ble.startNotification(
            peripheral.id,
            GAME_SERVICE,
            COMPUTER_CHARACTERISTIC,
            app.onMoveChange,
            failure
        );

        ble.read(
            peripheral.id,
            GAME_SERVICE,
            COMPUTER_CHARACTERISTIC,
            app.onMoveChange,
            failure
        );
    },
    start: function(){
        var success = function(){
            play.hidden = false;
            console.log("Game started!");
        }

        if (app.peripheral && app.peripheral.id){
            var data = new Uint8Array(1);
            data[0] = 1;
            yourMove.innerHTML = "You: " + "haven't moved";
            computerMove.innerHTML = "Computer: hasn't moved";
            ble.write(
                app.peripheral.id,
                GAME_SERVICE,
                START_CHARACTERISTIC,
                data.buffer,
                success,
                app.onError
            )
        }
    },

    onStatusChange: function(buffer){
        var data = new Uint8Array(buffer);
        console.log("The current status is:" + data[0]);
        switch (data[0]) {
            case 0:
                statusDiv.innerHTML = "Waiting for user to Start";
                break;
            case 1:
                statusDiv.innerHTML = "In game";
                break;
            case 2:
                statusDiv.innerHTML = "You win! Click to restart";
                play.hidden = true;
                break;
            case 3:
                statusDiv.innerHTML = "Computer Wins! Click to restart";
                play.hidden = true;
                break;
            case 4:
                statusDiv.innerHTML = "Draw! Click to restart";
                play.hidden = true;
                break;
            default:
        }
    },

    onMoveChange: function(buffer){
        var data = new Uint8Array(buffer);
        if (data[0] !== 0){
            console.log("Computer: " + data[0].toString(16).toUpperCase());
            computerMove.innerHTML = "Computer: " + data[0].toString(16).toUpperCase();
            setTimeout(function(){yourMove.innerHTML = "You: " + "haven't moved";}, 1000);
        }else{
            console.log("Computer has not moved yet");
        }
    },

    setMoveValue: function(){
        var data = new Uint8Array(1);
        let moveValue = String(move.value);
        data[0] = parseInt(moveValue, 16);

        var success = function(){
            move.value = "";
            console.log("Your move is: " + data[0].toString(16).toUpperCase());
        };

        if (values.indexOf(data[0]) < 0){
            yourMove.innerHTML = "You: move invalid, try again!";
            yourMove.style.color = "red";
            move.value = "";
        }else if (app.peripheral && app.peripheral.id){
            yourMove.style.color = "black";
            yourMove.innerHTML = "You: " + data[0].toString(16).toUpperCase();
            ble.write(
                app.peripheral.id,
                GAME_SERVICE,
                MOVE_CHARACTERISTIC,
                data.buffer,
                success,
                app.onError
            )
        }
    },

    disconnect: function(e){
        if (app.peripheral && app.peripheral.id){
            ble.disconnect(app.peripheral.id, app.showMainPage, app.onError);
            play.hidden = true;
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
