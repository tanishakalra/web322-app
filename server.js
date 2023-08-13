/*********************************************************************************

WEB322 - Assignment 06
I declare that this assignment is my own work in accordance with Seneca
Academic Policy. No part of this assignment has been copied manually or 
electronically from any other source (including 3rd party web sites) or 
distributed to other students. I acknowledge that violation of this policy 
to any degree results in a ZERO for this assignment and possible failure of 
the course.

Name:
Student ID:
Date:
Cyclic Web App Url:
Github Repository URL:

********************************************************************************/

const express = require("express");
const app = express();
const authData = require("./auth-service");
const multer = require("multer");
const cloudinary = require("cloudinary").v2;
const streamifier = require("streamifier");
const exphbs = require("express-handlebars");
const clientSessions = require("client-sessions");

const storeService = require("./store-service");
const port = process.env.PORT || 8080;

app.use(express.static("public"));
app.use(express.urlencoded({extended: true}));

cloudinary.config({
  cloud_name: "dyw0tstmr",
  api_key: "962573162933328",
  api_secret: "gNbxSuVGKbywXXiwH27Y3NZoZxU",
  secure: true,
});
const upload = multer();

// client session cookie
app.use(
  clientSessions({
    cookieName: "session",
    secret: "d364f",
    duration: 2 * 60 * 1000, 
    activeDuration: 1000 * 60 * 5, 
  })
);

app.use(function (req, res, next) {
  res.locals.session = req.session;
  next();
});

function ensureLogin(req, res, next) {
  if (req.session && req.session.user) {
    next();
  } else {
    res.redirect("/login");
  }
}

app.engine(
  ".hbs",
  exphbs.engine({
    extname: ".hbs",
    helpers: {
      navLink: function (url, options) {
        return (
          '<li class="nav-item"><a' +
          (url == app.locals.activeRoute
            ? ' class="nav-link active" '
            : ' class="nav-link" ') +
          ' href="' +
          url +
          '">' +
          options.fn(this) +
          "</a></li>"
        );
      },
      equal: function (lvalue, rvalue, options) {
        if (arguments.length < 3)
          throw new Error("Handlebars Helper equal needs 2 parameters");
        if (lvalue != rvalue) {
          return options.inverse(this);
        } else {
          return options.fn(this);
        }
      },
      formatDate: function(dateObj){
        let year = dateObj.getFullYear();
        let month = (dateObj.getMonth() + 1).toString();
        let day = dateObj.getDate().toString();
        return `${year}-${month.padStart(2, '0')}-${day.padStart(2,'0')}`;
      }
    },
  })
);
app.set("view engine", ".hbs");

// middleware to set active route
app.use(function (req, res, next) {
  let route = req.path.substring(1);
  app.locals.activeRoute =
    "/" +
    (isNaN(route.split("/")[1])
      ? route.replace(/\/(?!.*)/, "")
      : route.replace(/\/(.*)/, ""));
  app.locals.viewingCategory = req.query.category;
  next();
});

// default redirect route
app.get("/", (req, res) => {
  res.redirect("/shop");
});

// about page route
app.get("/about", (req, res) => {
  res.render("about");
});

app.get("/shop", async (req, res) => {
  // Declare an object to store properties for the view
  let viewData = {};

  try {
    // declare empty array to hold "post" objects
    let items = [];

    // if there's a "category" query, filter the returned posts by category
    if (req.query.category) {
      // Obtain the published "posts" by category
      items = await storeService.getPublishedItemsByCategory(
        req.query.category
      );
    } else {
      // Obtain the published "items"
      items = await storeService.getPublishedItems();
    }

    // sort the published items by postDate
    items.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

    // get the latest post from the front of the list (element 0)
    let item = items[0];

    // store the "items" and "post" data in the viewData object (to be passed to the view)
    viewData.items = items;
    viewData.item = item;
  } catch (err) {
    viewData.message = "No items found";
  }

  try {
    // Obtain the full list of "categories"
    let categories = await storeService.getCategories();

    // store the "categories" data in the viewData object (to be passed to the view)
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }

  // render the "shop" view with all of the data (viewData)
  res.render("shop", { data: viewData });
});

app.get("/shop/:id", async (req, res) => {
  // Declare an object to store properties for the view
  let viewData = {};

  try {
    // declare empty array to hold "item" objects
    let items = [];

    // if there's a "category" query, filter the returned posts by category
    if (req.query.category) {
      // Obtain the published "posts" by category
      items = await storeService.getPublishedItemsByCategory(
        req.query.category
      );
    } else {
      // Obtain the published "posts"
      items = await storeService.getPublishedItems();
    }

    // sort the published items by postDate
    items.sort((a, b) => new Date(b.postDate) - new Date(a.postDate));

    // store the "items" and "item" data in the viewData object (to be passed to the view)
    viewData.items = items;
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    // Obtain the item by "id"
    viewData.item = await storeService.getItemById(req.params.id);
  } catch (err) {
    viewData.message = "no results";
  }

  try {
    // Obtain the full list of "categories"
    let categories = await storeService.getCategories();

    // store the "categories" data in the viewData object (to be passed to the view)
    viewData.categories = categories;
  } catch (err) {
    viewData.categoriesMessage = "no results";
  }

  // render the "shop" view with all of the data (viewData)
  res.render("shop", { data: viewData });
});

