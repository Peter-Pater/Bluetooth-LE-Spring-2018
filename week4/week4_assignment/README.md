# Week4 Assignment - Bluetooth Controlled Tic-tac-toe (v3.0 Noble)

## Introduction
For this week's assignment, I designed a user interface running in terminal to control the TIC-TAC-TOC peripheral I built from the previous weeks. The libraries used are Noble and inquirer. Noble is used for handling bluetooth communication in node.js, and inquirer is used for creating a question based user interface.

*Note: Again, there are new code created for both central device and the peripheral (arduino), and both are added to this repository*

The way to play the game basically stays the same. The only differences are, first, the result of a game (the selections of lights) would stay put until the user press restart. Second, the interface is question based, therefore user interacts with a relatively more dynamic interface with questions prompted out at each step.

*Note: for more detailed descriptiong, please watch the demo video*

## Service, characteristics and UUIDs
As mentioned above, the service, characteristics and UUIDs are as the following:
- Service: TICTACTOE; UUID: FF20
	- This is basically a game service, of tic-tac-toe, as described above
- Characteristic 1: MOVE; UUID: FF21
	- Type: Read | Write
	- Valid inputs: A0, A1, A2, B0, B1, B2, C0, C1, C2
	- Description: Using this, a user controls his/her moves by inputing a valid position mark
- Characteristic 2: (Re)Start; UUID: FF22
	- Type: READ | Write
	- Valid inputs: any
	- Description: A user can start or restart the game using this characteristic by inputting any character.
- Characteristic 3: Status; UUID: FF23
	- Type: READ | Notify
	- Description: Tells a user what the current status of the game is, namely, "waiting to start", "in-game", "game-ends (win, lose, draw)".
    - Specs:
        - 0: Waiting for player to start;
        - 1: In game;
        - 2: Player wins;
        - 3: Computer wins;
        - 4: Draw;
- Characteristic 4: ComputerMove; UUID: FF24
	- Type: READ | Notify
	- Description: Tells a user what the previous move of the computer was.

*Note: the app provides validation for each input of the moves. If a move is not valid on the given board or a move is conflicted with a previous move, then the user would be alerted and required to choose an alternative move.*

## Pictures and screenshots
<img src="documentation/1.PNG" alt="demo" width="400"/>

<img src="documentation/2.jpeg" alt="3" width="400"/>


## Problem encountered and solutions
