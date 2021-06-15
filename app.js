const express = require("express");
const { open } = require("sqlite");
const sqlite3 = require("sqlite3");
const path = require("path");
const format = require("date-fns/format");
const parse = require("date-fns/parse");
const isDate = require("date-fns/isDate");
const toDate = require("date-fns/toDate");
const isValid = require("date-fns/isValid");

const myApp = express();
myApp.use(express.json());

const dbPath = path.join(__dirname, "todoApplication.db");

let db = null;

const initializeDbAndServer = async () => {
  try {
    db = await open({
      filename: dbPath,
      driver: sqlite3.Database,
    });
    myApp.listen(3000, () => {
      console.log("Server Running at http://localhost:3000/");
    });
  } catch (e) {
    console.log(`DB Error:${e.message}`);
    process.exit(1);
  }
};

initializeDbAndServer();
const priorityArray = ["HIGH", "MEDIUM", "LOW"];
const statusArray = ["TO DO", "IN PROGRESS", "DONE"];
const categoryArray = ["WORK", "HOME", "LEARNING"];
const hasPriorityAndStatus = (ServerAns) => {
  return ServerAns.priority !== undefined && ServerAns.status !== undefined;
};
const hasPriority = (ServerAns) => {
  return ServerAns.priority !== undefined;
};

const hasStatus = (ServerAns) => {
  return ServerAns.status !== undefined;
};
const hasCategory = (ServerAns) => {
  return ServerAns.category !== undefined;
};
const hasCategoryAndStatus = (ServerAns) => {
  return ServerAns.category !== undefined && ServerAns.status !== undefined;
};
const hasCategoryAndPriority = (ServerAns) => {
  return ServerAns.category !== undefined && ServerAns.priority !== undefined;
};

const hasDueDate = (ServerAns) => {
  return ServerAns.due_date !== undefined;
};
const dbObjectToTodoList = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    category: dbObject.category,
    status: dbObject.status,
    dueDate: dbObject.due_date,
  };
};