// route for add item page
app.get("/items/add", ensureLogin, (req, res) => {
  storeService.getCategories()
  .then(data => res.render("addItem", {categories:data}))
  .catch(() => res.render("addPost", {categories: []}));
});

// function to add item to the store
app.post("/items/add", ensureLogin, upload.single("featureImage"), (req, res) => {
  if (req.file) {
    let streamUpload = (req) => {
      return new Promise((resolve, reject) => {
        let stream = cloudinary.uploader.upload_stream((error, result) => {
          if (result) {
            resolve(result);
          } else {
            reject(error);
          }
        });

        streamifier.createReadStream(req.file.buffer).pipe(stream);
      });
    };

    async function upload(req) {
      let result = await streamUpload(req);
      return result;
    }

    upload(req).then((uploaded) => {
      processItem(uploaded.url);
    });
  } else {
    processItem("");
  }

  function processItem(imageUrl) {
    req.body.featureImage = imageUrl;

    storeService.addItem(req.body);
    res.redirect("/items");
  }
});


app.get('/login', function(req, res) {
  res.render('login');
});


app.get('/register', function(req, res) {
  res.render('register');
});

app.post('/register', (req, res) => {
  authData.registerUser(req.body)
    .then(() => res.render('register', { successMessage: 'User created' }))
    .catch((err) => res.render('register', { errorMessage: err, userName: req.body.userName }));
});

app.post('/login', (req, res) => {
  req.body.userAgent = req.get('User-Agent');
  authData.checkUser(req.body)
    .then((user) => {
      req.session.user = {
        userName: user.userName,
        email: user.email,
        loginHistory: user.loginHistory,
      };
      res.redirect('/items');
    })
    .catch((err) => {
      console.log("error during login: " + err) ;
      res.render('login', { errorMessage: err, userName: req.body.userName });
    });
});

app.get('/logout', (req, res) => {
  req.session.reset();
  res.redirect('/');
});

app.get('/userHistory', ensureLogin, (req, res) => {
  res.render('userHistory');
});

app.get("/items", ensureLogin, (req, res) => {
  const category = req.query.category;
  const minDateStr = req.query.minDate;

  if (category) {
    storeService
      .getItemsByCategory(category)
      .then((data) => {
        if (data.length>0) res.render("items", { items: data });
        else res.render("items", { message: "No results returned" });
      })
      .catch((err) => res.render("items", { message: err }));
  } else if (minDateStr) {
    storeService
      .getItemsByMinDate(minDateStr)
      .then((data) => {
        if (data.length>0) res.render("items", { items: data });
        else res.render("items", { message: "No results returned" });
      })
      .catch((err) => res.render("items", { message: err }));
  } else {
    storeService
      .getAllItems()
      .then((data) => {
        if (data.length>0) res.render("items", { items: data });
        else res.render("items", { message: "No results returned" });
      })
      .catch((err) => res.render("items", { message: err }));
  }
});

app.get("/item/:value", ensureLogin, (req, res) => {
  const value = req.params.value;
  storeService
    .getItemById(value)
    .then((data) => {
      res.json(data);
    })
    .catch((err) => res.send(err));
});

app.get("/categories", ensureLogin, (req, res) => {
  storeService
    .getCategories()
    .then((data) => {
      if (data.length>0) res.render("categories", { categories: data });
      else res.render("categories", { message: "No results returned" });
    })
    .catch((err) => res.render("categories", { message: err }));
});

app.get("/categories/add", ensureLogin, (req, res) => {
  res.render("addCategory");
});

app.post("/categories/add", ensureLogin, (req, res) => {
  storeService
    .addCategory({category: req.body.category})
    .then(() => res.redirect("/categories"))
    .catch((err) => {
      res.status(500).send("Unable to add category");
    });
});

app.get("/categories/delete/:id", ensureLogin, (req, res) => {
  storeService
    .deleteCategoryById(req.params.id)
    .then(() => res.redirect("/categories"))
    .catch((err) => {
      res.status(500).send("Unable to remove category");
    });
});

app.get("/items/delete/:id", ensureLogin, (req, res) => {
  storeService
    .deleteItemById(req.params.id)
    .then(() => res.redirect("/items"))
    .catch((error) => {
      res.status(500).send("Unable to remove item");
    });
});

// 404 Page Not Found handler
app.use((req, res, next) => {
  res.status(404).render("404");
});

storeService
  .initialize()
  .then(authData.initialize)
  .then((data) => {
    app.listen(port, () => {
      console.log(`Express http server listening on ${port}`);
    });
  })
  .catch((err) => console.log(err));
