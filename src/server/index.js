require('dotenv').config()
const fs = require('fs');
const express = require("express");
const { math } = require('./helpers')
const path = require("path");
const hbs = require("hbs");
const dataItems = require('./data/items.json')
const config = require('./data/config.json')
const { withOutSession, withSession } = require('./ws')

const app = express();
const PORT = process.env.PORT || 8080;
const SESSION_FILE_PATH = './session.json';
const publicPath = path.join(__dirname, "../../public");
const partialPath = path.join(__dirname, "../views/partials");
const viewPath = path.join(__dirname, "../views");
let sessionData;
app.use(express.static(publicPath));


// configures express to use hbs
hbs.registerPartials(partialPath);
hbs.registerHelper('math', math);
app.set("view engine", "hbs");
app.set("views", viewPath);

/************************* ROUTERS *********************/

app.get("/", (req, res) => {
    console.log("RENDERING THE HOME PAGE");
    res.render("home.hbs", {
        pageName: "Home Page",
        items: dataItems,
        config: config
    }); // express looks for a file in the views directory,
    //then compiles and renders them to the client
});

app.get("/ws", (req, res) => {
    console.log("RENDERING THE ABOUT PAGE");
    res.render("ws.hbs", {
        pageName: "About Page"
    });
});



/**
 * Revisamos si existe archivo con credenciales WS!
 */
(fs.existsSync(SESSION_FILE_PATH)) ? withSession() : withOutSession();


/**
 * Iniciamos el Servidor de Express
 */
app.listen(PORT, () => {
    console.log(`Ya esta listo puedes visitar tu sitio http://localhost:${PORT}`);
});