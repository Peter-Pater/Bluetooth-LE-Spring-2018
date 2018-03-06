// tic-tac-toe (ttt), a reimplementation in js on raspberry pi
const Gpio = require("onoff").Gpio;
const bleno = require("bleno");

// an array representing the 3*3 light matrix, where 0 means off,
// 1 means green, and 2 means yellow, setting up
const matrix = [];
// corresponding values
const values = [0xA0, 0xA1, 0xA2, 0xB0, 0xB1, 0xB2, 0xC0, 0xC1, 0xC2];
// leds
const greenLights = new Array(9);
const yellowLights = new Array(9);
// status
let state = 0; // 0 being standing-by, 1 being in-game, 2 being player win, 3 being computer win, 4 being draw
// msg to notify
let msg = 0;
// last msg
let lastMsg = -1;
// computerMove
let comMove = 0;
// last computer move
let lastComMove = -1;

// initialize the peripheral
function setup() {
    // light pins
    // It turns out that the pins selected are relevant to the system,
    // they should not conflict a certain system functionality by occupying
    // all the pins reserved for them (such as clock)
    const greenPins = [5, 27, 26, 10, 1, 13, 24, 18, 21];
    const yellowPins = [22, 17, 19, 16, 25, 6, 23, 12, 20];
    // setup
    for (let i = 0; i < 9; i++) {
        // setup matrix
        matrix.push(0);
        // setup lights
        console.log("setting green: ", i);
        greenLights[i] = new Gpio(greenPins[i], "out");
        console.log("setting yellow: ", i);
        yellowLights[i] = new Gpio(yellowPins[i], "out");
    }
    console.log("matrix initialized: ", matrix);
}

class StatusCharacteristic extends bleno.Characteristic {
    constructor() {
        super({
            uuid: "ff23",
            properties: ["notify"],
            descriptors: [
                new bleno.Descriptor({
                    uuid: "2901",
                    value: "Status"
                })
            ]
        });
    }

    onSubscribe(maxValueSize, updateValueCallback) {
        console.log('Status Characteristic subscribe');
        this.changeInterval = setInterval(() => {
            if (msg != lastMsg) {
                lastMsg = msg;
                const data = new Buffer(1);
                data[0] = msg;
                console.log('Status Updated: ', msg);
                updateValueCallback(data);
            }
        }, 1000);
    }

    onUnsubscribe() {
        console.log("status Characteristic unsubscribed");
        if (this.changeInterval) {
            clearInterval(this.changeInterval);
            this.changeInterval = null;
        }
    }
}

class ComputerMoveCharacteristic extends bleno.Characteristic {
    constructor() {
        super({
            uuid: "ff24",
            properties: ["notify"],
            descriptors: [
                new bleno.Descriptor({
                    uuid: "2901",
                    value: "ComputerMove"
                })
            ]
        });
    }

    onSubscribe(maxValueSize, updateValueCallback) {
        console.log('ComputerMove Characteristic subscribe');
        this.changeInterval = setInterval(() => {
            if (comMove != lastComMove) {
                lastComMove = comMove;
                const data = new Buffer(1);
                data[0] = comMove;
                console.log('Computer Moved to: ' + comMove.toString(16).toUpperCase());
                updateValueCallback(data);
            }
        }, 500);
    }

    onUnsubscribe() {
        console.log("ComputerMove Characteristic unsubscribed");
        if (this.changeInterval) {
            clearInterval(this.changeInterval);
            this.changeInterval = null;
        }
    }
}

class StartCharacteristic extends bleno.Characteristic {
    constructor() {
        super({
            uuid: "ff22",
            properties: ["write"],
            descriptors: [
                new bleno.Descriptor({
                    uuid: "2901",
                    value: "(Re)start"
                })
            ]
        });
    }

    onWriteRequest(data, offset, withoutResponse, callback) {
        if (data[0]){
            console.log("Game starts!");
            // in-game
            state = 1;
            // reset computer move
            comMove = 0x00;
            lastComMove = 0x00;
            // turn off, on, and then off all lights
            let index = -1;
            if (msg === 1){
                msg = 0;
            }
            const lightDisplay = setInterval(() => {
                if (index === -1){
                    for (let i = 0; i < 9; i++){
                        greenLights[i].writeSync(0);
                        yellowLights[i].writeSync(0);
                    }
                    index++;
                }else if (index < 18 && index > -1){
                    if (index % 2 === 0){
                        greenLights[index/2].writeSync(1);
                    }else{
                        yellowLights[(index - 1)/2].writeSync(1)
                    }
                    index++;
                }else{
                    for (let i = 0; i < 9; i++){
                        greenLights[i].writeSync(0);
                        yellowLights[i].writeSync(0);
                    }
                    if (msg === 0){
                        msg = 0;
                    }
                    clearInterval(lightDisplay);
                    callback(this.RESULT_SUCCESS);
                }
            }, 100);
        }
    }
}

