document.querySelector('#enterButton').addEventListener('click', function(event) {
    event.stopPropagation();
    event.preventDefault();

    if (isWebBluetoothEnabled()) {
        ChromeSamples.clearLog();
        onEnterButtonClick();
    }
});

var bluetoothDevice;
var moveCharacteristic;
var startCharacteristic;
var statusCharacteristic;
var computerMoveCharacteristic;
var log = ChromeSamples.log;
let status;
// status
const STANDING_BY = 0;
const IN_GAME = 1;
const PLAYER_WINS = 2;
const COMPUTER_WINS = 3;
const DRAW = 4;
const RESTART = 5;

const validMoves = [0xA0, 0xA1, 0xA2,
                    0xB0, 0xB1, 0xB2,
                    0xC0, 0xC1, 0xC2];
var moved = [];

for (let i = 0; i < 9; i++){
    let id;
    if (i < 3){
        id = "A" + i % 3;
    }else if (i >= 3 && i < 6){
        id = "B" + i % 3;
    }else{
        id = "C" + i % 3;
    }
    const element = document.createElement("div");
    element.className = "element";
    element.setAttribute("id", id);
    document.querySelector("#grid").appendChild(element);
    element.addEventListener("click", () => {
        // log(status.toString() === "1");
        if (status === IN_GAME){
            const move = id;
            if (moved.indexOf(move) > -1){
                log("invalid move!")
                document.querySelector("#computerMove").innerHTML = "Invalid Move!";
                document.querySelector("#computerMove").style.color = "red";
            }else{
                console.log("player moved to: ", move);
                moved.push(move);
                element.style.background = "lightgreen";
                document.querySelector("#computerMove").innerHTML = "Player moved to " + move;
                document.querySelector("#computerMove").style.color = "black";
                moveCharacteristic.writeValue(new Uint8Array([parseInt(move, 16)]));
            }
        }else{
            document.querySelector("#computerMove").innerHTML = "Click start first!";
            document.querySelector("#computerMove").style.color = "red";
        }
    });
}

document.querySelector("#startButton").addEventListener("click", onStartButtonClick);
document.querySelector("#disconnectButton").addEventListener("click", disconnect);

function onStartButtonClick() {
    startCharacteristic.writeValue(new Uint8Array([1]));
    moved = [];
    for (let i = 0; i < 9; i++){
        let id = "#";
        if (i < 3){
            id += "A" + i % 3;
        }else if (i >= 3 && i < 6){
            id += "B" + i % 3;
        }else{
            id += "C" + i % 3;
        }
        document.querySelector(id).style.background = "azure";
    }
}

function onEnterButtonClick() {
    let gameServiceUuid = BluetoothUUID.getCharacteristic(0xFF20);
    let moveCharacteristicUuid = BluetoothUUID.getCharacteristic(0xFF21);
    let startCharacteristicUuid = BluetoothUUID.getCharacteristic(0xFF22);
    let statusCharacteristicUuid = BluetoothUUID.getCharacteristic(0xFF23);
    let computerMoveCharacteristicUuid = BluetoothUUID.getCharacteristic(0xFF24);

    log("Requesting Bluetooth Device...");
    navigator.bluetooth.requestDevice({
            filters: [{services: [gameServiceUuid]}]
        })
        .then(device => {
            bluetoothDevice = device;
            log("connecting to GATT Server...");
            return device.gatt.connect();
        })
        .then(server => {
            log('Getting Service...');
            return server.getPrimaryService(gameServiceUuid);
        })
        .then(service => {
            log('Getting Characteristic...');
            return service.getCharacteristics();
        })
        .then(characteristics => {

            // save references to the characteristics we care about
            characteristics.forEach(c => {

                switch (c.uuid) {
                    case moveCharacteristicUuid:
                        log('Move Characteristic');
                        moveCharacteristic = c;
                        document.querySelector("#startPage").style.display = "none";
                        document.querySelector("#gamePage").style.display = "block";
                        break;

                    case startCharacteristicUuid:
                        log('Start Characteristic');
                        startCharacteristic = c;
                        startCharacteristic.writeValue(new Uint8Array([1]));
                        break;

                    case statusCharacteristicUuid:
                        log('Status Characteristic');
                        statusCharacteristic = c;
                        statusCharacteristic.startNotifications().then(_ => {
                            log("Status Notifications started");
                            statusCharacteristic.addEventListener("characteristicvaluechanged", statusCharacteristicChanged);
                        });
                        break;

                    case computerMoveCharacteristicUuid:
                        log("computerMove Characteristic")
                        computerMoveCharacteristic = c;
                        computerMoveCharacteristic.startNotifications().then(_ => {
                            log("ComputerMove Notifications started");
                        });
                        computerMoveCharacteristic.addEventListener("characteristicvaluechanged", computerMoveCharacteristicChanged);
                        break;

                    default:
                        log('Skipping ' + c.uuid);
                }
            });
        })
        .catch(error => {
            log('Argh! ' + error);
        });
}

function statusCharacteristicChanged(event) {
    let value = event.target.value;
    let state = value.getUint8(0);
    console.log("status changed to " + String(state));
    // 0 being standing-by, 1 being in-game, 2 being player win, 3 being computer win, 4 being draw, 5 being restarting
    switch (state) {
        case 0:
            document.querySelector("#statusLine").innerHTML = "Standing By";
            status = STANDING_BY;
            break;
        case 1:
            document.querySelector("#statusLine").innerHTML = "In Game";
            status = IN_GAME;
            break;
        case 2:
            document.querySelector("#statusLine").innerHTML = "Player Win!";
            status = PLAYER_WINS;
            break;
        case 3:
            document.querySelector("#statusLine").innerHTML = "Computer Win!";
            status = COMPUTER_WINS;
            break;
        case 4:
            document.querySelector("#statusLine").innerHTML = "Draw!";
            status = DRAW;
            break;
        case 5:
            document.querySelector("#statusLine").innerHTML = "Restarting";
            status = RESTART;
            break;
    }
    if (state === 0) {
        document.querySelector("#startButton").innerHTML = "Start";
    } else {
        document.querySelector("#startButton").innerHTML = "Restart";
    }
}

function computerMoveCharacteristicChanged(event) {
    let move = event.target.value;
    move = move.getUint8(0);
    if (move){
        moved.push(move);
        move = move.toString(16).toUpperCase();
        log("computer moved to: " + move);
        document.querySelector("#computerMove").innerHTML = "Computer moved to " + move;
        document.querySelector("#" + move).style.backgroundColor = "yellow";
    }
}

function disconnect() {
    document.querySelector('#startPage').style.display = "block";
    document.querySelector('#gamePage').style.display = "none";
    if (bluetoothDevice && bluetoothDevice.gatt) {
        bluetoothDevice.gatt.disconnect();
    }
}
