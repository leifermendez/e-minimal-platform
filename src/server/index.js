const express = require("express");
const { math } = require('./helpers')
const path = require("path");
const hbs = require("hbs");
const dataItems = require('./data/items.json')

const app = express();
let PORT = 8080;

const publicPath = path.join(__dirname, "../../public");
const partialPath = path.join(__dirname, "../views/partials");
const viewPath = path.join(__dirname, "../views");

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
        items: dataItems
    }); // express looks for a file in the views directory,
    //then compiles and renders them to the client
});

app.get("/about", (req, res) => {
    console.log("RENDERING THE ABOUT PAGE");
    res.render("about.hbs", {
        pageName: "About Page"
    });
});

app.get("/more", (req, res) => {
    console.log("RENDERING THE MORE PAGE");
    res.render("more.hbs", {
        pageName: "More Page"
    });
});

app.listen(PORT, () => {
    console.log(`Server is up on port ${PORT}`);
});