const fs = require("fs");
const http = require("http");
const url = require("url");
const qs = require("querystring");
const path = require("path");
const ws = require("ws");
const id = require("uuid").v4;
const { c, d } = require("./public/cards.js");
const { vCard, vDeck, vObject } = require("./libs/visuals.js");

//HTTP SERVER
http.createServer((req, res) => {
    let parsed = url.parse(req.url);
    let pathname = parsed.pathname;
    let query = qs.parse(parsed.query);
    if (pathname == "/") {
        fs.createReadStream("public/index.html").pipe(res);
    } else {
        let public = path.join(__dirname, "public"); //.replace(/\\/g, '/');
        let filepath = path.join(public, pathname);
        if (!filepath.startsWith(public)) {
            return;
        }
        if (!fs.existsSync(filepath)) {
            if (filepath.endsWith("/")) { filepath = filepath.slice(0, -1); }
            filepath += ".html";
            if (!fs.existsSync(filepath)) {
                res.end(`<h1 style="color:red">Error 404</h1><p style="color:darkred">File not found.</p>`);
                return;
            }
        }
        fs.createReadStream(filepath).pipe(res);
    }
}).listen(8080);

//WEBSOCKET GAME SERVER
let objects = [
    new vDeck(d("ALL"), 50, 50)
];
setInterval(() => {
    for (let i = objects.length - 1; i >= 0; i--) {
        if (objects[i].delete_me == true) {
            objects.splice(i, 1);
            if (i == objects.length) { i--; }
        }
    }
}, 1000 / 30);
let clients = {};
let COLORS = ["red", "cyan", "magenta", "lime", "darkred", "blue", "purple", "black"];
colors = {};
COLORS.forEach(c => colors[c] = null);

function pickColor(sock) {
    for (col of COLORS) {
        if (colors[col] != null) { continue; }
        colors[col] = sock;
        return col;
    }
    return null;
}

function broadcast(id, msg) {
    for (let cid in clients) {
        let c = clients[cid];
        if (c.id == id) { continue; }
        c.send(JSON.stringify(msg));
    }
}

let wss = new ws.Server({
    port: 9090
});
wss.on("connection", sock => {
    sock.color = pickColor(sock);
    if (sock.color == null) {
        sock.send(JSON.stringify({
            type: "no_free_space",
            data: null
        }));
        sock.close();
        return;
    }
    sock.id = id();
    sock.peaks = [];
    broadcast(sock.id, {
        type: "connected",
        data: sock.color
    });
    sock.send(JSON.stringify({
        type: "player_data",
        data: { color: sock.color, id: sock.id }
    }));
    sock.send(JSON.stringify({
        type: "init_data",
        data: objects.map(o => o.serialise())
    })); {
        let peaks = {};
        for (client in clients) {
            let cl = clients[client];
            if (cl.peaks.length > 0) {
                peaks[cl.color] = [];
                cl.peaks.forEach((p, i) => {
                    if (objects.find(e => e.name == p)) {
                        peaks[cl.color].push(p);
                    } else {
                        cl.peaks.splice(i, 1);
                    }
                })
            }
        }
        sock.send(JSON.stringify({
            type: "init_peakers",
            data: peaks
        }));
    }
    sock.on("message", msg => {
        msg = msg.toString();
        let ev = JSON.parse(msg);
        if (ev.action == "delete") {
            let idx = objects.findIndex(e => e.name == ev.name);
            objects.splice(idx, 1);
            broadcast(sock.id, {
                type: "delete",
                data: ev.name
            });
        } else if (ev.action == "createObject") {
            let newObj = vObject.deserialise(ev.data);
            broadcast(sock.id, {
                type: "createObject",
                data: ev.data
            });
            objects.push(newObj);
        } else if (ev.action == "changeObject") {
            let idx = objects.findIndex(e => { return (e.name == ev.name); });
            if (idx == -1) {
                console.log(objects.map(e => e.name));
                console.log(ev.name);
                process.exit(1);
            }
            for (k in ev.data) {
                if (k == "deck") {
                    objects[idx][k] = d(ev.data[k]);
                } else if (k == "card") {
                    objects[idx][k] = c(ev.data[k]);
                } else {
                    objects[idx][k] = ev.data[k];
                }
            }
            broadcast(sock.id, {
                type: "changeObject",
                data: {
                    name: ev.name,
                    changes: ev.data
                }
            });
        } else if (ev.action == "peak") {
            if (!sock.peaks.includes(ev.name) && ev.data) {
                sock.peaks.push(ev.name);
            } else if (sock.peaks.includes(ev.name) && !ev.data) {
                sock.peaks.splice(sock.peaks.indexOf(ev.name));
            }
            broadcast(sock.id, {
                type: "peak",
                data: {
                    player: sock.color,
                    object: ev.name,
                    peaking: ev.data
                }
            });
        }
    });
    sock.on("close", () => {
        broadcast(sock.id, {
            type: "disconnected",
            data: sock.color
        });
        colors[sock.color] = null;
        delete clients[sock.id];
    });
    clients[sock.id] = sock;
});