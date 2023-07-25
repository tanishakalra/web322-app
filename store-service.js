const Sequelize = require('sequelize');

var sequelize = new Sequelize('grahcrmo', 'grahcrmo', 'HSA6aRJHmWiMAXhytKskVgUGw0l9h1Zl', {
  host: 'isilo.db.elephantsql.com',
  dialect: 'postgres',
  port: 5432,
  dialectOptions: {
      ssl: { rejectUnauthorized: false }
  },
  query: { raw: true }
});

// Define a "Project" model

var Item = sequelize.define('Item', {
  body: Sequelize.TEXT,
  title: Sequelize.STRING,
  postDate: Sequelize.DATE,
  featureImage: Sequelize.TEXT,
  published: Sequelize.BOOLEAN,
  price: Sequelize.DOUBLE
});

var Category = sequelize.define('Category', {
  category: Sequelize.STRING
})
Item.belongsTo(Category, {foreignKey: 'category'});

const initialize = () => {
  return new Promise((resolve, reject) => {
    sequelize.sync().then(()=> resolve())
    .catch(() => reject("Unable to sync the database"));
  });
};

const getAllItems = () => {
  return new Promise((resolve, reject) => {
    Item.findAll().then(data => resolve(data))
    .catch(err => reject("No results returned"));
  });
};

const getItemsByCategory = (category) => {
  
  return new Promise((resolve, reject) => {
    Item.findAll()
      .then((items) => {
        var filtered = items.filter(
          (itemData) => parseInt(itemData.category) === parseInt(category)
        );
        resolve(filtered);
      })
      .catch((err) => reject("No results returned"));
  });
};

function getItemsByMinDate(minDateStr) {
  return new Promise((resolve, reject) => {
    const { gte } = Sequelize.Op;
    Item.findAll({where: {postDate: {[gte]: new Date(minDateStr)}}})
    .then(items => {
      const filteredItems = items.filter(
        (item) => new Date(item.postDate) >= new Date(minDateStr)
      );
      resolve(filteredItems);
    }).catch(() => reject("No items are published after this date"));
    
  });
}

function getItemById(id) {
  return new Promise((resolve, reject) => {
    Item.findAll().then(items => {
      const foundItem = items.find((item) => parseInt(item.id) === parseInt(id));
      resolve(foundItem);
    }).catch(() => reject("No results returned"));
  });
}

const getCategories = () => {
  return new Promise((resolve, reject) => {
    Category.findAll().then(data => resolve(data))
    .catch(err => reject("No results returned"));
  });
};

const getPublishedItems = () => {
  return new Promise((resolve, reject) => {
    Item.findAll()
      .then((items) => {
        const filtered = items.filter((obj) => obj.published === true);
        resolve(filtered);
      })
      .catch((err) => reject("No results returned"));
  });
};

const getPublishedItemsByCategory = (category) => {
  return new Promise((resolve, reject) => {
    Item.findAll()
      .then((items) => {
        const filtered = items.filter(
          (itemData) =>
            parseInt(itemData.category) === parseInt(category) &&
            itemData.published === true
        );
        resolve(filtered);
      })
      .catch((err) => reject("No results returned"));
  });
};

const addItem = (itemData) => {
  return new Promise((resolve, reject) => {
    itemData.published = (itemData.published) ? true : false;
    for (let property in itemData) {
        if (itemData[property] === "") {
          itemData[property] = null;
        }
    }
    // setting current date
    itemData.postDate = new Date();

    Item.create(itemData).then(()=>resolve())
    .catch(()=>reject("Unable to create post"));
  });
};

const addCategory = (categoryData) => {
  return new Promise((resolve, reject) => {
    for (let property in categoryData) {
        if (categoryData[property] === "") {
          categoryData[property] = null;
        }
    }
    Category.create(categoryData)
    .then(() => resolve())
    .catch(() => reject("Unable to add category"));
  });
}

const deleteCategoryById = (id) => {
  return new Promise((resolve, reject) => {
    Category.destroy({where: {id:id}})
    .then(()=> resolve())
    .catch(()=> reject("Unable to delete category"));
  })
}

const deleteItemById = (id) => {
  return new Promise((resolve, reject) => {
    Item.destroy({where: {id:id}})
    .then(()=> resolve())
    .catch(()=> reject("Unable to delete item"));
  })
}


module.exports = {
  addCategory,
  deleteCategoryById,
  deleteItemById,
  initialize,
  getAllItems,
  getCategories,
  getPublishedItems,
  addItem,
  getItemsByCategory,
  getPublishedItemsByCategory,
  getItemsByMinDate,
  getItemById,
};