class MoveCharacteristic extends bleno.Characteristic {
    constructor() {
        super({
            uuid: "ff21",
            properties: ["write"],
            descriptors: [
                new bleno.Descriptor({
                    uuid: "2901",
                    value: "Move"
                })
            ]
        });
    }

    onWriteRequest(data, offset, withoutResponse, callback) {
        console.log('write request: ' + data[0].toString(16).toUpperCase());
        if (state === 1) {
            let i;
            for (i = 0; i < 9; i++) {
                if (data[0] === values[i] && matrix[i] === 0) {
                    // the input is valid, move
                    // I used a indexToPin mapper, but due to the redesign of the pin value array, there is no need here
                    matrix[i] = 1;
                    greenLights[i].writeSync(1);
                    if (resultInspector()){
                        callback(this.RESULT_SUCCESS);
                        return;
                    }else{
                        console.log("computer moving");
                        while (true) {
                            const pos = Math.floor(Math.random() * 9);
                            if (matrix[pos] === 0) {
                                matrix[pos] = 2;
                                setTimeout(() => {yellowLights[pos].writeSync(1);}, 500);
                                comMove = values[pos];
                                console.log("Computer moved: ", values[pos].toString(16).toUpperCase());
                                resultInspector();
                                break;
                            }
                        }
                    }
                    break;
                }
            }
            if (i == 8) {
                // the input is invalid since we went through the entire array without a hit
                // should not happen since handled in computer app
                console.log("Invalid input!");
            }
        }
        callback(this.RESULT_SUCCESS);
    }
}

function resultInspector() {
    // only active when state is in-game(1)
    if (state == 1) {
        // inspect lines
        for (let i = 0; i < 7; i += 3) {
            if (matrix[i] !== 0 && matrix[i] === matrix[i + 1] && matrix[i + 1] === matrix[i + 2]) {
                // game ends
                state = 0;
                if (matrix[i] === 1) {
                    msg = 2;
                    console.log("Player wins!");
                } else {
                    msg = 3;
                    console.log("Computer wins!");
                }
                reset();
                return 1;
            }
        }
        // inspect cols
        for (let i = 0; i < 3; i++) {
            if (matrix[i] !== 0 && matrix[i] === matrix[i + 3] && matrix[i + 3] === matrix[i + 6]) {
                // game ends
                state = 0;
                if (matrix[i] === 1) {
                    msg = 2;
                    console.log("Player wins!");
                } else {
                    msg = 3;
                    console.log("Computer wins!");
                }
                reset();
                return 1;
            }
        }
        // inspect diagnal
        if (matrix[0] !== 0 && matrix[0] === matrix[4] && matrix[4] === matrix[8]) {
            // game ends
            state = 0;
            if (matrix[0] === 1) {
                msg = 2;
                console.log("Player wins!");
            } else {
                msg = 3;
                console.log("Computer wins!");
            }
            reset();
            return 1;
        } else if (matrix[2] !== 0 && matrix[2] === matrix[4] && matrix[4] === matrix[6]) {
            state = 0;
            if (matrix[2] === 1) {
                msg = 2;
                console.log("Player wins!");
            } else {
                msg = 3;
                console.log("Computer wins!");
            }
            reset();
            return 1;
        }
        // if all filled, draw
        for (let i = 0; i < 9; i++) {
            if (matrix[i] == 0) {
                return 0;
            }
        }
        msg = 4;
        state = 0;
        statusCharacteristic.setValue(msg);
        Serial.println("Draw!");
        reset();
        return 1;
    } else {
        return 0;
    }
}

// reset when game over
function reset(){
    for (let i = 0; i < 9; i++){
        matrix[i] = 0;
    }
}

const gameService = new bleno.PrimaryService({
    uuid: "ff20",
    characteristics: [
        new MoveCharacteristic(),
        new StartCharacteristic(),
        new StatusCharacteristic(),
        new ComputerMoveCharacteristic()
    ]
});

bleno.on('stateChange', state1 => {
    console.log('on -> stateChange: ' + state1);
    if (state1 === 'poweredOn') {
        bleno.startAdvertising('TICTACTOE', [gameService.uuid]);
        setup();
    } else {
        console.log("stopped");
        bleno.stopAdvertising();
    }
});

bleno.on('advertisingStart', error => {
    console.log('on -> advertisingStart: ' + (error ? 'error ' + error : 'success'));
    if (!error) {
        bleno.setServices([gameService]);
    }
});

// cleanup GPIO on exit
function exit() {
    for (let i = 0; i < 9; i++){
        greenLights[i].unexport();
        yellowLights[i].unexport();
    }
    process.exit();
}
process.on('SIGINT', exit);
