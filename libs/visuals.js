const id = require("uuid").v4;
const { c, d } = require("../public/cards.js");
class vObject {
    constructor(x, y, type, oid = null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.open = false;
        this.peaking = false;
        this.delete_me = false;
        this.id = oid ? oid : id();
    }
    drag(x, y) {
        this.x = x;
        this.y = y;
        emitEvent(this.name, "changeObject", {
            x: x,
            y: y
        });
    }
    flip(bool = null) {
        if (this.open == bool) { return; }
        this.peak(false);
        this.open = !this.open;
        emitEvent(this.name, "flip", this.open);
    }
    peak(bool = null) {
        if (this.peaking == bool) { return; }
        this.peaking = !this.peaking;
        emitEvent(this.name, "peak", this.peaking);
    }
    static deserialise(s) {
        if (s.type == "card") {
            let crd = c(s.card);
            let vc = new vCard(crd, s.x, s.y, s.id);
            vc.open = s.open;
            return vc;
        } else if (s.type == "deck") {
            let dck = d(s.deck);
            let vd = new vDeck(dck, s.x, s.y, s.id);
            vd.open = s.open;
            return vd;
        }
    }
}

class vCard extends vObject {
    constructor(card, x, y, id) {
        super(x, y, "card", id);
        if (!card) { debugger; }
        this.card = card;
    }
    get name() {
        return `c_${this.id}`;
    }
    get texture() {
        return this.card.value + this.card.suit;
    }
    serialise() {
        return {
            card: this.card.name,
            x: this.x,
            y: this.y,
            open: this.open,
            id: this.id,
            type: this.type
        };
    }
}

class vDeck extends vObject {
    constructor(deck, x, y, id) {
        super(x, y, "deck", id);
        this.deck = deck;
    }
    get name() {
        return `d_${this.id}`;
    }
    take() {
        if (this.deck.size <= 0) { return null; }
        let ret = this.deck.cards.splice(0, 1)[0];
        if (this.deck.size <= 0) { this.delete_me = true; }
        return ret;
    }
    serialise() {
        return {
            deck: this.deck.serialise(),
            x: this.x,
            y: this.y,
            open: this.open,
            id: this.id,
            type: this.type
        };
    }
}

module.exports = {
    vObject,
    vCard,
    vDeck
};