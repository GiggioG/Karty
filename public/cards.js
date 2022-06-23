function convertSuit(str) {
    str = str.replaceAll("S", "♠");
    str = str.replaceAll("H", "♥");
    str = str.replaceAll("D", "♦");
    str = str.replaceAll("C", "♣");
    return str;
}
const SUITS = ['S', 'H', 'D', 'C'];
const VALUES = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'];

class Card { // V♠ - black joker; V♥ - red joker
    constructor(value, suit) {
        this.value = value;
        this.suit = suit;
    }
    get name() {
        return this.value + this.suit;
    }
    get humanName() {
        return convertSuit(this.name);
    }
}


class Deck {
    constructor(cards = []) {
        this.cards = cards;
        if (cards == "ALL") {
            this.cards = [];
            for (let v of VALUES) {
                for (let i = SUITS.length - 1; i >= 0; i--) {
                    this.cards.push(new Card(v, SUITS[i]));
                }
            }
            this.cards.push(new Card('V', 'S'));
            this.cards.push(new Card('V', 'H'));
        }
    }
    get size() { return this.cards.length; }
    split() {
        let after = Math.floor(this.size / 2);
        return [
            new Deck(this.cards.slice(0, after)),
            new Deck(this.cards.slice(after))
        ];
    }
    shuffle() {
        // <from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array>
        let currentIndex = this.size,
            randomIndex;
        while (currentIndex != 0) {
            randomIndex = Math.floor(Math.random() * currentIndex);
            currentIndex--;
            [this.cards[currentIndex], this.cards[randomIndex]] = [
                this.cards[randomIndex], this.cards[currentIndex]
            ];
        }
        // </from https://stackoverflow.com/questions/2450954/how-to-randomize-shuffle-a-javascript-array>
    }
    add(card) {
        this.cards = [card].concat(this.cards);
    }
    pop() {
        let card = this.cards[0];
        this.cards = this.cards.slice(1);
        return card;
    }
    join(deck) {
        this.cards = deck.cards.concat(this.cards);
    }
    serialise() {
        return this.cards.map(c => c.name).join(' ');
    }
}

function c(str) {
    return new Card(str.slice(0, -1), str.slice(-1));
}

function d(str = "") {
    if (str == "ALL") { return new Deck("ALL"); }
    if (str == "") { return new Deck(); }
    let arr = str.split(" ");
    arr = arr.map(e => c(e));
    return new Deck(arr);
}

if (typeof exports != "undefined") {
    module.exports = {
        convertSuit,
        SUITS,
        VALUES,
        Card,
        Deck,
        c: c,
        d: d
    };
}