myApp.get("/todos/", async (request, response) => {
  let getQuery = "";
  const { search_q = "", priority, status, category } = request.query;
  switch (true) {
    case hasPriority(request.query):
      getQuery = `
                SELECT
                    *
                FROM
                    todo 
                WHERE
                    todo LIKE '%${search_q}%'
                    AND priority = '${priority}';`;
      break;
    case hasPriorityAndStatus(request.query):
      getQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND status = '${status}'
                AND priority = '${priority}';`;
      break;
    case hasPriority(request.query):
      getQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND priority = '${priority}';`;
      break;
    case hasStatus(request.query):
      getQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND status = '${status}';`;
      break;
    case hasCategory(request.query):
      getQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND category = '${category}';`;
      break;
    case hasCategoryAndPriority(request.query):
      getQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND category = '${category}'
                AND priority = '${priority}';`;
      break;
    case hasCategoryAndStatus(request.query):
      getQuery = `
            SELECT
                *
            FROM
                todo 
            WHERE
                todo LIKE '%${search_q}%'
                AND category = '${category}'
                AND status = '${status}';`;
      break;
    default:
      getQuery = `
                SELECT
                *
                FROM
                todo 
                WHERE
                todo LIKE '%${search_q}%';`;
  }
  if (hasPriority(request.query)) {
    if (priorityArray.includes(priority)) {
      const todoArray = await db.all(getQuery);
      response.send(todoArray.map((eachData) => dbObjectToTodoList(eachData)));
    } else {
      response.status(400);
      response.send("Invalid Todo Priority");
    }
  } else if (hasCategory(request.query)) {
    if (categoryArray.includes(category)) {
      const todoArray = await db.all(getQuery);
      response.send(todoArray.map((eachData) => dbObjectToTodoList(eachData)));
    } else {
      response.status(400);
      response.send("Invalid Todo Category");
    }
  } else if (hasStatus(request.query)) {
    if (statusArray.includes(status)) {
      const todoArray = await db.all(getQuery);
      response.send(todoArray.map((eachData) => dbObjectToTodoList(eachData)));
    } else {
      response.status(400);
      response.send("Invalid Todo Status");
    }
  } else {
    const todoArray = await db.all(getQuery);
    response.send(todoArray.map((eachData) => dbObjectToTodoList(eachData)));
  }
});

myApp.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getSingleTodo = `
    SELECT *
    FROM todo
    WHERE id=${todoId};`;
  const data = await db.get(getSingleTodo);
  response.send(dbObjectToTodoList(data));
});

myApp.get("/agenda/", async (request, response) => {
  try {
    const { date } = request.query;
    const createdDate = format(new Date(date), "yyyy-MM-dd");
    const getQuery = `
        SELECT *
        FROM todo
        WHERE due_date = '${createdDate}';`;
    const todoArray = await db.all(getQuery);

    if (todoArray.length !== 0 && createdDate !== "") {
      response.send(todoArray.map((data) => dbObjectToTodoList(data)));
    } else {
      response.status(400);
      response.send("Invalid Due Date");
    }
  } catch (error) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});
myApp.post("/todos/", async (request, response) => {
  const { id, todo, category, priority, status, dueDate } = request.body;

  try {
    const createdDate = format(new Date(dueDate), "yyyy-MM-dd");
    const parseDate = isValid(new Date(createdDate));
    if (!categoryArray.includes(category)) {
      response.status(400);
      response.send("Invalid Todo Category");
    } else if (!statusArray.includes(status)) {
      response.status(400);
      response.send("Invalid Todo Status");
    } else if (!priorityArray.includes(priority)) {
      response.status(400);
      response.send("Invalid Todo Priority");
    } else if (parseDate === false) {
      response.status(400);
      response.send("Invalid Due Date");
    } else {
      const postQuery = `
        INSERT INTO
            todo(id,todo,category,priority,status,due_date)
        VALUES
            (${id},'${todo}','${category}','${priority}','${status}','${createdDate}');`;
      await db.run(postQuery);
      response.send("Todo Successfully Added");
    }
  } catch (error) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

myApp.put("/todos/:todoId/", async (request, response) => {
  try {
    const { todoId } = request.params;
    let ColumnUpdate = "";
    const reqBody = request.body;
    switch (true) {
      case reqBody.status !== undefined:
        if (statusArray.includes(reqBody.status)) {
          ColumnUpdate = "Status";
          break;
        } else {
          response.status(400);
          response.send("Invalid Todo Status");
          break;
        }
      case reqBody.priority !== undefined:
        if (priorityArray.includes(reqBody.priority)) {
          ColumnUpdate = "Priority";
          break;
        } else {
          response.status(400);
          response.send("Invalid Todo Priority");
          break;
        }
      case reqBody.todo !== undefined:
        ColumnUpdate = "Todo";
        break;
      case reqBody.category !== undefined:
        if (categoryArray.includes(reqBody.category)) {
          ColumnUpdate = "Category";
          break;
        } else {
          response.status(400);
          response.send("Invalid Todo Category");
          break;
        }
      case reqBody.dueDate !== undefined:
        const createdDate = format(new Date(reqBody.dueDate), "yyyy-MM-dd");
        const parseDate = isValid(new Date(createdDate));
        if (parseDate === true) {
          ColumnUpdate = "Due Date";
          break;
        } else {
          response.status(400);
          response.send("Invalid Due Date");
          break;
        }
    }
    const previousQuery = `
        SELECT
        *
        FROM
        todo
        WHERE 
        id = ${todoId};`;
    const previousTodo = await db.get(previousQuery);

    const {
      todo = previousTodo.todo,
      priority = previousTodo.priority,
      status = previousTodo.status,
      category = previousTodo.category,
      dueDate = previousTodo.due_date,
    } = request.body;

    const updateTodoQuery = `
        UPDATE
        todo
        SET
        todo='${todo}',
        priority='${priority}',
        status='${status}',
        category='${category}',
        due_date='${dueDate}' 
        WHERE
        id = ${todoId};`;
    await db.run(updateTodoQuery);
    response.send(`${ColumnUpdate} Updated`);
  } catch (error) {
    response.status(400);
    response.send("Invalid Due Date");
  }
});

myApp.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const delQuery = `
    DELETE FROM
    todo
    WHERE
    id=${todoId};`;
  await db.run(delQuery);
  response.send("Todo Deleted");
});

module.exports = myApp;
