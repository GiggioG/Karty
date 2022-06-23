let canvas = document.querySelector("canvas");
canvas.width = window.innerWidth;
canvas.height = window.innerHeight - 5;
let ctx = canvas.getContext("2d");
ctx.w = canvas.width, ctx.h = canvas.height;
let PLAYER_ID;
let sock;

function emitEvent(name, action, data = null) {
    sock.send(JSON.stringify({
        name,
        action,
        data
    }));
}

function main() {
    canvas.focus();
    let objects = [];
    let selected = null;
    let dragged = null;
    let dragOffset = { x: null, y: null };
    let mouse = { x: null, y: null }
    let cancelClick = false;

    sock = new WebSocket(`ws://${location.hostname}:9090`);
    sock.addEventListener("message", msg => {
        let m = JSON.parse(msg.data);
        if (m.type == "player_data") {
            PLAYER_COLOR = m.data.color;
            document.documentElement.style.setProperty("--player-color", PLAYER_COLOR);
            announce(`Your color is ${sayColor(PLAYER_COLOR)}.`, "lightgrey", 20000);
            document.title = `Karty - ${PLAYER_COLOR}`;
            PLAYER_ID = m.data.id;
        } else if (m.type == "init_data") {
            m.data.forEach(o => {
                objects.push(vObject.deserialise(o));
            })
        } else if (m.type == "no_free_space") {
            document.write("All player slots are occupied.");
            setTimeout(() => {
                location.reload();
            }, 10000);
        } else if (m.type == "delete") {
            let idx = objects.findIndex(e => e.name == m.data);
            if (idx == -1) { return; }
            objects.splice(idx, 1);
        } else if (m.type == "createObject") {
            let newObj = vObject.deserialise(m.data);
            objects.push(newObj);
        } else if (m.type == "changeObject") {
            let idx = objects.findIndex(e => e.name == m.data.name);
            if (idx == -1) { return; }
            for (k in m.data.changes) {
                if (k == "deck") {
                    objects[idx][k] = d(m.data.changes[k]);
                } else if (k == "card") {
                    objects[idx][k] = c(m.data.changes[k]);
                } else {
                    objects[idx][k] = m.data.changes[k];
                }
            }
        } else if (m.type == "connected") {
            announce(`${sayColor(m.data)} connected.`, "lightgreen", 5000);
        } else if (m.type == "disconnected") {
            announce(`${sayColor(m.data)} disconnected.`, "lightcoral", 5000);
        } else if (m.type == "peak") {
            let idx = objects.findIndex(e => e.name == m.data.object);
            if (idx == -1) { return; }
            if (!objects[idx]["peakers"]) { objects[idx]["peakers"] = {}; }
            objects[idx]["peakers"][m.data.player] = m.data.peaking;
        } else if (m.type == "init_peakers") {
            for (let p in m.data) {
                for (let o of m.data[p]) {
                    let idx = objects.findIndex(e => e.name == o);
                    if (idx == -1) { return; }
                    if (!objects[idx]["peakers"]) { objects[idx]["peakers"] = {}; }
                    objects[idx]["peakers"][p] = true;
                }
            }
        }
    });
    sock.addEventListener("close", () => {
        console.error("server disconnected");
        location.reload();
    });


    function select(obj) {
        if (selected) { selected.selected = false; }
        if (obj) { obj.selected = true; }
        selected = obj;
    }

    function deleteme(obj) {
        obj.delete_me = true;
        emitEvent(obj.name, "delete", null);
        if (objects.includes(obj)) {
            objects.splice(objects.indexOf(obj), 1);
        }
        delete obj;
    }

    function deckToCard(d) {
        let newc = new vCard(d.take(), d.x, d.y);
        newc.open = d.open;
        emitEvent(newc.name, "createObject", newc.serialise());
        objects.push(newc);
        if (d.selected) {
            select(newc);
        }
        deleteme(d);
        return newc;
    }

    canvas.addEventListener("click", e => {
        if (cancelClick) { cancelClick = false; return; }
        for (obj of objects) {
            if (!obj.includes(e.x, e.y)) { continue; }
            if (obj.selected && !obj.open) {
                obj.peak();
                return;
            }
            select(obj);
            return;
        }
        select(null);
    });
    canvas.addEventListener("mousedown", e => {
        for (obj of objects) {
            if (!obj.includes(e.x, e.y)) { continue; }
            dragged = obj;
            dragOffset.x = e.x - obj.x;
            dragOffset.y = e.y - obj.y;
            return;
        }
        select(null);
    });
    canvas.addEventListener("mousemove", e => {
        mouse.x = e.x;
        mouse.y = e.y;
        if (dragged && !dragged.delete_me) {
            dragged.drag(e.x - dragOffset.x, e.y - dragOffset.y);
            cancelClick = true;
        }
    });
    canvas.addEventListener("mouseup", e => {
        dragged = null;
    });
    canvas.addEventListener("keydown", e => {
        if (!selected) { return; }
        let { key } = e;
        if (key == 'f') {
            selected.flip();
        } else if (key == 't') {
            if (selected.type == "deck") {
                let card = selected.take();
                emitEvent(selected.name, "changeObject", {
                    deck: selected.deck.serialise()
                });
                let vc = new vCard(card, selected.x, selected.y);
                vc.open = selected.open;
                emitEvent(vc.name, "createObject", vc.serialise());
                objects.push(vc);
                dragged = vc;
                dragOffset = { x: vc.w / 2, y: vc.h / 2 };
                vc.drag(mouse.x - dragOffset.x, mouse.y - dragOffset.y);
                cancelClick = true;
                if (selected.deck.size == 1) { deckToCard(selected); }
            } else if (selected.type == "card") {
                dragged = selected;
                selected.drag(mouse.x - dragOffset.x, mouse.y - dragOffset.y);
                dragOffset = { x: selected.w / 2, y: selected.h / 2 };
                cancelClick = true;
            }
        } else if (key == 'p' && objects.length > 1) {
            let closest = selected.closest(objects, () => { return true; });
            if (selected.dist(closest.x, closest.y) > 150) { return; };
            if (selected.type == "card") {
                if (closest.type == "card") {
                    let newd = new Deck([selected.card, closest.card]);
                    let vd = new vDeck(newd, closest.x, closest.y);
                    vd.open = selected.open;
                    emitEvent(vd.name, "createObject", vd.serialise());
                    objects.push(vd);
                    deleteme(selected);
                    deleteme(closest);
                    select(vd);
                } else if (closest.type == "deck") {
                    closest.deck.cards.push(null);
                    for (let i = closest.deck.size - 1; i >= 1; i--) {
                        closest.deck.cards[i] = closest.deck.cards[i - 1];
                    }
                    closest.deck.cards[0] = selected.card;
                    emitEvent(closest.name, "changeObject", {
                        deck: closest.deck.serialise()
                    });
                    closest.open = selected.open;
                    deleteme(selected);
                    select(closest);
                }
            } else if (selected.type == "deck") {
                if (closest.type == "card") {
                    selected.drag(closest.x, closest.y);
                    selected.deck.cards.push(closest.card);
                    emitEvent(selected.name, "changeObject", {
                        deck: selected.deck.serialise()
                    });
                    deleteme(closest);
                } else if (closest.type == "deck") {
                    selected.drag(closest.x, closest.y);
                    closest.deck.cards.forEach(e => selected.deck.cards.push(e));
                    emitEvent(selected.name, "changeObject", {
                        deck: selected.deck.serialise()
                    });
                    deleteme(closest);
                }
            }
        } else if (key == 's' && selected.type == "deck") {
            let decks = selected.deck.split();
            selected.deck = decks[1];
            let newVD = new vDeck(decks[0], selected.x, selected.y);
            newVD.open = selected.open;
            objects.push(newVD);
            emitEvent(selected.name, "changeObject", {
                deck: selected.deck.serialise()
            });
            emitEvent(newVD.name, "createObject", newVD.serialise());
            dragged = newVD;
            if (selected.deck.size == 1) {
                deckToCard(selected);
            }
            if (newVD.deck.size == 1) {
                newVD = deckToCard(newVD);
                dragOffset = { x: newVD.w / 2, y: newVD.h / 2 };
                newVD.drag(mouse.x - dragOffset.x, mouse.y - dragOffset.y);
                dragged = newVD;
            }
        } else if (key == 'h' && selected.type == "deck") {
            selected.deck.shuffle();
            emitEvent(selected.name, "changeObject", {
                deck: selected.deck.serialise()
            });
        }
    }, true);

    setInterval(() => {
        background(ctx, "darkgreen");
        for (let i = objects.length - 1; i >= 0; i--) {
            if (objects[i].open && objects[i].peaking) {
                objects[i].peak(false);
                objects[i].peakers = {};
            }
            objects[i].draw(ctx);
        }
    }, 1000 / 30);
}