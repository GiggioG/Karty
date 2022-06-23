# Karty
Playing card simulator. Play any card game you want!
# THIS APP IS VERY INSECURE. IT IS TRIVIAL FOR A PLAYER CHANGE/CREATE/DELETE CARDS/DECKS EASILY. IT IS POSSIBLE THERE ARE RCE VULNERABILITIES IN THE GAME SERVER. USE AT YOUR OWN RISK. I AM NOT RESPONSIBLE IF YOU GET HACKED. PLAY ONLY WITH PEOPLE YOU TRUST AND MAKE SURE ONLY THEY CAN ACCESS THE GAME.
# Game mechanics
## Player slots
There are 8 player slots and each player is assigned a color. The colors are:  `red, cyan, magenta, lime, darkred, blue, purple, black`. 
Each player's UI is colored with their color, mainly the border of selected objects and the tint of an object they are peaking.
## Actions
There are 2 types of game objects: Cards and Decks.  
After you select an object by clicking it once, you can do the following things to it.
### Peak (`Click`)
Click on the selected object to **peak** it. When peaking, only you can see the card's value, but other players can see what cards you're peaking. In actual games this is often
used to look at your own cards.
### Flip (`F`)  
Press `F` to flip a Card or Deck, meaning everyone would be able to see its value.  
**WARNING: Fliping a deck only makes the cards visible, if you want to actually make the card at the bottom go on the top, then [Spread](#spread) and Reverse-[Collect](#collect) 
the deck.**
### Take (`T`)
Press `T` to take the top card from a deck. The deck remains selected, so you can continue pressing `T` to take more cards. This means that you can **Spread** cards.
* #### (Spread)  
  By holding down `T` and moving the mouse you can **Spread** a deck. The last card remains selected and in your hand.
### Put (`P`)
Press `P` to put your selected object on top of the closest other object. It has a distance limit of 150 pixels. The created deck is selected, so you can press `P` again, 
to put IT on top of the next closest object. Thie means that you can **Collect** cards.
* #### (Collect)
  By holding down `P` on a card of a spread deck, you can collect the cards back into a deck. If start from the deck's first card, then you will put it back together, 
  but if you start from the spread deck's last card, you can collect it backwards, effectively flipping the card order.
### Split (`S`)
Press `S` to split a deck you have selected into 2 parts that are as close to equal as possible. One stays and the game lets you drag the other one.
### sHuffle (`H`)
Press `H` to shuffle a deck of cards.