var noble = require('noble');
var deviceName = 'peterpi'; // TODO change to match your device name

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
    0xC0, 0xC1, 0xC2
];
var moved = [];

noble.on('stateChange', function(state) {
    if (state === 'poweredOn') {
        noble.startScanning(['ff20']);
        statusDiv.innerHTML += ' Scanning...';
    } else {
        noble.stopScanning();
        alert('Please enable Bluetooth');
    }
});

noble.on('discover', function(peripheral) {
    console.log('Discovered', peripheral.advertisement.localName);
    noble.stopScanning();
    connectAndSetUp(peripheral);
});

function connectAndSetUp(peripheral) {
    console.log('Connecting to', peripheral.advertisement.localName);

    peripheral.connect(function(error) {
        console.log('Connecting to', peripheral.advertisement.localName);
        statusDiv.innerHTML = `Connected to '${peripheral.advertisement.localName}'.`

        var serviceUUIDs = ['ff20'];
        var characteristicUUIDs = ['ff21', 'ff22', 'ff23', 'ff24'];

        peripheral.discoverSomeServicesAndCharacteristics(
            serviceUUIDs,
            characteristicUUIDs,
            onServicesAndCharacteristicsDiscovered);
    });

    // attach disconnect handler
    peripheral.on('disconnect', onDisconnect);
}

function onDisconnect() {
    console.log('Peripheral disconnected!');
    statusDiv.innerHTML = 'Disconnected.'
}

function onServicesAndCharacteristicsDiscovered(error, services, characteristics) {

    if (error) {
        console.log('Error discovering services and characteristics ' + error);
        return;
    }

    document.querySelector("#startPage").style.display = "none";
    document.querySelector("#gamePage").style.display = "block";

    var moveCharacteristic = characteristics[0];
    var startCharacteristic = characteristics[1];
    var statusCharacteristic = characteristics[2];
    var computerMoveCharacteristic = characteristics[3];

    statusCharacteristic.subscribe();
    computerMoveCharacteristic.subscribe();

    for (let i = 0; i < 9; i++) {
        let id;
        if (i < 3) {
            id = "A" + i % 3;
        } else if (i >= 3 && i < 6) {
            id = "B" + i % 3;
        } else {
            id = "C" + i % 3;
        }
        const element = document.createElement("div");
        element.className = "element";
        element.setAttribute("id", id);
        document.querySelector("#grid").appendChild(element);
        element.addEventListener("click", () => {
            // log(status.toString() === "1");
            if (status === IN_GAME) {
                const move = id;
                if (moved.indexOf(move) > -1) {
                    console.log("invalid move!");
                    document.querySelector("#computerMove").innerHTML = "Invalid Move!";
                    document.querySelector("#computerMove").style.color = "red";
                } else {
                    console.log("player moved to: ", move);
                    moved.push(move);
                    element.style.background = "lightgreen";
                    document.querySelector("#computerMove").innerHTML = "Player moved to " + move;
                    document.querySelector("#computerMove").style.color = "black";
                    const buffer = new Buffer(1);
                    buffer[0] = parseInt(move, 16);
                    moveCharacteristic.write(buffer, false, function(error) {
                        if (error) {
                            console.log(error);
                        } else {
                            console.log("player moved to", move);
                        }
                    });
                }
            } else {
                document.querySelector("#computerMove").innerHTML = "Click start first!";
                document.querySelector("#computerMove").style.color = "red";
            }
        });
    }

    document.querySelector("#startButton").addEventListener("click", onStartButtonClick);

    function onStartButtonClick() {
        const buffer = new Buffer([1]);
        startCharacteristic.write(buffer, false, function(error) {
            if (error) {
                console.log(error);
            } else {
                console.log("started");
            }
        });
        moved = [];
        for (let i = 0; i < 9; i++) {
            let id = "#";
            if (i < 3) {
                id += "A" + i % 3;
            } else if (i >= 3 && i < 6) {
                id += "B" + i % 3;
            } else {
                id += "C" + i % 3;
            }
            document.querySelector(id).style.background = "azure";
        }
    }

    document.querySelector("#startButton").click();

    statusCharacteristic.on('data', function(data, isNotification) {
        let state = data.readUInt8(0);
        console.log("status changed to " + String(state));
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
    });

    computerMoveCharacteristic.on("data", function(data, isNotification) {
        let move = data.readUInt8(0);
        if (move) {
            moved.push(move);
            move = move.toString(16).toUpperCase();
            console.log("computer moved to: ", move);
            document.querySelector("#computerMove").innerHTML = "Computer moved to " + move;
            document.querySelector("#" + move).style.backgroundColor = "yellow";
        }
    });

    document.querySelector("#disconnectButton").addEventListener("click", () => {
        const buffer = new Buffer([1]);
        startCharacteristic.write(buffer, false, function(error) {
            if (error) {
                console.log(error);
            } else {
                console.log("started");
            }
        });
        statusCharacteristic.unsubscribe();
        computerMoveCharacteristic.unsubscribe();
        process.exit();
    });
}
