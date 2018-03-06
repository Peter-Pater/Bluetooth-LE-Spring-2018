const noble = require("noble");
const inquirer = require("inquirer");
// get the device name from commandline, in this case, TICTACTOE
const deviceName = process.argv.splice(2);

const GAME_SERVICE_UUID = 'ff20';
const MOVE_CHARACTERISTIC_UUID = 'ff21';
const START_CHARACTERISTIC_UUID = 'ff22';
const STATUS_CHARACTERISTIC_UUID = "ff23"
const COMPUTERMOVE_CHARACTERISTIC_UUID = 'ff24';

let state = 0;

const validMoves = [0xA0, 0xA1, 0xA2, 0xB0, 0xB1, 0xB2, 0xC0, 0xC1, 0xC2];
let moved = [];

if (deviceName.length === 0) {
  console.warn('WARNING: No device name specified. Will connect to the first one that fits.');
} else {
  console.log(`Looking for a device has a name among ${deviceName}`);
}

noble.on('stateChange', state => {
  if (state === 'poweredOn') {
    // 721b is the UUID of the combined peripheral
    noble.startScanning([GAME_SERVICE_UUID]);
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', peripheral => {
    const name = peripheral.advertisement.localName;
    if (deviceName.length === 0){
        console.log(`Connecting to '${name}' ${peripheral.id}`);
        noble.stopScanning();
        connectAndSetUp(peripheral);
    }else{
        if (deviceName.indexOf(name) > -1) {
            console.log(`Connecting to '${name}' ${peripheral.id}`);
            noble.stopScanning();
            connectAndSetUp(peripheral);
        } else {
            console.log(`Skipping '${name}' ${peripheral.id}`);
        }
    }
});

function connectAndSetUp(peripheral) {

  peripheral.connect(error => {
    const serviceUUIDs = [GAME_SERVICE_UUID];
    const characteristicUUIDs = [MOVE_CHARACTERISTIC_UUID, START_CHARACTERISTIC_UUID, STATUS_CHARACTERISTIC_UUID, COMPUTERMOVE_CHARACTERISTIC_UUID];
    console.log("<--------Welcome to game TICTACTOE!-------->");
    peripheral.discoverSomeServicesAndCharacteristics(
        serviceUUIDs,
        characteristicUUIDs,
        onServicesAndCharacteristicsDiscovered
    );
  });

  peripheral.on("disconnect", () => console.log("disconnected"));
}

function onServicesAndCharacteristicsDiscovered(error, services, characteristics) {

    if (error) {
        console.log('Error discovering services and characteristics ' + error);
        return;
    }

    const moveCharacteristic = characteristics[0];
    const startCharacteristic = characteristics[1];
    const statusCharacteristic = characteristics[2];
    const computerMoveCharacteristic = characteristics[3];

    statusCharacteristic.subscribe();
    computerMoveCharacteristic.subscribe();
    statusCharacteristic.on("data", (data, isNotification) => {
        switch(data.readIntLE(0)){
            case 0:
                state = 0;
                console.log();
                console.log("<--------Standing by, select start to join game-------->");
                console.log();
                ask();
                break;
            case 1:
                state = 1;
                console.log();
                console.log("<--------Game started!-------->");
                console.log();
                ask();
                break;
            case 2:
                state = 0;
                console.log();
                console.log("<--------You win!!-------->");
                console.log();
                ask();
                break;
            case 3:
                state = 0;
                console.log();
                console.log("<--------Computer Wins!!-------->");
                console.log();
                break;
            case 4:
                state = 0;
                console.log();
                console.log("<--------Draw!!-------->");
                console.log();
                ask();
                break;
            case 5:
                state = 1;
                console.log();
                console.log("<--------Restarting...-------->");
                console.log();
                break;
            default:
                // only for debugging
                console.log();
                console.log(data.readIntLE(0));
                console.log("Uh Oh... how did you wind up here?");
                console.log();
        }
    });

    computerMoveCharacteristic.on("data", (data, isNotification) => {
        const computerMove = data.readIntLE(0);
        if (computerMove !== 0){
            moved.push(computerMove + 1);
            console.log();
            console.log(`<--------Computer moved to: ${(computerMove + 1).toString(16).toUpperCase()}-------->`);
            console.log();
            // Add timeout to wait for the peripheral to send back status information
            setTimeout(ask, 1000);
        }
    });

    function move(byte) {
        const buffer = new Buffer([byte]);
        moveCharacteristic.write(buffer, false);
    }

    function start(value){
        const buffer = new Buffer([0]);
        if (value === "Yes"){
            buffer[0] = 1;
            startCharacteristic.write(buffer, false);
        }else if(value === "Quit"){
            buffer[0] = 2;
            startCharacteristic.write(buffer, false);
        }
    }

    function ask() {
        if (state === 0){
            questions[0].choices = ["Start", "Quit"];
        }else{
            questions[0].choices = ["Move", "Start", "Quit"];
        }
        inquirer.prompt(questions).then(answers => {
            switch (answers.action) {
                case 'move':
                    moved.push(parseInt(answers.move, 16));
                    move(parseInt(answers.move, 16));
                    break;
                case 'start':
                    moved = [];
                    start(answers.start);
                    break;
                default:
                    start("Quit");
                    statusCharacteristic.unsubscribe();
                    computerMoveCharacteristic.unsubscribe();
                    process.exit();
            }
        });
    };
}

const questions = [
    {
        type: "list",
        name: "action",
        message: "Which function?",
        choices: ["Move", "Start", "Quit"],
        filter: function (val){
            return val.toLowerCase();
        }
    },
    {
        type: "input",
        name: "move",
        message: "What's your move?",
        filter: String,
        validate: function (value){
            const valid = validMoves.indexOf(parseInt(value, 16)) > -1 && moved.indexOf(parseInt(value, 16)) < 0;
            return valid || "<--------Move invalid! Please enter a move valid on the board!-------->";
        },
        when: function (answers) {
            return answers.action === 'move';
        }
    },
    {
        type: "list",
        name: "start",
        message: "(Re)start?",
        choices: ["Yes"],
        when: function(answers){
            return answers.action === "start";
        }
    }
]
