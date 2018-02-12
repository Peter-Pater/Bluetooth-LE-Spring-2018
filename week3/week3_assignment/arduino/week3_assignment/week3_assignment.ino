// tic-tac-toe (ttt)
#include <CurieBLE.h>

// an array representing the 3*3 light matrix, where 0 means off,
// 1 means green, and 2 means yellow
int matrix[9];
// corresponding values
int values[9] = {160, 161, 162, 176, 177, 178, 192, 193, 194};

// status
int state = 0; // 0 being standing-by, 1 being in-game
// msg to notify
int msg = 0; // 0 being standing-by, 1 being in-game, 2 being player win, 3 being computer win, 4 being draw

// setting up peripheral, services and descriptors
BLEPeripheral blePeripheral;
BLEService gameService = BLEService("FF20");
BLEUnsignedCharCharacteristic moveCharacteristic = BLEUnsignedCharCharacteristic("FF21", BLERead | BLEWrite);
BLEUnsignedCharCharacteristic startCharacteristic = BLEUnsignedCharCharacteristic("FF22", BLERead | BLEWrite);
BLEIntCharacteristic statusCharacteristic = BLEIntCharacteristic("FF23", BLERead | BLENotify);
BLEIntCharacteristic computerMoveCharacteristic = BLEIntCharacteristic("FF24", BLERead | BLENotify);
BLEDescriptor moveDescriptor = BLEDescriptor("2901", "Move");
BLEDescriptor startDescriptor = BLEDescriptor("2901", "(Re)start");
BLEDescriptor statusDescriptor = BLEDescriptor("2901", "Status");
BLEDescriptor computerDescriptor = BLEDescriptor("2901", "ComputerMove");

void setup() {
  Serial.begin(9600);

  // setting up pins
  for (int i = 2; i < 14; i++) {
    pinMode(i, OUTPUT);
  }
  pinMode(A0, OUTPUT);
  pinMode(A1, OUTPUT);
  pinMode(A2, OUTPUT);
  pinMode(A3, OUTPUT);
  pinMode(A4, OUTPUT);
  pinMode(A5, OUTPUT);

  // initialize matrix
  for (int i = 0; i < 9; i++) {
    matrix[i] = 0;
  }

  // setting up peripheral: names, attributes and event handlers
  blePeripheral.setLocalName("TICTACTOE");
  blePeripheral.setDeviceName("TICTACTOE");
  blePeripheral.addAttribute(gameService);
  blePeripheral.addAttribute(moveCharacteristic);
  blePeripheral.addAttribute(moveDescriptor);
  blePeripheral.addAttribute(startCharacteristic);
  blePeripheral.addAttribute(startDescriptor);
  blePeripheral.addAttribute(statusCharacteristic);
  blePeripheral.addAttribute(statusDescriptor);
  blePeripheral.addAttribute(computerMoveCharacteristic);
  blePeripheral.addAttribute(computerDescriptor);

  moveCharacteristic.setEventHandler(BLEWritten, moveCharacteristicWritten);
  startCharacteristic.setEventHandler(BLEWritten, startCharacteristicWritten);

  blePeripheral.setAdvertisedServiceUuid(gameService.uuid());
  blePeripheral.begin();
  statusCharacteristic.setValue(msg);
  computerMoveCharacteristic.setValue(0);
}

void loop() {
  blePeripheral.poll();
}

void startCharacteristicWritten(BLECentral&central, BLECharacteristic&characteristic) {
  // plays and resets the LEDs, and also revert the state
  msg = 1;
  computerMoveCharacteristic.setValue(0);
  gameDisplay();
  if (state == 0) {
    state = 1;
  }
}

void moveCharacteristicWritten(BLECentral&central, BLECharacteristic&characteristic) {
  // only active when the state is in-game(1)
  if (state == 1) {
    int pos;
    if (pos = moveCharacteristic.value()) {
      for (int i = 0; i < 9; i++) {
        if (pos == values[i] && matrix[i] == 0) {
          // the input is valid, move
          indexToPinMapper(i, 0);
          matrix[i] = 1;
          Serial.print(F("Player moved: "));
          Serial.println(moveCharacteristic.value(), HEX);
          delay(500);
          computerMove();
          break;
        }
        if (i == 8) {
          // the input is invalid, notify?
          Serial.println(F("Invalid input"))  ;
        }
      }
    }
  }
}

