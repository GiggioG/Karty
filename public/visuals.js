let imgs = {};
document.querySelectorAll("img.card").forEach(e => {
    imgs[e.id.slice(5)] = e;
});
let PLAYER_COLOR = "red";
class vObject {
    constructor(x, y, type, oid = null) {
        this.x = x;
        this.y = y;
        this.type = type;
        this.open = false;
        this.selected = false;
        this.peaking = false;
        this.delete_me = false;
        this.id = oid ? oid : id();
    }
    includes(x, y) {
        if (x < this.x) { return false; }
        if (x > this.x + this.w) { return false; }
        if (y < this.y) { return false; }
        if (y > this.y + this.h) { return false; }
        return true;
    }
    dist(x, y) {
        let dx = Math.abs(this.x - x);
        let dy = Math.abs(this.y - y);
        return Math.sqrt(dx * dx + dy * dy);
    }
    closest(objects, ok) {
        let minD = 9999;
        let minObj
        objects.forEach(e => {
            if ((e.id != this.id) && ok(e)) {
                let dst = this.dist(e.x, e.y)
                if (dst < minD) {
                    minObj = e;
                    minD = dst;
                }
            }
        });
        return minObj;
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
        emitEvent(this.name, "changeObject", {
            open: this.open
        });
    }
    peak(bool = null) {
        if (this.peaking == bool) { return; }
        this.peaking = !this.peaking;
        emitEvent(this.name, "peak", this.peaking);
    }
    drawPeakers() {
        if (this["peakers"]) {
            let r = 0,
                c = 0;
            for (let p in this.peakers) {
                if (this.peakers[p]) {
                    if ((c + 1) * 20 > this.w) {
                        c = 0;
                        r++;
                    }
                    ctx.fillStyle = p;
                    ctx.fillRect(
                        this.x + this.w - (c + 1) * 20,
                        this.y + this.h - (r + 1) * 20,
                        20, 20);
                    c++;
                }
            }
        }
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
        this.w = imgs[this.texture].width;
        this.h = imgs[this.texture].height;
    }
    get name() {
        return `c_${this.id}`;
    }
    get texture() {
        return this.card.value + this.card.suit;
    }
    draw(ctx) {
        let img = (this.open || this.peaking ? imgs[this.card.name] : imgs.backB);
        if (this.selected) {
            ctx.fillStyle = PLAYER_COLOR;
            ctx.fillRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
        }
        ctx.drawImage(img, this.x, this.y);
        if (this.peaking && !this.open) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = PLAYER_COLOR;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.globalAlpha = 1;
        }
        if (!this.open) {
            this.drawPeakers();
        }
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
    get dropShadow() {
        return max((this.deck.size / 13) * 2, 2);
    }
    get w() {
        return imgs[this.deck.cards[0].name].width + this.dropShadow;
    }
    get h() {
        return imgs[this.deck.cards[0].name].height + this.dropShadow;
    }
    get name() {
        return `d_${this.id}`;
    }
    draw(ctx) {
        let img = (this.open || this.peaking ? imgs[this.deck.cards[0].name] : imgs.backR);
        if (this.selected) {
            ctx.fillStyle = PLAYER_COLOR;
            ctx.fillRect(this.x - 2, this.y - 2, this.w + 4, this.h + 4);
        }
        let shadowX = this.x + this.dropShadow,
            shadowY = this.y + this.dropShadow;
        while (shadowX > this.x) {
            ctx.drawImage(imgs.dropShadow, shadowX, shadowY);
            shadowX--;
            shadowY--;
        }
        ctx.drawImage(img, this.x, this.y);
        if (this.peaking && !this.open) {
            ctx.globalAlpha = 0.3;
            ctx.fillStyle = PLAYER_COLOR;
            ctx.fillRect(this.x, this.y, this.w, this.h);
            ctx.globalAlpha = 1;
        }
        if (!this.open) {
            this.drawPeakers();
        }
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

function background(ctx, col) {
    ctx.fillStyle = col;
    ctx.fillRect(0, 0, ctx.w, ctx.h);
}

function announce(html, color, timeout) {
    const ul = document.querySelector("ul#announcements");
    let li = document.createElement("li");
    li.style.backgroundColor = color;
    li.innerHTML = html;
    li.classList.add("announcement");
    ul.appendChild(li);
    setTimeout(() => {
        li.style.opacity = "0%";
    }, timeout - 1000);
    setTimeout(() => {
        li.remove();
    }, timeout);
}

function sayColor(col) {
    let bkg = invertColor(col);
    return `<span style="color:${col};">${col}</span>`;
}