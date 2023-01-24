import TokenGeneration from "./generation";
import crypto from "crypto";
import fs from "fs";
import dotenv from "dotenv";
import express from "express";
import mysql from "mysql";
import util from "util";
import { checkRecaptcha } from "./recaptcha";

dotenv.config();

// const hmacKey = crypto.randomBytes(32); //HMAC KEY

// fs.writeFileSync("../hmacKey", hmacKey.toString("hex"));

const hmacKey = Buffer.from(fs.readFileSync("../hmacKey").toString(), "hex"); //HMAC KEY

const dbConfig = {
  host: process.env["DB_HOST"],
  user: process.env["DB_USER"],
  password: process.env["DB_PASSWORD"],
  database: process.env["DB_DATABASE"],
};
const pool = mysql.createPool(dbConfig);

const getDBConnection = util.promisify(pool.getConnection).bind(pool);

const generation = new TokenGeneration(dbConfig, hmacKey);

const app = express();

app.use(express.json());
app.set("etag", false);
app.disable("x-powered-by");

const idRegex = (id: string) => {
  return /^[a-z0-9]{5,20}$/.test(id);
};
const passwordRegex = (password: string) => {
  return /^[a-fA-F0-9]{64}$/.test(password);
};

interface IUserQuery {
  id: string;
  salt: Buffer;
  password: Buffer;
}

app.post("/login", async (req, res) => {
  const { id, password } = req.body;

  if (!idRegex(id) || !passwordRegex(password)) {
    return res.status(400).send({
      reason: "ID_OR_PASSWORD_WRONG",
    });
  }

  const dbConnection = await getDBConnection();
  try {
    const dbQuery = util.promisify(dbConnection.query).bind(dbConnection);

    const userQuery: Array<IUserQuery> = (await dbQuery(`SELECT * FROM user WHERE id="${id}"`)) as Array<IUserQuery>;
    if (userQuery.length == 0) {
      return res.status(400).send({
        reason: "ID_OR_PASSWORD_WRONG",
      });
    }
    const { salt, password: dbPassword } = userQuery[0];

    const saltedPassword = Buffer.concat([salt, Buffer.from(password, "hex")]);
    const hashedPassword = crypto.createHash("sha256").update(saltedPassword).digest("hex");

    if (dbPassword.equals(Buffer.from(hashedPassword, "hex"))) {
      return res.status(200).send({
        "refreh-token": generation.tokenToString(await generation.createRefreshToken(id, 20)),
      });
    }

    return res.status(400).send({
      reason: "ID_OR_PASSWORD_WRONG",
    });
  } finally {
    dbConnection.release();
  }
});
app.post("/signup", async (req, res) => {
  const { id, password, g_response } = req.body;
  if (!(await checkRecaptcha(g_response)))
    return res.status(400).send({
      reason: "RECAPTCHA_WRONG",
    });

  if (!idRegex(id) || !passwordRegex(password)) {
    return res.status(400).send({
      reason: "ID_OR_PASSWORD_WRONG",
    });
  }

  const dbConnection = await getDBConnection();
  try {
    const dbQuery = util.promisify(dbConnection.query).bind(dbConnection);
    const salt = crypto.randomBytes(8);
    const saltedPassword = Buffer.concat([salt, Buffer.from(password, "hex")]);
    const hashedPassword = crypto.createHash("sha256").update(saltedPassword).digest("hex");

    await dbQuery(`INSERT INTO USER VALUES("${id}", 0x${salt.toString("hex")}, 0x${hashedPassword});`);

    return res.status(200).send({
      "refreh-token": generation.tokenToString(await generation.createRefreshToken(id, 20)),
    });
  } catch {
    return res.status(400).send({
      reason: "ID_DUPLICATE",
    });
  } finally {
    dbConnection.release();
  }
});
app.get("/access-token", async (req, res) => {
  const tokenString = req.headers.authorization;
  const token = generation.verifyRefreshToken(tokenString);

  if (!token) {
    return res.status(400).send({
      reason: "TOKEN_WRONG",
    });
  }
  const accessToken = await generation.createAccessToken(token, 30);
  if (!accessToken) {
    return res.status(400).send({
      reason: "TOKEN_WRONG",
    });
  }
  return res.status(200).send({
    "access-token": generation.tokenToString(accessToken),
  });
});
app.get("/refresh-token", async (req, res) => {
  const tokenString = req.headers.authorization;
  const token = generation.verifyRefreshToken(tokenString);
  if (!token) {
    return res.status(400).send({
      reason: "TOKEN_WRONG",
    });
  }
  const updatedToken = await generation.updateRefreshToken(token, 20);

  if (!updatedToken) {
    return res.status(400).send({
      reason: "TOKEN_WRONG",
    });
  }

  return res.status(200).send({
    "refresh-token": generation.tokenToString(updatedToken),
  });
});

app.use((err: any, req: express.Request, res: express.Response, next: express.NextFunction) => {
  console.error(err);
  res.status(err.status || 500).send(`Error ${err.status || 500}`);
});

app.listen(process.env["WEB_PORT"], () => {
  console.log(`The program is running on port ${process.env["WEB_PORT"]}`);
});