// make a move automatically when it is computer's turn
void computerMove() {
  resultInspector();
  // only active when the state is in-game(1)
  if (state == 1) {
    // just stupidly picking the first valid move
    while (true) {
      int pos = random(0, 9);
      if (matrix[pos] == 0) {
        matrix[pos] = 2;
        indexToPinMapper(pos, 1);
        computerMoveCharacteristic.setValue(values[pos]);
        Serial.print(F("Computer moved: "));
        Serial.println(values[pos], HEX);
        resultInspector();
        break;
      }
    }
  }
}

// maps the matrix index (0 ... 8) to the corresponding led pin, and output HIGH directly
void indexToPinMapper(int index, int side) {
  index = (index + 1) * 2;
  if (side == 1) {
    // increment by offset 1 if it is computer's turn
    index++;
  }
  if (index <= 13) {
    digitalWrite(index, HIGH);
  } else {
    switch (index) {
      case 14:
        analogWrite(A5, 255);
        break;
      case 15:
        analogWrite(A4, 255);
        break;
      case 16:
        analogWrite(A3, 255);
        break;
      case 17:
        analogWrite(A2, 255);
        break;
      case 18:
        analogWrite(A1, 255);
        break;
      case 19:
        analogWrite(A0, 255);
        break;
      default:
        Serial.println("What?!");
    }
  }
}

void resultInspector() {
  // only active when the state is in-game(1)
  if (state == 1) {
    // inspect lines
    for (int i = 0; i < 7; i += 3) {
      if (matrix[i] != 0 && matrix[i] == matrix[i + 1] && matrix[i + 1] == matrix[i + 2]) {
        // game ends
        if (matrix[i] == 1) {
          msg = 2;
          Serial.println("Player wins!");
        } else {
          msg = 3;
          Serial.println("Computer wins!");
        }
        gameDisplay();
        return;
      }
    }
    // inspect cols
    for (int i = 0; i < 3; i ++) {
      if (matrix[i] != 0 && matrix[i] == matrix[i + 3] && matrix[i + 3] == matrix[i + 6]) {
        // game ends
        if (matrix[i] == 1) {
          msg = 2;
          Serial.println("Player wins!");
        } else {
          msg = 3;
          Serial.println("Computer wins!");
        }
        gameDisplay();
        return;
      }
    }
    // inspect diagnal
    if (matrix[0] != 0 && matrix[0] == matrix[4] && matrix[4] == matrix[8]) {
      // game ends
      if (matrix[0] == 1) {
        msg = 2;
        Serial.println("Player wins!");
      } else {
        msg = 3;
        Serial.println("Computer wins!");
      }
      gameDisplay();
      return;
    }
    else if (matrix[2] != 0 && matrix[2] == matrix[4] && matrix[4] == matrix[6]) {
      if (matrix[2] == 1) {
        msg = 2;
        Serial.println("Player wins!");
      } else {
        msg = 3;
        Serial.println("Computer wins!");
      }
      gameDisplay();
      return;
    }
    // if all filled, draw
    for (int i = 0; i < 9; i ++) {
      if (matrix[i] == 0) {
        return;
      }
    }
    msg = 4;
    Serial.println("Draw!");
    gameDisplay();
  } else {
    // idle
  }
}

void gameDisplay() {
  long previousMillis = millis();
  int i = 0;
  statusCharacteristic.setValue(msg);
  for (int i = 2; i <= 13; i++) {
    digitalWrite(i, LOW);
  }
  analogWrite(A0, 0);
  analogWrite(A1, 0);
  analogWrite(A2, 0);
  analogWrite(A3, 0);
  analogWrite(A4, 0);
  analogWrite(A5, 0);
  while (i < 9) {
    if (millis() - previousMillis == 100) {
      matrix[i] = 0;
      indexToPinMapper(i, 0);
    }
    if (millis() - previousMillis == 200) {
      indexToPinMapper(i, 1);
      previousMillis = millis();
      i++;
    }
  }
  for (int i = 2; i <= 13; i++) {
    digitalWrite(i, LOW);
  }
  analogWrite(A0, 0);
  analogWrite(A1, 0);
  analogWrite(A2, 0);
  analogWrite(A3, 0);
  analogWrite(A4, 0);
  analogWrite(A5, 0);
  state = abs(state - 1);
}
